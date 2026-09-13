/**
 * SPRINT 23 — PREDICTIVE INTELLIGENCE (contexto Predictive).
 *
 * Camada pura e client-safe. Nenhuma consulta: recebe evidência já lida pela
 * Query Layer (`predictive.functions.ts`) e devolve previsões EXPLICÁVEIS.
 *
 * Princípio do ADR-021 — toda previsão é explicável:
 * nenhum número sai daqui sem `fatores`, `confianca`, `base` e `calculadoEm`.
 * Sem evidência suficiente, a previsão devolve `valor: null` e diz o motivo —
 * nunca zero, nunca estimativa disfarçada de medição.
 */

import type { AdvisorVendedor } from "@/lib/platform/advisor";
import type { AdvisoryEmpreendimento } from "@/lib/platform/advisory";

/* ------------------------------------------------------------------ *
 * Envelope de explicabilidade (ADR-021)
 * ------------------------------------------------------------------ */

export type Direcao = "positivo" | "negativo" | "neutro";

export type Fator = {
  nome: string;
  detalhe: string;
  /** Contribuição em pontos no score/decisão (0 quando apenas contextual). */
  peso: number;
  direcao: Direcao;
};

export type NivelConfianca = "insuficiente" | "indicativa" | "moderada" | "robusta";

export type Previsao<T> = {
  valor: T | null;
  /** 0–100. Nunca inferido do próprio valor previsto: mede a EVIDÊNCIA. */
  confianca: number;
  nivel: NivelConfianca;
  fatores: Fator[];
  /** Origem exata dos dados usados. */
  base: string;
  calculadoEm: string;
  /** Preenchido quando `valor` é null. */
  motivoAusencia?: string;
};

export function nivelDeConfianca(confianca: number): NivelConfianca {
  if (confianca < 30) return "insuficiente";
  if (confianca < 55) return "indicativa";
  if (confianca < 80) return "moderada";
  return "robusta";
}

