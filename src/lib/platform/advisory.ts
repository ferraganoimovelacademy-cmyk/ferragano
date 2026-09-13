/**
 * SPRINT 22 — ADVISORY (bounded context próprio).
 *
 * Até aqui a plataforma respondia com números. Este módulo é a camada de
 * COMUNICAÇÃO: transforma evidência já auditada em linguagem executiva.
 *
 * Regras do contexto (ADR-020):
 * 1. Nenhuma consulta a tabela transacional. Só Read Models (Sprint 10),
 *    Automation Intelligence (ADR-017), Decision Intelligence (ADR-018) e
 *    Recommendation Memory (ADR-019).
 * 2. Nenhum número inventado: toda frase cita a medida que a sustenta.
 * 3. Ausência de evidência devolve `null` e é dita em voz alta — nunca zero.
 * 4. Lógica pura e client-safe. Sem LLM: o texto é determinístico.
 */

import type { AdvisorSinal, AdvisorSnapshot, AdvisorSeveridade } from "@/lib/platform/advisor";
import {
  saudeDaRegra,
  taxaFalha,
  tempoEconomizadoHoras,
  type AutomationIntelligence,
} from "@/lib/platform/automation-intelligence";
import { automationConfidence } from "@/lib/platform/decision-intelligence";
import {
  precisaoRecomendacoes,
  quadranteLabels,
  type RecomendacaoRankeada,
  type RecommendationQuality,
  type RecommendationRow,
} from "@/lib/platform/recommendation";

/* ------------------------------------------------------------------ *
 * Entrada única do contexto Advisory
 * ------------------------------------------------------------------ */

export type AdvisoryEntrada = {
  snapshot: AdvisorSnapshot;
  sinais: AdvisorSinal[];
  inteligencia: AutomationIntelligence | null;
  recomendacoes: RecomendacaoRankeada[];
  memoria: RecommendationRow[];
  qualidade: RecommendationQuality | null;
  /** Recorte do `property_360` usado só para leitura executiva. */
  empreendimentos: AdvisoryEmpreendimento[];
};

/**
 * Projeção mínima do Read Model `property_360`. O Advisory não recalcula
 * nada de imóvel: consome o que o Property Domain já mediu.
 */
export type AdvisoryEmpreendimento = {
  empreendimentoId: string;
  nome: string;
  vendas30d: number;
  vendas90d: number;
  visitas30d: number;
  oportunidadesAbertas: number;
  unidadesDisponiveis: number;
  conversaoPercentual: number;
  velocidadeMensal: number;
  estoqueMeses: number | null;
};

const n = (v: number) => new Intl.NumberFormat("pt-BR").format(Math.round(v));
const pct = (v: number, casas = 0) =>
  `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(v)}%`;
const h = (v: number) =>
  `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)} h`;

const DIA_MS = 24 * 60 * 60 * 1000;

function dias(de: string, ate: string): number {
  return Math.max(0, (new Date(ate).getTime() - new Date(de).getTime()) / DIA_MS);
}

/* ------------------------------------------------------------------ *
 * GATE 05 — Advisor Confidence
 * ------------------------------------------------------------------ */

export type AdvisorConfidenceNivel = "inicial" | "moderada" | "robusta";

export const advisorConfidenceLabels: Record<AdvisorConfidenceNivel, string> = {
  inicial: "Indicação inicial",
  moderada: "Evidência moderada",
  robusta: "Evidência robusta",
};

export type AdvisorConfidence = {
  /** 0..100. `null` quando não há evidência suficiente para afirmar nada. */
  valor: number | null;
  nivel: AdvisorConfidenceNivel;
  /** Por que a confiança é essa. Sempre preenchido. */
  motivos: string[];
};

/** Confiança mínima para o Advisor falar em tom afirmativo. */
export const CONFIANCA_ROBUSTA = 80;
export const CONFIANCA_MODERADA = 50;

/**
 * GATE 05 — a confiança do Advisor é a média ponderada de quatro coberturas:
 * dados de funil, janela de automação, confiança estatística das evidências
 * e precisão histórica do próprio motor de recomendação.
 */
