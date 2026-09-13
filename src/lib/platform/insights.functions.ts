import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import { num } from "@/lib/platform/insights";

/**
 * SPRINT 10 — Query Layer do Decision Center (InsightsService).
 *
 * Único caminho de leitura dos Read Models. As views materializadas não
 * aceitam RLS, então estão fora da API: cada função aqui chama a `read_*_360`
 * correspondente, que valida vínculo e papel antes de devolver linhas.
 */

export const getCustomer360 = createServerFn({ method: "GET" })
  .middleware([instrumented("people", "customer_360")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        personId: z.string().uuid().nullable().default(null),
        limite: z.number().int().min(1).max(200).default(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("read_customer_360", {
      _workspace_id: data.workspaceId,
      _person_id: data.personId ?? undefined,
      _limit: data.limite,
    });

    if (error) {
      console.error("[getCustomer360]", error.message);
      throw new Error("Não foi possível carregar o painel de clientes.");
    }

    return (rows ?? []).map((r) => ({
      personId: r.person_id!,
      nome: r.nome ?? "—",
      tipo: r.tipo,
      estagioJornada: r.estagio_jornada,
      origem: r.origem,
      responsavelId: r.responsavel_id,
      score: r.score ?? 0,
      temperatura: r.temperatura,
      oportunidadesTotal: r.oportunidades_total ?? 0,
      oportunidadesAbertas: r.oportunidades_abertas ?? 0,
      oportunidadesGanhas: r.oportunidades_ganhas ?? 0,
      oportunidadesPerdidas: r.oportunidades_perdidas ?? 0,
      valorPipeline: num(r.valor_pipeline) ?? 0,
      valorGanho: num(r.valor_ganho) ?? 0,
      proximaAcaoEm: r.proxima_acao_em,
      ultimaInteracaoEm: r.ultima_interacao_em,
      diasSemContato: r.dias_sem_contato,
      atividadesTotal: r.atividades_total ?? 0,
      tarefasPendentes: r.tarefas_pendentes ?? 0,
      tarefasAtrasadas: r.tarefas_atrasadas ?? 0,
      visitasTotal: r.visitas_total ?? 0,
      visitasRealizadas: r.visitas_realizadas ?? 0,
      propostasTotal: r.propostas_total ?? 0,
      propostasAbertas: r.propostas_abertas ?? 0,
      propostasAceitas: r.propostas_aceitas ?? 0,
      documentosTotal: r.documentos_total ?? 0,
      relacionamentosTotal: r.relacionamentos_total ?? 0,
      temQualificacao: r.tem_qualificacao ?? false,
      rendaMensal: num(r.renda_mensal),
      entradaDisponivel: num(r.entrada_disponivel),
      precoTeto: num(r.preco_teto),
      perfil: r.perfil,
      restricaoCredito: r.restricao_credito ?? false,
    }));
  });

export const getProperty360 = createServerFn({ method: "GET" })
  .middleware([instrumented("property", "property_360")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        empreendimentoId: z.string().uuid().nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("read_property_360", {
      _workspace_id: data.workspaceId,
      _empreendimento_id: data.empreendimentoId ?? undefined,
    });

    if (error) {
      console.error("[getProperty360]", error.message);
      throw new Error("Não foi possível carregar o painel de imóveis.");
    }

    return (rows ?? []).map((r) => ({
      empreendimentoId: r.empreendimento_id!,
      nome: r.nome ?? "—",
      status: r.status,
      segmento: r.segmento,
      cidade: r.cidade,
      uf: r.uf,
      entregaPrevista: r.entrega_prevista,
      unidadesTotal: r.unidades_total ?? 0,
      unidadesDisponiveis: r.unidades_disponiveis ?? 0,
      unidadesReservadas: r.unidades_reservadas ?? 0,
      unidadesVendidas: r.unidades_vendidas ?? 0,
      precoMedio: num(r.preco_medio),
      comissaoMedia: num(r.comissao_media),
      scoreLiquidezMedio: num(r.score_liquidez_medio),
      vendas30d: r.vendas_30d ?? 0,
      vendas90d: r.vendas_90d ?? 0,
      receitaAssinada: num(r.receita_assinada) ?? 0,
      reservasAtivas: r.reservas_ativas ?? 0,
      visitas30d: r.visitas_30d ?? 0,
      visitasRealizadas: r.visitas_realizadas ?? 0,
      notaMedia: num(r.nota_media),
      oportunidadesAbertas: r.oportunidades_abertas ?? 0,
      valorPipeline: num(r.valor_pipeline) ?? 0,
      perfilPredominante: r.perfil_predominante,
      estoqueMeses: num(r.estoque_meses),
      velocidadeMensal: num(r.velocidade_mensal) ?? 0,
      giroPercentual: num(r.giro_percentual) ?? 0,
      conversaoPercentual: num(r.conversao_percentual) ?? 0,
    }));
  });

export const getSales360 = createServerFn({ method: "GET" })
  .middleware([instrumented("sales", "sales_360")])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("read_sales_360", {
      _workspace_id: data.workspaceId,
    });

    if (error) {
      console.error("[getSales360]", error.message);
      throw new Error("Não foi possível carregar o painel de vendas.");
    }

    return (rows ?? []).map((r) => ({
      responsavelId: r.responsavel_id!,
      responsavelNome: r.responsavel_nome ?? "Sem responsável",
      oportunidadesTotal: r.oportunidades_total ?? 0,
      oportunidadesAbertas: r.oportunidades_abertas ?? 0,
      ganhasTotal: r.ganhas_total ?? 0,
      ganhas30d: r.ganhas_30d ?? 0,
      perdidas30d: r.perdidas_30d ?? 0,
      valorPipeline: num(r.valor_pipeline) ?? 0,
      valorPonderado: num(r.valor_ponderado) ?? 0,
      valorGanho: num(r.valor_ganho) ?? 0,
      followupPerdido: r.followup_perdido ?? 0,
      semProximaAcao: r.sem_proxima_acao ?? 0,
      slaEstourado: r.sla_estourado ?? 0,
      tempoMedioGanhoDias: num(r.tempo_medio_ganho_dias),
      tempoMedioEtapaDias: num(r.tempo_medio_etapa_dias),
      conversaoPercentual: num(r.conversao_percentual) ?? 0,
      ticketMedio: num(r.ticket_medio),
      tarefasPendentes: r.tarefas_pendentes ?? 0,
      tarefasAtrasadas: r.tarefas_atrasadas ?? 0,
      visitas30d: r.visitas_30d ?? 0,
      ultimaAtividadeEm: r.ultima_atividade_em,
      atividades7d: r.atividades_7d ?? 0,
      diasSemAtividade: r.dias_sem_atividade,
    }));
  });

