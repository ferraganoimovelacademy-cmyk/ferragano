import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import { ACADEMY_LICAO_KEYS } from "@/lib/platform/academy";

const workspaceSchema = z.object({ workspaceId: z.string().uuid() });

/** GATE P05 — progresso da Academy do próprio usuário. */
export const listarProgressoAcademy = createServerFn({ method: "GET" })
  .middleware([instrumented("platform", "academy_progresso_listado", { surface: "app.academy" })])
  .inputValidator((input: unknown) => workspaceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("academy_progress")
      .select("licao_key, concluido_em")
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", context.userId);

    if (error) {
      console.error("[listarProgressoAcademy]", error);
      throw new Error("Não foi possível carregar seu progresso da Academy.");
    }

    return { items: rows ?? [] };
  });

/** Marca ou desmarca uma lição. A chave precisa existir na trilha oficial. */
export const marcarLicaoAcademy = createServerFn({ method: "POST" })
  .middleware([instrumented("platform", "academy_licao_marcada", { surface: "app.academy" })])
  .inputValidator((input: unknown) =>
    workspaceSchema
      .extend({
        licaoKey: z.enum(ACADEMY_LICAO_KEYS as [string, ...string[]]),
        concluida: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!data.concluida) {
      const { error } = await context.supabase
        .from("academy_progress")
        .delete()
        .eq("workspace_id", data.workspaceId)
        .eq("user_id", context.userId)
        .eq("licao_key", data.licaoKey);

      if (error) throw new Error("Não foi possível atualizar a lição.");
      return { ok: true, concluida: false };
    }

    const { error } = await context.supabase.from("academy_progress").upsert(
      {
        workspace_id: data.workspaceId,
        user_id: context.userId,
        licao_key: data.licaoKey,
        concluido_em: new Date().toISOString(),
      },
      { onConflict: "workspace_id,user_id,licao_key" },
    );

    if (error) {
      console.error("[marcarLicaoAcademy]", error);
      throw new Error("Não foi possível concluir a lição.");
    }

    return { ok: true, concluida: true };
  });

/** Visão de equipe: só administradores do workspace leem o progresso alheio (RLS). */
export const listarProgressoEquipe = createServerFn({ method: "GET" })
  .middleware([instrumented("platform", "academy_equipe_listada", { surface: "app.academy" })])
  .inputValidator((input: unknown) => workspaceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("academy_progress")
      .select("user_id, licao_key")
      .eq("workspace_id", data.workspaceId);

    if (error) throw new Error("Não foi possível carregar o progresso da equipe.");

    const porUsuario = new Map<string, string[]>();
    for (const row of rows ?? []) {
      const atual = porUsuario.get(row.user_id) ?? [];
      atual.push(row.licao_key);
      porUsuario.set(row.user_id, atual);
    }

    const ids = [...porUsuario.keys()];
    const nomes = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, nome, email")
        .in("id", ids);
      for (const p of profiles ?? []) {
        nomes.set(p.id, p.nome ?? p.email ?? "Usuário");
      }
    }

    return {
      items: ids.map((id) => ({
        userId: id,
        nome: nomes.get(id) ?? "Usuário",
        licoes: porUsuario.get(id) ?? [],
      })),
    };
  });