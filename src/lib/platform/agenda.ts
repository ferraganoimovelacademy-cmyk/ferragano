/**
 * Domínio Comercial — vocabulário da Agenda.
 * Client-safe: nada de servidor aqui.
 */

export const COMPROMISSO_TIPOS = [
  "visita",
  "ligacao",
  "reuniao",
  "followup",
  "tarefa",
  "outro",
] as const;
export type CompromissoTipo = (typeof COMPROMISSO_TIPOS)[number];

export const COMPROMISSO_STATUS = ["pendente", "concluido", "cancelado"] as const;
export type CompromissoStatus = (typeof COMPROMISSO_STATUS)[number];

export const tipoLabels: Record<CompromissoTipo, string> = {
  visita: "Visita",
  ligacao: "Ligação",
  reuniao: "Reunião",
  followup: "Follow-up",
  tarefa: "Tarefa",
  outro: "Outro",
};

export const tipoIcones: Record<CompromissoTipo, string> = {
  visita: "home_work",
  ligacao: "call",
  reuniao: "groups",
  followup: "notifications_active",
  tarefa: "task_alt",
  outro: "event",
};

export const statusLabels: Record<CompromissoStatus, string> = {
  pendente: "Pendente",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const diaLongo = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

export function formatDataHora(iso: string) {
  return dataHora.format(new Date(iso));
}

export function formatDiaLongo(iso: string) {
  return diaLongo.format(new Date(iso));
}

/** Chave de agrupamento por dia no fuso local. */
export function chaveDoDia(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Compromisso pendente cujo horário já passou. */
export function estaAtrasado(inicioIso: string, status: CompromissoStatus) {
  return status === "pendente" && new Date(inicioIso).getTime() < Date.now();
}
