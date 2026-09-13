import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  PERFIS_COMPRA,
  calcularCapacidade,
  calcularOpportunityScore,
  proximaMelhorAcao,
  recomendarUnidades,
  temperaturaPorScore,
  type Qualificacao,
  type SinaisOportunidade,
  type UnidadeCandidata,
} from "@/lib/platform/decision";

/**
 * SPRINT 08 — Decision Engine (leitura derivada).
 *
 * Write Model ≠ Read Model: nada aqui cria entidade nova. Lemos People,
 * Sales e Property e devolvemos DECISÃO já calculada no servidor, sob RLS.
 * A única escrita é a qualificação (entrada do corretor) e o score derivado
 * gravado de volta na oportunidade.
 */

const qualificacaoSchema = z.object({
  workspaceId: z.string().uuid(),
  personId: z.string().uuid(),
  renda_mensal: z.number().nonnegative().nullable().optional(),
  entrada_disponivel: z.number().nonnegative().nullable().optional(),
  usa_fgts: z.boolean().default(false),
  fgts_valor: z.number().nonnegative().nullable().optional(),
  perfil: z.enum(PERFIS_COMPRA).default("moradia"),
  bairros_desejados: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  cidade: z.string().trim().max(80).nullable().optional(),
  uf: z.string().trim().max(2).nullable().optional(),
  dormitorios_min: z.number().int().min(0).max(10).nullable().optional(),
  vagas_min: z.number().int().min(0).max(10).nullable().optional(),
  area_min: z.number().nonnegative().nullable().optional(),
  preco_teto: z.number().nonnegative().nullable().optional(),
  prazo_meses: z.number().int().min(12).max(480).nullable().optional(),
  banco_preferido: z.string().trim().max(80).nullable().optional(),
  restricao_credito: z.boolean().default(false),
  primeiro_imovel: z.boolean().default(true),
  observacao: z.string().trim().max(2000).nullable().optional(),
});

const vazio = (q: Partial<Qualificacao> | null): Qualificacao => ({
  renda_mensal: q?.renda_mensal ?? null,
  entrada_disponivel: q?.entrada_disponivel ?? null,
  usa_fgts: q?.usa_fgts ?? false,
  fgts_valor: q?.fgts_valor ?? null,
  perfil: q?.perfil ?? "moradia",
  bairros_desejados: q?.bairros_desejados ?? [],
  cidade: q?.cidade ?? null,
  uf: q?.uf ?? null,
  dormitorios_min: q?.dormitorios_min ?? null,
  vagas_min: q?.vagas_min ?? null,
  area_min: q?.area_min ?? null,
  preco_teto: q?.preco_teto ?? null,
  prazo_meses: q?.prazo_meses ?? null,
  banco_preferido: q?.banco_preferido ?? null,
  restricao_credito: q?.restricao_credito ?? false,
  primeiro_imovel: q?.primeiro_imovel ?? true,
});

export const saveQualification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => qualificacaoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { workspaceId, personId, ...campos } = data;

    const { error } = await supabase.from("person_qualifications").upsert(
      {
        workspace_id: workspaceId,
        person_id: personId,
        ...campos,
        cidade: campos.cidade || null,
        uf: campos.uf || null,
        banco_preferido: campos.banco_preferido || null,
        observacao: campos.observacao || null,
        atualizado_por: userId,
      },
      { onConflict: "person_id" },
    );

    if (error) {
      console.error("[saveQualification]", error.message);
      throw new Error("Não foi possível salvar a qualificação.");
    }
    return { ok: true };
  });

