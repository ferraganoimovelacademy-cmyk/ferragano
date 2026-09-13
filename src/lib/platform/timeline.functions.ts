import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { salesEventLabels, type SalesEvent } from "@/lib/platform/sales";

/**
 * GATE 03.5 — motor de timeline.
 * Projeção de LEITURA: não existe tabela `timeline`. O feed é montado na hora
 * a partir das fontes que já são a verdade (audit_log, comments, files) e
 * ordenado por data. Cada fonte continua sob sua própria RLS — quem não é
 * admin simplesmente não recebe as linhas de auditoria, sem erro vazado.
 *
 * Fonte nova? Some um bloco aqui. Nunca duplicar evento em tabela paralela.
 */

const inputSchema = z.object({
  workspaceId: z.string().uuid(),
  entity: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z_]+$/, "entidade inválida")
    .optional(),
  entityId: z.string().uuid().optional(),
  limit: z.number().int().min(5).max(100).default(30),
});

export type TimelineSource = "auditoria" | "comentario" | "arquivo" | "atividade" | "evento";

export type TimelineEvent = {
  id: string;
  source: TimelineSource;
  titulo: string;
  detalhe: string | null;
  entity: string;
  entityId: string | null;
  createdAt: string;
  actorId: string | null;
  actorNome: string;
  actorAvatar: string | null;
};

const acoesLegiveis: Record<string, string> = {
  "workspace.created": "criou o workspace",
  "invite.created": "enviou um convite",
  "invite.accepted": "aceitou um convite",
  "invite.revoked": "revogou um convite",
  "member.removed": "removeu um membro",
  "role.granted": "concedeu um papel",
  "role.revoked": "revogou um papel",
  "module.toggled": "alterou um módulo",
};

export const listTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { workspaceId, entity, entityId, limit } = data;

    const auditQuery = (() => {
      let q = supabase
        .from("audit_log")
        .select("id, action, entity, entity_id, actor_id, metadata, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (entity) q = q.eq("entity", entity);
      if (entityId) q = q.eq("entity_id", entityId);
      return q;
    })();

    const commentsQuery = (() => {
      let q = supabase
        .from("comments")
        .select("id, entity, entity_id, autor_id, corpo, removido_em, created_at")
        .eq("workspace_id", workspaceId)
        .is("removido_em", null)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (entity) q = q.eq("entity", entity);
      if (entityId) q = q.eq("entity_id", entityId);
      return q;
    })();

    const filesQuery = (() => {
      let q = supabase
        .from("files")
        .select("id, nome, entity, entity_id, enviado_por, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (entity) q = q.eq("entity", entity);
      if (entityId) q = q.eq("entity_id", entityId);
      return q;
    })();

    // SPRINT 05 — interações da pessoa entram na mesma linha do tempo.
    const activitiesQuery = (() => {
      let q = supabase
        .from("activities")
        .select("id, tipo, titulo, descricao, person_id, autor_id, ocorreu_em")
        .eq("workspace_id", workspaceId)
        .order("ocorreu_em", { ascending: false })
        .limit(limit);
      if (entity === "person" && entityId) q = q.eq("person_id", entityId);
      else if (entity && entity !== "person") q = q.eq("person_id", "00000000-0000-0000-0000-000000000000");
      return q;
    })();

    // SPRINT 06 — Event Bus: os eventos de domínio do Sales entram no mesmo feed.
    const eventsQuery = (() => {
      let q = supabase
        .from("domain_events")
        .select("id, event_type, aggregate, aggregate_id, person_id, opportunity_id, actor_id, payload, occurred_at")
        .eq("workspace_id", workspaceId)
        .order("occurred_at", { ascending: false })
        .limit(limit);
      if (entity === "person" && entityId) q = q.eq("person_id", entityId);
      else if (entity === "opportunity" && entityId) q = q.eq("opportunity_id", entityId);
      else if (entity && entityId) q = q.eq("aggregate_id", entityId);
      return q;
    })();

    const [audit, comments, files, activities, events] = await Promise.all([
      auditQuery,
      commentsQuery,
      filesQuery,
      activitiesQuery,
      eventsQuery,
    ]);

    for (const [nome, res] of [
      ["audit_log", audit],
      ["comments", comments],
      ["files", files],
      ["activities", activities],
      ["domain_events", events],
    ] as const) {
      if (res.error) {
        console.error(`[listTimeline:${nome}]`, res.error.message);
        throw new Error("Não foi possível carregar a linha do tempo.");
      }
    }



    const eventos: Omit<TimelineEvent, "actorNome" | "actorAvatar">[] = [
      ...(audit.data ?? []).map((row) => {
        const metadata = (row.metadata ?? {}) as Record<string, unknown>;
        const alvo = metadata.email ?? metadata.nome ?? metadata.role ?? metadata.module;
        return {
          id: `audit:${row.id}`,
          source: "auditoria" as const,
          titulo: acoesLegiveis[row.action] ?? row.action,
          detalhe: typeof alvo === "string" ? alvo : null,
          entity: row.entity,
          entityId: row.entity_id,
          createdAt: row.created_at,
          actorId: row.actor_id,
        };
      }),
      ...(comments.data ?? []).map((row) => ({
        id: `comment:${row.id}`,
        source: "comentario" as const,
        titulo: "comentou",
        detalhe: row.corpo.length > 160 ? `${row.corpo.slice(0, 160)}…` : row.corpo,
        entity: row.entity,
        entityId: row.entity_id,
        createdAt: row.created_at,
        actorId: row.autor_id,
      })),
      ...(files.data ?? []).map((row) => ({
        id: `file:${row.id}`,
        source: "arquivo" as const,
        titulo: "anexou um arquivo",
        detalhe: row.nome,
        entity: row.entity,
        entityId: row.entity_id,
        createdAt: row.created_at,
        actorId: row.enviado_por,
      })),
      ...(activities.data ?? []).map((row) => ({
        id: `activity:${row.id}`,
        source: "atividade" as const,
        titulo: row.titulo,
        detalhe: row.descricao,
        entity: "person",
        entityId: row.person_id,
        createdAt: row.ocorreu_em,
        actorId: row.autor_id,
      })),
      ...(events.data ?? []).map((row) => ({
        id: `event:${row.id}`,
        source: "evento" as const,
        titulo: salesEventLabels[row.event_type as SalesEvent] ?? row.event_type,
        detalhe:
          typeof (row.payload as Record<string, unknown> | null)?.etapa === "string"
            ? ((row.payload as Record<string, unknown>).etapa as string)
            : null,
        entity: row.aggregate,
        entityId: row.aggregate_id,
        createdAt: row.occurred_at,
        actorId: row.actor_id,
      })),
    ];


    eventos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const recorte = eventos.slice(0, limit);

    const actorIds = [...new Set(recorte.map((e) => e.actorId).filter(Boolean))] as string[];
    const { data: profiles } = actorIds.length
      ? await supabase.from("profiles").select("id, nome, email, avatar_url").in("id", actorIds)
      : { data: [] as { id: string; nome: string | null; email: string | null; avatar_url: string | null }[] };

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    return recorte.map<TimelineEvent>((evento) => {
      const perfil = evento.actorId ? byId.get(evento.actorId) : null;
      return {
        ...evento,
        actorNome: perfil?.nome ?? perfil?.email ?? "Sistema",
        actorAvatar: perfil?.avatar_url ?? null,
      };
    });
  });
