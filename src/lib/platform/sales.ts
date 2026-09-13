/**
 * SPRINT 06 — Sales Bounded Context: vocabulário compartilhado.
 * Client-safe: espelha os enums do banco, sem acesso a dados.
 *
 * Regra do contexto: aqui não existe pessoa. Existe OPORTUNIDADE.
 * A identidade continua morando em `people` e nunca é duplicada.
 */

export const STAGE_TIPOS = ["aberto", "ganho", "perdido"] as const;
export type StageTipo = (typeof STAGE_TIPOS)[number];

export const stageTipoLabels: Record<StageTipo, string> = {
  aberto: "Em andamento",
  ganho: "Ganho",
  perdido: "Perdido",
};

export const TASK_STATUS = ["pendente", "em_andamento", "concluida", "cancelada"] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

export const taskStatusLabels: Record<TaskStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const TASK_PRIORIDADES = ["baixa", "media", "alta", "urgente"] as const;
export type TaskPrioridade = (typeof TASK_PRIORIDADES)[number];

export const taskPrioridadeLabels: Record<TaskPrioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const TASK_ORIGENS = ["manual", "automacao", "sla", "checklist", "sistema"] as const;
export type TaskOrigem = (typeof TASK_ORIGENS)[number];

export const VISIT_STATUS = ["agendada", "realizada", "nao_compareceu", "cancelada"] as const;
export type VisitStatus = (typeof VISIT_STATUS)[number];

export const visitStatusLabels: Record<VisitStatus, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  nao_compareceu: "Não compareceu",
  cancelada: "Cancelada",
};

export const PROPOSAL_STATUS = [
  "rascunho",
  "enviada",
  "em_analise",
  "aceita",
  "recusada",
  "expirada",
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUS)[number];

export const proposalStatusLabels: Record<ProposalStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  em_analise: "Em análise",
  aceita: "Aceita",
  recusada: "Recusada",
  expirada: "Expirada",
};

export const RESERVATION_STATUS = ["ativa", "expirada", "convertida", "cancelada"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUS)[number];

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  ativa: "Ativa",
  expirada: "Expirada",
  convertida: "Convertida",
  cancelada: "Cancelada",
};

export const SALE_STATUS = ["em_assinatura", "assinada", "cancelada", "distratada"] as const;
export type SaleStatus = (typeof SALE_STATUS)[number];

export const saleStatusLabels: Record<SaleStatus, string> = {
  em_assinatura: "Em assinatura",
  assinada: "Assinada",
  cancelada: "Cancelada",
  distratada: "Distratada",
};

/** Paleta das etapas — nomes de token, nunca hex solto na UI. */
export const STAGE_CORES = [
  "slate",
  "sky",
  "indigo",
  "violet",
  "amber",
  "orange",
  "teal",
  "emerald",
  "rose",
] as const;
export type StageCor = (typeof STAGE_CORES)[number];

export const stageCorClasses: Record<StageCor, string> = {
  slate: "bg-slate-500",
  sky: "bg-sky-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  teal: "bg-teal-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
};

export function corDaEtapa(cor: string | null | undefined): string {
  return stageCorClasses[(cor ?? "slate") as StageCor] ?? stageCorClasses.slate;
}

/**
 * Event Sourcing Light — catálogo dos eventos de domínio.
 * Todo módulo publica aqui; timeline, analytics e IA só leem.
 */
export const SALES_EVENTS = [
  "OpportunityCreated",
  "OpportunityMoved",
  "OpportunityWon",
  "OpportunityLost",
  "TaskCreated",
  "TaskCompleted",
  "VisitScheduled",
  "VisitCompleted",
  "VisitNoShow",
  "ProposalCreated",
  "ProposalSent",
  "ProposalAccepted",
  "ProposalRejected",
  "ReservationCreated",
  "ReservationCancelled",
  "SaleCompleted",
] as const;
export type SalesEvent = (typeof SALES_EVENTS)[number];

export const salesEventLabels: Record<SalesEvent, string> = {
  OpportunityCreated: "Oportunidade criada",
  OpportunityMoved: "Oportunidade mudou de etapa",
  OpportunityWon: "Oportunidade ganha",
  OpportunityLost: "Oportunidade perdida",
  TaskCreated: "Tarefa criada",
  TaskCompleted: "Tarefa concluída",
  VisitScheduled: "Visita agendada",
  VisitCompleted: "Visita realizada",
  VisitNoShow: "Cliente não compareceu",
  ProposalCreated: "Proposta criada",
  ProposalSent: "Proposta enviada",
  ProposalAccepted: "Proposta aceita",
  ProposalRejected: "Proposta recusada",
  ReservationCreated: "Reserva criada",
  ReservationCancelled: "Reserva cancelada",
  SaleCompleted: "Venda concluída",
};

/** SLA: quanto tempo a oportunidade está parada na etapa. */
export function slaEstado(entrouEm: string, slaHoras: number | null | undefined) {
  if (!slaHoras) return { estourado: false, horas: 0 };
  const horas = Math.floor((Date.now() - new Date(entrouEm).getTime()) / 3_600_000);
  return { estourado: horas > slaHoras, horas };
}

export function formatDataCurta(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
    new Date(iso),
  );
}
