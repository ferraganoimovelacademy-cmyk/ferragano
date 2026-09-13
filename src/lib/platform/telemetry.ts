/**
 * SPRINT 12 — Operational Intelligence.
 *
 * Domínio Observability: contrato da telemetria transversal.
 * Princípio "Everything Important Must Be Measured" (ADR-011): toda ação
 * relevante emite `domain` + `action` padronizados. Nada de string solta.
 */

export const TELEMETRY_DOMAINS = [
  "people",
  "sales",
  "property",
  "platform",
  "automation",
  "observability",
  "marketing",
] as const;

export type TelemetryDomain = (typeof TELEMETRY_DOMAINS)[number];

export const telemetryDomainLabels: Record<TelemetryDomain, string> = {
  people: "Pessoas",
  sales: "Comercial",
  property: "Imóveis",
  platform: "Plataforma",
  automation: "Automação",
  observability: "Observabilidade",
  marketing: "Marketing",
};

/** GATE 05 — telemetria operacional x telemetria de negócio. São mundos separados. */
export type TelemetryCategory = "operacional" | "negocio";

export type TelemetryAction = {
  domain: TelemetryDomain;
  action: string;
  label: string;
  category: TelemetryCategory;
  /** Chave de orçamento em `metrics.ts`, quando a ação tem meta de latência. */
  metric?: string;
};

/**
 * GATE 01 — catálogo completo da jornada instrumentada.
 * Toda funcionalidade nova entra aqui antes de ser considerada pronta.
 */
export const TELEMETRY_CATALOG: readonly TelemetryAction[] = [
  // ---------------- People ----------------
  { domain: "people", action: "customer_360", label: "Cliente 360", category: "operacional", metric: "query.customer_360" },
  { domain: "people", action: "abrir_pessoa", label: "Abrir pessoa", category: "operacional", metric: "query.pessoa_detalhe" },
  { domain: "people", action: "criar_pessoa", label: "Criar pessoa", category: "negocio" },
  { domain: "people", action: "editar_pessoa", label: "Editar pessoa", category: "negocio" },
  { domain: "people", action: "merge", label: "Unificar duplicidade", category: "negocio" },
  { domain: "people", action: "deduplicacao", label: "Checar duplicidade", category: "operacional", metric: "query.deduplicacao" },
  { domain: "people", action: "pesquisa", label: "Pesquisar pessoas", category: "operacional", metric: "query.pessoas_lista" },
  // ---------------- Sales ----------------
  { domain: "sales", action: "abrir_oportunidade", label: "Abrir oportunidade", category: "operacional", metric: "query.oportunidades" },
  { domain: "sales", action: "criar_oportunidade", label: "Criar oportunidade", category: "negocio" },
  { domain: "sales", action: "mover_etapa", label: "Mover etapa", category: "negocio" },
  { domain: "sales", action: "criar_visita", label: "Agendar visita", category: "negocio" },
  { domain: "sales", action: "criar_proposta", label: "Criar proposta", category: "negocio" },
  { domain: "sales", action: "reservar", label: "Reservar unidade", category: "negocio" },
  { domain: "sales", action: "vender", label: "Registrar venda", category: "negocio" },
  { domain: "sales", action: "sales_360", label: "Vendas 360", category: "operacional", metric: "query.sales_360" },
  // ---------------- Property ----------------
  { domain: "property", action: "abrir_empreendimento", label: "Abrir empreendimento", category: "operacional", metric: "query.empreendimento" },
  { domain: "property", action: "abrir_unidade", label: "Abrir unidade", category: "operacional", metric: "query.unidade" },
  { domain: "property", action: "alterar_preco", label: "Alterar preço", category: "negocio" },
  { domain: "property", action: "alterar_estoque", label: "Alterar estoque", category: "negocio" },
  { domain: "property", action: "property_360", label: "Imóvel 360", category: "operacional", metric: "query.property_360" },
  // ---------------- Platform ----------------
  { domain: "platform", action: "login", label: "Entrar", category: "operacional" },
  { domain: "platform", action: "logout", label: "Sair", category: "operacional" },
  { domain: "platform", action: "refresh", label: "Recarregar sessão", category: "operacional" },
  { domain: "platform", action: "busca_global", label: "Busca global", category: "operacional", metric: "search.global" },
  { domain: "platform", action: "query_layer", label: "Query Layer", category: "operacional" },
  { domain: "platform", action: "cache_hit", label: "Cache aproveitado", category: "operacional" },
  { domain: "platform", action: "cache_miss", label: "Cache perdido", category: "operacional" },
  { domain: "platform", action: "web_vitals", label: "Web Vitals", category: "operacional" },
  { domain: "platform", action: "cron", label: "Execução de cron", category: "operacional" },
  { domain: "platform", action: "worker", label: "Worker do Outbox", category: "operacional", metric: "job.outbox_worker" },
  // ---------------- Automation ----------------
  { domain: "automation", action: "evento_publicado", label: "Evento publicado", category: "operacional" },
  { domain: "automation", action: "evento_processado", label: "Evento processado", category: "operacional" },
  { domain: "automation", action: "retry", label: "Reprocessamento", category: "operacional" },
  { domain: "automation", action: "erro", label: "Erro de automação", category: "operacional" },
  // ---------------- Observability / Decision ----------------
  { domain: "observability", action: "executive_360", label: "Executivo 360", category: "negocio", metric: "query.executive_360" },
  { domain: "observability", action: "decision_center", label: "Decision Center", category: "operacional", metric: "query.decision_center" },
  { domain: "observability", action: "control_center", label: "Control Center", category: "operacional" },
  { domain: "marketing", action: "marketing_360", label: "Marketing 360", category: "negocio", metric: "query.marketing_360" },
  { domain: "marketing", action: "consultoria_submit", label: "Consultoria — envio recebido", category: "negocio" },
  { domain: "marketing", action: "consultoria_sucesso", label: "Consultoria — lead criado", category: "negocio" },
  { domain: "marketing", action: "consultoria_erro", label: "Consultoria — envio recusado", category: "negocio" },
];

