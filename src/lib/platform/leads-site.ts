import { z } from "zod";

/**
 * Domínio: leads originados da vitrine pública (site e landing pages).
 * Não cria entidade nova — apenas a leitura tipada do funil que o banco
 * devolve por `site_lead_funnel`, sempre escopado ao workspace do usuário.
 */

export const utmSchema = z
  .object({
    source: z.string().trim().max(120).optional(),
    medium: z.string().trim().max(120).optional(),
    campaign: z.string().trim().max(160).optional(),
    term: z.string().trim().max(160).optional(),
    content: z.string().trim().max(160).optional(),
  })
  .partial();

export type Utm = z.infer<typeof utmSchema>;

export const stageEventSchema = z.object({
  de: z.string().nullable().default(null),
  para: z.string(),
  em: z.string(),
});

export const siteLeadSchema = z.object({
  id: z.string().uuid(),
  titulo: z.string(),
  pessoa: z.string().nullable().default(null),
  estagio: z.string(),
  origem: z.string(),
  campanha: z.string().nullable().default(null),
  rota_origem: z.string().nullable().default(null),
  utm: z.record(z.string(), z.unknown()).nullable().default(null),
  score: z.number().nullable().default(null),
  temperatura: z.string().nullable().default(null),
  empreendimento: z.string().nullable().default(null),
  unidade: z.string().nullable().default(null),
  created_at: z.string(),
  stage_entrou_em: z.string().nullable().default(null),
  eventos: z.array(stageEventSchema).default([]),
});

export const siteLeadFunnelSchema = z.object({
  total: z.number(),
  ganhos: z.number(),
  perdidos: z.number(),
  etapas: z.array(z.object({ estagio: z.string(), total: z.number() })).default([]),
  leads: z.array(siteLeadSchema).default([]),
});

export type SiteLead = z.infer<typeof siteLeadSchema>;
export type SiteLeadFunnel = z.infer<typeof siteLeadFunnelSchema>;

/** Conversão = ganhos / total capturado na janela. */
export function taxaConversao(funnel: SiteLeadFunnel): number {
  if (funnel.total <= 0) return 0;
  return Math.round((funnel.ganhos / funnel.total) * 100);
}

export const ROTULO_ESTAGIO: Record<string, string> = {
  novo: "Novo",
  contatado: "Contatado",
  qualificado: "Qualificado",
  visita: "Visita",
  proposta: "Proposta",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};

export function rotuloEstagio(estagio: string): string {
  return ROTULO_ESTAGIO[estagio] ?? estagio;
}

/**
 * Chave de idempotência da captação pública: mesmo contato + mesmo
 * empreendimento não gera oportunidade duplicada.
 */
export function dedupeKeyLead(input: {
  email?: string | null;
  telefone?: string | null;
  empreendimentoId?: string | null;
}): string | null {
  const telefone = (input.telefone ?? "").replace(/\D+/g, "");
  const email = (input.email ?? "").trim().toLowerCase();
  const contato = telefone.length >= 8 ? `tel:${telefone}` : email ? `mail:${email}` : null;
  if (!contato) return null;
  return `site:${contato}:${input.empreendimentoId ?? "geral"}`;
}
