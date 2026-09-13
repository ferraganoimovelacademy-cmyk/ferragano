/**
 * SPRINT 21 — Recommendation Engine (contratos client-safe, lógica pura).
 *
 * A Sprint 20 respondeu "em qual evidência confiar?". Aqui respondemos
 * "o que fazer PRIMEIRO, com qual urgência, e a recomendação de fato
 * melhorou algo?".
 *
 * Nenhum LLM: modelo de decisão explícito sobre os números já auditados
 * (`automation_daily_metrics`, ADR-017; confiança estatística, ADR-018).
 * Ausência de evidência continua sendo `null`, nunca zero (ADR-019).
 */

import type {
  RecomendacaoPriorizada,
  RecomendacaoTipo,
} from "@/lib/platform/decision-intelligence";

/* ------------------------------------------------------------------ *
 * GATE 02 — Business Priority: impacto × urgência (matriz Eisenhower)
 * ------------------------------------------------------------------ */

export const QUADRANTES = ["agir_agora", "planejar", "delegar", "monitorar"] as const;
export type Quadrante = (typeof QUADRANTES)[number];

export const quadranteLabels: Record<Quadrante, string> = {
  agir_agora: "Agir agora",
  planejar: "Planejar",
  delegar: "Delegar",
  monitorar: "Monitorar",
};

export const quadranteCores: Record<Quadrante, string> = {
  agir_agora: "bg-destructive/15 text-destructive",
  planejar: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  delegar: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  monitorar: "bg-muted text-muted-foreground",
};

/** Acima disso a dimensão é considerada alta na matriz. */
export const LIMITE_ALTO = 50;

/**
 * Urgência base por tipo: quanto o problema piora se ficar parado.
 * Falha e fila crescem sozinhas; consolidar e ampliar não.
 */
const URGENCIA_BASE: Record<RecomendacaoTipo, number> = {
  revisar_gatilho: 85,
  alterar_delay: 70,
  eliminar: 35,
  consolidar: 30,
  ampliar: 45,
};

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Impacto = tamanho esperado do ganho, medido no que a linha já provou:
 * horas/mês afetadas e/ou fração de volume reduzida, ponderadas pela
 * confiança da evidência. Sem confiança, o impacto não sobe.
 */
export function impactoEsperado(rec: RecomendacaoPriorizada): number {
  const horas = rec.forecast.horasMes ?? 0;
  // 40 h/mês (uma semana de trabalho) satura a escala de tempo.
  const porTempo = clamp(horas / 40, 0, 1);
  const porVolume = clamp(rec.forecast.reducao ?? 0, 0, 1);
  const bruto = Math.max(porTempo, porVolume);
  const evidenciado = bruto * clamp(rec.confianca / 100, 0, 1);
  // Piso pelo score já calculado na Sprint 20: nunca perder um problema grave
  // só porque a previsão não tinha número de tempo.
  return Math.round(clamp(Math.max(evidenciado * 100, rec.score * 0.5), 0, 100));
}

/** Urgência = pressa, não tamanho. Deriva do tipo e da confiança. */
export function urgencia(rec: RecomendacaoPriorizada): number {
  const base = URGENCIA_BASE[rec.tipo];
  return Math.round(clamp(base * (0.6 + 0.4 * clamp(rec.confianca / 100, 0, 1)), 0, 100));
}

export function quadranteDe(impacto: number, urg: number): Quadrante {
  if (impacto >= LIMITE_ALTO && urg >= LIMITE_ALTO) return "agir_agora";
  if (impacto >= LIMITE_ALTO) return "planejar";
  if (urg >= LIMITE_ALTO) return "delegar";
  return "monitorar";
}

/* ------------------------------------------------------------------ *
 * GATE 01 — Recommendation Ranking
 * ------------------------------------------------------------------ */

