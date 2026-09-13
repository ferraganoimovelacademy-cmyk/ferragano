/**
 * Domínio Comercial / Imobiliário — vocabulário compartilhado.
 * Espelha os enums do banco. Client-safe: nada de acesso a dados aqui.
 */

export const LEAD_ESTAGIOS = [
  "novo",
  "contato",
  "qualificado",
  "visita",
  "proposta",
  "negociacao",
  "fechado",
  "perdido",
] as const;
export type LeadEstagio = (typeof LEAD_ESTAGIOS)[number];

export const estagioLabels: Record<LeadEstagio, string> = {
  novo: "Novo",
  contato: "Em contato",
  qualificado: "Qualificado",
  visita: "Visita",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

/** Estágios exibidos no kanban (fechado/perdido são desfechos, ficam ao final). */
export const PIPELINE_ESTAGIOS: LeadEstagio[] = [
  "novo",
  "contato",
  "qualificado",
  "visita",
  "proposta",
  "negociacao",
  "fechado",
];

export const LEAD_ORIGENS = [
  "instagram",
  "facebook",
  "google",
  "indicacao",
  "site",
  "portal",
  "whatsapp",
  "evento",
  "outro",
] as const;
export type LeadOrigem = (typeof LEAD_ORIGENS)[number];

export const origemLabels: Record<LeadOrigem, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  google: "Google",
  indicacao: "Indicação",
  site: "Site",
  portal: "Portal",
  whatsapp: "WhatsApp",
  evento: "Evento",
  outro: "Outro",
};

export const LEAD_TEMPERATURAS = ["frio", "morno", "quente"] as const;
export type LeadTemperatura = (typeof LEAD_TEMPERATURAS)[number];

export const temperaturaLabels: Record<LeadTemperatura, string> = {
  frio: "Frio",
  morno: "Morno",
  quente: "Quente",
};

export const EMPREENDIMENTO_STATUS = [
  "breve_lancamento",
  "lancamento",
  "em_obras",
  "pronto",
  "entregue",
] as const;
export type EmpreendimentoStatus = (typeof EMPREENDIMENTO_STATUS)[number];

export const empStatusLabels: Record<EmpreendimentoStatus, string> = {
  breve_lancamento: "Breve lançamento",
  lancamento: "Lançamento",
  em_obras: "Em obras",
  pronto: "Pronto",
  entregue: "Entregue",
};

export const EMPREENDIMENTO_SEGMENTOS = ["mcmv", "medio", "alto", "comercial"] as const;
export type EmpreendimentoSegmento = (typeof EMPREENDIMENTO_SEGMENTOS)[number];

export const segmentoLabels: Record<EmpreendimentoSegmento, string> = {
  mcmv: "MCMV",
  medio: "Médio padrão",
  alto: "Alto padrão",
  comercial: "Comercial",
};

/**
 * Lead score por regras — deliberadamente não é IA.
 * Só faz sentido treinar modelo quando houver histórico de conversão real.
 */
export function calcularScore(input: {
  origem: LeadOrigem;
  temperatura: LeadTemperatura;
  temTelefone: boolean;
  temEmail: boolean;
  temEmpreendimento: boolean;
  valorEstimado?: number | null;
}): number {
  let score = 0;
  const porOrigem: Record<LeadOrigem, number> = {
    indicacao: 25,
    site: 18,
    whatsapp: 18,
    instagram: 15,
    google: 15,
    portal: 12,
    facebook: 10,
    evento: 10,
    outro: 5,
  };
  score += porOrigem[input.origem];
  score += { frio: 5, morno: 20, quente: 35 }[input.temperatura];
  if (input.temTelefone) score += 15;
  if (input.temEmail) score += 5;
  if (input.temEmpreendimento) score += 10;
  if ((input.valorEstimado ?? 0) > 0) score += 10;
  return Math.max(0, Math.min(100, score));
}

export function temperaturaPorScore(score: number): LeadTemperatura {
  if (score >= 70) return "quente";
  if (score >= 40) return "morno";
  return "frio";
}

export function formatBRL(value?: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const UNIDADE_STATUS = [
  "disponivel",
  "reservada",
  "vendida",
  "bloqueada",
  "em_analise",
] as const;
export type UnidadeStatus = (typeof UNIDADE_STATUS)[number];

export const unidadeStatusLabels: Record<UnidadeStatus, string> = {
  disponivel: "Disponível",
  reservada: "Reservada",
  vendida: "Vendida",
  bloqueada: "Bloqueada",
  em_analise: "Em análise",
};


export const PROPOSTA_STATUS = [
  "rascunho",
  "enviada",
  "em_analise",
  "aceita",
  "recusada",
  "expirada",
] as const;
export type PropostaStatus = (typeof PROPOSTA_STATUS)[number];

export const propostaStatusLabels: Record<PropostaStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  em_analise: "Em análise",
  aceita: "Aceita",
  recusada: "Recusada",
  expirada: "Expirada",
};
