import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * GATE 03.5 — leitura da caixa de notificações.
 * A escrita vive em `notifications.server.ts` (`notify`). Aqui só o dono lê e
 * marca como lida — a policy filtra por `user_id = auth.uid()`.
 */

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        apenasNaoLidas: z.boolean().default(false),
        limit: z.number().int().min(1).max(50).default(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("notifications")
      .select("id, tipo, titulo, mensagem, link, lida_em, created_at")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.apenasNaoLidas) query = query.is("lida_em", null);

    const { data: rows, error } = await query;
    if (error) {
      console.error("[listNotifications]", error.message);
      throw new Error("Não foi possível carregar as notificações.");
    }

    const items = (rows ?? []).map((row) => ({
      id: row.id,
      tipo: row.tipo,
      titulo: row.titulo,
      mensagem: row.mensagem,
      link: row.link,
      lida: Boolean(row.lida_em),
      createdAt: row.created_at,
    }));

    return { items, naoLidas: items.filter((item) => !item.lida).length };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ notificationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ lida_em: new Date().toISOString() })
      .eq("id", data.notificationId)
      .is("lida_em", null);

    if (error) {
      console.error("[markNotificationRead]", error.message);
      throw new Error("Não foi possível marcar a notificação.");
    }
    return { ok: true as const };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ lida_em: new Date().toISOString() })
      .eq("workspace_id", data.workspaceId)
      .is("lida_em", null);

    if (error) {
      console.error("[markAllNotificationsRead]", error.message);
      throw new Error("Não foi possível marcar as notificações.");
    }
    return { ok: true as const };
  });
