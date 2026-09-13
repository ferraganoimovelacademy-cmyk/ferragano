import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AuditEvent = {
  workspaceId: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * GATE 07 — trilha de auditoria.
 * Ponto único de escrita em `audit_log`. A tabela é append-only e não tem
 * policy de INSERT: só o servidor grava. Falha de auditoria nunca derruba a
 * operação de negócio — apenas registra no log do servidor.
 */
export async function recordAudit(
  client: SupabaseClient<Database>,
  event: AuditEvent,
): Promise<void> {
  const { error } = await client.from("audit_log").insert({
    workspace_id: event.workspaceId,
    actor_id: event.actorId,
    action: event.action,
    entity: event.entity,
    entity_id: event.entityId ?? null,
    metadata: (event.metadata ?? {}) as never,
  });

  if (error) {
    console.error("[audit] falha ao registrar", event.action, error.message);
  }
}
