import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const diaSchema = z.object({
  ativo: z.boolean(),
  inicio: z.string().regex(/^\d{2}:\d{2}$/),
  fim: z.string().regex(/^\d{2}:\d{2}$/),
});

export const DIAS = [
  ["seg", "Segunda"],
  ["ter", "Terça"],
  ["qua", "Quarta"],
  ["qui", "Quinta"],
  ["sex", "Sexta"],
  ["sab", "Sábado"],
  ["dom", "Domingo"],
] as const;

const opt = (max = 160) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length ? v : null))
    .nullable()
    .optional();

/** Dados completos da empresa (workspace ativo). */
export const getOrganizacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: workspace, error } = await context.supabase
      .from("workspaces")
      .select("*")
      .eq("id", data.workspaceId)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar a organização.");
    return { workspace };
  });

/** Atualiza os dados da empresa. A policy de UPDATE exige admin. */
export const updateOrganizacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        nome: z.string().trim().min(2).max(80).optional(),
        nome_fantasia: opt(80),
        razao_social: opt(120),
        cnpj: opt(20),
        inscricao_estadual: opt(30),
        logo_url: opt(500),
        email: opt(160),
        site: opt(200),
        telefone: opt(40),
        whatsapp: opt(40),
        endereco_cep: opt(12),
        endereco_logradouro: opt(160),
        endereco_numero: opt(20),
        endereco_complemento: opt(80),
        endereco_bairro: opt(80),
        endereco_cidade: opt(80),
        endereco_uf: opt(2),
        timezone: z.string().trim().min(3).max(60).optional(),
        moeda: z.string().trim().min(3).max(3).optional(),
        horario_comercial: z.record(z.string(), diaSchema).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { workspaceId, ...patch } = data;
    const payload = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    ) as Record<string, unknown>;
    if (!Object.keys(payload).length) return { ok: true };

    const { error } = await context.supabase
      .from("workspaces")
      .update(payload as never)
      .eq("id", workspaceId);
    if (error) {
      console.error("[updateOrganizacao]", error);
      throw new Error("Sem permissão para editar a organização.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("./audit.server");
    await recordAudit(supabaseAdmin, {
      workspaceId,
      actorId: context.userId,
      action: "workspace.updated",
      entity: "workspaces",
      entityId: workspaceId,
      metadata: { campos: Object.keys(payload) },
    });

    return { ok: true };
  });
