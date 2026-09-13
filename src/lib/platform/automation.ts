/**
 * SPRINT 09 — Automation Engine (contratos client-safe).
 *
 * O Outbox guarda o EFEITO desejado; o Worker apenas executa.
 * Toda execução é idempotente: a `idempotency_key` impede que o mesmo
 * efeito seja enfileirado (e portanto executado) duas vezes.
 */

export const AUTOMATION_ACOES = [
  "task",
  "notification",
  "webhook",
  "email",
  "whatsapp",
  "push",
] as const;
export type AutomationAcao = (typeof AUTOMATION_ACOES)[number];

export const AUTOMATION_CANAIS = ["interno", "email", "whatsapp", "push", "webhook"] as const;
export type AutomationCanal = (typeof AUTOMATION_CANAIS)[number];

export const acaoLabels: Record<AutomationAcao, string> = {
  task: "Criar tarefa",
  notification: "Notificar usuário",
  webhook: "Chamar webhook",
  email: "Enviar e-mail",
  whatsapp: "Enviar WhatsApp",
  push: "Enviar push",
};

/** Ações sem provedor conectado: o worker descarta com motivo explícito. */
export const acoesSemProvedor: AutomationAcao[] = ["email", "whatsapp", "push"];

export const canalLabels: Record<AutomationCanal, string> = {
  interno: "Interno",
  email: "E-mail",
  whatsapp: "WhatsApp",
  push: "Push",
  webhook: "Webhook",
};

export type OutboxStatus = "pendente" | "processando" | "entregue" | "falhou" | "descartado";

export const outboxStatusLabels: Record<OutboxStatus, string> = {
  pendente: "Pendente",
  processando: "Processando",
  entregue: "Entregue",
  falhou: "Falhou",
  descartado: "Descartado",
};

export const outboxStatusCores: Record<OutboxStatus, string> = {
  pendente: "bg-muted text-muted-foreground",
  processando: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  entregue: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  falhou: "bg-destructive/15 text-destructive",
  descartado: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

/** Eventos de domínio que hoje podem disparar automação. */
export const AUTOMATION_EVENTOS = [
  "opportunity.created",
  "opportunity.stage_changed",
  "opportunity.won",
  "opportunity.lost",
  "opportunity.sla_breached",
  "task.created",
  "visit.scheduled",
  "visit.completed",
  "proposal.sent",
  "proposal.accepted",
  "proposal.rejected",
  "reservation.created",
  "reservation.expiring",
  "reservation.expired",
  "sale.signed",
  "unit.price_changed",
] as const;

/**
 * SPRINT 17 — sinais do Advisor como gatilho de automação.
 * `advisor.signal.any` reage a qualquer sinal fora do limite.
 */
export const AUTOMATION_EVENTOS_SINAIS = [
  "advisor.signal.any",
  "advisor.signal.conversao",
  "advisor.signal.ciclo",
  "advisor.signal.liquidez",
  "advisor.signal.forecast",
  "advisor.signal.followup",
  "advisor.signal.inatividade",
  "advisor.signal.origem",
] as const;

export type ConfigValue =
  | string
  | number
  | boolean
  | null
  | ConfigValue[]
  | { [chave: string]: ConfigValue };

export type AutomationRule = {
  id: string;
  nome: string;
  descricao: string | null;
  eventType: string;
  acao: AutomationAcao;
  canal: AutomationCanal;
  config: Record<string, ConfigValue>;
  delaySegundos: number;
  ativa: boolean;
};

export type OutboxRow = {
  id: string;
  eventType: string;
  canal: string;
  destino: string | null;
  status: OutboxStatus;
  tentativas: number;
  maxTentativas: number;
  ultimoErro: string | null;
  disponivelEm: string;
  processadoEm: string | null;
  createdAt: string;
  ruleId: string | null;
};

/** Backoff exponencial em minutos (mesma regra da função SQL). */
export function proximaTentativaMinutos(tentativas: number): number {
  return Math.pow(2, Math.max(0, tentativas));
}

/**
 * SPRINT 18 — Efetividade das automações.
 * Cada regra é medida pelo que aconteceu com os efeitos que ela enfileirou.
 */
export type AutomationEffectivenessRow = {
  ruleId: string;
  nome: string;
  eventType: string;
  acao: AutomationAcao;
  canal: AutomationCanal;
  ativa: boolean;
  total: number;
  entregues: number;
  falhou: number;
  pendentes: number;
  descartados: number;
  tentativasMedia: number;
  latenciaMediaSegundos: number;
  ultimaExecucao: string | null;
  ultimoErro: string | null;
};

export type AutomationEfetividadeStatus =
  | "ok"
  | "atencao"
  | "critico"
  | "inativa"
  | "sem_dados";

export const efetividadeLabels: Record<AutomationEfetividadeStatus, string> = {
  ok: "Saudável",
  atencao: "Atenção",
  critico: "Crítico",
  inativa: "Inativa",
  sem_dados: "Sem execuções",
};

export const efetividadeCores: Record<AutomationEfetividadeStatus, string> = {
  ok: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  atencao: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  critico: "bg-destructive/15 text-destructive",
  inativa: "bg-muted text-muted-foreground",
  sem_dados: "bg-muted text-muted-foreground",
};

/**
 * Taxa de entrega sobre o que já saiu da fila. Descarte conta como não
 * entregue: o efeito foi desejado e não aconteceu (ex.: canal sem provedor).
 */
export function taxaEntrega(linha: AutomationEffectivenessRow): number | null {
  const concluidos = linha.entregues + linha.falhou + linha.descartados;
  if (concluidos === 0) return null;
  return linha.entregues / concluidos;
}

/**
 * Regra crítica = alguma falha definitiva ou entrega abaixo de 80%.
 * Regra em atenção = fila acumulada ou entrega abaixo de 95%.
 */
export function statusDaRegra(
  linha: AutomationEffectivenessRow,
): AutomationEfetividadeStatus {
  if (!linha.ativa) return "inativa";
  if (linha.total === 0) return "sem_dados";
  if (linha.falhou > 0) return "critico";

  const taxa = taxaEntrega(linha);
  if (taxa !== null && taxa < 0.8) return "critico";
  if (taxa !== null && taxa < 0.95) return "atencao";
  if (linha.pendentes > 20) return "atencao";
  return "ok";
}

/** Resumo agregado usado no cabeçalho do Control Center. */
export function resumoEfetividade(linhas: AutomationEffectivenessRow[]) {
  const ativas = linhas.filter((l) => l.ativa);
  const total = linhas.reduce((s, l) => s + l.total, 0);
  const entregues = linhas.reduce((s, l) => s + l.entregues, 0);
  const falhou = linhas.reduce((s, l) => s + l.falhou, 0);
  const pendentes = linhas.reduce((s, l) => s + l.pendentes, 0);
  const descartados = linhas.reduce((s, l) => s + l.descartados, 0);
  const concluidos = entregues + falhou + descartados;

  return {
    regras: linhas.length,
    regrasAtivas: ativas.length,
    regrasSilenciosas: ativas.filter((l) => l.total === 0).length,
    regrasCriticas: linhas.filter((l) => statusDaRegra(l) === "critico").length,
    total,
    entregues,
    falhou,
    pendentes,
    descartados,
    taxaEntrega: concluidos === 0 ? null : entregues / concluidos,
  };
}