export function advisorConfidence(entrada: AdvisoryEntrada): AdvisorConfidence {
  const motivos: string[] = [];
  const partes: { peso: number; valor: number }[] = [];

  const e = entrada.snapshot.executivo;
  if (e && e.novas30d + e.ganhasMes > 0) {
    const volume = Math.min(1, (e.novas30d + e.ganhasMes) / 30);
    partes.push({ peso: 3, valor: volume });
    motivos.push(
      `${n(e.novas30d)} oportunidade(s) em 30 dias e ${n(e.ganhasMes)} venda(s) no mês sustentam a leitura de funil.`,
    );
  } else {
    motivos.push("Funil sem volume suficiente na janela: leitura comercial é apenas indicativa.");
  }

  const intel = entrada.inteligencia;
  if (intel && intel.regras.length > 0) {
    const janela = Math.min(1, intel.janelaDias / 90);
    partes.push({ peso: 2, valor: janela });
    const confiaveis = intel.regras
      .map((r) => automationConfidence(r, intel.baseline))
      .filter((c): c is NonNullable<typeof c> => c !== null);
    if (confiaveis.length > 0) {
      const media = confiaveis.reduce((s, c) => s + c.confianca, 0) / confiaveis.length / 100;
      partes.push({ peso: 3, valor: media });
      motivos.push(
        `${confiaveis.length} regra(s) com amostra estatística válida, confiança média de ${pct(media * 100)}.`,
      );
    } else {
      motivos.push(
        `Nenhuma regra atingiu amostra mínima na janela de ${intel.janelaDias} dias: impacto de automação não é afirmado.`,
      );
    }
  } else {
    motivos.push("Sem histórico de automação materializado: nada a afirmar sobre impacto de regras.");
  }

  const precisao = precisaoRecomendacoes(entrada.qualidade);
  if (precisao !== null) {
    partes.push({ peso: 2, valor: precisao });
    motivos.push(
      `Histórico do motor: ${pct(precisao * 100)} das recomendações avaliadas melhoraram o indicador.`,
    );
  } else {
    motivos.push("Motor de recomendação ainda sem desfechos avaliados suficientes.");
  }

  if (partes.length === 0) return { valor: null, nivel: "inicial", motivos };

  const pesoTotal = partes.reduce((s, p) => s + p.peso, 0);
  const valor = Math.round(
    (partes.reduce((s, p) => s + p.peso * p.valor, 0) / pesoTotal) * 100,
  );

  return {
    valor,
    nivel:
      valor >= CONFIANCA_ROBUSTA ? "robusta" : valor >= CONFIANCA_MODERADA ? "moderada" : "inicial",
    motivos,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 01 — Executive Briefing (diário)
 * ------------------------------------------------------------------ */

export type BriefingLinha = { rotulo: string; valor: string; tom: AdvisorSeveridade };

export type ExecutiveBriefing = {
  saudacao: string;
  /** Frase de abertura, sempre derivada de número medido. */
  abertura: string;
  numeros: BriefingLinha[];
  atencoes: string[];
  proximoPasso: string | null;
  confianca: AdvisorConfidence;
};

function saudacaoDe(agora: Date, nome?: string | null): string {
  const hora = agora.getHours();
  const parte = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  return nome?.trim() ? `${parte}, ${nome.trim()}.` : `${parte}.`;
}

/**
 * GATE 01 — briefing diário: o que aconteceu, o que exige atenção e qual é
 * o próximo passo. Sem número medido, a linha simplesmente não aparece.
 */
export function briefingExecutivo(
  entrada: AdvisoryEntrada,
  opcoes: { nome?: string | null; agora?: Date } = {},
): ExecutiveBriefing {
  const agora = opcoes.agora ?? new Date();
  const e = entrada.snapshot.executivo;
  const numeros: BriefingLinha[] = [];
  const atencoes: string[] = [];

  if (e) {
    numeros.push({ rotulo: "Oportunidades abertas", valor: n(e.oportunidadesAbertas), tom: "ok" });
    numeros.push({ rotulo: "Novas (30 dias)", valor: n(e.novas30d), tom: "ok" });
    numeros.push({ rotulo: "Vendas no mês", valor: n(e.ganhasMes), tom: e.ganhasMes > 0 ? "ok" : "atencao" });
    numeros.push({
      rotulo: "Conversão",
      valor: pct(e.conversaoPercentual, 1),
      tom: e.conversaoPercentual >= 15 ? "ok" : e.conversaoPercentual >= 7.5 ? "atencao" : "critico",
    });
    numeros.push({
      rotulo: "Ciclo médio",
      valor: `${n(e.tempoMedioCicloDias)} dias`,
      tom: e.tempoMedioCicloDias <= 90 ? "ok" : "atencao",
    });
    numeros.push({
      rotulo: "Unidades disponíveis",
      valor: `${n(e.unidadesDisponiveis)} de ${n(e.unidadesTotal)}`,
      tom: "ok",
    });
  }

  for (const sinal of entrada.sinais) {
    if (sinal.severidade === "ok") continue;
    atencoes.push(`${sinal.titulo}: ${sinal.evidencia}`);
  }

  const intel = entrada.inteligencia;
  if (intel) {
    for (const r of intel.regras) {
      const falha = taxaFalha(r);
      if (falha !== null && falha >= 0.1) {
        atencoes.push(
          `A regra "${r.nome}" está com ${pct(falha * 100)} de falhas (${n(r.falhou)} de ${n(r.entregues + r.falhou + r.descartados)} efeitos concluídos).`,
        );
      }
      if (saudeDaRegra(r) === "morta" && r.ativa) {
        atencoes.push(`A regra "${r.nome}" está ativa e não disparou nenhuma vez na janela.`);
      }
    }
  }

  const primeira = entrada.recomendacoes[0] ?? null;
  const abertura = e
    ? `Pipeline com ${n(e.oportunidadesAbertas)} oportunidade(s) aberta(s), ${n(e.novas30d)} nova(s) em 30 dias e conversão de ${pct(e.conversaoPercentual, 1)}.`
    : "Ainda não há volume medido nos painéis para abrir o dia com números.";

  return {
    saudacao: saudacaoDe(agora, opcoes.nome ?? null),
    abertura,
    numeros,
    atencoes: atencoes.slice(0, 5),
    proximoPasso: primeira
      ? `${primeira.posicao}º na fila (${quadranteLabels[primeira.quadrante]}): ${primeira.mensagem} ${primeira.forecast.texto}`
      : null,
    confianca: advisorConfidence(entrada),
  };
}

/* ------------------------------------------------------------------ *
 * GATE 02 — Weekly Intelligence
 * ------------------------------------------------------------------ */

export type WeeklyIntelligence = {
  periodoDias: number;
  gargalos: string[];
  oportunidades: string[];
  tendencia: string;
  riscos: string[];
  melhoresCorretores: { nome: string; evidencia: string }[];
  empreendimentosEmAlta: { nome: string; evidencia: string }[];
  automacoesCriticas: { nome: string; evidencia: string }[];
  confianca: AdvisorConfidence;
};

/** GATE 02 — resumo de segunda-feira. Cada bloco só existe se houver medida. */
export function inteligenciaSemanal(
  entrada: AdvisoryEntrada,
  periodoDias = 7,
): WeeklyIntelligence {
  const gargalos: string[] = [];
  const oportunidades: string[] = [];
  const riscos: string[] = [];

  const e = entrada.snapshot.executivo;
  const vend = entrada.snapshot.vendedores;

  const followup = vend.reduce((a, v) => a + v.followupPerdido, 0);
  const semAcao = vend.reduce((a, v) => a + v.semProximaAcao, 0);
  const sla = vend.reduce((a, v) => a + v.slaEstourado, 0);

  if (followup > 0) gargalos.push(`${n(followup)} oportunidade(s) com follow-up vencido.`);
  if (semAcao > 0) gargalos.push(`${n(semAcao)} oportunidade(s) sem próxima ação definida.`);
  if (sla > 0) gargalos.push(`${n(sla)} oportunidade(s) com SLA de atendimento estourado.`);
  if (e && e.tempoMedioCicloDias > 90)
    gargalos.push(`Ciclo médio de ${n(e.tempoMedioCicloDias)} dias, acima do limite de 90.`);

  if (e && e.unidadesTotal > 0 && e.unidadesDisponiveis > 0)
    oportunidades.push(
      `${n(e.unidadesDisponiveis)} unidade(s) disponíveis de ${n(e.unidadesTotal)} — estoque para trabalhar.`,
    );

  const origens = entrada.snapshot.origens
    .filter((o) => o.ganhasTotal + o.perdidasTotal >= 10)
    .sort(
      (a, b) =>
        b.ganhasTotal / (b.ganhasTotal + b.perdidasTotal) -
        a.ganhasTotal / (a.ganhasTotal + a.perdidasTotal),
    );
  const melhorOrigem = origens[0];
  if (melhorOrigem)
    oportunidades.push(
      `Origem ${melhorOrigem.origem} converte melhor (${n(melhorOrigem.ganhasTotal)} ganhas / ${n(melhorOrigem.perdidasTotal)} perdidas): concentrar investimento.`,
    );

  for (const rec of entrada.recomendacoes.slice(0, 3))
    oportunidades.push(`${rec.posicao}º da fila: ${rec.mensagem} ${rec.forecast.texto}`);

  for (const sinal of entrada.sinais)
    if (sinal.severidade === "critico") riscos.push(`${sinal.titulo}: ${sinal.evidencia}`);

  const inativos = vend.filter((v) => (v.diasSemAtividade ?? 0) >= 7);
  if (inativos.length > 0)
    riscos.push(
      `${inativos.length} corretor(es) sem atividade há 7 dias ou mais: ${inativos.slice(0, 5).map((v) => v.responsavelNome).join(", ")}.`,
    );

  const melhoresCorretores = [...vend]
    .filter((v) => v.ganhas30d > 0 || v.oportunidadesAbertas > 0)
    .sort((a, b) => b.ganhas30d - a.ganhas30d || b.conversaoPercentual - a.conversaoPercentual)
    .slice(0, 3)
    .map((v) => ({
      nome: v.responsavelNome,
      evidencia: `${n(v.ganhas30d)} venda(s) em 30 dias, ${pct(v.conversaoPercentual, 1)} de conversão, ${n(v.oportunidadesAbertas)} aberta(s).`,
    }));

  // Empreendimento "em alta" = giro medido nos últimos 30 dias, não promessa.
  const empreendimentosEmAlta = [...entrada.empreendimentos]
    .filter((p) => p.vendas30d > 0 || p.visitas30d > 0)
    .sort(
      (a, b) =>
        b.vendas30d - a.vendas30d ||
        b.visitas30d - a.visitas30d ||
        b.conversaoPercentual - a.conversaoPercentual,
    )
    .slice(0, 3)
    .map((p) => ({
      nome: p.nome,
      evidencia: `${n(p.vendas30d)} venda(s) e ${n(p.visitas30d)} visita(s) em 30 dias; ${n(p.unidadesDisponiveis)} unidade(s) disponíveis.`,
    }));

  const parado = [...entrada.empreendimentos]
    .filter((p) => p.unidadesDisponiveis > 0 && p.vendas90d === 0 && p.oportunidadesAbertas > 0)
    .sort((a, b) => b.oportunidadesAbertas - a.oportunidadesAbertas)[0];
  if (parado)
    riscos.push(
      `"${parado.nome}" tem ${n(parado.oportunidadesAbertas)} oportunidade(s) aberta(s) e nenhuma venda em 90 dias.`,
    );

  const intel = entrada.inteligencia;
  const automacoesCriticas = (intel?.regras ?? [])
    .map((r) => ({ r, falha: taxaFalha(r), saude: saudeDaRegra(r) }))
    .filter((x) => x.saude === "suspeita" || x.saude === "morta")
    .sort((a, b) => (b.falha ?? 0) - (a.falha ?? 0))
    .slice(0, 5)
    .map((x) => ({
      nome: x.r.nome,
      evidencia:
        x.falha !== null && x.falha > 0
          ? `${pct(x.falha * 100)} de falhas em ${n(x.r.execucoes)} execução(ões).`
          : `${n(x.r.execucoes)} execução(ões) na janela de ${n(x.r.dias)} dia(s).`,
    }));

  const horas = (intel?.regras ?? []).reduce((s, r) => s + tempoEconomizadoHoras(r), 0);
  const tendencia = intel
    ? `Automação poupou ${h(horas)} na janela de ${n(intel.janelaDias)} dias; base do workspace com ${n(intel.baseline.oportunidades)} oportunidade(s) e ${n(intel.baseline.ganhas)} ganha(s).`
    : "Sem histórico materializado de automação: tendência não pode ser afirmada nesta semana.";

  return {
    periodoDias,
    gargalos,
    oportunidades,
    tendencia,
    riscos,
    melhoresCorretores,
    empreendimentosEmAlta,
    automacoesCriticas,
    confianca: advisorConfidence(entrada),
  };
}

/* ------------------------------------------------------------------ *
 * GATE 03 — Natural Language Query
 * ------------------------------------------------------------------ */

export const NLQ_INTENCOES = [
  "regras_prejudicando",
  "melhor_corretor",
  "follow_up",
  "conversao",
  "tempo_economizado",
  "prioridade",
  "empreendimento",
  "estoque",
  "desconhecida",
] as const;
export type NlqIntencao = (typeof NLQ_INTENCOES)[number];

export type NlqResposta = {
  intencao: NlqIntencao;
  resposta: string;
  /** Medidas citadas, na ordem em que aparecem na resposta. */
  evidencias: string[];
  confianca: AdvisorConfidence;
};

const PADROES: { intencao: Exclude<NlqIntencao, "desconhecida">; termos: RegExp }[] = [
  { intencao: "regras_prejudicando", termos: /(regra|automa|falha|prejudic|quebr)/i },
  { intencao: "melhor_corretor", termos: /(corretor|vendedor|equipe|melhor.*vend|time)/i },
  { intencao: "follow_up", termos: /(follow|retorno|sla|atras|abandon|parad)/i },
  { intencao: "conversao", termos: /(convers|fech|ganho|venda|funil)/i },
  { intencao: "tempo_economizado", termos: /(tempo|hora|economiz|poupad|roi)/i },
  { intencao: "prioridade", termos: /(prioridade|primeiro|urgen|o que fazer|foco)/i },
  { intencao: "empreendimento", termos: /(empreendimento|torre|obra|lançament|lancament)/i },
  { intencao: "estoque", termos: /(estoque|unidade|disponív|dispon)/i },
];

/** Classificação determinística da pergunta: sem LLM, sem alucinação. */
export function classificarPergunta(pergunta: string): NlqIntencao {
  const texto = (pergunta ?? "").trim();
  if (!texto) return "desconhecida";
  for (const p of PADROES) if (p.termos.test(texto)) return p.intencao;
  return "desconhecida";
}

/**
 * GATE 03 — responde em linguagem natural usando SOMENTE a Query Layer já
 * carregada na entrada. Não sabendo, diz que não sabe.
 */
export function responderPergunta(pergunta: string, entrada: AdvisoryEntrada): NlqResposta {
  const intencao = classificarPergunta(pergunta);
  const confianca = advisorConfidence(entrada);
  const evidencias: string[] = [];
  const e = entrada.snapshot.executivo;
  const intel = entrada.inteligencia;

  const semDado = (assunto: string) =>
    `Não tenho evidência medida sobre ${assunto} neste workspace.`;

  let resposta: string;

  switch (intencao) {
    case "regras_prejudicando": {
      const ruins = (intel?.regras ?? [])
        .map((r) => ({ r, falha: taxaFalha(r) }))
        .filter((x) => x.falha !== null && x.falha >= 0.1)
        .sort((a, b) => (b.falha ?? 0) - (a.falha ?? 0));
      if (ruins.length === 0) {
        resposta =
          intel && intel.regras.length > 0
            ? "Nenhuma regra apresenta taxa de falha relevante na janela medida."
            : semDado("regras de automação");
      } else {
        for (const x of ruins.slice(0, 3))
          evidencias.push(`${x.r.nome}: ${pct((x.falha ?? 0) * 100)} de falhas em ${n(x.r.execucoes)} execução(ões).`);
        resposta = `${ruins.length} regra(s) com falha acima de 10%. A pior é "${ruins[0]!.r.nome}", com ${pct((ruins[0]!.falha ?? 0) * 100)} de falhas.`;
      }
      break;
    }
    case "melhor_corretor": {
      const top = [...entrada.snapshot.vendedores].sort(
        (a, b) => b.ganhas30d - a.ganhas30d || b.conversaoPercentual - a.conversaoPercentual,
      )[0];
      if (!top) {
        resposta = semDado("desempenho por corretor");
      } else {
        evidencias.push(
          `${top.responsavelNome}: ${n(top.ganhas30d)} venda(s) em 30 dias, ${pct(top.conversaoPercentual, 1)} de conversão.`,
        );
        resposta = `${top.responsavelNome} lidera com ${n(top.ganhas30d)} venda(s) em 30 dias e ${pct(top.conversaoPercentual, 1)} de conversão.`;
      }
      break;
    }
    case "follow_up": {
      const followup = entrada.snapshot.vendedores.reduce((a, v) => a + v.followupPerdido, 0);
      const semAcao = entrada.snapshot.vendedores.reduce((a, v) => a + v.semProximaAcao, 0);
      if (entrada.snapshot.vendedores.length === 0) {
        resposta = semDado("follow-up da equipe");
      } else {
        evidencias.push(`${n(followup)} follow-up(s) vencido(s) e ${n(semAcao)} oportunidade(s) sem próxima ação.`);
        resposta = `Hoje há ${n(followup)} follow-up(s) vencido(s) e ${n(semAcao)} oportunidade(s) sem próxima ação.`;
      }
      break;
    }
    case "conversao": {
      if (!e) {
        resposta = semDado("conversão do funil");
      } else {
        evidencias.push(
          `Conversão de ${pct(e.conversaoPercentual, 1)} com ${n(e.ganhasMes)} venda(s) no mês e ${n(e.novas30d)} nova(s) em 30 dias.`,
        );
        resposta = `A conversão medida é de ${pct(e.conversaoPercentual, 1)}, com ciclo médio de ${n(e.tempoMedioCicloDias)} dias.`;
      }
      break;
    }
    case "tempo_economizado": {
      if (!intel || intel.regras.length === 0) {
        resposta = semDado("tempo economizado por automação");
      } else {
        const horas = intel.regras.reduce((s, r) => s + tempoEconomizadoHoras(r), 0);
        evidencias.push(`${h(horas)} poupadas na janela de ${n(intel.janelaDias)} dias.`);
        resposta = `A automação poupou ${h(horas)} nos últimos ${n(intel.janelaDias)} dias. O valor é estimado por perfil de ação, não observado.`;
      }
      break;
    }
    case "prioridade": {
      const rec = entrada.recomendacoes[0];
      if (!rec) {
        resposta = semDado("fila de recomendações");
      } else {
        evidencias.push(`${rec.mensagem} (prioridade ${n(rec.prioridade)}, confiança ${pct(rec.confianca)}).`);
        resposta = `Comece por: ${rec.mensagem} ${rec.forecast.texto} Quadrante ${quadranteLabels[rec.quadrante]}.`;
      }
      break;
    }
    case "estoque": {
      if (!e || e.unidadesTotal === 0) {
        resposta = semDado("estoque de unidades");
      } else {
        evidencias.push(`${n(e.unidadesDisponiveis)} de ${n(e.unidadesTotal)} unidades disponíveis.`);
        resposta = `Há ${n(e.unidadesDisponiveis)} unidade(s) disponíveis de ${n(e.unidadesTotal)}.`;
      }
      break;
    }
    case "empreendimento": {
      const props = entrada.empreendimentos;
      if (props.length === 0) {
        resposta = semDado("desempenho por empreendimento");
        break;
      }
      // "perdeu" pergunta pelo pior giro; qualquer outra, pelo melhor.
      const perdas = /(perd|pior|encalh|parad|fraco)/i.test(pergunta);
      const ordenados = [...props].sort((a, b) =>
        perdas
          ? a.vendas30d - b.vendas30d || b.oportunidadesAbertas - a.oportunidadesAbertas
          : b.vendas30d - a.vendas30d || b.visitas30d - a.visitas30d,
      );
      const alvo = ordenados[0]!;
      evidencias.push(
        `${alvo.nome}: ${n(alvo.vendas30d)} venda(s) em 30 dias, ${n(alvo.vendas90d)} em 90, ${n(alvo.oportunidadesAbertas)} oportunidade(s) aberta(s).`,
      );
      resposta = perdas
        ? `O empreendimento com menor giro é "${alvo.nome}": ${n(alvo.vendas30d)} venda(s) em 30 dias com ${n(alvo.oportunidadesAbertas)} oportunidade(s) aberta(s).`
        : `O empreendimento em alta é "${alvo.nome}": ${n(alvo.vendas30d)} venda(s) e ${n(alvo.visitas30d)} visita(s) em 30 dias.`;
      break;
    }
    default:
      resposta =
        "Não sei responder a essa pergunta com a evidência disponível. Pergunte sobre conversão, follow-up, corretores, empreendimentos, estoque, automações, tempo economizado ou prioridade.";
  }

  return { intencao, resposta, evidencias, confianca };
}

/* ------------------------------------------------------------------ *
 * GATE 04 — Decision Timeline
 * ------------------------------------------------------------------ */

export type DecisionEtapa = {
  etapa: "gerada" | "vista" | "aceita" | "implementada" | "avaliada" | "arquivada";
  em: string;
  /** Dias desde a geração da recomendação. */
  diasDesdeGeracao: number;
};

export type DecisionTimelineItem = {
  id: string;
  chave: string;
  tipo: string;
  ruleNome: string | null;
  mensagem: string | null;
  etapas: DecisionEtapa[];
  resultado: RecommendationRow["resultado"];
  /** Dias entre gerar e implementar. `null` se ainda não implementada. */
  diasAteImplementacao: number | null;
  /** Ciclo fechado = implementada e com desfecho avaliado. */
  fechada: boolean;
};

export type DecisionTimeline = {
  itens: DecisionTimelineItem[];
  /** Média de dias entre gerar e implementar. `null` sem amostra. */
  tempoMedioImplementacaoDias: number | null;
  ciclosFechados: number;
};

/** GATE 04 — recomendação → implementação → resultado → impacto. */
export function decisionTimeline(memoria: RecommendationRow[]): DecisionTimeline {
  const itens: DecisionTimelineItem[] = memoria.map((row) => {
    const etapas: DecisionEtapa[] = [];
    const add = (etapa: DecisionEtapa["etapa"], em: string | null) => {
      if (!em) return;
      etapas.push({ etapa, em, diasDesdeGeracao: dias(row.geradaEm, em) });
    };
    add("gerada", row.geradaEm);
    add("vista", row.vistaEm);
    add("aceita", row.aceitaEm);
    add("implementada", row.implementadaEm);
    add("avaliada", row.avaliadaEm);
    if (row.status === "arquivada") add("arquivada", row.fechadaEm);

    const diasAteImplementacao = row.implementadaEm
      ? dias(row.geradaEm, row.implementadaEm)
      : null;

    return {
      id: row.id,
      chave: row.chave,
      tipo: row.tipo,
      ruleNome: row.ruleNome,
      mensagem: row.mensagem,
      etapas,
      resultado: row.resultado,
      diasAteImplementacao,
      fechada: Boolean(row.implementadaEm) && row.resultado !== "indefinido",
    };
  });

  const implementadas = itens
    .map((i) => i.diasAteImplementacao)
    .filter((d): d is number => d !== null);

  return {
    itens,
    tempoMedioImplementacaoDias:
      implementadas.length > 0
        ? implementadas.reduce((s, d) => s + d, 0) / implementadas.length
        : null,
    ciclosFechados: itens.filter((i) => i.fechada).length,
  };
}
