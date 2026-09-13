/**
 * SPRINT 27.1 — INTELLIGENCE FABRIC (camada acima do Orchestrator, pura).
 *
 * O Fabric não calcula inteligência e não decide nada de negócio. Ele coordena:
 * mede o custo de cada motor, versiona pipelines, encontra gargalos, simula
 * falhas e expõe o estado de execução em tempo real.
 *
 * Regras invioláveis (ADR-030):
 * 1. Nada de estimativa inventada: sem medição, o número é `null` e a lacuna é
 *    declarada (ADR-019/ADR-021). Tempo economizado só existe com duração medida.
 * 2. O Fabric só reordena execução dentro da ordem topológica do Orchestrator —
 *    nunca altera a semântica do fluxo (ADR-029).
 * 3. Versão de pipeline deriva de assinatura determinística das dependências;
 *    mudança de dependência é sempre uma versão nova, nunca uma edição silenciosa.
 * 4. Custo é reportado em tempo medido e chamadas contadas. CPU e memória não são
 *    observáveis no runtime serverless: declaradas como lacuna, não estimadas.
 */

import {
  CONTEXTOS,
  DEPENDENCIAS,
  analisarImpacto,
  contextoLabels,
  grafoDependencias,
  type Contexto,
  type Dependencia,
  type ExecucaoContexto,
  type PlanoRecalculo,
} from "@/lib/platform/orchestrator";

export const VERSAO_FABRIC = "27.1.0";

/** CPU e memória não são observáveis no runtime serverless desta plataforma. */
export const LACUNA_RECURSOS =
  "CPU e memória não são observáveis no runtime desta plataforma; o custo é reportado em tempo medido e chamadas contadas.";

const mediana = (valores: number[]): number | null => {
  if (!valores.length) return null;
  const s = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(s.length / 2);
  return s.length % 2 ? s[meio]! : Math.round((s[meio - 1]! + s[meio]!) / 2);
};

const percentil = (valores: number[], p: number): number | null => {
  if (!valores.length) return null;
  const s = [...valores].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1);
  return s[Math.max(0, i)]!;
};

const soma = (valores: (number | null)[]): number | null => {
  const medidos = valores.filter((v): v is number => v != null);
  return medidos.length ? medidos.reduce((a, b) => a + b, 0) : null;
};

/* ------------------------------------------------------------------ *
 * GATE 01 — Dependency Optimizer (medição por contexto)
 * ------------------------------------------------------------------ */

export type Amostra = {
  contexto: Contexto;
  duracaoMs: number | null;
  ok: boolean;
  em: string | null;
};

export type MetricaContexto = {
  contexto: Contexto;
  rotulo: string;
  execucoes: number;
  sucessos: number;
  falhas: number;
  duracaoMedianaMs: number | null;
  duracaoP95Ms: number | null;
  duracaoTotalMs: number | null;
  ultimaEm: string | null;
  /** Sem duração medida: o contexto não entra em nenhum cálculo de custo. */
  semMedicao: boolean;
  dependentes: number;
};

export function metricasPorContexto(
  amostras: Amostra[],
  dependencias: readonly Dependencia[] = DEPENDENCIAS,
): MetricaContexto[] {
  const dependentes = new Map<Contexto, number>(CONTEXTOS.map((c) => [c, 0]));
  for (const c of CONTEXTOS) {
    dependentes.set(c, analisarImpacto(c, dependencias).afetados.length);
  }

  return CONTEXTOS.map((contexto) => {
    const minhas = amostras.filter((a) => a.contexto === contexto);
    const duracoes = minhas
      .map((a) => a.duracaoMs)
      .filter((d): d is number => d != null && Number.isFinite(d) && d >= 0);
    const datas = minhas.map((a) => a.em).filter((e): e is string => !!e).sort();

    return {
      contexto,
      rotulo: contextoLabels[contexto],
      execucoes: minhas.length,
      sucessos: minhas.filter((a) => a.ok).length,
      falhas: minhas.filter((a) => !a.ok).length,
      duracaoMedianaMs: mediana(duracoes),
      duracaoP95Ms: percentil(duracoes, 95),
      duracaoTotalMs: duracoes.length ? duracoes.reduce((a, b) => a + b, 0) : null,
      ultimaEm: datas.length ? datas[datas.length - 1]! : null,
      semMedicao: duracoes.length === 0,
      dependentes: dependentes.get(contexto) ?? 0,
    };
  });
}