export const catalogKey = (domain: TelemetryDomain, action: string) => `${domain}.${action}`;

export const telemetryByKey: Record<string, TelemetryAction> = Object.fromEntries(
  TELEMETRY_CATALOG.map((a) => [catalogKey(a.domain, a.action), a]),
);

export function actionLabel(domain: string, action: string): string {
  return telemetryByKey[`${domain}.${action}`]?.label ?? `${domain}.${action}`;
}

export function categoriaDaAcao(domain: string, action: string): TelemetryCategory {
  return telemetryByKey[`${domain}.${action}`]?.category ?? "operacional";
}

/** Métrica agregada correspondente à ação, quando existe orçamento. */
export function metricDaAcao(domain: TelemetryDomain, action: string): string | undefined {
  return telemetryByKey[catalogKey(domain, action)]?.metric;
}

// =====================================================================
// Feature adoption (GATE 03)
// =====================================================================

export type FeatureUsage = {
  domain: string;
  action: string;
  usos: number;
  usuarios: number;
  sessoes: number;
  erros: number;
  taxaErro: number | null;
  duracaoMediaMs: number | null;
  ultimoUso: string | null;
};

export type Jornada = {
  sessionId: string | null;
  usuario: string;
  inicio: string;
  fim: string;
  passos: number;
  caminho: string[];
};

export type FeatureAdoption = {
  janelaHoras: number;
  desde: string;
  features: FeatureUsage[];
  dominios: Record<string, number>;
  jornadas: Jornada[];
  totalEventos: number;
  geradoEm: string;
};

/** Abandono = sessões que tocaram a feature e não concluíram nenhuma ação de negócio. */
export function taxaDeAbandono(feature: FeatureUsage): number {
  if (feature.sessoes === 0) return 0;
  const concluidas = Math.max(0, feature.usos - feature.erros);
  if (concluidas === 0) return 100;
  return Math.max(0, Math.round(100 - (concluidas / feature.usos) * 100));
}

/** Notas de qualidade de uso: erro alto ou ação lenta viram alerta de produto. */
export function featureSaudavel(feature: FeatureUsage): boolean {
  return (feature.taxaErro ?? 0) < 5;
}

