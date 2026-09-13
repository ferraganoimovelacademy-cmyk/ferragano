/**
 * SPRINT 19 — Automation Intelligence (contratos client-safe).
 *
 * A Sprint 18 mediu execução. Aqui medimos IMPACTO: ganho de conversão,
 * tempo economizado e saúde real de cada regra. Toda leitura vem do
 * histórico materializado (`automation_daily_metrics`), nunca da fila —
 * a métrica sobrevive à purga do Outbox (ADR-017).
 *
 * Regra estatística herdada da Sprint 18: sem desfecho, sem número.
 * Ausência de dado nunca vira zero.
 */

import type { AutomationAcao, AutomationCanal } from "@/lib/platform/automation";

/** Amostra mínima para afirmar diferença de conversão. Abaixo disso, `null`. */
export const AMOSTRA_MINIMA_LIFT = 10;

/** Acima disso, a regra dispara demais para o volume da janela. */
export const EXECUCOES_DIA_SUSPEITA = 50;

/** Abaixo disso, a regra é ativa mas praticamente inerte. */
export const EXECUCOES_BAIXA_ATIVIDADE = 3;

export type AutomationIntelligenceRule = {
  ruleId: string;
  nome: string;
  eventType: string;
  acao: AutomationAcao;
  canal: AutomationCanal;
  ativa: boolean;
  dias: number;
  execucoes: number;
  entregues: number;
  falhou: number;
  descartados: number;
  pendentes: number;
  latenciaMediaSegundos: number;
  tempoEconomizadoSegundos: number;
  oportunidadesTocadas: number;
  conversoes: number;
  ultimaExecucao: string | null;
};

export type AutomationIntelligence = {
  janelaDias: number;
  desde: string;
  baseline: { oportunidades: number; ganhas: number };
  regras: AutomationIntelligenceRule[];
  geradoEm: string;
};

/** GATE 04 — Rule Health em quatro níveis. */
export type RuleHealth = "saudavel" | "baixa_atividade" | "suspeita" | "morta";

export const ruleHealthLabels: Record<RuleHealth, string> = {
  saudavel: "Saudável",
  baixa_atividade: "Baixa atividade",
  suspeita: "Suspeita",
  morta: "Morta",
};

export const ruleHealthCores: Record<RuleHealth, string> = {
  saudavel: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  baixa_atividade: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  suspeita: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  morta: "bg-destructive/15 text-destructive",
};

/** Conversão de referência do workspace na janela. Sem base, `null`. */
export function conversaoBaseline(base: AutomationIntelligence["baseline"]): number | null {
  if (!base || base.oportunidades <= 0) return null;
  return base.ganhas / base.oportunidades;
}

/**
 * GATE 02 — Conversion Lift: conversão das oportunidades tocadas pela regra
 * menos a conversão de referência do workspace. Correlação, não causa.
 */
export function conversionLift(
  regra: AutomationIntelligenceRule,
  base: AutomationIntelligence["baseline"],
): { taxaRegra: number; baseline: number; lift: number } | null {
  const baseline = conversaoBaseline(base);
  if (baseline === null) return null;
  if (regra.oportunidadesTocadas < AMOSTRA_MINIMA_LIFT) return null;

  const taxaRegra = regra.conversoes / regra.oportunidadesTocadas;
  return { taxaRegra, baseline, lift: taxaRegra - baseline };
}

/** GATE 03 — Time Saved em horas (segundos poupados por efeito entregue). */
export function tempoEconomizadoHoras(regra: AutomationIntelligenceRule): number {
  return regra.tempoEconomizadoSegundos / 3600;
}

/** Taxa de falha definitiva sobre o que saiu da fila. Sem desfecho, `null`. */
export function taxaFalha(regra: AutomationIntelligenceRule): number | null {
  const concluidos = regra.entregues + regra.falhou + regra.descartados;
  if (concluidos === 0) return null;
  return regra.falhou / concluidos;
}

/**
 * GATE 04 — Silent Rules Score.
 * morta: ativa e nunca disparou na janela (gatilho errado ou evento extinto).
 * suspeita: falha relevante, descarte alto ou volume fora de escala.
 * baixa_atividade: dispara, mas raramente.
 */
export function saudeDaRegra(regra: AutomationIntelligenceRule): RuleHealth {
  if (regra.execucoes === 0) return "morta";

  const falha = taxaFalha(regra);
  if (falha !== null && falha >= 0.1) return "suspeita";

  const porDia = regra.execucoes / Math.max(1, regra.dias);
  if (porDia > EXECUCOES_DIA_SUSPEITA) return "suspeita";

  if (regra.execucoes < EXECUCOES_BAIXA_ATIVIDADE) return "baixa_atividade";
  return "saudavel";
}

