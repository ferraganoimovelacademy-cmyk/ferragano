import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { SalesEvent } from "@/lib/platform/sales";
import type { PropertyEvent } from "@/lib/platform/property";

/**
 * SPRINT 06/07 — Event Bus interno (Event Sourcing Light) + Outbox Pattern.
 *
 * Nenhum módulo escreve em `domain_events` direto: todos passam por aqui.
 * O evento é a fonte para Timeline, Analytics, IA e automações — por isso
 * ele é append-only e a falha de publicação NUNCA derruba a operação de
 * negócio (só registra no log do servidor).
 *
 * Sprint 07 acrescentou:
 *  - versionamento (`event_version`, `schema_version`) para evoluir o payload
 *    sem quebrar consumidores antigos;
 *  - rastreabilidade (`correlation_id` = fluxo, `causation_id` = evento pai);
 *  - Outbox: o efeito colateral (WhatsApp, e-mail, webhook, automação) é
 *    gravado na mesma operação e processado depois por um worker, então
 *    nenhuma automação se perde em caso de falha externa.
 */
export type DomainEventType = SalesEvent | PropertyEvent;

export type DomainAggregate =
  | "opportunity"
  | "task"
  | "visit"
  | "proposal"
  | "reservation"
  | "sale"
  | "developer"
  | "project"
  | "release"
  | "tower"
  | "unit";

export type DomainEventInput = {
  workspaceId: string;
  type: DomainEventType;
  aggregate: DomainAggregate;
  aggregateId?: string | null;
  personId?: string | null;
  opportunityId?: string | null;
  actorId: string | null;
  payload?: Record<string, unknown>;
  /** Versão do contrato do evento (default 1). */
  eventVersion?: number;
  /** Versão do schema do payload (default 1). */
  schemaVersion?: number;
  /** Id do fluxo de negócio (mesma jornada compartilha o mesmo valor). */
  correlationId?: string | null;
  /** Id do evento que causou este. */
  causationId?: string | null;
  /** Efeitos colaterais a enfileirar no outbox. */
  outbox?: OutboxEntry[];
};

export type OutboxEntry = {
  canal: "interno" | "email" | "whatsapp" | "push" | "webhook";
  destino?: string | null;
  payload?: Record<string, unknown>;
  /** Atraso em segundos antes de o worker poder processar. */
  delaySegundos?: number;
  /**
   * Chave de idempotência. Se omitida, é derivada do evento + canal + destino.
   * O índice único no banco garante que o mesmo efeito nunca entra duas vezes.
   */
  idempotencyKey?: string;
};

export async function publishEvent(
  client: SupabaseClient<Database>,
  event: DomainEventInput,
): Promise<string | null> {
  const { data, error } = await client
    .from("domain_events")
    .insert({
      workspace_id: event.workspaceId,
      event_type: event.type,
      aggregate: event.aggregate,
      aggregate_id: event.aggregateId ?? null,
      person_id: event.personId ?? null,
      opportunity_id: event.opportunityId ?? null,
      actor_id: event.actorId,
      payload: (event.payload ?? {}) as never,
      event_version: event.eventVersion ?? 1,
      schema_version: event.schemaVersion ?? 1,
      correlation_id: event.correlationId ?? null,
      causation_id: event.causationId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[events] falha ao publicar", event.type, error.message);
    return null;
  }

  if (event.outbox?.length) {
    await enqueueOutbox(event, data.id);
  }

  await enqueueFromRules(event, data.id);

  return data.id;
}

/**
 * O outbox é restrito ao serviço interno (só `service_role` escreve),
 * por isso usamos o client privilegiado — sempre depois de o evento de
 * domínio já ter sido autorizado pelas policies do usuário.
 */
async function enqueueOutbox(event: DomainEventInput, domainEventId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const agora = Date.now();

    const { error } = await supabaseAdmin.from("outbox_events").insert(
      (event.outbox ?? []).map((entry) => ({
        workspace_id: event.workspaceId,
        domain_event_id: domainEventId,
        event_type: event.type,
        canal: entry.canal,
        destino: entry.destino ?? null,
        payload: (entry.payload ?? event.payload ?? {}) as never,
        disponivel_em: new Date(agora + (entry.delaySegundos ?? 0) * 1000).toISOString(),
        idempotency_key:
          entry.idempotencyKey ??
          `${event.type}:${event.aggregateId ?? domainEventId}:${entry.canal}:${entry.destino ?? "-"}`,
      })),
    );

    if (error) console.error("[outbox] falha ao enfileirar", event.type, error.message);
  } catch (e) {
    console.error("[outbox] erro inesperado", (e as Error).message);
  }
}

/**
 * SPRINT 09 — Automation Engine.
 * As regras ativas do workspace decidem quais efeitos o evento gera.
 * Condições são comparações simples de igualdade contra o payload do evento,
 * o que mantém o motor declarativo e auditável (Rules Engine antes da IA).
 */
async function enqueueFromRules(event: DomainEventInput, domainEventId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: regras, error } = await supabaseAdmin
      .from("automation_rules")
      .select("id, acao, canal, config, delay_segundos, condicoes, nome")
      .eq("workspace_id", event.workspaceId)
      .eq("event_type", event.type)
      .eq("ativa", true);

    if (error) {
      console.error("[automation] falha ao ler regras", event.type, error.message);
      return;
    }
    if (!regras?.length) return;

    const payload = event.payload ?? {};
    const agora = Date.now();

    const linhas = regras
      .filter((regra) => condicoesAtendidas(regra.condicoes as Record<string, unknown>, payload))
      .map((regra) => ({
        workspace_id: event.workspaceId,
        domain_event_id: domainEventId,
        rule_id: regra.id,
        event_type: event.type,
        canal: regra.canal,
        destino: (regra.config as Record<string, unknown>)?.["destino"] as string | null,
        payload: {
          ...payload,
          ...(regra.config as Record<string, unknown>),
          acao: regra.acao,
          personId: event.personId ?? payload["personId"] ?? null,
          opportunityId: event.opportunityId ?? payload["opportunityId"] ?? null,
          regra: regra.nome,
        } as never,
        disponivel_em: new Date(agora + (regra.delay_segundos ?? 0) * 1000).toISOString(),
        idempotency_key: `${event.type}:${event.aggregateId ?? domainEventId}:rule:${regra.id}:${domainEventId}`,
      }));

    if (!linhas.length) return;

    const { error: insertErro } = await supabaseAdmin.from("outbox_events").insert(linhas);
    if (insertErro && insertErro.code !== "23505") {
      console.error("[automation] falha ao enfileirar regras", event.type, insertErro.message);
    }
  } catch (e) {
    console.error("[automation] erro inesperado", (e as Error).message);
  }
}

function condicoesAtendidas(
  condicoes: Record<string, unknown> | null,
  payload: Record<string, unknown>,
): boolean {
  if (!condicoes) return true;
  return Object.entries(condicoes).every(([chave, esperado]) => {
    if (Array.isArray(esperado)) return esperado.includes(payload[chave] as never);
    return payload[chave] === esperado;
  });
}
