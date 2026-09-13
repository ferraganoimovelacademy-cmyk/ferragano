import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import { FEEDBACK_SEVERIDADES, FEEDBACK_STATUS, FEEDBACK_TIPOS } from "@/lib/platform/feedback";

const enviarSchema = z.object({
  workspaceId: z.string().uuid(),
  tipo: z.enum(FEEDBACK_TIPOS),
  mensagem: z.string().trim().min(3).max(4000),
  severidade: z.enum(FEEDBACK_SEVERIDADES).default("media"),
  surface: z.string().trim().max(120).optional(),
  rota: z.string().trim().max(300).optional(),
  userAgent: z.string().trim().max(400).optional(),
});

/** GATE P07 — registra feedback do piloto no nome do próprio usuário (RLS). */
export const enviarFeedback = createServerFn({ method: "POST" })
  .middleware([instrumented("platform", "feedback_enviado", { surface: "app.shell" })])
  .inputValidator((input: unknown) => enviarSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("pilot_feedback").insert({
      workspace_id: data.workspaceId,
      user_id: context.userId,
      tipo: data.tipo,
      mensagem: data.mensagem,
      severidade: data.severidade,
      surface: data.surface ?? null,
      rota: data.rota ?? null,
      user_agent: data.userAgent ?? null,
    });

    if (error) {
      console.error("[enviarFeedback]", error);
      throw new Error("Não foi possível enviar o feedback agora.");
    }

    return { ok: true };
  });

/** Histórico do feedback visível para quem chama (próprio ou tudo, se admin). */
export const listarFeedback = createServerFn({ method: "GET" })
  .middleware([instrumented("platform", "feedback_listado", { surface: "app.shell" })])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        status: z.enum(FEEDBACK_STATUS).optional(),
        limite: z.number().int().min(1).max(100).default(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("pilot_feedback")
      .select("id, tipo, mensagem, severidade, status, rota, resposta, created_at")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(data.limite);

    if (data.status) query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error("Não foi possível carregar o feedback.");
    return { items: rows ?? [] };
  });

/** Triagem: só administradores do workspace (policy de UPDATE). */
export const triarFeedback = createServerFn({ method: "POST" })
  .middleware([instrumented("platform", "feedback_triado", { surface: "app.shell" })])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        feedbackId: z.string().uuid(),
        status: z.enum(FEEDBACK_STATUS),
        severidade: z.enum(FEEDBACK_SEVERIDADES).optional(),
        resposta: z.string().trim().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pilot_feedback")
      .update({
        status: data.status,
        ...(data.severidade ? { severidade: data.severidade } : {}),
        ...(data.resposta
          ? {
              resposta: data.resposta,
              respondido_por: context.userId,
              respondido_em: new Date().toISOString(),
            }
          : {}),
      })
      .eq("id", data.feedbackId)
      .eq("workspace_id", data.workspaceId);

    if (error) throw new Error("Não foi possível atualizar o feedback.");
    return { ok: true };
  });