export type AutomationRecomendacao = {
  ruleId: string;
  nome: string;
  severidade: "critico" | "atencao" | "oportunidade";
  mensagem: string;
};

/**
 * GATES 05 e 06 — Recommendations e Optimization Suggestions.
 * Cada frase é derivada de um número presente na linha: nada é sugerido
 * sem evidência, e regra inativa não gera ruído.
 */
export function recomendacoesAutomacao(dados: AutomationIntelligence): AutomationRecomendacao[] {
  const out: AutomationRecomendacao[] = [];

  for (const r of dados.regras) {
    if (!r.ativa) {
      if (r.execucoes === 0) {
        out.push({
          ruleId: r.ruleId,
          nome: r.nome,
          severidade: "oportunidade",
          mensagem: `A regra "${r.nome}" está desligada e não executou em ${dados.janelaDias} dias — considere removê-la.`,
        });
      }
      continue;
    }

    const falha = taxaFalha(r);
    if (falha !== null && falha >= 0.1) {
      out.push({
        ruleId: r.ruleId,
        nome: r.nome,
        severidade: "critico",
        mensagem: `A regra "${r.nome}" falhou ${(falha * 100).toFixed(0)}% das vezes — revise o gatilho ${r.eventType}.`,
      });
    }

    if (r.execucoes === 0) {
      out.push({
        ruleId: r.ruleId,
        nome: r.nome,
        severidade: "atencao",
        mensagem: `A regra "${r.nome}" nunca foi executada em ${dados.janelaDias} dias — o evento ${r.eventType} pode não estar ocorrendo.`,
      });
    }

    if (r.pendentes > 20) {
      out.push({
        ruleId: r.ruleId,
        nome: r.nome,
        severidade: "atencao",
        mensagem: `A regra "${r.nome}" acumulou ${r.pendentes} efeitos na fila — aumente o atraso (delay) ou reduza o gatilho.`,
      });
    }

    const lift = conversionLift(r, dados.baseline);
    if (lift && lift.lift >= 0.05) {
      out.push({
        ruleId: r.ruleId,
        nome: r.nome,
        severidade: "oportunidade",
        mensagem: `A regra "${r.nome}" aumentou a conversão em ${(lift.lift * 100).toFixed(0)} pontos — vale ampliar o alcance.`,
      });
    }
  }

  const porGatilho = new Map<string, string[]>();
  for (const r of dados.regras.filter((x) => x.ativa)) {
    const chave = `${r.eventType}|${r.acao}`;
    porGatilho.set(chave, [...(porGatilho.get(chave) ?? []), r.nome]);
  }
  for (const [chave, nomes] of porGatilho) {
    if (nomes.length > 1) {
      out.push({
        ruleId: chave,
        nome: nomes.join(" / "),
        severidade: "atencao",
        mensagem: `${nomes.length} regras ativas com o mesmo gatilho e a mesma ação (${chave.split("|")[0]}) — considere consolidar.`,
      });
    }
  }

  return out;
}

/** GATE 01 — Automation ROI consolidado da janela. */
export function resumoInteligencia(dados: AutomationIntelligence) {
  const regras = dados.regras;
  const ativas = regras.filter((r) => r.ativa);
  const execucoes = regras.reduce((s, r) => s + r.execucoes, 0);
  const tocadas = regras.reduce((s, r) => s + r.oportunidadesTocadas, 0);
  const conversoes = regras.reduce((s, r) => s + r.conversoes, 0);
  const baseline = conversaoBaseline(dados.baseline);

  const taxaTocadas = tocadas >= AMOSTRA_MINIMA_LIFT ? conversoes / tocadas : null;

  return {
    regras: regras.length,
    regrasAtivas: ativas.length,
    regrasMortas: ativas.filter((r) => saudeDaRegra(r) === "morta").length,
    regrasSuspeitas: ativas.filter((r) => saudeDaRegra(r) === "suspeita").length,
    execucoes,
    horasEconomizadas: regras.reduce((s, r) => s + tempoEconomizadoHoras(r), 0),
    oportunidadesTocadas: tocadas,
    conversoes,
    taxaTocadas,
    baseline,
    lift: taxaTocadas === null || baseline === null ? null : taxaTocadas - baseline,
  };
}