export type RecomendacaoRankeada = RecomendacaoPriorizada & {
  /** 1 = primeira coisa a fazer. */
  posicao: number;
  impacto: number;
  urgencia: number;
  quadrante: Quadrante;
  /** Nota final 0..100 usada na ordenação. */
  prioridade: number;
  /** Chave estável de memória (GATE 04). */
  chave: string;
};

/** Chave de memória: uma recomendação por tipo e por regra. */
export function chaveRecomendacao(rec: RecomendacaoPriorizada): string {
  return `${rec.tipo}:${rec.ruleId}`;
}

/** Payload de sincronização da fila com a memória (GATE 04). */
export type RecommendationSyncItem = {
  chave: string;
  tipo: string;
  score: number;
  impacto: number;
  urgencia: number;
  quadrante: string;
  confianca?: number | null;
  ruleId?: string | null;
  ruleNome?: string | null;
  mensagem?: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Converte a fila rankeada em payload de memória. Recomendações de grupo
 * (`consolidar`) não têm ruleId real — vão sem referência de regra.
 */
export function paraMemoria(recs: RecomendacaoRankeada[]): RecommendationSyncItem[] {
  return recs.map((rec) => ({
    chave: rec.chave,
    tipo: rec.tipo,
    score: rec.prioridade,
    impacto: rec.impacto,
    urgencia: rec.urgencia,
    quadrante: rec.quadrante,
    confianca: Math.round(rec.confianca),
    ruleId: UUID.test(rec.ruleId) ? rec.ruleId : null,
    ruleNome: rec.nome.slice(0, 160),
    mensagem: rec.mensagem.slice(0, 600),
  }));
}

/**
 * Ordena a fila por prioridade esperada = impacto (60%) + urgência (40%),
 * ainda modulada pela confiança. Empate resolve pelo score da Sprint 20.
 */
export function rankearRecomendacoes(
  recs: RecomendacaoPriorizada[],
): RecomendacaoRankeada[] {
  return recs
    .map((rec) => {
      const imp = impactoEsperado(rec);
      const urg = urgencia(rec);
      const prioridade = Math.round(
        clamp((imp * 0.6 + urg * 0.4) * clamp(0.5 + rec.confianca / 200, 0, 1), 0, 100),
      );
      return {
        ...rec,
        impacto: imp,
        urgencia: urg,
        quadrante: quadranteDe(imp, urg),
        prioridade,
        chave: chaveRecomendacao(rec),
        posicao: 0,
      };
    })
    .sort(
      (a, b) =>
        b.prioridade - a.prioridade || b.score - a.score || a.nome.localeCompare(b.nome),
    )
    .map((rec, i) => ({ ...rec, posicao: i + 1 }));
}

/* ------------------------------------------------------------------ *
 * GATE 04 — Recommendation Memory (ciclo de vida)
 * ------------------------------------------------------------------ */

export const RECOMMENDATION_STATUS = [
  "gerada",
  "vista",
  "aceita",
  "implementada",
  "descartada",
  "arquivada",
] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUS)[number];

export const recommendationStatusLabels: Record<RecommendationStatus, string> = {
  gerada: "Gerada",
  vista: "Visualizada",
  aceita: "Aceita",
  implementada: "Implementada",
  descartada: "Descartada",
  arquivada: "Arquivada",
};

export const RECOMMENDATION_RESULTS = ["indefinido", "melhorou", "neutro", "piorou"] as const;
export type RecommendationResult = (typeof RECOMMENDATION_RESULTS)[number];

export const recommendationResultLabels: Record<RecommendationResult, string> = {
  indefinido: "Sem desfecho",
  melhorou: "Melhorou",
  neutro: "Sem mudança",
  piorou: "Piorou",
};

export const recommendationResultCores: Record<RecommendationResult, string> = {
  indefinido: "bg-muted text-muted-foreground",
  melhorou: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  neutro: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  piorou: "bg-destructive/15 text-destructive",
};

