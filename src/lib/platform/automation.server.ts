import { createHmac } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { acoesSemProvedor, type AutomationAcao } from "@/lib/platform/automation";

/**
 * SPRINT 09 — Automation Engine (Worker + Executores).
 *
 * Fluxo: Evento → Outbox → Worker → Executor → canal.
 *
 * Invariantes:
 *  - o claim do lote é atômico (`claim_outbox_batch` usa FOR UPDATE SKIP LOCKED),
 *    então dois workers concorrentes nunca pegam a mesma entrada;
 *  - o resultado é sempre registrado por `complete_outbox_event`, que reagenda
 *    com backoff exponencial e desiste após `max_tentativas`;
 *  - canais sem provedor conectado são DESCARTADOS com motivo explícito —
 *    nunca ficam presos em retry infinito.
 */

type Admin = SupabaseClient<Database>;

type OutboxJob = {
  id: string;
  workspace_id: string;
  event_type: string;
  canal: string;
  destino: string | null;
  payload: Record<string, unknown> | null;
  tentativas: number;
  max_tentativas: number;
};

export type WorkerResultado = {
  processados: number;
  entregues: number;
  reagendados: number;
  descartados: number;
  falhas: number;
};

type Execucao = { ok: true } | { ok: false; erro: string; descartar?: boolean };

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Cria tarefa (ação disponível hoje, sem dependência externa). */
async function executarTask(admin: Admin, job: OutboxJob): Promise<Execucao> {
  const p = job.payload ?? {};
  const titulo = str(p["titulo"]) ?? `Ação automática: ${job.event_type}`;

  const { error } = await admin.from("tasks").insert({
    workspace_id: job.workspace_id,
    titulo,
    descricao: str(p["descricao"]),
    person_id: str(p["personId"]),
    opportunity_id: str(p["opportunityId"]),
    responsavel_id: str(p["responsavelId"]),
    prioridade: (str(p["prioridade"]) ?? "media") as never,
    origem: (str(p["origem"]) ?? "automacao") as never,
    vence_em: str(p["venceEm"]),
  });

  return error ? { ok: false, erro: error.message } : { ok: true };
}

/** Notifica um usuário ou todos os gestores/admins do workspace. */
async function executarNotification(admin: Admin, job: OutboxJob): Promise<Execucao> {
  const p = job.payload ?? {};
  const titulo = str(p["titulo"]) ?? `Aviso: ${job.event_type}`;
  const destinatario = str(p["userId"]) ?? str(job.destino);

  let userIds: string[] = [];
  if (destinatario) {
    userIds = [destinatario];
  } else {
    const { data, error } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("workspace_id", job.workspace_id)
      .in("role", ["proprietario", "administrador", "gerente", "diretor"]);
    if (error) return { ok: false, erro: error.message };
    userIds = Array.from(new Set((data ?? []).map((r) => r.user_id)));
  }

  if (!userIds.length) return { ok: false, erro: "nenhum destinatário", descartar: true };

  const { error } = await admin.from("notifications").insert(
    userIds.map((userId) => ({
      workspace_id: job.workspace_id,
      user_id: userId,
      titulo,
      mensagem: str(p["mensagem"]),
      tipo: str(p["tipo"]) ?? "info",
      link: str(p["link"]),
      entity: str(p["entity"]),
      entity_id: str(p["entityId"]),
    })),
  );

  return error ? { ok: false, erro: error.message } : { ok: true };
}