export const nivelLabels: Record<NivelConfianca, string> = {
  insuficiente: "Insuficiente",
  indicativa: "Indicativa",
  moderada: "Moderada",
  robusta: "Robusta",
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round = (v: number, casas = 0) => {
  const f = 10 ** casas;
  return Math.round(v * f) / f;
};
const n = (v: number) => new Intl.NumberFormat("pt-BR").format(round(v, 1));

function previsao<T>(
  valor: T | null,
  confianca: number,
  fatores: Fator[],
  base: string,
  calculadoEm: string,
  motivoAusencia?: string,
): Previsao<T> {
  const c = clamp(round(confianca), 0, 100);
  return {
    valor,
    confianca: c,
    nivel: nivelDeConfianca(c),
    fatores,
    base,
    calculadoEm,
    ...(valor == null && motivoAusencia ? { motivoAusencia } : {}),
  };
}

/* ------------------------------------------------------------------ *
 * GATE 01 — Opportunity Score
 * ------------------------------------------------------------------ */

/** Fatos observáveis de UMA oportunidade (RPC `read_opportunity_signals`). */
export type OpportunitySignal = {
  opportunityId: string;
  titulo: string;
  personId: string | null;
  personNome: string;
  responsavelId: string | null;
  responsavelNome: string;
  empreendimentoId: string | null;
  empreendimentoNome: string | null;
  estagio: string;
  stageNome: string | null;
  stageProbabilidade: number | null;
  slaHoras: number | null;
  valor: number | null;
  diasNaEtapa: number;
  diasDesdeCriacao: number;
  interacoes30d: number;
  diasSemInteracao: number | null;
  visitasRealizadas: number;
  propostas: number;
  propostasEnviadas: number;
  tarefasAtrasadas: number;
  temProximaAcao: boolean;
  /** Conversão histórica medida da etapa (%) — null quando amostra insuficiente. */
  stageConversao: number | null;
  stageAmostra: number;
  /** Velocidade de venda mensal medida do empreendimento (property_360). */
  empreendimentoVelocidade: number | null;
};

export type Faixa = "alta" | "media" | "baixa";

export const faixaLabels: Record<Faixa, string> = {
  alta: "Alta probabilidade",
  media: "Probabilidade média",
  baixa: "Baixa probabilidade",
};

export type OpportunityScore = {
  opportunityId: string;
  titulo: string;
  personNome: string;
  responsavelNome: string;
  empreendimentoNome: string | null;
  valor: number | null;
  score: number;
  faixa: Faixa;
  previsao: Previsao<number>;
};

export const slaDias = (slaHoras: number | null): number | null =>
  slaHoras == null || slaHoras <= 0 ? null : slaHoras / 24;

/**
 * Score 0–100 de probabilidade de avanço. Parte da conversão MEDIDA da etapa
 * (ou, na falta de amostra, da probabilidade configurada) e ajusta por sinais
 * observados. Cada ajuste vira um fator no envelope.
 */
export function pontuarOportunidade(sinal: OpportunitySignal): OpportunityScore {
  const calculadoEm = new Date().toISOString();
  const fatores: Fator[] = [];

  const baseMedida = sinal.stageConversao != null && sinal.stageAmostra >= 20;
  const base = baseMedida
    ? sinal.stageConversao!
    : (sinal.stageProbabilidade ?? 30);
  fatores.push({
    nome: baseMedida ? "Conversão histórica da etapa" : "Probabilidade configurada da etapa",
    detalhe: baseMedida
      ? `${sinal.stageNome ?? sinal.estagio}: ${n(sinal.stageConversao!)}% em ${n(sinal.stageAmostra)} oportunidades fechadas.`
      : `${sinal.stageNome ?? sinal.estagio}: ${n(base)}% configurado (amostra histórica de ${n(sinal.stageAmostra)} — insuficiente para medir).`,
    peso: round(base),
    direcao: "neutro",
  });

  let score = base;
  const aplicar = (peso: number, nome: string, detalhe: string) => {
    score += peso;
    fatores.push({
      nome,
      detalhe,
      peso,
      direcao: peso > 0 ? "positivo" : peso < 0 ? "negativo" : "neutro",
    });
  };

  if (sinal.propostasEnviadas > 0) {
    aplicar(14, "Proposta enviada", `${n(sinal.propostasEnviadas)} proposta(s) enviada(s) ao cliente.`);
  } else if (sinal.propostas > 0) {
    aplicar(6, "Proposta em elaboração", `${n(sinal.propostas)} proposta(s) registrada(s), nenhuma enviada.`);
  }

  if (sinal.visitasRealizadas > 0) {
    aplicar(10, "Visita realizada", `${n(sinal.visitasRealizadas)} visita(s) com presença confirmada.`);
  }

  if (sinal.interacoes30d >= 3) {
    aplicar(8, "Cliente engajado", `${n(sinal.interacoes30d)} interações nos últimos 30 dias.`);
  } else if (sinal.interacoes30d === 0) {
    aplicar(-12, "Sem interação medida", "Nenhuma interação registrada nos últimos 30 dias.");
  }

  if (sinal.diasSemInteracao != null) {
    if (sinal.diasSemInteracao > 14) {
      aplicar(-15, "Contato frio", `${n(sinal.diasSemInteracao)} dias sem contato registrado.`);
    } else if (sinal.diasSemInteracao > 7) {
      aplicar(-8, "Contato esfriando", `${n(sinal.diasSemInteracao)} dias sem contato registrado.`);
    }
  }

  const sla = slaDias(sinal.slaHoras);
  if (sla != null && sinal.diasNaEtapa > sla) {
    aplicar(
      -12,
      "SLA da etapa estourado",
      `${n(sinal.diasNaEtapa)} dias na etapa contra SLA de ${n(sla)} dia(s).`,
    );
  }

  if (sinal.tarefasAtrasadas > 0) {
    aplicar(-6, "Tarefas atrasadas", `${n(sinal.tarefasAtrasadas)} tarefa(s) vencida(s).`);
  }

  if (!sinal.temProximaAcao) {
    aplicar(-5, "Sem próxima ação", "A oportunidade não tem próxima ação agendada.");
  }

  if (sinal.empreendimentoVelocidade != null && sinal.empreendimentoVelocidade > 0) {
    aplicar(
      5,
      "Empreendimento com giro",
      `${sinal.empreendimentoNome ?? "Empreendimento"} vende ${n(sinal.empreendimentoVelocidade)} unidade(s)/mês.`,
    );
  }

  score = clamp(round(score), 0, 100);

  // Confiança mede EVIDÊNCIA, não o score: amostra da etapa + rastros do funil.
  let confianca = baseMedida ? 55 : 25;
  if (sinal.interacoes30d > 0) confianca += 10;
  if (sinal.visitasRealizadas > 0) confianca += 10;
  if (sinal.propostas > 0) confianca += 10;
  if (sinal.diasSemInteracao != null) confianca += 5;
  if (sinal.diasDesdeCriacao < 2) confianca -= 15;

  const faixa: Faixa = score >= 70 ? "alta" : score >= 45 ? "media" : "baixa";

  return {
    opportunityId: sinal.opportunityId,
    titulo: sinal.titulo,
    personNome: sinal.personNome,
    responsavelNome: sinal.responsavelNome,
    empreendimentoNome: sinal.empreendimentoNome,
    valor: sinal.valor,
    score,
    faixa,
    previsao: previsao(
      score,
      confianca,
      fatores,
      "read_opportunity_signals (funil, interações, visitas, propostas, tarefas) + property_360",
      calculadoEm,
    ),
  };
}

/* ------------------------------------------------------------------ *
 * GATE 02 — Risk Detection
 * ------------------------------------------------------------------ */

export type RiscoSeveridade = "atencao" | "critico";

export type Risco = {
  codigo: string;
  escopo: "oportunidade" | "empreendimento" | "corretor";
  alvo: string;
  titulo: string;
  /** Por que o risco existe — sempre com o número que o sustenta. */
  motivo: string;
  severidade: RiscoSeveridade;
  base: string;
};

export function detectarRiscosOportunidade(sinal: OpportunitySignal): Risco[] {
  const riscos: Risco[] = [];
  const alvo = sinal.titulo || sinal.personNome;
  const base = "read_opportunity_signals";

  if (sinal.interacoes30d === 0) {
    riscos.push({
      codigo: "cliente_sem_contato",
      escopo: "oportunidade",
      alvo,
      titulo: "Cliente sem contato recente",
      motivo: `Nenhuma interação nos últimos 30 dias, com ${n(sinal.diasDesdeCriacao)} dias de oportunidade aberta.`,
      severidade: "critico",
      base,
    });
  } else if (sinal.diasSemInteracao != null && sinal.diasSemInteracao > 14) {
    riscos.push({
      codigo: "oportunidade_esfriando",
      escopo: "oportunidade",
      alvo,
      titulo: "Oportunidade esfriando",
      motivo: `${n(sinal.diasSemInteracao)} dias sem contato registrado após ${n(sinal.interacoes30d)} interação(ões) no período.`,
      severidade: "atencao",
      base,
    });
  }

  const sla = slaDias(sinal.slaHoras);
  if (sla != null && sinal.diasNaEtapa > sla) {
    riscos.push({
      codigo: "sla_etapa_estourado",
      escopo: "oportunidade",
      alvo,
      titulo: "Etapa acima do SLA",
      motivo: `${n(sinal.diasNaEtapa)} dias em "${sinal.stageNome ?? sinal.estagio}" contra SLA de ${n(sla)} dia(s).`,
      severidade: sinal.diasNaEtapa > sla * 2 ? "critico" : "atencao",
      base,
    });
  }

  if (sinal.propostasEnviadas > 0 && sinal.diasSemInteracao != null && sinal.diasSemInteracao > 7) {
    riscos.push({
      codigo: "proposta_sem_resposta",
      escopo: "oportunidade",
      alvo,
      titulo: "Proposta enviada sem retorno",
      motivo: `${n(sinal.propostasEnviadas)} proposta(s) enviada(s) e ${n(sinal.diasSemInteracao)} dias sem interação.`,
      severidade: "critico",
      base,
    });
  }

  return riscos;
}

export function detectarRiscosEmpreendimento(emp: AdvisoryEmpreendimento): Risco[] {
  const riscos: Risco[] = [];
  const base = "property_360";

  if (emp.vendas90d === 0 && emp.oportunidadesAbertas > 0) {
    riscos.push({
      codigo: "empreendimento_sem_venda",
      escopo: "empreendimento",
      alvo: emp.nome,
      titulo: "Empreendimento sem venda em 90 dias",
      motivo: `${n(emp.oportunidadesAbertas)} oportunidade(s) aberta(s) e zero venda em 90 dias.`,
      severidade: "critico",
      base,
    });
  } else if (emp.vendas90d >= 3 && emp.vendas30d === 0) {
    riscos.push({
      codigo: "empreendimento_perdendo_tracao",
      escopo: "empreendimento",
      alvo: emp.nome,
      titulo: "Empreendimento perdendo tração",
      motivo: `${n(emp.vendas90d)} venda(s) em 90 dias, nenhuma nos últimos 30.`,
      severidade: "atencao",
      base,
    });
  }

  if (emp.estoqueMeses != null && emp.estoqueMeses > 24 && emp.unidadesDisponiveis > 0) {
    riscos.push({
      codigo: "estoque_encalhado",
      escopo: "empreendimento",
      alvo: emp.nome,
      titulo: "Estoque encalhado",
      motivo: `${n(emp.unidadesDisponiveis)} unidade(s) disponível(is) e ${n(emp.estoqueMeses)} meses de estoque no ritmo atual.`,
      severidade: "atencao",
      base,
    });
  }

  return riscos;
}

export function detectarRiscosCorretor(v: AdvisorVendedor): Risco[] {
  const riscos: Risco[] = [];
  const base = "sales_360";

  if (v.diasSemAtividade != null && v.diasSemAtividade >= 7 && v.oportunidadesAbertas > 0) {
    riscos.push({
      codigo: "corretor_inativo",
      escopo: "corretor",
      alvo: v.responsavelNome,
      titulo: "Queda de produtividade",
      motivo: `${n(v.diasSemAtividade)} dias sem atividade com ${n(v.oportunidadesAbertas)} oportunidade(s) aberta(s).`,
      severidade: v.diasSemAtividade >= 14 ? "critico" : "atencao",
      base,
    });
  }

  if (v.followupPerdido > 0) {
    riscos.push({
      codigo: "followup_perdido",
      escopo: "corretor",
      alvo: v.responsavelNome,
      titulo: "Follow-up perdido",
      motivo: `${n(v.followupPerdido)} oportunidade(s) com próxima ação vencida e ${n(v.tarefasAtrasadas)} tarefa(s) atrasada(s).`,
      severidade: "atencao",
      base,
    });
  }

  return riscos;
}

export const ordenarRiscos = (riscos: readonly Risco[]): Risco[] =>
  [...riscos].sort((a, b) =>
    a.severidade === b.severidade ? a.alvo.localeCompare(b.alvo) : a.severidade === "critico" ? -1 : 1,
  );

/* ------------------------------------------------------------------ *
 * GATE 03 — Next Best Action
 * ------------------------------------------------------------------ */

export type NextBestAction = {
  opportunityId: string;
  cliente: string;
  acao: string;
  responsavelNome: string;
  previsao: Previsao<string>;
};

/**
 * Próxima melhor ação: primeira regra satisfeita sobre o funil observado.
 * Determinística de propósito — o corretor precisa saber POR QUE.
 */
export function proximaMelhorAcao(sinal: OpportunitySignal, score: OpportunityScore): NextBestAction {
  const calculadoEm = new Date().toISOString();
  const fatores: Fator[] = [
    {
      nome: "Opportunity Score",
      detalhe: `Score ${n(score.score)} (${faixaLabels[score.faixa]}).`,
      peso: score.score,
      direcao: "neutro",
    },
  ];

  const empurrar = (nome: string, detalhe: string, direcao: Direcao = "neutro") =>
    fatores.push({ nome, detalhe, peso: 0, direcao });

  let acao: string;
  if (sinal.interacoes30d === 0) {
    acao = "Retomar contato";
    empurrar("Sem interação", "Zero interação nos últimos 30 dias.", "negativo");
  } else if (sinal.propostasEnviadas > 0 && (sinal.diasSemInteracao ?? 0) > 3) {
    acao = "Cobrar retorno da proposta";
    empurrar(
      "Proposta parada",
      `${n(sinal.propostasEnviadas)} enviada(s), ${n(sinal.diasSemInteracao ?? 0)} dias sem retorno.`,
      "negativo",
    );
  } else if (sinal.propostas > 0 && sinal.propostasEnviadas === 0) {
    acao = "Enviar a proposta ao cliente";
    empurrar("Proposta em rascunho", `${n(sinal.propostas)} proposta(s) sem envio.`, "negativo");
  } else if (sinal.visitasRealizadas === 0) {
    acao = "Agendar visita";
    empurrar(
      "Sem visita realizada",
      `${n(sinal.interacoes30d)} interação(ões) em 30 dias e nenhuma visita com presença.`,
      "positivo",
    );
  } else if (sinal.propostas === 0) {
    acao = "Emitir proposta";
    empurrar(
      "Visita sem proposta",
      `${n(sinal.visitasRealizadas)} visita(s) realizada(s) e nenhuma proposta.`,
      "positivo",
    );
  } else if (!sinal.temProximaAcao) {
    acao = "Definir próxima ação";
    empurrar("Sem próxima ação", "Nenhuma próxima ação agendada.", "negativo");
  } else {
    acao = "Avançar etapa ou registrar bloqueio";
    empurrar(
      "Etapa parada",
      `${n(sinal.diasNaEtapa)} dias em "${sinal.stageNome ?? sinal.estagio}".`,
      "neutro",
    );
  }

  const sla = slaDias(sinal.slaHoras);
  if (sla != null && sinal.diasNaEtapa > sla) {
    empurrar("SLA estourado", `${n(sinal.diasNaEtapa)} dias contra SLA de ${n(sla)} dia(s).`, "negativo");
  }

  // A confiança da ação herda a evidência do score e sobe quando o gatilho
  // é um fato duro (proposta/visita) em vez de ausência de registro.
  const gatilhoDuro = sinal.propostas > 0 || sinal.visitasRealizadas > 0;
  const confianca = clamp(score.previsao.confianca + (gatilhoDuro ? 12 : -5), 0, 100);

  return {
    opportunityId: sinal.opportunityId,
    cliente: sinal.personNome,
    acao,
    responsavelNome: sinal.responsavelNome,
    previsao: previsao(
      acao,
      confianca,
      fatores,
      "read_opportunity_signals + Opportunity Score (GATE 01)",
      calculadoEm,
    ),
  };
}

/* ------------------------------------------------------------------ *
 * GATE 04 — Forecast
 * ------------------------------------------------------------------ */

/** Base observada do mês/trimestre (RPC `read_forecast_base`). */
export type ForecastBase = {
  ganhasMes: number;
  valorGanhoMes: number;
  ganhas90d: number;
  criadas90d: number;
  diasNoMes: number;
  diasDecorridos: number;
  oportunidadesAbertas: number;
  pipelineTotal: number;
  ticketMedio: number | null;
  cicloMedioDias: number | null;
};

export type Intervalo = { esperado: number; min: number; max: number };

export type Forecast = {
  vendasMes: Previsao<Intervalo>;
  receitaMes: Previsao<Intervalo>;
  conversao: Previsao<Intervalo>;
  gargalo: Previsao<string>;
};

/** Intervalo de Wilson (95%) para proporção — honesto com amostra pequena. */
export function wilson(sucessos: number, total: number): Intervalo | null {
  if (total <= 0) return null;
  const z = 1.96;
  const p = sucessos / total;
  const d = 1 + (z * z) / total;
  const centro = (p + (z * z) / (2 * total)) / d;
  const margem = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / d;
  return {
    esperado: round(p * 100, 1),
    min: round(Math.max(0, centro - margem) * 100, 1),
    max: round(Math.min(1, centro + margem) * 100, 1),
  };
}

/** Run-rate com intervalo de Poisson (95%) sobre a contagem já realizada. */
export function runRate(realizado: number, diasDecorridos: number, diasNoMes: number): Intervalo | null {
  if (diasDecorridos <= 0) return null;
  const projecao = (realizado / diasDecorridos) * diasNoMes;
  const margem = 1.96 * Math.sqrt(Math.max(realizado, 1)) * (diasNoMes / diasDecorridos - 1);
  return {
    esperado: round(projecao, 1),
    min: round(Math.max(realizado, projecao - margem), 1),
    max: round(projecao + margem, 1),
  };
}

export function projetarForecast(
  base: ForecastBase,
  riscos: readonly Risco[] = [],
  agora: Date = new Date(),
): Forecast {
  const calculadoEm = agora.toISOString();
  const janela = `read_forecast_base — ${base.diasDecorridos} de ${base.diasNoMes} dias do mês, 90 dias de histórico`;

  const vendas = runRate(base.ganhasMes, base.diasDecorridos, base.diasNoMes);
  const confiancaVendas =
    base.ganhasMes === 0 ? 20 : clamp(30 + base.ganhasMes * 8 + base.diasDecorridos, 0, 90);

  const vendasMes = previsao(
    vendas,
    confiancaVendas,
    [
      {
        nome: "Realizado no mês",
        detalhe: `${n(base.ganhasMes)} venda(s) em ${n(base.diasDecorridos)} dia(s) corridos.`,
        peso: base.ganhasMes,
        direcao: "neutro",
      },
      {
        nome: "Ritmo diário medido",
        detalhe: `${n(base.ganhasMes / Math.max(1, base.diasDecorridos))} venda(s)/dia projetadas sobre ${n(base.diasNoMes)} dias.`,
        peso: 0,
        direcao: "neutro",
      },
      {
        nome: "Pipeline aberto",
        detalhe: `${n(base.oportunidadesAbertas)} oportunidade(s) aberta(s) sustentando o mês.`,
        peso: 0,
        direcao: base.oportunidadesAbertas > 0 ? "positivo" : "negativo",
      },
    ],
    janela,
    calculadoEm,
    vendas == null ? "Mês sem dias corridos suficientes para projetar." : undefined,
  );

  const receita =
    vendas == null || base.ticketMedio == null
      ? null
      : {
          esperado: round(vendas.esperado * base.ticketMedio),
          min: round(vendas.min * base.ticketMedio),
          max: round(vendas.max * base.ticketMedio),
        };
  const receitaMes = previsao(
    receita,
    receita == null ? 0 : clamp(confiancaVendas - 10, 0, 85),
    [
      {
        nome: "Ticket médio medido",
        detalhe:
          base.ticketMedio == null
            ? "Nenhuma venda ganha para medir ticket médio."
            : `${n(base.ticketMedio)} por venda ganha.`,
        peso: 0,
        direcao: "neutro",
      },
      {
        nome: "Vendas projetadas",
        detalhe: vendas == null ? "Sem projeção de vendas." : `${n(vendas.esperado)} venda(s) no mês.`,
        peso: 0,
        direcao: "neutro",
      },
    ],
    janela,
    calculadoEm,
    receita == null ? "Sem ticket médio medido: receita não é projetável." : undefined,
  );

  const conv = wilson(base.ganhas90d, base.criadas90d);
  const conversao = previsao(
    conv,
    conv == null ? 0 : clamp(20 + base.criadas90d * 1.5, 0, 92),
    [
      {
        nome: "Amostra de 90 dias",
        detalhe: `${n(base.ganhas90d)} ganha(s) em ${n(base.criadas90d)} oportunidade(s) criada(s).`,
        peso: base.criadas90d,
        direcao: "neutro",
      },
      {
        nome: "Intervalo de Wilson 95%",
        detalhe: conv == null ? "Sem amostra." : `Entre ${n(conv.min)}% e ${n(conv.max)}%.`,
        peso: 0,
        direcao: "neutro",
      },
    ],
    janela,
    calculadoEm,
    conv == null ? "Nenhuma oportunidade criada nos últimos 90 dias." : undefined,
  );

  const criticos = riscos.filter((r) => r.severidade === "critico");
  const contagem = new Map<string, number>();
  for (const r of criticos) contagem.set(r.titulo, (contagem.get(r.titulo) ?? 0) + 1);
  const top = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0];

  const gargalo = previsao(
    top ? top[0] : null,
    top ? clamp(30 + top[1] * 10, 0, 85) : 0,
    top
      ? [
          {
            nome: "Riscos críticos recorrentes",
            detalhe: `${n(top[1])} ocorrência(s) de "${top[0]}" entre ${n(criticos.length)} risco(s) crítico(s).`,
            peso: top[1],
            direcao: "negativo",
          },
        ]
      : [],
    "Risk Detection (GATE 02)",
    calculadoEm,
    top ? undefined : "Nenhum risco crítico detectado no período.",
  );

  return { vendasMes, receitaMes, conversao, gargalo };
}