export const getDecisionPanel = createServerFn({ method: "GET" })
  .middleware([instrumented("observability", "decision_center")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        personId: z.string().uuid(),
        limite: z.number().int().min(1).max(30).default(12),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const desde30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    const [qualRes, oportRes, unidadesRes, atividadesRes, visitasRes, propostasRes, arquivosRes] =
      await Promise.all([
        supabase
          .from("person_qualifications")
          .select("*")
          .eq("person_id", data.personId)
          .eq("workspace_id", data.workspaceId)
          .maybeSingle(),
        supabase
          .from("opportunities")
          .select("id, titulo, estagio, valor, score, temperatura, created_at")
          .eq("person_id", data.personId)
          .eq("workspace_id", data.workspaceId)
          .order("created_at", { ascending: false }),
        supabase
          .from("unidades")
          .select(
            "id, identificador, status, preco, dormitorios, suites, vagas, varanda, andar, area_privativa, comissao_percentual, score_liquidez, campanha, empreendimento_id, empreendimentos(id, nome, cidade, bairro, segmento, status)",
          )
          .eq("workspace_id", data.workspaceId)
          .eq("status", "disponivel")
          .limit(600),
        supabase
          .from("activities")
          .select("id, tipo, ocorreu_em")
          .eq("person_id", data.personId)
          .eq("workspace_id", data.workspaceId)
          .order("ocorreu_em", { ascending: false })
          .limit(200),
        supabase
          .from("visits")
          .select("id, status, opportunity_id")
          .eq("person_id", data.personId)
          .eq("workspace_id", data.workspaceId),
        supabase
          .from("proposals")
          .select("id, status, opportunity_id")
          .eq("person_id", data.personId)
          .eq("workspace_id", data.workspaceId),
        supabase
          .from("files")
          .select("id")
          .eq("entity", "person")
          .eq("entity_id", data.personId)
          .eq("workspace_id", data.workspaceId),
      ]);

    const qualificacaoRow = qualRes.data;
    const qualificacao = vazio(
      qualificacaoRow
        ? {
            ...qualificacaoRow,
            renda_mensal: qualificacaoRow.renda_mensal ? Number(qualificacaoRow.renda_mensal) : null,
            entrada_disponivel: qualificacaoRow.entrada_disponivel
              ? Number(qualificacaoRow.entrada_disponivel)
              : null,
            fgts_valor: qualificacaoRow.fgts_valor ? Number(qualificacaoRow.fgts_valor) : null,
            area_min: qualificacaoRow.area_min ? Number(qualificacaoRow.area_min) : null,
            preco_teto: qualificacaoRow.preco_teto ? Number(qualificacaoRow.preco_teto) : null,
          }
        : null,
    );

    const unidades: UnidadeCandidata[] = (unidadesRes.data ?? []).map((u) => ({
      id: u.id,
      identificador: u.identificador,
      status: u.status,
      preco: u.preco != null ? Number(u.preco) : null,
      dormitorios: u.dormitorios,
      suites: u.suites,
      vagas: u.vagas,
      varanda: u.varanda,
      andar: u.andar,
      area_privativa: u.area_privativa != null ? Number(u.area_privativa) : null,
      comissao_percentual: u.comissao_percentual != null ? Number(u.comissao_percentual) : null,
      score_liquidez: u.score_liquidez,
      campanha: u.campanha,
      empreendimentoId: u.empreendimento_id,
      empreendimentoNome: u.empreendimentos?.nome ?? "—",
      cidade: u.empreendimentos?.cidade ?? null,
      bairro: u.empreendimentos?.bairro ?? null,
      segmento: u.empreendimentos?.segmento ?? null,
      status_obra: u.empreendimentos?.status ?? null,
    }));

    const temQualificacao = Boolean(qualificacaoRow && (qualificacao.renda_mensal || qualificacao.preco_teto));
    const { recomendadas, descartadas } = temQualificacao
      ? recomendarUnidades(qualificacao, unidades, data.limite)
      : { recomendadas: [], descartadas: [] };

    const atividades = atividadesRes.data ?? [];
    const interacoes30d = atividades.filter((a) => a.ocorreu_em >= desde30).length;
    const ultima = atividades[0]?.ocorreu_em;
    const diasSemInteracao = ultima
      ? Math.floor((Date.now() - new Date(ultima).getTime()) / 86_400_000)
      : null;
    const documentosEntregues = (arquivosRes.data ?? []).length;

    const oportunidades = (oportRes.data ?? []).map((o) => {
      const visitas = (visitasRes.data ?? []).filter(
        (v) => v.opportunity_id === o.id && v.status === "realizada",
      ).length;
      const props = (propostasRes.data ?? []).filter((p) => p.opportunity_id === o.id);

      const sinais: SinaisOportunidade = {
        interacoes30d,
        diasSemInteracao,
        visitasRealizadas: visitas,
        propostasEnviadas: props.filter((p) => p.status !== "rascunho").length,
        propostaAceita: props.some((p) => p.status === "aceita"),
        respostaCliente: props.some((p) => p.status === "em_analise" || p.status === "recusada"),
        documentosEntregues,
        qualificacaoCompleta: temQualificacao,
        estagio: o.estagio,
      };

      const { score, fatores } = calcularOpportunityScore(sinais);
      const acoes = proximaMelhorAcao(sinais, {
        temQualificacao,
        unidadesRecomendadas: recomendadas.length,
      });

      return {
        id: o.id,
        titulo: o.titulo,
        estagio: o.estagio,
        valor: o.valor != null ? Number(o.valor) : null,
        scoreAtual: o.score,
        score,
        temperatura: temperaturaPorScore(score),
        fatores,
        acoes,
        sinais,
      };
    });

    return {
      qualificacao,
      temQualificacao,
      observacao: qualificacaoRow?.observacao ?? null,
      atualizadoEm: qualificacaoRow?.updated_at ?? null,
      capacidade: calcularCapacidade(qualificacao),
      recomendadas,
      descartadas,
      totalUnidadesAvaliadas: unidades.length,
      oportunidades,
    };
  });

/** Grava o score derivado de volta na oportunidade (Write Model). */
export const applyOpportunityScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        opportunityId: z.string().uuid(),
        score: z.number().int().min(0).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { error } = await supabase
      .from("opportunities")
      .update({ score: data.score, temperatura: temperaturaPorScore(data.score) })
      .eq("id", data.opportunityId)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[applyOpportunityScore]", error.message);
      throw new Error("Não foi possível atualizar o score.");
    }
    return { ok: true, score: data.score };
  });