export type CacheEstatistica = {
  hits: number;
  misses: number;
  /** null quando o plano não avaliou nenhum contexto. */
  taxaHit: number | null;
  recalculosEvitados: number;
  /** Soma das medianas medidas dos contextos reaproveitados. */
  tempoEconomizadoMs: number | null;
  /** Contextos reaproveitados sem duração medida — economia não quantificável. */
  semMedicao: Contexto[];
};

export function estatisticaCache(
  plano: PlanoRecalculo,
  metricas: MetricaContexto[],
): CacheEstatistica {
  const porContexto = new Map(metricas.map((m) => [m.contexto, m]));
  const hits = plano.reaproveitar.length;
  const misses = plano.recalcular.length;
  const total = hits + misses;

  const economias = plano.reaproveitar.map((c) => porContexto.get(c)?.duracaoMedianaMs ?? null);
  const semMedicao = plano.reaproveitar.filter(
    (c) => (porContexto.get(c)?.duracaoMedianaMs ?? null) == null,
  );

  return {
    hits,
    misses,
    taxaHit: total === 0 ? null : Math.round((hits / total) * 100),
    recalculosEvitados: hits,
    tempoEconomizadoMs: soma(economias),
    semMedicao,
  };
}

export type NivelExecucao = {
  nivel: number;
  contextos: Contexto[];
  /** Duração do nível = etapa mais lenta (execução paralela). */
  duracaoMs: number | null;
};

export type OtimizacaoOrdem = {
  ordemAtual: Contexto[];
  niveis: NivelExecucao[];
  /** Soma das durações se tudo rodar em série. */
  duracaoSerialMs: number | null;
  /** Caminho crítico respeitando as dependências. */
  duracaoCriticaMs: number | null;
  ganhoEstimadoMs: number | null;
  observacoes: string[];
};

/**
 * Agrupa a ordem topológica em níveis paralelizáveis. Não muda a semântica do
 * fluxo: apenas identifica contextos sem dependência entre si.
 */
