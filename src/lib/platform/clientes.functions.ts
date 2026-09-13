import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recordAudit } from "@/lib/platform/audit.server";

/** Domínio Comercial — base única de clientes. */

export const listClientes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        busca: z.string().trim().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("clientes")
      .select("id, nome, email, telefone, documento, observacao, responsavel_id, lead_id, created_at")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(300);

    if (data.busca) {
      const termo = data.busca.replace(/[%,()]/g, "");
      query = query.or(`nome.ilike.%${termo}%,email.ilike.%${termo}%,telefone.ilike.%${termo}%`);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("[listClientes]", error.message);
      throw new Error("Não foi possível carregar os clientes.");
    }
    return rows ?? [];
  });

export const createCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        nome: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(160).optional().or(z.literal("")),
        telefone: z.string().trim().max(30).optional().or(z.literal("")),
        documento: z.string().trim().max(30).optional().or(z.literal("")),
        observacao: z.string().trim().max(2000).optional().or(z.literal("")),
        leadId: z.string().uuid().nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("clientes")
      .insert({
        workspace_id: data.workspaceId,
        nome: data.nome,
        email: data.email || null,
        telefone: data.telefone || null,
        documento: data.documento || null,
        observacao: data.observacao || null,
        lead_id: data.leadId ?? null,
        responsavel_id: userId,
        criado_por: userId,
      })
      .select("id, nome")
      .single();

    if (error) {
      console.error("[createCliente]", error.message);
      throw new Error("Não foi possível cadastrar o cliente.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "cliente.created",
      entity: "cliente",
      entityId: row.id,
      metadata: { nome: row.nome },
    });

    return row;
  });

/** Converte uma pessoa (oportunidade fechada) em cliente sem duplicar digitação. */
export const converterLeadEmCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid(), personId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [{ data: pessoa, error: readErr }, { data: contatos }] = await Promise.all([
      supabase
        .from("people")
        .select("id, nome")
        .eq("id", data.personId)
        .eq("workspace_id", data.workspaceId)
        .maybeSingle(),
      supabase
        .from("person_contacts")
        .select("canal, valor")
        .eq("person_id", data.personId)
        .eq("workspace_id", data.workspaceId),
    ]);

    if (readErr || !pessoa) throw new Error("Pessoa não encontrada.");

    const email = (contatos ?? []).find((c) => c.canal === "email")?.valor ?? null;
    const telefone =
      (contatos ?? []).find((c) => c.canal === "telefone" || c.canal === "whatsapp")?.valor ??
      null;

    const { data: row, error } = await supabase
      .from("clientes")
      .insert({
        workspace_id: data.workspaceId,
        nome: pessoa.nome,
        email,
        telefone,
        responsavel_id: userId,
        criado_por: userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[converterLeadEmCliente]", error.message);
      throw new Error("Não foi possível converter a pessoa em cliente.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "cliente.created_from_lead",
      entity: "cliente",
      entityId: row.id,
      metadata: { personId: pessoa.id },
    });

    return row;
  });
