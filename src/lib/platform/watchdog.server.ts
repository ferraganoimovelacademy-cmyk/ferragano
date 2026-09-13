import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { derivarSinais, montarSnapshotAdvisor } from "@/lib/platform/advisor";
import {
  montarEfeitosDeSinais,
  type WatchdogEfeito,
  type WatchdogRegra,
} from "@/lib/platform/watchdog";

/**
 * SPRINT 17 — Automação Inteligente (execução).
 *
 * Roda pelo cron com service_role: lê os Read Models 360 direto (as RPCs
 * exigem `auth.uid()`), deriva os sinais do Advisor e enfileira os efeitos no
 * Outbox. Quem executa continua sendo o worker do Sprint 09 — aqui só publica
 * o EFEITO, com `idempotency_key` diária para não duplicar.
 */

type Admin = SupabaseClient<Database>;
type Linha = Record<string, unknown>;

export type WatchdogResultado = {
  workspaces: number;
  sinaisAcionaveis: number;
  efeitosEnfileirados: number;
  duplicados: number;
};

export async function avaliarSinaisAutomaticos(agora: Date = new Date()): Promise<WatchdogResultado> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as Admin;
  const bruto = admin as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (k: string, v: unknown) => Promise<{ data: Linha[] | null; error: { message: string } | null }>;
        in: (k: string, v: unknown[]) => Promise<{ data: Linha[] | null; error: { message: string } | null }>;
      };
    };
  };

  const resultado: WatchdogResultado = {
    workspaces: 0,
    sinaisAcionaveis: 0,
    efeitosEnfileirados: 0,
    duplicados: 0,
  };

  const { data: workspaces, error } = await bruto
    .from("workspaces")
    .select("id")
    .in("status", ["trial", "ativo"]);
  if (error) throw new Error(`workspaces: ${error.message}`);

  for (const ws of workspaces ?? []) {
    const workspaceId = String(ws["id"]);
    resultado.workspaces += 1;

    const [exec, vend, mkt, regras] = await Promise.all([
      bruto.from("executive_360").select("*").eq("workspace_id", workspaceId),
      bruto.from("sales_360").select("*").eq("workspace_id", workspaceId),
      bruto.from("marketing_360").select("*").eq("workspace_id", workspaceId),
      bruto.from("automation_rules").select("*").eq("workspace_id", workspaceId),
    ]);

    const falha = exec.error ?? vend.error ?? mkt.error ?? regras.error;
    if (falha) {
      console.error("[advisor-watchdog]", workspaceId, falha.message);
      continue;
    }

    const sinais = derivarSinais(
      montarSnapshotAdvisor((exec.data ?? [])[0], vend.data ?? [], mkt.data ?? []),
    );

    const efeitos = montarEfeitosDeSinais(
      sinais,
      (regras.data ?? []).map(
        (r): WatchdogRegra => ({
          id: String(r["id"]),
          eventType: String(r["event_type"]),
          acao: r["acao"] as WatchdogRegra["acao"],
          canal: r["canal"] as WatchdogRegra["canal"],
          config: (r["config"] ?? {}) as WatchdogRegra["config"],
          delaySegundos: Number(r["delay_segundos"] ?? 0),
          ativa: r["ativa"] === true,
        }),
      ),
      agora,
    );

    resultado.sinaisAcionaveis += efeitos.length;
    if (efeitos.length === 0) continue;

    const { enfileirados, duplicados } = await enfileirar(admin, workspaceId, efeitos, agora);
    resultado.efeitosEnfileirados += enfileirados;
    resultado.duplicados += duplicados;
  }

  return resultado;
}

/**
 * Insere um por um: a `idempotency_key` é única, então a colisão de um efeito
 * já publicado hoje não pode derrubar os outros do lote.
 */
async function enfileirar(
  admin: Admin,
  workspaceId: string,
  efeitos: readonly WatchdogEfeito[],
  agora: Date,
): Promise<{ enfileirados: number; duplicados: number }> {
  let enfileirados = 0;
  let duplicados = 0;

  for (const efeito of efeitos) {
    const { error } = await admin.from("outbox_events").insert({
      workspace_id: workspaceId,
      event_type: efeito.eventType,
      canal: efeito.canal,
      rule_id: efeito.ruleId,
      idempotency_key: efeito.idempotencyKey,
      payload: efeito.payload as never,
      disponivel_em: new Date(agora.getTime() + efeito.delaySegundos * 1000).toISOString(),
    });

    if (!error) {
      enfileirados += 1;
    } else if (error.code === "23505" || /duplicate key/i.test(error.message)) {
      duplicados += 1;
    } else {
      console.error("[advisor-watchdog] enfileirar", efeito.idempotencyKey, error.message);
    }
  }

  return { enfileirados, duplicados };
}
