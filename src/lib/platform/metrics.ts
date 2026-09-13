/**
 * SPRINT 11 — Platform Reliability.
 *
 * GATE A5 (Performance Budget) e GATE A6 (Platform Metrics) moram aqui:
 * orçamento declarado em um único lugar, classificação determinística e
 * cálculo do Ferragano Health Score. Nada de I/O — só regra pura, testável.
 */

export type MetricType = "latencia" | "contagem" | "taxa" | "erro" | "duracao";

export type BudgetScope = "frontend" | "backend";

export type BudgetUnit = "ms" | "s" | "kb" | "fps";

export type PerformanceBudget = {
  /** Chave usada em `platform_metrics.metric_name`. */
  key: string;
  label: string;
  scope: BudgetScope;
  /** Meta máxima (ou mínima, quando `higherIsBetter`). */
  budget: number;
  unit: BudgetUnit;
  higherIsBetter?: boolean;
  /** Estourar este orçamento bloqueia o build/release. */
  blocking: boolean;
};

/** GATE A5 — orçamento único da plataforma. Alterar aqui exige ADR. */
export const PERFORMANCE_BUDGETS: readonly PerformanceBudget[] = [
  // Frontend
  { key: "web.fcp", label: "First Contentful Paint", scope: "frontend", budget: 1500, unit: "ms", blocking: true },
  { key: "web.lcp", label: "Largest Contentful Paint", scope: "frontend", budget: 2500, unit: "ms", blocking: true },
  { key: "web.inp", label: "Interaction to Next Paint", scope: "frontend", budget: 200, unit: "ms", blocking: true },
  { key: "bundle.initial", label: "Bundle inicial (gzip)", scope: "frontend", budget: 300, unit: "kb", blocking: true },
  { key: "search.global", label: "Busca global", scope: "frontend", budget: 100, unit: "ms", blocking: true },
  { key: "kanban.fps", label: "Board Kanban", scope: "frontend", budget: 60, unit: "fps", higherIsBetter: true, blocking: false },
  // Backend
  { key: "query.customer_360", label: "People 360", scope: "backend", budget: 200, unit: "ms", blocking: true },
  { key: "query.property_360", label: "Property 360", scope: "backend", budget: 250, unit: "ms", blocking: true },
  { key: "query.sales_360", label: "Sales 360", scope: "backend", budget: 250, unit: "ms", blocking: true },
  { key: "query.executive_360", label: "Executive 360", scope: "backend", budget: 300, unit: "ms", blocking: true },
  { key: "query.decision_center", label: "Decision Center", scope: "backend", budget: 300, unit: "ms", blocking: true },
  { key: "job.read_models_refresh", label: "Refresh Read Models", scope: "backend", budget: 30_000, unit: "ms", blocking: false },
  { key: "job.outbox_worker", label: "Worker Outbox (lote)", scope: "backend", budget: 2000, unit: "ms", blocking: false },
];

export const budgetByKey: Record<string, PerformanceBudget> = Object.fromEntries(
  PERFORMANCE_BUDGETS.map((b) => [b.key, b]),
);

export type BudgetStatus = "dentro" | "atencao" | "estourado" | "sem_dado";

export const budgetStatusLabels: Record<BudgetStatus, string> = {
  dentro: "Dentro do orçamento",
  atencao: "Perto do limite",
  estourado: "Orçamento estourado",
  sem_dado: "Sem medição",
};

export const budgetStatusCores: Record<BudgetStatus, string> = {
  dentro: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  atencao: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  estourado: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  sem_dado: "bg-muted text-muted-foreground",
};

/**
 * Classifica uma medição contra o orçamento.
 * "atenção" começa a 85% da meta (ou 115% do mínimo, quando maior é melhor).
 */
export function classificarBudget(
  budget: PerformanceBudget,
  valor: number | null | undefined,
): BudgetStatus {
  if (valor == null || Number.isNaN(valor)) return "sem_dado";

  if (budget.higherIsBetter) {
    if (valor < budget.budget * 0.9) return "estourado";
    if (valor < budget.budget) return "atencao";
    return "dentro";
  }

  if (valor > budget.budget) return "estourado";
  if (valor >= budget.budget * 0.85) return "atencao";
  return "dentro";
}

/** Estourou orçamento bloqueante = release barrado (ADR-009). */
export function bloqueiaRelease(
  medicoes: Record<string, number | null | undefined>,
): { bloqueado: boolean; violacoes: string[] } {
  const violacoes = PERFORMANCE_BUDGETS.filter(
    (b) => b.blocking && classificarBudget(b, medicoes[b.key]) === "estourado",
  ).map((b) => b.label);

  return { bloqueado: violacoes.length > 0, violacoes };
}

export function formatBudgetValor(unit: BudgetUnit, valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  if (unit === "ms") return valor >= 1000 ? `${(valor / 1000).toFixed(1)} s` : `${Math.round(valor)} ms`;
  if (unit === "s") return `${valor.toFixed(1)} s`;
  if (unit === "kb") return `${Math.round(valor)} KB`;
  return `${Math.round(valor)} FPS`;
}

// =====================================================================
// Ferragano Health Score
// =====================================================================

