import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recordAudit } from "@/lib/platform/audit.server";
import {
  LEAD_ESTAGIOS,
  LEAD_ORIGENS,
  LEAD_TEMPERATURAS,
  calcularScore,
  temperaturaPorScore,
} from "@/lib/platform/comercial";

/**
 * SPRINT 05 — Relationship Core: processo comercial.
 * Uma pessoa pode ter várias oportunidades ao mesmo tempo (dois imóveis,
 * duas datas). Por isso o pipeline vive aqui e não em `people`.
 * O estágio da jornada da pessoa é derivado por trigger a partir daqui.
 */

const estagio = z.enum(LEAD_ESTAGIOS);

/** Probabilidade padrão por estágio — o usuário pode sobrescrever. */
const probabilidadePadrao: Record<(typeof LEAD_ESTAGIOS)[number], number> = {
  novo: 5,
  contato: 10,
  qualificado: 25,
  visita: 40,
  proposta: 60,
  negociacao: 80,
  fechado: 100,
  perdido: 0,
};

export const listOpportunities = createServerFn({ method: "GET" })
  .middleware([instrumented("sales", "abrir_oportunidade")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        estagio: estagio.optional(),
        personId: z.string().uuid().optional(),
        busca: z.string().trim().max(120).optional(),
        limite: z.number().int().min(1).max(500).default(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    let query = supabase
      .from("opportunities")
      .select(
        "id, titulo, estagio, temperatura, score, valor, probabilidade, origem, proxima_acao, proxima_acao_em, perdido_motivo, responsavel_id, person_id, created_at, people(id, nome), empreendimentos(id, nome)",
      )
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(data.limite);

    if (data.estagio) query = query.eq("estagio", data.estagio);
    if (data.personId) query = query.eq("person_id", data.personId);

    const { data: rows, error } = await query;
    if (error) {
      console.error("[listOpportunities]", error.message);
      throw new Error("Não foi possível carregar as oportunidades.");
    }

    const ids = [...new Set((rows ?? []).map((r) => r.responsavel_id).filter(Boolean))] as string[];
    const { data: perfis } = ids.length
      ? await supabase.from("profiles").select("id, nome, email").in("id", ids)
      : { data: [] as { id: string; nome: string | null; email: string | null }[] };
    const byId = new Map((perfis ?? []).map((p) => [p.id, p]));

    const termo = data.busca?.trim().toLowerCase();

    return (rows ?? [])
      .map((row) => ({
        ...row,
        pessoaNome: row.people?.nome ?? "—",
        empreendimentoNome: row.empreendimentos?.nome ?? null,
        responsavelNome: row.responsavel_id
          ? (byId.get(row.responsavel_id)?.nome ?? byId.get(row.responsavel_id)?.email ?? "—")
          : null,
      }))
      .filter((row) =>
        termo
          ? row.pessoaNome.toLowerCase().includes(termo) ||
            (row.titulo ?? "").toLowerCase().includes(termo)
          : true,
      );
  });

export const createOpportunity = createServerFn({ method: "POST" })
  .middleware([instrumented("sales", "criar_oportunidade")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        personId: z.string().uuid(),
        titulo: z.string().trim().max(160).optional().or(z.literal("")),
        origem: z.enum(LEAD_ORIGENS).default("outro"),
        temperatura: z.enum(LEAD_TEMPERATURAS).default("frio"),
        empreendimentoId: z.string().uuid().nullish(),
        unidadeId: z.string().uuid().nullish(),
        valor: z.number().nonnegative().max(1e11).nullish(),
        proximaAcao: z.string().trim().max(160).optional().or(z.literal("")),
        proximaAcaoEm: z.string().trim().max(40).optional().or(z.literal("")),
        responsavelId: z.string().uuid().nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: contatos } = await supabase
      .from("person_contacts")
      .select("canal")
      .eq("person_id", data.personId)
      .eq("workspace_id", data.workspaceId);

    const score = calcularScore({
      origem: data.origem,
      temperatura: data.temperatura,
      temTelefone: (contatos ?? []).some((c) => c.canal === "telefone" || c.canal === "whatsapp"),
      temEmail: (contatos ?? []).some((c) => c.canal === "email"),
      temEmpreendimento: Boolean(data.empreendimentoId),
      valorEstimado: data.valor,
    });

    const { data: row, error } = await supabase
      .from("opportunities")
      .insert({
        workspace_id: data.workspaceId,
        person_id: data.personId,
        titulo: data.titulo || null,
        origem: data.origem,
        temperatura: temperaturaPorScore(score),
        score,
        probabilidade: probabilidadePadrao.novo,
        empreendimento_id: data.empreendimentoId ?? null,
        unidade_id: data.unidadeId ?? null,
        valor: data.valor ?? null,
        proxima_acao: data.proximaAcao || null,
        proxima_acao_em: data.proximaAcaoEm || null,
        responsavel_id: data.responsavelId ?? userId,
        criado_por: userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[createOpportunity]", error.message);
      throw new Error("Não foi possível criar a oportunidade.");
    }

    await supabase.from("activities").insert({
      workspace_id: data.workspaceId,
      person_id: data.personId,
      opportunity_id: row.id,
      tipo: "sistema",
      titulo: "Oportunidade criada",
      descricao: data.titulo || null,
      autor_id: userId,
    });

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "opportunity.created",
      entity: "opportunity",
      entityId: row.id,
      metadata: { personId: data.personId },
    });

    return row;
  });