/** POST assinado (HMAC-SHA256 do corpo, header `x-ferragano-signature`). */
async function executarWebhook(job: OutboxJob): Promise<Execucao> {
  const url = str(job.destino) ?? str((job.payload ?? {})["url"]);
  if (!url || !/^https:\/\//i.test(url)) {
    return { ok: false, erro: "destino inválido (exige URL https)", descartar: true };
  }

  const corpo = JSON.stringify({
    event: job.event_type,
    workspaceId: job.workspace_id,
    outboxId: job.id,
    data: job.payload ?? {},
  });

  const segredo = process.env["OUTBOX_WEBHOOK_SECRET"];
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-ferragano-event": job.event_type,
    "x-ferragano-delivery": job.id,
  };
  if (segredo) {
    headers["x-ferragano-signature"] = createHmac("sha256", segredo).update(corpo).digest("hex");
  }

  try {
    const resposta = await fetch(url, { method: "POST", headers, body: corpo });
    if (!resposta.ok) {
      const texto = (await resposta.text()).slice(0, 400);
      // 4xx (exceto 408/429) não melhora com retry.
      const permanente =
        resposta.status >= 400 && resposta.status < 500 && ![408, 429].includes(resposta.status);
      return { ok: false, erro: `HTTP ${resposta.status}: ${texto}`, descartar: permanente };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

async function executar(admin: Admin, job: OutboxJob): Promise<Execucao> {
  const acao = (str((job.payload ?? {})["acao"]) ?? canalParaAcao(job.canal)) as AutomationAcao;

  if (acoesSemProvedor.includes(acao)) {
    return {
      ok: false,
      erro: `canal "${acao}" sem provedor conectado — efeito registrado e descartado`,
      descartar: true,
    };
  }

  switch (acao) {
    case "task":
      return executarTask(admin, job);
    case "notification":
      return executarNotification(admin, job);
    case "webhook":
      return executarWebhook(job);
    default:
      return { ok: false, erro: `ação desconhecida: ${acao}`, descartar: true };
  }
}

function canalParaAcao(canal: string): AutomationAcao {
  switch (canal) {
    case "email":
      return "email";
    case "whatsapp":
      return "whatsapp";
    case "push":
      return "push";
    case "webhook":
      return "webhook";
    default:
      return "notification";
  }
}

/** Processa um lote da fila. Chamado pelo cron via /api/public/hooks/outbox-worker. */
export async function processarOutbox(limite = 20): Promise<WorkerResultado> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as Admin;

  const inicioLote = Date.now();
  const { data, error } = await admin.rpc("claim_outbox_batch", { _limit: limite });
  if (error) throw new Error(`claim falhou: ${error.message}`);

  const jobs = (data ?? []) as unknown as OutboxJob[];
  const resultado: WorkerResultado = {
    processados: jobs.length,
    entregues: 0,
    reagendados: 0,
    descartados: 0,
    falhas: 0,
  };

  // SPRINT 12 — GATE 01/05: telemetria do worker por workspace.
  const telemetria: {
    workspace_id: string;
    domain: string;
    action: string;
    surface: string;
    duracao_ms: number;
    ok: boolean;
    entity_type: string;
    entity_id: string;
    erro: string | null;
  }[] = [];

  for (const job of jobs) {
    let saida: Execucao;
    const inicioJob = Date.now();
    try {
      saida = await executar(admin, job);
    } catch (e) {
      saida = { ok: false, erro: (e as Error).message };
    }

    const descartar = !saida.ok && saida.descartar === true;
    const erro = saida.ok ? undefined : saida.erro.slice(0, 500);

    const { error: completeErro } = await admin.rpc("complete_outbox_event", {
      _id: job.id,
      _ok: saida.ok,
      ...(erro ? { _erro: erro } : {}),
      _descartar: descartar,
    });
    if (completeErro) console.error("[outbox-worker] complete falhou", job.id, completeErro.message);

    if (saida.ok) resultado.entregues += 1;
    else if (descartar) resultado.descartados += 1;
    else if (job.tentativas >= job.max_tentativas) resultado.falhas += 1;
    else resultado.reagendados += 1;

    telemetria.push({
      workspace_id: job.workspace_id,
      domain: "automation",
      action: saida.ok ? "evento_processado" : job.tentativas > 1 ? "retry" : "erro",
      surface: "outbox.worker",
      duracao_ms: Date.now() - inicioJob,
      ok: saida.ok,
      entity_type: "outbox_event",
      entity_id: job.id,
      erro: erro ?? null,
    });

    if (!saida.ok) console.error("[outbox-worker]", job.event_type, job.id, erro);
  }

  await registrarTelemetriaWorker(admin, telemetria, Date.now() - inicioLote);

  return resultado;
}

/**
 * O worker roda com service_role e sem `auth.uid()`, então não pode usar
 * `record_telemetry` (que exige vínculo do usuário). Grava direto — a RLS é
 * ignorada pelo service_role e a origem fica marcada em `surface`.
 * Telemetria falhando nunca invalida o lote já entregue.
 */
async function registrarTelemetriaWorker(
  admin: Admin,
  eventos: readonly Record<string, unknown>[],
  duracaoLoteMs: number,
): Promise<void> {
  if (eventos.length === 0) return;
  try {
    const client = admin as unknown as {
      from: (t: string) => { insert: (v: unknown) => Promise<{ error: { message: string } | null }> };
    };

    const { error: erroEventos } = await client.from("platform_telemetry").insert(eventos);
    if (erroEventos) console.error("[outbox-worker] telemetria", erroEventos.message);

    const workspaces = [...new Set(eventos.map((e) => e["workspace_id"] as string))];
    const { error: erroMetricas } = await client.from("platform_metrics").insert(
      workspaces.map((workspace_id) => ({
        workspace_id,
        metric_name: "job.outbox_worker",
        metric_type: "duracao",
        metric_value: duracaoLoteMs,
        entity_type: "job",
      })),
    );
    if (erroMetricas) console.error("[outbox-worker] metrica", erroMetricas.message);
  } catch (e) {
    console.error("[outbox-worker] telemetria", (e as Error).message);
  }
}
