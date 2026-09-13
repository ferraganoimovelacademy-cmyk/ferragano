/**
 * SPRINT 20 — Decision Intelligence (contratos client-safe, lógica pura).
 *
 * A Sprint 19 respondeu "a automação gera resultado?". Aqui respondemos
 * "quanta confiança esse resultado merece, o que fazer primeiro e o que
 * acontece se eu mudar isso?".
 *
 * Nada de IA generativa: aprendizado estatístico sobre o histórico
 * materializado (`automation_daily_metrics`, ADR-017). Toda função é pura e
 * derivada dos números já auditados — ausência de amostra devolve `null`,
 * nunca zero (ADR-018).
 */

import {
  conversaoBaseline,
  conversionLift,
  saudeDaRegra,
  taxaFalha,
  tempoEconomizadoHoras,
  type AutomationIntelligence,
  type AutomationIntelligenceRule,
} from "@/lib/platform/automation-intelligence";

/** Abaixo disso não afirmamos confiança sobre diferença de conversão. */
export const AMOSTRA_MINIMA_CONFIANCA = 10;

/** Confiança a partir da qual tratamos o lift como sustentado. */
export const CONFIANCA_SUSTENTADA = 90;

/** Aproximação de erf (Abramowitz & Stegun 7.1.26) — erro < 1.5e-7. */
function erf(x: number): number {
  const sinal = x < 0 ? -1 : 1;
  const z = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * z);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-z * z);
  return sinal * y;
}

/** P(|Z| <= z) para a normal padrão. */
function normalDuasCaudas(z: number): number {
  return erf(Math.abs(z) / Math.SQRT2);
}

export type AutomationConfidence = {
  /** Diferença observada de conversão (pontos, 0..1). */
  lift: number;
  /** Conversão observada nas oportunidades tocadas pela regra. */
  taxaRegra: number;
  /** Conversão de referência do workspace na janela. */
  baseline: number;
  /** Tamanho da amostra da regra (oportunidades tocadas). */
  amostra: number;
  /** Estatística z do teste de duas proporções. */
  z: number;
  /** Confiança de que o lift não é ruído amostral, em % (0..100). */
  confianca: number;
  /** Confiança >= CONFIANCA_SUSTENTADA. */
  sustentado: boolean;
};

/**
 * GATE 01 — Automation Confidence.
 *
 * +12% com 20 execuções não é +12% com 8.000: o teste de duas proporções
 * pondera o lift pelo tamanho da amostra da regra e da base do workspace.
 */
export function automationConfidence(
  regra: AutomationIntelligenceRule,
  base: AutomationIntelligence["baseline"],
): AutomationConfidence | null {
  const medida = conversionLift(regra, base);
  if (!medida) return null;
  if (regra.oportunidadesTocadas < AMOSTRA_MINIMA_CONFIANCA) return null;
  if (base.oportunidades <= 0) return null;

  const n1 = regra.oportunidadesTocadas;
  const n2 = base.oportunidades;
  const p1 = medida.taxaRegra;
  const p2 = medida.baseline;
  const pool = (regra.conversoes + base.ganhas) / (n1 + n2);
  const variancia = pool * (1 - pool) * (1 / n1 + 1 / n2);

  // Sem variância (0% ou 100% em toda a base) não há teste possível.
  if (variancia <= 0) return null;

  const z = (p1 - p2) / Math.sqrt(variancia);
  const confianca = normalDuasCaudas(z) * 100;

  return {
    lift: medida.lift,
    taxaRegra: p1,
    baseline: p2,
    amostra: n1,
    z,
    confianca,
    sustentado: confianca >= CONFIANCA_SUSTENTADA,
  };
}

export const RECOMENDACAO_TIPOS = [
  "eliminar",
  "revisar_gatilho",
  "alterar_delay",
  "consolidar",
  "ampliar",
] as const;
export type RecomendacaoTipo = (typeof RECOMENDACAO_TIPOS)[number];

export const recomendacaoTipoLabels: Record<RecomendacaoTipo, string> = {
  eliminar: "Eliminar regra",
  revisar_gatilho: "Revisar gatilho",
  alterar_delay: "Alterar atraso",
  consolidar: "Consolidar regras",
  ampliar: "Ampliar alcance",
};

/** Peso base por tipo: quanto o problema costuma custar à operação. */
const PESO_BASE: Record<RecomendacaoTipo, number> = {
  revisar_gatilho: 70,
  eliminar: 55,
  consolidar: 45,
  alterar_delay: 30,
  ampliar: 40,
};