export function otimizarOrdem(
  metricas: MetricaContexto[],
  dependencias: readonly Dependencia[] = DEPENDENCIAS,
): OtimizacaoOrdem {
  const grafo = grafoDependencias(dependencias);
  const observacoes: string[] = [];
  if (grafo.ciclos.length) {
    observacoes.push("Fluxo com ciclo detectado; otimização suspensa até a correção (ADR-029).");
    return {
      ordemAtual: grafo.ordem,
      niveis: [],
      duracaoSerialMs: null,
      duracaoCriticaMs: null,
      ganhoEstimadoMs: null,
      observacoes,
    };
  }

  const entradas = new Map<Contexto, Contexto[]>(CONTEXTOS.map((c) => [c, []]));
  for (const d of dependencias) entradas.get(d.para)!.push(d.de);

  const nivelDe = new Map<Contexto, number>();
  for (const ctx of grafo.ordem) {
    const pais = entradas.get(ctx)!;
    const nivel = pais.length ? Math.max(...pais.map((p) => (nivelDe.get(p) ?? 0) + 1)) : 0;
    nivelDe.set(ctx, nivel);
  }

  const porContexto = new Map(metricas.map((m) => [m.contexto, m]));
  const maxNivel = Math.max(0, ...[...nivelDe.values()]);
  const niveis: NivelExecucao[] = [];
  for (let n = 0; n <= maxNivel; n += 1) {
    const contextos = grafo.ordem.filter((c) => nivelDe.get(c) === n);
    if (!contextos.length) continue;
    const medidos = contextos
      .map((c) => porContexto.get(c)?.duracaoMedianaMs ?? null)
      .filter((d): d is number => d != null);
    niveis.push({
      nivel: n + 1,
      contextos,
      duracaoMs: medidos.length ? Math.max(...medidos) : null,
    });
  }

  const duracaoSerialMs = soma(grafo.ordem.map((c) => porContexto.get(c)?.duracaoMedianaMs ?? null));
  const duracaoCriticaMs = soma(niveis.map((n) => n.duracaoMs));

  const semMedicao = metricas.filter((m) => m.semMedicao).map((m) => m.rotulo);
  if (semMedicao.length) {
    observacoes.push(`Sem duração medida em: ${semMedicao.join(", ")}. Ganho calculado apenas sobre o medido.`);
  }
  if (niveis.some((n) => n.contextos.length > 1)) {
    const paralelos = niveis.filter((n) => n.contextos.length > 1).length;
    observacoes.push(`${paralelos} nível(is) com contextos independentes — podem executar em paralelo.`);
  }

  return {
    ordemAtual: grafo.ordem,
    niveis,
    duracaoSerialMs,
    duracaoCriticaMs,
    ganhoEstimadoMs:
      duracaoSerialMs == null || duracaoCriticaMs == null
        ? null
        : Math.max(0, duracaoSerialMs - duracaoCriticaMs),
    observacoes,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 02 — Pipeline Profiler
 * ------------------------------------------------------------------ */

export type Pipeline = {
  id: string;
  rotulo: string;
  entregavel: string;
  /** Etapas na ordem de execução; sempre um caminho válido no DAG. */
  etapas: Contexto[];
};

export const PIPELINES: readonly Pipeline[] = [
  {
    id: "advisor",
    rotulo: "Ferragano Advisor",
    entregavel: "Briefing executivo",
    etapas: ["dominio", "market", "behavior", "evidence", "recommendation", "advisor"],
  },
  {
    id: "radar",
    rotulo: "Executive Radar",
    entregavel: "Radar executivo",
    etapas: ["dominio", "market", "advisor", "knowledge", "executive"],
  },
  {
    id: "forecast",
    rotulo: "Forecast",
    entregavel: "Previsão de vendas",
    etapas: ["dominio", "behavior", "evidence", "executive"],
  },
  {
    id: "recommendation",
    rotulo: "Recommendation Engine",
    entregavel: "Recomendações ranqueadas",
    etapas: ["dominio", "behavior", "evidence", "recommendation"],
  },
];

export const pipelinePorId = (id: string): Pipeline | null =>
  PIPELINES.find((p) => p.id === id) ?? null;

export type EtapaPerfil = {
  contexto: Contexto;
  rotulo: string;
  duracaoMs: number | null;
  /** Participação no tempo total do pipeline. */
  percentual: number | null;
  gargalo: boolean;
  semMedicao: boolean;
};

export type PerfilPipeline = {
  pipeline: Pipeline;
  etapas: EtapaPerfil[];
  totalMs: number | null;
  gargalo: Contexto | null;
  /** % de etapas com duração medida. */
  cobertura: number;
  lacunas: string[];
};

export function perfilPipeline(
  pipelineId: string,
  metricas: MetricaContexto[],
): PerfilPipeline | null {
  const pipeline = pipelinePorId(pipelineId);
  if (!pipeline) return null;

  const porContexto = new Map(metricas.map((m) => [m.contexto, m]));
  const duracoes = pipeline.etapas.map((c) => porContexto.get(c)?.duracaoMedianaMs ?? null);
  const totalMs = soma(duracoes);
  const medidos = duracoes.filter((d): d is number => d != null);
  const maior = medidos.length ? Math.max(...medidos) : null;

  const etapas: EtapaPerfil[] = pipeline.etapas.map((contexto, i) => {
    const duracaoMs = duracoes[i] ?? null;
    return {
      contexto,
      rotulo: contextoLabels[contexto],
      duracaoMs,
      percentual:
        duracaoMs == null || totalMs == null || totalMs === 0
          ? null
          : Math.round((duracaoMs / totalMs) * 100),
      gargalo: duracaoMs != null && maior != null && duracaoMs === maior && medidos.length > 1,
      semMedicao: duracaoMs == null,
    };
  });

  const semMedicao = etapas.filter((e) => e.semMedicao);
  const lacunas = semMedicao.length
    ? [`${semMedicao.length} de ${etapas.length} etapas sem duração medida: ${semMedicao.map((e) => e.rotulo).join(", ")}.`]
    : [];

  return {
    pipeline,
    etapas,
    totalMs,
    gargalo: etapas.find((e) => e.gargalo)?.contexto ?? null,
    cobertura: Math.round(((etapas.length - semMedicao.length) / etapas.length) * 100),
    lacunas,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 03 — Pipeline Versioning
 * ------------------------------------------------------------------ */

/** Hash determinístico (djb2) — versão de pipeline não depende de relógio. */
export function assinaturaPipeline(
  pipelineId: string,
  dependencias: readonly Dependencia[] = DEPENDENCIAS,
): string {
  const pipeline = pipelinePorId(pipelineId);
  const etapas = pipeline ? pipeline.etapas : [];
  const relevantes = dependencias
    .filter((d) => etapas.includes(d.de) && etapas.includes(d.para))
    .map((d) => `${d.de}>${d.para}@${d.algoritmo}`)
    .sort();
  const base = [pipelineId, ...etapas, ...relevantes].join("|");

  let h = 5381;
  for (let i = 0; i < base.length; i += 1) h = ((h << 5) + h + base.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

export type VersaoPipeline = {
  pipeline: string;
  versao: string;
  assinatura: string;
  /** Arestas que compõem esta versão. */
  arestas: string[];
  registradaEm: string;
  nota: string;
};

/** Histórico declarado em código: cada sprint que altera o fluxo registra a versão. */
export const HISTORICO_PIPELINES: readonly VersaoPipeline[] = PIPELINES.map((p) => ({
  pipeline: p.id,
  versao: "v1.0",
  assinatura: assinaturaPipeline(p.id),
  arestas: DEPENDENCIAS.filter((d) => p.etapas.includes(d.de) && p.etapas.includes(d.para))
    .map((d) => `${d.de}>${d.para}`)
    .sort(),
  registradaEm: "2026-08-01T00:00:00.000Z",
  nota: "Fluxo certificado na Sprint 27 (ADR-029) e versionado na Sprint 27.1.",
}));

export type EstadoVersao = {
  pipeline: string;
  rotulo: string;
  versaoAtiva: string;
  assinaturaAtual: string;
  /** true quando a assinatura calculada difere da última versão registrada. */
  divergente: boolean;
  proximaVersao: string | null;
  arestasAdicionadas: string[];
  arestasRemovidas: string[];
  historico: VersaoPipeline[];
};

export function versionarPipeline(
  pipelineId: string,
  dependencias: readonly Dependencia[] = DEPENDENCIAS,
  historico: readonly VersaoPipeline[] = HISTORICO_PIPELINES,
): EstadoVersao | null {
  const pipeline = pipelinePorId(pipelineId);
  if (!pipeline) return null;

  const meu = historico.filter((h) => h.pipeline === pipelineId);
  const ultima = meu[meu.length - 1] ?? null;
  const assinaturaAtual = assinaturaPipeline(pipelineId, dependencias);
  const arestasAtuais = dependencias
    .filter((d) => pipeline.etapas.includes(d.de) && pipeline.etapas.includes(d.para))
    .map((d) => `${d.de}>${d.para}`)
    .sort();
  const anteriores = ultima?.arestas ?? [];
  const divergente = !ultima || ultima.assinatura !== assinaturaAtual;

  const proxima = (() => {
    if (!divergente) return null;
    if (!ultima) return "v1.0";
    const m = /^v(\d+)\.(\d+)$/.exec(ultima.versao);
    return m ? `v${m[1]}.${Number(m[2]) + 1}` : "v1.1";
  })();

  return {
    pipeline: pipelineId,
    rotulo: pipeline.rotulo,
    versaoAtiva: ultima?.versao ?? "não registrada",
    assinaturaAtual,
    divergente,
    proximaVersao: proxima,
    arestasAdicionadas: arestasAtuais.filter((a) => !anteriores.includes(a)),
    arestasRemovidas: anteriores.filter((a) => !arestasAtuais.includes(a)),
    historico: meu,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 04 — Cost Engine
 * ------------------------------------------------------------------ */

export type CustoPipeline = {
  pipeline: string;
  rotulo: string;
  entregavel: string;
  tempoMs: number | null;
  chamadas: number;
  etapas: number;
  falhas: number;
  /** Participação no custo total medido dos pipelines. */
  participacao: number | null;
  semMedicao: boolean;
};

export type Custos = {
  itens: CustoPipeline[];
  tempoTotalMs: number | null;
  chamadasTotais: number;
  maisCaro: string | null;
  lacunas: string[];
};

export function custoPipelines(metricas: MetricaContexto[]): Custos {
  const porContexto = new Map(metricas.map((m) => [m.contexto, m]));

  const brutos = PIPELINES.map((p) => {
    const tempoMs = soma(p.etapas.map((c) => porContexto.get(c)?.duracaoMedianaMs ?? null));
    return {
      pipeline: p.id,
      rotulo: p.rotulo,
      entregavel: p.entregavel,
      tempoMs,
      chamadas: p.etapas.reduce((acc, c) => acc + (porContexto.get(c)?.execucoes ?? 0), 0),
      etapas: p.etapas.length,
      falhas: p.etapas.reduce((acc, c) => acc + (porContexto.get(c)?.falhas ?? 0), 0),
      semMedicao: tempoMs == null,
    };
  });

  const tempoTotalMs = soma(brutos.map((b) => b.tempoMs));
  const itens: CustoPipeline[] = brutos.map((b) => ({
    ...b,
    participacao:
      b.tempoMs == null || tempoTotalMs == null || tempoTotalMs === 0
        ? null
        : Math.round((b.tempoMs / tempoTotalMs) * 100),
  }));

  const medidos = itens.filter((i) => i.tempoMs != null);
  const maisCaro = medidos.length
    ? medidos.reduce((a, b) => (b.tempoMs! > a.tempoMs! ? b : a)).pipeline
    : null;

  const lacunas = [LACUNA_RECURSOS];
  const sem = itens.filter((i) => i.semMedicao).map((i) => i.rotulo);
  if (sem.length) lacunas.push(`Sem tempo medido em: ${sem.join(", ")}.`);

  return { itens, tempoTotalMs, chamadasTotais: itens.reduce((a, i) => a + i.chamadas, 0), maisCaro, lacunas };
}

/* ------------------------------------------------------------------ *
 * GATE 05 — Dependency Heat Map
 * ------------------------------------------------------------------ */

export type FaixaCalor = {
  contexto: Contexto;
  rotulo: string;
  duracaoMs: number | null;
  dependentes: number;
  /** 0–10 blocos, proporcional ao tempo medido. */
  blocos: number;
  barra: string;
  /** Lento e com muitos dependentes. */
  gargalo: boolean;
  semMedicao: boolean;
};

export function mapaCalor(metricas: MetricaContexto[]): {
  faixas: FaixaCalor[];
  gargalos: Contexto[];
  referenciaMs: number | null;
} {
  const medidos = metricas
    .map((m) => m.duracaoMedianaMs)
    .filter((d): d is number => d != null);
  const referenciaMs = medidos.length ? Math.max(...medidos) : null;

  const faixas: FaixaCalor[] = metricas
    .map((m) => {
      const blocos =
        m.duracaoMedianaMs == null || referenciaMs == null || referenciaMs === 0
          ? 0
          : Math.max(1, Math.round((m.duracaoMedianaMs / referenciaMs) * 10));
      return {
        contexto: m.contexto,
        rotulo: m.rotulo,
        duracaoMs: m.duracaoMedianaMs,
        dependentes: m.dependentes,
        blocos,
        barra: "█".repeat(blocos),
        gargalo: blocos >= 7 && m.dependentes >= 2,
        semMedicao: m.semMedicao,
      };
    })
    .sort((a, b) => b.blocos - a.blocos || a.rotulo.localeCompare(b.rotulo));

  return { faixas, gargalos: faixas.filter((f) => f.gargalo).map((f) => f.contexto), referenciaMs };
}

/* ------------------------------------------------------------------ *
 * GATE 06 — Pipeline Simulator
 * ------------------------------------------------------------------ */

export type PipelineAfetado = {
  pipeline: string;
  rotulo: string;
  entregavel: string;
  etapaFaltante: Contexto;
  /** Etapas que ainda executariam antes da interrupção. */
  etapasPreservadas: Contexto[];
};

export type Simulacao = {
  desligado: Contexto;
  rotulo: string;
  indisponiveis: { contexto: Contexto; rotulo: string; profundidade: number; caminho: Contexto[] }[];
  operacionais: Contexto[];
  pipelinesAfetados: PipelineAfetado[];
  pipelinesIntactos: string[];
  severidade: "critico" | "alto" | "moderado" | "baixo";
  resumo: string;
};

/** Responde: "se este motor falhar/for desligado, o que para de funcionar?". */
export function simularFalha(
  desligado: Contexto,
  dependencias: readonly Dependencia[] = DEPENDENCIAS,
): Simulacao {
  const impacto = analisarImpacto(desligado, dependencias);
  const indisponiveis = impacto.afetados.map((a) => ({
    contexto: a.contexto,
    rotulo: contextoLabels[a.contexto],
    profundidade: a.profundidade,
    caminho: a.caminho,
  }));

  const afetadosSet = new Set<Contexto>([desligado, ...indisponiveis.map((i) => i.contexto)]);

  const pipelinesAfetados: PipelineAfetado[] = [];
  const pipelinesIntactos: string[] = [];
  for (const p of PIPELINES) {
    const idx = p.etapas.findIndex((e) => afetadosSet.has(e));
    if (idx === -1) {
      pipelinesIntactos.push(p.rotulo);
      continue;
    }
    pipelinesAfetados.push({
      pipeline: p.id,
      rotulo: p.rotulo,
      entregavel: p.entregavel,
      etapaFaltante: p.etapas[idx]!,
      etapasPreservadas: p.etapas.slice(0, idx),
    });
  }

  const severidade: Simulacao["severidade"] =
    pipelinesAfetados.length === PIPELINES.length
      ? "critico"
      : pipelinesAfetados.length >= 2
        ? "alto"
        : pipelinesAfetados.length === 1
          ? "moderado"
          : "baixo";

  const resumo =
    pipelinesAfetados.length === 0
      ? `Desligar ${contextoLabels[desligado]} não interrompe nenhum entregável mapeado.`
      : `Desligar ${contextoLabels[desligado]} interrompe ${pipelinesAfetados.length} de ${PIPELINES.length} entregáveis e deixa ${indisponiveis.length} contexto(s) sem insumo.`;

  return {
    desligado,
    rotulo: contextoLabels[desligado],
    indisponiveis,
    operacionais: impacto.intactos,
    pipelinesAfetados,
    pipelinesIntactos,
    severidade,
    resumo,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 07 — Runtime Knowledge Graph
 * ------------------------------------------------------------------ */

export type EstadoRuntime = "recalculado" | "aguardando" | "falhou" | "reaproveitado" | "ocioso";

export const estadoLabels: Record<EstadoRuntime, string> = {
  recalculado: "Recalculado",
  aguardando: "Aguardando",
  falhou: "Falhou",
  reaproveitado: "Reaproveitado (cache)",
  ocioso: "Ocioso",
};

export type NoRuntime = {
  contexto: Contexto;
  rotulo: string;
  estado: EstadoRuntime;
  em: string | null;
  duracaoMs: number | null;
  dependeDe: Contexto[];
  dependentes: Contexto[];
  motivo: string;
};

export type GrafoRuntime = {
  nos: NoRuntime[];
  recalculados: number;
  aguardando: number;
  falhas: number;
  reaproveitados: number;
  /** Cadeia inteira propagada: nada aguardando e nada falhando. */
  vivo: boolean;
};

/** Grafo vivo: cruza o plano do Orchestrator com as execuções observadas. */
export function grafoRuntime(
  plano: PlanoRecalculo,
  execucoes: ExecucaoContexto[],
  dependencias: readonly Dependencia[] = DEPENDENCIAS,
): GrafoRuntime {
  const entradas = new Map<Contexto, Contexto[]>(CONTEXTOS.map((c) => [c, []]));
  const saidas = new Map<Contexto, Contexto[]>(CONTEXTOS.map((c) => [c, []]));
  for (const d of dependencias) {
    entradas.get(d.para)!.push(d.de);
    saidas.get(d.de)!.push(d.para);
  }

  const porContexto = new Map<Contexto, ExecucaoContexto>();
  for (const e of execucoes) {
    const atual = porContexto.get(e.contexto);
    if (!atual || (e.em ?? "") > (atual.em ?? "")) porContexto.set(e.contexto, e);
  }

  const recalcular = new Set(plano.recalcular);
  const reaproveitar = new Set(plano.reaproveitar);

  const nos: NoRuntime[] = CONTEXTOS.map((contexto) => {
    const exec = porContexto.get(contexto) ?? null;
    let estado: EstadoRuntime;
    let motivo: string;

    if (exec && !exec.ok) {
      estado = "falhou";
      motivo = exec.detalhe ? `Última execução falhou (${exec.detalhe}).` : "Última execução falhou.";
    } else if (recalcular.has(contexto)) {
      if (exec?.ok) {
        estado = "recalculado";
        motivo = "Evento propagado e execução concluída.";
      } else {
        estado = "aguardando";
        motivo = "Evento propagado, sem execução registrada ainda.";
      }
    } else if (reaproveitar.has(contexto)) {
      estado = "reaproveitado";
      motivo = "Nenhum evento alcançou este contexto; resultado em cache continua válido.";
    } else {
      estado = "ocioso";
      motivo = "Fora do plano atual: sem evento e sem cache avaliado.";
    }

    return {
      contexto,
      rotulo: contextoLabels[contexto],
      estado,
      em: exec?.em ?? null,
      duracaoMs: exec?.duracaoMs ?? null,
      dependeDe: [...new Set(entradas.get(contexto)!)],
      dependentes: [...new Set(saidas.get(contexto)!)],
      motivo,
    };
  });

  const conta = (e: EstadoRuntime) => nos.filter((n) => n.estado === e).length;

  return {
    nos,
    recalculados: conta("recalculado"),
    aguardando: conta("aguardando"),
    falhas: conta("falhou"),
    reaproveitados: conta("reaproveitado"),
    vivo: conta("aguardando") === 0 && conta("falhou") === 0,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 08 — Executive Fabric Dashboard
 * ------------------------------------------------------------------ */

export type SaudeFabric = {
  /** Execuções bem-sucedidas sobre o total observado. */
  eficiencia: number | null;
  taxaHit: number | null;
  recalculosEvitados: number;
  tempoEconomizadoMs: number | null;
  economiaPlano: number;
  pipelinesSaudaveis: number;
  pipelinesTotal: number;
  versoesAtivas: number;
  versoesDivergentes: string[];
  tempoMedioPipelineMs: number | null;
  gargalos: Contexto[];
  /** Média das dimensões medíveis; null quando nada é medível. */
  score: number | null;
  lacunas: string[];
};

export function saudeFabric(entrada: {
  metricas: MetricaContexto[];
  plano: PlanoRecalculo;
  cache: CacheEstatistica;
  perfis: PerfilPipeline[];
  versoes: EstadoVersao[];
  runtime: GrafoRuntime;
}): SaudeFabric {
  const { metricas, plano, cache, perfis, versoes, runtime } = entrada;

  const execucoes = metricas.reduce((a, m) => a + m.execucoes, 0);
  const sucessos = metricas.reduce((a, m) => a + m.sucessos, 0);
  const eficiencia = execucoes === 0 ? null : Math.round((sucessos / execucoes) * 100);

  const tempos = perfis.map((p) => p.totalMs).filter((t): t is number => t != null);
  const tempoMedioPipelineMs = tempos.length
    ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)
    : null;

  const pipelinesSaudaveis = perfis.filter((p) => p.cobertura === 100 && p.lacunas.length === 0).length;
  const divergentes = versoes.filter((v) => v.divergente);
  const { gargalos } = mapaCalor(metricas);

  const lacunas: string[] = [LACUNA_RECURSOS];
  if (eficiencia == null) lacunas.push("Nenhuma execução observada na janela: eficiência não calculada.");
  if (cache.taxaHit == null) lacunas.push("Plano sem contextos avaliados: taxa de reutilização não calculada.");
  if (cache.semMedicao.length) {
    lacunas.push(`Economia não quantificada em ${cache.semMedicao.length} contexto(s) reaproveitado(s) sem duração medida.`);
  }
  if (tempoMedioPipelineMs == null) lacunas.push("Nenhum pipeline com tempo medido em todas as etapas.");
  if (divergentes.length) {
    lacunas.push(`Pipelines com assinatura divergente da versão registrada: ${divergentes.map((v) => v.rotulo).join(", ")}.`);
  }
  if (runtime.falhas > 0) lacunas.push(`${runtime.falhas} contexto(s) com falha na última execução.`);

  const dimensoes: number[] = [];
  if (eficiencia != null) dimensoes.push(eficiencia);
  if (cache.taxaHit != null) dimensoes.push(cache.taxaHit);
  dimensoes.push(Math.round((pipelinesSaudaveis / Math.max(1, perfis.length)) * 100));
  dimensoes.push(divergentes.length === 0 ? 100 : Math.round(((versoes.length - divergentes.length) / Math.max(1, versoes.length)) * 100));
  dimensoes.push(runtime.nos.length === 0 ? 0 : Math.round(((runtime.nos.length - runtime.falhas) / runtime.nos.length) * 100));

  return {
    eficiencia,
    taxaHit: cache.taxaHit,
    recalculosEvitados: cache.recalculosEvitados,
    tempoEconomizadoMs: cache.tempoEconomizadoMs,
    economiaPlano: plano.economia,
    pipelinesSaudaveis,
    pipelinesTotal: perfis.length,
    versoesAtivas: versoes.filter((v) => !v.divergente).length,
    versoesDivergentes: divergentes.map((v) => v.rotulo),
    tempoMedioPipelineMs,
    gargalos,
    score: dimensoes.length ? Math.round(dimensoes.reduce((a, b) => a + b, 0) / dimensoes.length) : null,
    lacunas,
  };
}