export type HealthDimension =
  | "arquitetura"
  | "performance"
  | "seguranca"
  | "ux"
  | "qualidade"
  | "operacao";

/** Pesos fixados na Sprint 11. Mudar peso exige ADR. */
export const HEALTH_WEIGHTS: Record<HealthDimension, number> = {
  arquitetura: 20,
  performance: 20,
  seguranca: 20,
  ux: 15,
  qualidade: 15,
  operacao: 10,
};

export const healthDimensionLabels: Record<HealthDimension, string> = {
  arquitetura: "Arquitetura",
  performance: "Performance",
  seguranca: "Segurança",
  ux: "UX",
  qualidade: "Qualidade",
  operacao: "Operação",
};

export type HealthTier = "platinum" | "gold" | "silver" | "action_required";

export const healthTierLabels: Record<HealthTier, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  action_required: "Action Required",
};

export const healthTierCores: Record<HealthTier, string> = {
  platinum: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  gold: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  silver: "bg-muted text-muted-foreground",
  action_required: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export function tierDoScore(score: number): HealthTier {
  if (score >= 96) return "platinum";
  if (score >= 90) return "gold";
  if (score >= 80) return "silver";
  return "action_required";
}

/** Cada dimensão entra como nota 0–100; o score é a média ponderada. */
export function calcularHealthScore(notas: Record<HealthDimension, number>): {
  score: number;
  tier: HealthTier;
  contribuicoes: { dimensao: HealthDimension; nota: number; peso: number; pontos: number }[];
} {
  const contribuicoes = (Object.keys(HEALTH_WEIGHTS) as HealthDimension[]).map((dimensao) => {
    // GATE S03 — dado degradado (NaN/Infinity) nunca contamina o score.
    const bruta = notas[dimensao];
    const nota = Number.isFinite(bruta) ? Math.max(0, Math.min(100, bruta as number)) : 0;
    const peso = HEALTH_WEIGHTS[dimensao];
    return { dimensao, nota, peso, pontos: (nota * peso) / 100 };
  });

  const score = Math.round(contribuicoes.reduce((acc, c) => acc + c.pontos, 0));
  return { score, tier: tierDoScore(score), contribuicoes };
}

/**
 * Nota de performance derivada das medições: cada orçamento vale o mesmo,
 * "dentro" = 100, "atenção" = 70, "estourado" = 0. Sem medição não pontua
 * nem penaliza (evita inventar número, conforme ADR-009).
 */
export function notaDePerformance(medicoes: Record<string, number | null | undefined>): number | null {
  const avaliadas = PERFORMANCE_BUDGETS.map((b) => classificarBudget(b, medicoes[b.key])).filter(
    (s) => s !== "sem_dado",
  );

  if (avaliadas.length === 0) return null;

  const pontos = avaliadas.reduce(
    (acc, s) => acc + (s === "dentro" ? 100 : s === "atencao" ? 70 : 0),
    0,
  );
  return Math.round(pontos / avaliadas.length);
}

/**
 * Nota de operação a partir do estado real da plataforma:
 * fila limpa, cron rodando e sem job falho = 100.
 */
export function notaDeOperacao(input: {
  outboxFalhou: number;
  outboxPendente: number;
  cronFalhas: number;
  cronExecucoes: number;
}): number {
  let nota = 100;
  if (input.cronExecucoes === 0) nota -= 40;
  nota -= Math.min(30, input.cronFalhas * 10);
  nota -= Math.min(30, input.outboxFalhou * 10);
  if (input.outboxPendente > 50) nota -= 10;
  return Math.max(0, nota);
}

export type MetricAggregate = {
  metric_name: string;
  metric_type: MetricType;
  amostras: number;
  media: number | null;
  p95: number | null;
  maximo: number | null;
  ultimo_em: string | null;
};

export type PlatformMetricsSummary = {
  janelaHoras: number;
  desde: string;
  metricas: MetricAggregate[];
  sistema: {
    erros: number;
    cronExecucoes: number;
    cronFalhas: number;
    outboxPendente: number;
    outboxFalhou: number;
    arquivos: { total: number; bytes: number };
  };
  produto: {
    usuariosAtivos24h: number;
    usuariosAtivos7d: number;
    membrosAtivos: number;
    acoesPorTipo: Record<string, number>;
  };
  comercial: {
    oportunidadesCriadas: number;
    oportunidadesGanhas: number;
    oportunidadesPerdidas: number;
    tempoMedioEtapaHoras: number;
    tarefasAtrasadas: number;
    reservasAtivas: number;
    vendasAssinadas: number;
  };
  geradoEm: string;
};

/** p95 por métrica, no formato aceito por `classificarBudget`. */
export function medicoesPorChave(
  metricas: readonly MetricAggregate[],
): Record<string, number | null> {
  return Object.fromEntries(metricas.map((m) => [m.metric_name, m.p95 ?? m.media ?? null]));
}

export function taxaDeConversao(ganhas: number, perdidas: number): number {
  const fechadas = ganhas + perdidas;
  return fechadas === 0 ? 0 : Math.round((ganhas / fechadas) * 100);
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 KB";
  const mb = bytes / 1024 / 1024;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}