export function separarPorCategoria(features: readonly FeatureUsage[]): Record<
  TelemetryCategory,
  FeatureUsage[]
> {
  const out: Record<TelemetryCategory, FeatureUsage[]> = { operacional: [], negocio: [] };
  for (const f of features) out[categoriaDaAcao(f.domain, f.action)].push(f);
  return out;
}

/** Cobertura do catálogo: o que já tem evidência de uso na janela. */
export function coberturaDoCatalogo(features: readonly FeatureUsage[]): {
  instrumentadas: number;
  total: number;
  percentual: number;
  semDados: string[];
} {
  const vistas = new Set(features.map((f) => `${f.domain}.${f.action}`));
  const semDados = TELEMETRY_CATALOG.filter((a) => !vistas.has(catalogKey(a.domain, a.action))).map(
    (a) => a.label,
  );
  const instrumentadas = TELEMETRY_CATALOG.length - semDados.length;
  return {
    instrumentadas,
    total: TELEMETRY_CATALOG.length,
    percentual: Math.round((instrumentadas / TELEMETRY_CATALOG.length) * 100),
    semDados,
  };
}

// =====================================================================
// Decision accuracy (GATE 04)
// =====================================================================

export type DecisionAccuracy = {
  janelaHoras: number;
  total: number;
  aceitas: number;
  ignoradas: number;
  rejeitadas: number;
  pendentes: number;
  aceitasComGanho: number;
  aceitasComPerda: number;
  ignoradasComGanho: number;
  ignoradasComPerda: number;
  porTipo: { tipo: string; total: number; aceitas: number; ganhos: number }[];
  geradoEm: string;
};

export const decisaoLabels: Record<string, string> = {
  pendente: "Pendente",
  aceita: "Aceita",
  ignorada: "Ignorada",
  rejeitada: "Rejeitada",
};

/** Taxa de adesão à recomendação (só considera o que já foi decidido). */
export function taxaDeAdesao(a: Pick<DecisionAccuracy, "aceitas" | "ignoradas" | "rejeitadas">): number {
  const decididas = a.aceitas + a.ignoradas + a.rejeitadas;
  return decididas === 0 ? 0 : Math.round((a.aceitas / decididas) * 100);
}

/**
 * Precisão: entre as recomendações com desfecho conhecido, quantas o sistema
 * acertou — aceitou e ganhou, ou ignorou e perdeu.
 */
export function precisaoDaRecomendacao(a: DecisionAccuracy): number | null {
  const acertos = a.aceitasComGanho + a.ignoradasComPerda;
  const erros = a.aceitasComPerda + a.ignoradasComGanho;
  const total = acertos + erros;
  return total === 0 ? null : Math.round((acertos / total) * 100);
}

// =====================================================================
// Alertas (GATE 06)
// =====================================================================

export type AlertSeveridade = "info" | "atencao" | "critico";
export type AlertStatus = "aberto" | "reconhecido" | "resolvido";

export type PlatformAlert = {
  id: string;
  chave: string;
  severidade: AlertSeveridade;
  titulo: string;
  detalhe: string | null;
  metrica: string | null;
  valor: number | null;
  limite: number | null;
  status: AlertStatus;
  createdAt: string;
};

export const alertSeveridadeCores: Record<AlertSeveridade, string> = {
  info: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  atencao: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  critico: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export const alertSeveridadeLabels: Record<AlertSeveridade, string> = {
  info: "Informativo",
  atencao: "Atenção",
  critico: "Crítico",
};

export const alertStatusLabels: Record<AlertStatus, string> = {
  aberto: "Aberto",
  reconhecido: "Reconhecido",
  resolvido: "Resolvido",
};

/** Nota de confiabilidade: alerta crítico aberto pesa mais que atenção. */
export function notaDeAlertas(alertas: readonly PlatformAlert[]): number {
  const abertos = alertas.filter((a) => a.status !== "resolvido");
  const penalidade = abertos.reduce(
    (acc, a) => acc + (a.severidade === "critico" ? 25 : a.severidade === "atencao" ? 10 : 3),
    0,
  );
  return Math.max(0, 100 - penalidade);
}