export type RecommendationRow = {
  id: string;
  workspaceId: string;
  chave: string;
  tipo: string;
  ruleId: string | null;
  ruleNome: string | null;
  mensagem: string | null;
  score: number;
  confianca: number | null;
  impacto: number;
  urgencia: number;
  quadrante: Quadrante | null;
  status: RecommendationStatus;
  resultado: RecommendationResult;
  ocorrencias: number;
  geradaEm: string;
  vistaEm: string | null;
  aceitaEm: string | null;
  implementadaEm: string | null;
  avaliadaEm: string | null;
  fechadaEm: string | null;
};

/** Próximo passo legítimo do ciclo — impede pular etapas na UI. */
export function proximosStatus(status: RecommendationStatus): RecommendationStatus[] {
  switch (status) {
    case "gerada":
    case "vista":
      return ["aceita", "descartada"];
    case "aceita":
      return ["implementada", "descartada"];
    case "implementada":
      return ["arquivada"];
    default:
      return [];
  }
}

/* ------------------------------------------------------------------ *
 * GATE 03 e 05 — Learning Feedback + Recommendation Quality
 * ------------------------------------------------------------------ */

/** Variação mínima de score para declarar melhora ou piora. */
export const DELTA_APRENDIZADO = 10;

/**
 * GATE 03 — Learning Feedback puro: compara o score no momento da
 * implementação com o score atual da mesma chave. O problema encolheu?
 * O modelo aprende. Cresceu? Também aprende.
 */
export function resultadoAprendido(
  scoreNaImplementacao: number | null,
  scoreAtual: number | null,
): RecommendationResult {
  if (scoreNaImplementacao === null || scoreAtual === null) return "indefinido";
  if (scoreAtual <= Math.max(0, scoreNaImplementacao - DELTA_APRENDIZADO)) return "melhorou";
  if (scoreAtual >= scoreNaImplementacao + DELTA_APRENDIZADO) return "piorou";
  return "neutro";
}

export type RecommendationQualityTipo = {
  tipo: string;
  total: number;
  aceitas: number;
  implementadas: number;
  avaliadas: number;
  melhoraram: number;
};

export type RecommendationQuality = {
  janelaDias: number;
  desde: string;
  total: number;
  vistas: number;
  aceitas: number;
  implementadas: number;
  descartadas: number;
  avaliadas: number;
  melhoraram: number;
  neutras: number;
  pioraram: number;
  porTipo: RecommendationQualityTipo[];
  geradoEm: string;
};

/** Amostra mínima para publicar a precisão do motor. */
export const AMOSTRA_MINIMA_PRECISAO = 5;

/**
 * GATE 05 — Precisão das recomendações: das que foram implementadas e
 * tiveram desfecho, quantas melhoraram. Sem amostra suficiente, `null`.
 */
export function precisaoRecomendacoes(q: RecommendationQuality | null): number | null {
  if (!q || q.avaliadas < AMOSTRA_MINIMA_PRECISAO) return null;
  return q.melhoraram / q.avaliadas;
}

/** Taxa de aceitação: das geradas, quantas o gestor aceitou. */
export function taxaAceitacao(q: RecommendationQuality | null): number | null {
  if (!q || q.total <= 0) return null;
  return q.aceitas / q.total;
}

/** Taxa de implementação sobre as aceitas — mede execução, não intenção. */
export function taxaImplementacao(q: RecommendationQuality | null): number | null {
  if (!q || q.aceitas <= 0) return null;
  return q.implementadas / q.aceitas;
}

/** Tipos que o gestor costuma ignorar: candidatos a recalibragem de peso. */
export function tiposIgnorados(q: RecommendationQuality | null): RecommendationQualityTipo[] {
  if (!q) return [];
  return q.porTipo
    .filter((t) => t.total >= AMOSTRA_MINIMA_PRECISAO && t.aceitas / t.total < 0.2)
    .sort((a, b) => b.total - a.total);
}