/**
 * FASE 1 — GATE P07: contrato do feedback do piloto.
 * Regra de domínio pura (sem I/O) para o botão permanente de feedback.
 */

export const FEEDBACK_TIPOS = ["bug", "sugestao", "dificuldade", "ideia", "elogio"] as const;
export type FeedbackTipo = (typeof FEEDBACK_TIPOS)[number];

export const FEEDBACK_SEVERIDADES = ["baixa", "media", "alta", "critica"] as const;
export type FeedbackSeveridade = (typeof FEEDBACK_SEVERIDADES)[number];

export const FEEDBACK_STATUS = ["novo", "triado", "em_andamento", "resolvido", "descartado"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUS)[number];

export const feedbackTipoLabels: Record<FeedbackTipo, string> = {
  bug: "Bug",
  sugestao: "Sugestão",
  dificuldade: "Dificuldade",
  ideia: "Ideia",
  elogio: "Elogio",
};

export const feedbackStatusLabels: Record<FeedbackStatus, string> = {
  novo: "Novo",
  triado: "Triado",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
  descartado: "Descartado",
};

/** Severidade sugerida por tipo: bug entra alto, elogio entra baixo. */
export function severidadePadrao(tipo: FeedbackTipo): FeedbackSeveridade {
  if (tipo === "bug") return "alta";
  if (tipo === "dificuldade") return "media";
  return "baixa";
}

export type FeedbackItem = {
  id: string;
  tipo: FeedbackTipo;
  mensagem: string;
  severidade: FeedbackSeveridade;
  status: FeedbackStatus;
  rota: string | null;
  resposta: string | null;
  created_at: string;
};