export const moveOpportunityStage = createServerFn({ method: "POST" })
  .middleware([instrumented("sales", "mover_etapa")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        opportunityId: z.string().uuid(),
        estagio,
        motivo: z.string().trim().max(400).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.estagio === "perdido" && !data.motivo)
      throw new Error("Informe o motivo da perda.");

    const { data: atual, error: readErr } = await supabase
      .from("opportunities")
      .select("id, person_id, estagio")
      .eq("id", data.opportunityId)
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();

    if (readErr || !atual) throw new Error("Oportunidade não encontrada.");

    const desfecho = data.estagio === "fechado" || data.estagio === "perdido";

    const { error } = await supabase
      .from("opportunities")
      .update({
        estagio: data.estagio,
        probabilidade: probabilidadePadrao[data.estagio],
        perdido_motivo: data.estagio === "perdido" ? (data.motivo ?? null) : null,
        fechado_em: desfecho ? new Date().toISOString() : null,
      })
      .eq("id", data.opportunityId)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[moveOpportunityStage]", error.message);
      throw new Error("Não foi possível mover a oportunidade.");
    }

    await supabase.from("activities").insert({
      workspace_id: data.workspaceId,
      person_id: atual.person_id,
      opportunity_id: atual.id,
      tipo: "sistema",
      titulo: `Estágio: ${atual.estagio} → ${data.estagio}`,
      descricao: data.motivo || null,
      autor_id: userId,
    });

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "opportunity.stage_changed",
      entity: "opportunity",
      entityId: atual.id,
      metadata: { de: atual.estagio, para: data.estagio },
    });

    return { ok: true };
  });

export const updateOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        opportunityId: z.string().uuid(),
        titulo: z.string().trim().max(160).optional().or(z.literal("")),
        valor: z.number().nonnegative().max(1e11).nullish(),
        probabilidade: z.number().int().min(0).max(100).optional(),
        temperatura: z.enum(LEAD_TEMPERATURAS).optional(),
        empreendimentoId: z.string().uuid().nullish(),
        proximaAcao: z.string().trim().max(160).optional().or(z.literal("")),
        proximaAcaoEm: z.string().trim().max(40).optional().or(z.literal("")),
        responsavelId: z.string().uuid().nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error } = await supabase
      .from("opportunities")
      .update({
        ...(data.titulo !== undefined ? { titulo: data.titulo || null } : {}),
        ...(data.valor !== undefined ? { valor: data.valor ?? null } : {}),
        ...(data.probabilidade !== undefined ? { probabilidade: data.probabilidade } : {}),
        ...(data.temperatura !== undefined ? { temperatura: data.temperatura } : {}),
        ...(data.empreendimentoId !== undefined
          ? { empreendimento_id: data.empreendimentoId ?? null }
          : {}),
        ...(data.proximaAcao !== undefined ? { proxima_acao: data.proximaAcao || null } : {}),
        ...(data.proximaAcaoEm !== undefined ? { proxima_acao_em: data.proximaAcaoEm || null } : {}),
        ...(data.responsavelId !== undefined ? { responsavel_id: data.responsavelId } : {}),
      })
      .eq("id", data.opportunityId)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[updateOpportunity]", error.message);
      throw new Error("Não foi possível salvar a oportunidade.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "opportunity.updated",
      entity: "opportunity",
      entityId: data.opportunityId,
    });

    return { ok: true };
  });