export type ImpactForecast = {
  /** Frase única, sempre derivada de um número da linha. */
  texto: string;
  /** Horas/mês afetadas, quando a mudança mexe em tempo economizado. */
  horasMes: number | null;
  /** Redução esperada de fila ou de execuções (0..1), quando aplicável. */
  reducao: number | null;
};

export type RecomendacaoPriorizada = {
  ruleId: string;
  nome: string;
  tipo: RecomendacaoTipo;
  /** GATE 02 — prioridade 0..100. */
  score: number;
  /** Confiança na evidência que originou a recomendação, em % (0..100). */
  confianca: number;
  mensagem: string;
  /** GATE 03 — o que se espera ganhar ao executar. */
  forecast: ImpactForecast;
};

function clamp(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

function horasPorMes(regra: AutomationIntelligenceRule): number {
  const dias = Math.max(1, regra.dias);
  return (tempoEconomizadoHoras(regra) / dias) * 30;
}

/**
 * GATES 02 e 03 — Recommendation Score + Impact Forecast.
 *
 * O score combina o peso do tipo, a evidência (volume relativo na janela)
 * e a confiança estatística. Regras sem amostra recebem confiança baixa e,
 * portanto, prioridade baixa: o gestor age primeiro no que é comprovado.
 */
export function priorizarRecomendacoes(dados: AutomationIntelligence): RecomendacaoPriorizada[] {
  const out: RecomendacaoPriorizada[] = [];
  const execucoesTotal = dados.regras.reduce((s, r) => s + r.execucoes, 0);
  const parcela = (r: AutomationIntelligenceRule) =>
    execucoesTotal > 0 ? r.execucoes / execucoesTotal : 0;

  const push = (
    r: AutomationIntelligenceRule,
    tipo: RecomendacaoTipo,
    confianca: number,
    mensagem: string,
    forecast: ImpactForecast,
    evidencia: number,
  ) => {
    const score = Math.round(
      clamp(PESO_BASE[tipo] * (0.55 + 0.45 * clamp(evidencia, 0, 1)) * (confianca / 100) * 1.6, 1, 100),
    );
    out.push({ ruleId: r.ruleId, nome: r.nome, tipo, score, confianca, mensagem, forecast });
  };

  for (const r of dados.regras) {
    const saude = saudeDaRegra(r);
    const falha = taxaFalha(r);
    const conf = automationConfidence(r, dados.baseline);
    const horasMes = horasPorMes(r);

    if (!r.ativa || saude === "morta") {
      const desligada = !r.ativa;
      const confianca = r.dias >= 30 ? 95 : 70;
      push(
        r,
        "eliminar",
        confianca,
        desligada
          ? `"${r.nome}" está desligada e sem execuções em ${dados.janelaDias} dias.`
          : `"${r.nome}" está ativa mas não disparou nenhuma vez em ${dados.janelaDias} dias.`,
        {
          texto:
            horasMes > 0
              ? `Remover elimina ruído sem perder as ${horasMes.toFixed(1)} h/mês já poupadas.`
              : "Remover não perde tempo economizado: a regra não produziu efeito na janela.",
          horasMes: horasMes > 0 ? horasMes : 0,
          reducao: null,
        },
        0.4,
      );
      continue;
    }

    if (falha !== null && falha >= 0.1) {
      const concluidos = r.entregues + r.falhou + r.descartados;
      push(
        r,
        "revisar_gatilho",
        concluidos >= 30 ? 96 : concluidos >= 10 ? 80 : 55,
        `"${r.nome}" falhou em ${(falha * 100).toFixed(0)}% dos efeitos concluídos (${r.falhou} de ${concluidos}).`,
        {
          texto: `Corrigir recupera cerca de ${(r.falhou * (horasMes / Math.max(1, r.entregues || 1))).toFixed(1)} h/mês hoje perdidas em falha.`,
          horasMes: horasMes,
          reducao: falha,
        },
        parcela(r),
      );
    }

    if (r.pendentes > 20) {
      const reducao = clamp(r.pendentes / Math.max(1, r.execucoes), 0, 1);
      push(
        r,
        "alterar_delay",
        r.execucoes >= 50 ? 90 : 70,
        `"${r.nome}" acumulou ${r.pendentes} efeitos na fila.`,
        {
          texto: `Aumentar o atraso ou estreitar o gatilho reduz a fila desta regra em até ${(reducao * 100).toFixed(0)}%.`,
          horasMes: null,
          reducao,
        },
        parcela(r),
      );
    }

    if (conf && conf.lift >= 0.05 && conf.sustentado) {
      push(
        r,
        "ampliar",
        conf.confianca,
        `"${r.nome}" converte ${(conf.lift * 100).toFixed(0)} p.p. acima da base com ${conf.amostra} oportunidades tocadas.`,
        {
          texto: `Dobrar o alcance projeta cerca de ${Math.round(r.conversoes)} conversões adicionais por janela, mantida a taxa atual.`,
          horasMes,
          reducao: null,
        },
        parcela(r),
      );
    }
  }

  // Duplicidade: mesmo gatilho + mesma ação em regras ativas.
  const grupos = new Map<string, AutomationIntelligenceRule[]>();
  for (const r of dados.regras.filter((x) => x.ativa)) {
    const chave = `${r.eventType}|${r.acao}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), r]);
  }
  for (const [chave, regras] of grupos) {
    if (regras.length < 2) continue;
    const execucoes = regras.reduce((s, r) => s + r.execucoes, 0);
    const maior = Math.max(...regras.map((r) => r.execucoes));
    const duplicadas = execucoes - maior;
    const reducao = execucoes > 0 ? duplicadas / execucoes : 0;
    out.push({
      ruleId: chave,
      nome: regras.map((r) => r.nome).join(" / "),
      tipo: "consolidar",
      score: Math.round(clamp(PESO_BASE.consolidar * (0.6 + reducao) * 1.4, 1, 100)),
      confianca: execucoes >= 20 ? 92 : 65,
      mensagem: `${regras.length} regras ativas compartilham o gatilho ${chave.split("|")[0]} e a mesma ação.`,
      forecast: {
        texto: `Consolidar remove ${duplicadas} execuções duplicadas (${(reducao * 100).toFixed(0)}% do volume do grupo).`,
        horasMes: null,
        reducao,
      },
    });
  }

  return out.sort((a, b) => b.score - a.score || a.nome.localeCompare(b.nome));
}

/**
 * GATE 04 — Rule Dependencies.
 *
 * Uma regra cujo efeito é `task` produz o evento `task.created`, que pode
 * disparar outra regra. O grafo revela cadeias, loops e regras órfãs.
 */
const EVENTO_PRODUZIDO: Partial<Record<AutomationIntelligenceRule["acao"], string>> = {
  task: "task.created",
};

export type RuleGraphNode = {
  ruleId: string;
  nome: string;
  eventType: string;
  /** Regras disparadas pelo efeito desta. */
  dispara: string[];
  /** Regras cujo efeito pode disparar esta. */
  disparadaPor: string[];
  /** Ativa, sem entrada de outra regra e sem saída. */
  orfa: boolean;
  /** Participa de um ciclo do grafo. */
  emLoop: boolean;
  /** Concentra fila e recebe disparo de outra regra. */
  gargalo: boolean;
};

export type RuleGraph = {
  nos: RuleGraphNode[];
  loops: string[][];
  orfas: string[];
  gargalos: string[];
};

export function grafoDeRegras(dados: AutomationIntelligence): RuleGraph {
  const ativas = dados.regras.filter((r) => r.ativa);
  const porEvento = new Map<string, AutomationIntelligenceRule[]>();
  for (const r of ativas) {
    porEvento.set(r.eventType, [...(porEvento.get(r.eventType) ?? []), r]);
  }

  const arestas = new Map<string, string[]>();
  for (const r of ativas) {
    const evento = EVENTO_PRODUZIDO[r.acao];
    const destinos = evento ? (porEvento.get(evento) ?? []).map((d) => d.ruleId) : [];
    arestas.set(r.ruleId, destinos);
  }

  const entradas = new Map<string, string[]>();
  for (const [origem, destinos] of arestas) {
    for (const destino of destinos) {
      entradas.set(destino, [...(entradas.get(destino) ?? []), origem]);
    }
  }

  // Detecção de ciclos por DFS com pilha de caminho.
  const loops: string[][] = [];
  const emLoop = new Set<string>();
  const visitado = new Set<string>();
  const caminho: string[] = [];

  const dfs = (id: string) => {
    const posicao = caminho.indexOf(id);
    if (posicao >= 0) {
      const ciclo = caminho.slice(posicao);
      ciclo.forEach((x) => emLoop.add(x));
      loops.push([...ciclo, id]);
      return;
    }
    if (visitado.has(id)) return;
    visitado.add(id);
    caminho.push(id);
    for (const destino of arestas.get(id) ?? []) dfs(destino);
    caminho.pop();
  };
  for (const r of ativas) dfs(r.ruleId);

  const nos: RuleGraphNode[] = ativas.map((r) => {
    const dispara = arestas.get(r.ruleId) ?? [];
    const disparadaPor = entradas.get(r.ruleId) ?? [];
    return {
      ruleId: r.ruleId,
      nome: r.nome,
      eventType: r.eventType,
      dispara,
      disparadaPor,
      orfa: dispara.length === 0 && disparadaPor.length === 0 && r.execucoes === 0,
      emLoop: emLoop.has(r.ruleId),
      gargalo: disparadaPor.length > 0 && r.pendentes > 20,
    };
  });

  return {
    nos,
    loops,
    orfas: nos.filter((n) => n.orfa).map((n) => n.ruleId),
    gargalos: nos.filter((n) => n.gargalo).map((n) => n.ruleId),
  };
}

export type SimulacaoVeredito = "nao_desligar" | "avaliar" | "pode_desligar";

export const simulacaoVereditoLabels: Record<SimulacaoVeredito, string> = {
  nao_desligar: "NÃO DESLIGAR",
  avaliar: "AVALIAR COM CUIDADO",
  pode_desligar: "PODE DESLIGAR",
};

export const simulacaoVereditoCores: Record<SimulacaoVeredito, string> = {
  nao_desligar: "bg-destructive/15 text-destructive",
  avaliar: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  pode_desligar: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

export type SimulacaoDesligar = {
  ruleId: string;
  nome: string;
  janelaDias: number;
  execucoes: number;
  oportunidadesTocadas: number;
  horasEconomizadas: number;
  lift: number | null;
  confianca: number | null;
  /** Regras que perdem o gatilho se esta for desligada. */
  dependentes: string[];
  veredito: SimulacaoVeredito;
  motivo: string;
};

/**
 * GATE 05 — Automation Simulator.
 * "E se eu desligar essa regra?" — resposta baseada no histórico da janela,
 * nunca em opinião. Regra com lift sustentado ou dependentes não se desliga.
 */
export function simularDesligarRegra(
  dados: AutomationIntelligence,
  ruleId: string,
): SimulacaoDesligar | null {
  const regra = dados.regras.find((r) => r.ruleId === ruleId);
  if (!regra) return null;

  const conf = automationConfidence(regra, dados.baseline);
  const grafo = grafoDeRegras(dados);
  const no = grafo.nos.find((n) => n.ruleId === ruleId);
  const dependentes = no?.dispara ?? [];
  const horas = tempoEconomizadoHoras(regra);

  let veredito: SimulacaoVeredito;
  let motivo: string;

  if (conf && conf.lift > 0 && conf.sustentado) {
    veredito = "nao_desligar";
    motivo = `A regra converte ${(conf.lift * 100).toFixed(0)} p.p. acima da base com ${conf.confianca.toFixed(0)}% de confiança em ${conf.amostra} oportunidades.`;
  } else if (dependentes.length > 0) {
    veredito = "nao_desligar";
    motivo = `${dependentes.length} regra(s) dependem do efeito desta para disparar.`;
  } else if (regra.execucoes === 0) {
    veredito = "pode_desligar";
    motivo = `Sem nenhuma execução em ${dados.janelaDias} dias: desligar não altera a operação.`;
  } else if (horas >= 5) {
    veredito = "avaliar";
    motivo = `Desligar devolve ${horas.toFixed(1)} h de trabalho manual por janela, mesmo sem ganho de conversão comprovado.`;
  } else {
    veredito = "pode_desligar";
    motivo = `Impacto medido baixo: ${regra.execucoes} execuções e ${horas.toFixed(1)} h poupadas, sem lift sustentado.`;
  }

  return {
    ruleId,
    nome: regra.nome,
    janelaDias: dados.janelaDias,
    execucoes: regra.execucoes,
    oportunidadesTocadas: regra.oportunidadesTocadas,
    horasEconomizadas: horas,
    lift: conf ? conf.lift : null,
    confianca: conf ? conf.confianca : null,
    dependentes,
    veredito,
    motivo,
  };
}

/** Resumo do painel de Decision Intelligence. */
export function resumoDecisionIntelligence(dados: AutomationIntelligence) {
  const recs = priorizarRecomendacoes(dados);
  const grafo = grafoDeRegras(dados);
  const confiancas = dados.regras
    .map((r) => automationConfidence(r, dados.baseline))
    .filter((c): c is AutomationConfidence => c !== null);

  return {
    recomendacoes: recs.length,
    prioridadeMaxima: recs.length > 0 ? recs[0]!.score : null,
    regrasComConfianca: confiancas.length,
    regrasSustentadas: confiancas.filter((c) => c.sustentado).length,
    loops: grafo.loops.length,
    orfas: grafo.orfas.length,
    gargalos: grafo.gargalos.length,
    baseline: conversaoBaseline(dados.baseline),
  };
}