/* ------------------------------------------------------------------ *
 * GATE 05 — Executive Radar
 * ------------------------------------------------------------------ */

export type RadarEmpreendimento = {
  nome: string;
  evidencia: string;
};

export type Radar = {
  criticas: OpportunityScore[];
  acoes: NextBestAction[];
  aceleracao: RadarEmpreendimento[];
  destaques: RadarEmpreendimento[];
  riscos: Risco[];
  forecast: Forecast;
  tendencias: string[];
  geradoEm: string;
};

export type RadarEntrada = {
  sinais: readonly OpportunitySignal[];
  empreendimentos: readonly AdvisoryEmpreendimento[];
  vendedores: readonly AdvisorVendedor[];
  forecastBase: ForecastBase | null;
};

export function montarRadar(entrada: RadarEntrada, agora: Date = new Date()): Radar {
  const scores = entrada.sinais.map(pontuarOportunidade);
  const porId = new Map(scores.map((s) => [s.opportunityId, s]));

  const riscos = ordenarRiscos([
    ...entrada.sinais.flatMap(detectarRiscosOportunidade),
    ...entrada.empreendimentos.flatMap(detectarRiscosEmpreendimento),
    ...entrada.vendedores.flatMap(detectarRiscosCorretor),
  ]);

  // Críticas = alto valor em risco: score baixo com pipeline relevante.
  const criticas = [...scores]
    .filter((s) => s.score < 45)
    .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0) || a.score - b.score)
    .slice(0, 10);

  const acoes = [...scores]
    .sort((a, b) => b.score - a.score || (b.valor ?? 0) - (a.valor ?? 0))
    .slice(0, 10)
    .map((s) => {
      const sinal = entrada.sinais.find((x) => x.opportunityId === s.opportunityId)!;
      return proximaMelhorAcao(sinal, porId.get(s.opportunityId)!);
    });

  const aceleracao = [...entrada.empreendimentos]
    .filter((e) => e.vendas30d > 0)
    .sort((a, b) => b.vendas30d - a.vendas30d || b.velocidadeMensal - a.velocidadeMensal)
    .slice(0, 5)
    .map((e) => ({
      nome: e.nome,
      evidencia: `${n(e.vendas30d)} venda(s) em 30 dias, ${n(e.visitas30d)} visita(s) e ${n(e.conversaoPercentual)}% de conversão.`,
    }));

  const destaques = [...entrada.vendedores]
    .filter((v) => v.ganhas30d > 0)
    .sort((a, b) => b.ganhas30d - a.ganhas30d || b.conversaoPercentual - a.conversaoPercentual)
    .slice(0, 5)
    .map((v) => ({
      nome: v.responsavelNome,
      evidencia: `${n(v.ganhas30d)} venda(s) em 30 dias e ${n(v.conversaoPercentual)}% de conversão.`,
    }));

  const forecast = projetarForecast(
    entrada.forecastBase ?? {
      ganhasMes: 0,
      valorGanhoMes: 0,
      ganhas90d: 0,
      criadas90d: 0,
      diasNoMes: 30,
      diasDecorridos: 0,
      oportunidadesAbertas: 0,
      pipelineTotal: 0,
      ticketMedio: null,
      cicloMedioDias: null,
    },
    riscos,
    agora,
  );

  const tendencias: string[] = [];
  const altas = scores.filter((s) => s.faixa === "alta").length;
  if (scores.length > 0) {
    tendencias.push(
      `${n(altas)} de ${n(scores.length)} oportunidades pontuadas com alta probabilidade (score 70+).`,
    );
  }
  if (riscos.length > 0) {
    const criticos = riscos.filter((r) => r.severidade === "critico").length;
    tendencias.push(`${n(riscos.length)} risco(s) detectado(s), ${n(criticos)} crítico(s).`);
  }
  if (forecast.vendasMes.valor) {
    tendencias.push(
      `Projeção do mês entre ${n(forecast.vendasMes.valor.min)} e ${n(forecast.vendasMes.valor.max)} venda(s).`,
    );
  }
  if (tendencias.length === 0) {
    tendencias.push("Sem evidência suficiente no período para apontar tendência.");
  }

  return {
    criticas,
    acoes,
    aceleracao,
    destaques,
    riscos: riscos.slice(0, 20),
    forecast,
    tendencias,
    geradoEm: agora.toISOString(),
  };
}