export const getExecutive360 = createServerFn({ method: "GET" })
  .middleware([instrumented("observability", "executive_360")])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("read_executive_360", {
      _workspace_id: data.workspaceId,
    });

    if (error) {
      console.error("[getExecutive360]", error.message);
      throw new Error("Não foi possível carregar o painel executivo.");
    }

    const r = (rows ?? [])[0];
    if (!r) return null;

    return {
      oportunidadesTotal: r.oportunidades_total ?? 0,
      oportunidadesAbertas: r.oportunidades_abertas ?? 0,
      ganhasTotal: r.ganhas_total ?? 0,
      ganhasMes: r.ganhas_mes ?? 0,
      perdidasTotal: r.perdidas_total ?? 0,
      novas30d: r.novas_30d ?? 0,
      pipelineTotal: num(r.pipeline_total) ?? 0,
      receitaPrevista: num(r.receita_prevista) ?? 0,
      valorGanho: num(r.valor_ganho) ?? 0,
      valorGanhoMes: num(r.valor_ganho_mes) ?? 0,
      tempoMedioCicloDias: num(r.tempo_medio_ciclo_dias) ?? 0,
      receitaRealizada: num(r.receita_realizada) ?? 0,
      receitaRealizadaMes: num(r.receita_realizada_mes) ?? 0,
      receitaEmAssinatura: num(r.receita_em_assinatura) ?? 0,
      comissaoRealizada: num(r.comissao_realizada) ?? 0,
      vendasAssinadas: r.vendas_assinadas ?? 0,
      vendasCanceladas: r.vendas_canceladas ?? 0,
      pessoasTotal: r.pessoas_total ?? 0,
      pessoas30d: r.pessoas_30d ?? 0,
      clientesTotal: r.clientes_total ?? 0,
      unidadesTotal: r.unidades_total ?? 0,
      unidadesDisponiveis: r.unidades_disponiveis ?? 0,
      vgvDisponivel: num(r.vgv_disponivel) ?? 0,
      conversaoPercentual: num(r.conversao_percentual) ?? 0,
      ticketMedio: num(r.ticket_medio),
    };
  });

export const getMarketing360 = createServerFn({ method: "GET" })
  .middleware([instrumented("marketing", "marketing_360")])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("read_marketing_360", {
      _workspace_id: data.workspaceId,
    });

    if (error) {
      console.error("[getMarketing360]", error.message);
      throw new Error("Não foi possível carregar o painel de marketing.");
    }

    return (rows ?? []).map((r) => ({
      origem: r.origem ?? "outro",
      pessoasTotal: r.pessoas_total ?? 0,
      pessoas30d: r.pessoas_30d ?? 0,
      oportunidadesTotal: r.oportunidades_total ?? 0,
      oportunidades30d: r.oportunidades_30d ?? 0,
      oportunidadesAbertas: r.oportunidades_abertas ?? 0,
      ganhasTotal: r.ganhas_total ?? 0,
      perdidasTotal: r.perdidas_total ?? 0,
      valorGanho: num(r.valor_ganho) ?? 0,
      valorPipeline: num(r.valor_pipeline) ?? 0,
      landingPages: r.landing_pages ?? 0,
      tempoMedioConversaoDias: num(r.tempo_medio_conversao_dias) ?? 0,
      conversaoPercentual: num(r.conversao_percentual) ?? 0,
      ticketMedio: num(r.ticket_medio),
    }));
  });