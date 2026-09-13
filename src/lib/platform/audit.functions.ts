import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const filtersSchema = z.object({
  workspaceId: z.string().uuid(),
  action: z.string().trim().max(80).optional(),
  entity: z.string().trim().max(80).optional(),
  limit: z.number().int().min(10).max(100).default(50),
  offset: z.number().int().min(0).max(5000).default(0),
});

/**
 * GATE 07 — leitura da trilha de auditoria.
 * Sem service role: a policy de `audit_log` só devolve linhas para admin do
 * workspace. Não-admin recebe lista vazia, nunca erro de permissão vazado.
 */
export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => filtersSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    let query = supabase
      .from("audit_log")
      .select("id, action, entity, entity_id, actor_id, metadata, created_at", { count: "exact" })
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.action) query = query.eq("action", data.action);
    if (data.entity) query = query.eq("entity", data.entity);

    const { data: rows, count, error } = await query;

    if (error) {
      console.error("[listAuditLog]", error.message);
      throw new Error("Não foi possível carregar a auditoria.");
    }

    const actorIds = [...new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean))] as string[];
    const { data: profiles } = actorIds.length
      ? await supabase.from("profiles").select("id, nome, email").in("id", actorIds)
      : { data: [] as { id: string; nome: string | null; email: string | null }[] };

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    return {
      total: count ?? 0,
      events: (rows ?? []).map((row) => ({
        id: row.id,
        action: row.action,
        entity: row.entity,
        entityId: row.entity_id,
        createdAt: row.created_at,
        metadata: Object.fromEntries(
          Object.entries((row.metadata ?? {}) as Record<string, unknown>).map(([k, v]) => [
            k,
            typeof v === "string" ? v : JSON.stringify(v),
          ]),
        ) as Record<string, string>,
        actor: row.actor_id ? (byId.get(row.actor_id) ?? null) : null,
      })),
    };
  });
