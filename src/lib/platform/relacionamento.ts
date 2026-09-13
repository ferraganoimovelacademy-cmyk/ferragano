/**
 * SPRINT 05 — Relationship Core: vocabulário compartilhado.
 * Espelha os enums do banco. Client-safe: nada de acesso a dados aqui.
 */

export const PERSON_TIPOS = ["fisica", "juridica"] as const;
export type PersonTipo = (typeof PERSON_TIPOS)[number];

export const personTipoLabels: Record<PersonTipo, string> = {
  fisica: "Pessoa física",
  juridica: "Pessoa jurídica",
};

/** Estados da jornada — a pessoa nunca troca de tabela, só de estado. */
export const PERSON_ESTAGIOS = [
  "visitante",
  "lead",
  "oportunidade",
  "cliente",
  "proprietario",
  "investidor",
  "indicador",
] as const;
export type PersonEstagio = (typeof PERSON_ESTAGIOS)[number];

export const personEstagioLabels: Record<PersonEstagio, string> = {
  visitante: "Visitante",
  lead: "Lead",
  oportunidade: "Oportunidade",
  cliente: "Cliente",
  proprietario: "Proprietário",
  investidor: "Investidor",
  indicador: "Indicador",
};

/** Estágios derivados de oportunidades — não podem ser escolhidos à mão. */
export const PERSON_ESTAGIOS_MANUAIS: PersonEstagio[] = [
  "proprietario",
  "investidor",
  "indicador",
];

export const CONTACT_CANAIS = ["email", "telefone", "whatsapp", "instagram", "outro"] as const;
export type ContactCanal = (typeof CONTACT_CANAIS)[number];

export const contactCanalLabels: Record<ContactCanal, string> = {
  email: "E-mail",
  telefone: "Telefone",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  outro: "Outro",
};

export const contactCanalIcons: Record<ContactCanal, string> = {
  email: "mail",
  telefone: "call",
  whatsapp: "chat",
  instagram: "photo_camera",
  outro: "link",
};

export const ADDRESS_TIPOS = ["residencial", "comercial", "cobranca", "outro"] as const;
export type AddressTipo = (typeof ADDRESS_TIPOS)[number];

export const addressTipoLabels: Record<AddressTipo, string> = {
  residencial: "Residencial",
  comercial: "Comercial",
  cobranca: "Cobrança",
  outro: "Outro",
};

export const RELATIONSHIP_TIPOS = [
  "indicou",
  "conjuge",
  "familiar",
  "socio",
  "representante",
  "outro",
] as const;
export type RelationshipTipo = (typeof RELATIONSHIP_TIPOS)[number];

export const relationshipLabels: Record<RelationshipTipo, string> = {
  indicou: "Indicou",
  conjuge: "Cônjuge de",
  familiar: "Familiar de",
  socio: "Sócio de",
  representante: "Representante de",
  outro: "Relacionado a",
};

export const ACTIVITY_TIPOS = [
  "ligacao",
  "mensagem",
  "whatsapp",
  "email",
  "visita",
  "documento",
  "proposta",
  "nota",
  "sistema",
] as const;
export type ActivityTipo = (typeof ACTIVITY_TIPOS)[number];

export const activityLabels: Record<ActivityTipo, string> = {
  ligacao: "Ligação",
  mensagem: "Mensagem",
  whatsapp: "WhatsApp",
  email: "E-mail",
  visita: "Visita",
  documento: "Documento",
  proposta: "Proposta",
  nota: "Nota",
  sistema: "Sistema",
};

export const activityIcons: Record<ActivityTipo, string> = {
  ligacao: "call",
  mensagem: "sms",
  whatsapp: "chat",
  email: "mail",
  visita: "location_on",
  documento: "attach_file",
  proposta: "description",
  nota: "sticky_note_2",
  sistema: "bolt",
};

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}
