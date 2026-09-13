/**
 * SPRINT 07 — Property Domain: vocabulário compartilhado (client-safe).
 *
 * Hierarquia canônica:
 *   Developer → Project (empreendimentos) → Release → Tower → Floor → Unit
 *
 * Regra do contexto: aqui não existe pessoa nem oportunidade. Existe IMÓVEL.
 * O estoque nunca é editado "na mão": muda por evento (Inventory Engine).
 */

export const RELEASE_STATUS = [
  "planejado",
  "lancado",
  "em_obras",
  "entregue",
  "encerrado",
] as const;
export type ReleaseStatus = (typeof RELEASE_STATUS)[number];

export const releaseStatusLabels: Record<ReleaseStatus, string> = {
  planejado: "Planejado",
  lancado: "Lançado",
  em_obras: "Em obras",
  entregue: "Entregue",
  encerrado: "Encerrado",
};

export const KNOWLEDGE_TIPOS = [
  "faq",
  "script",
  "diferencial",
  "objecao",
  "concorrente",
  "bairro",
  "nota",
] as const;
export type KnowledgeTipo = (typeof KNOWLEDGE_TIPOS)[number];

export const knowledgeTipoLabels: Record<KnowledgeTipo, string> = {
  faq: "FAQ",
  script: "Script de venda",
  diferencial: "Diferencial",
  objecao: "Objeção",
  concorrente: "Concorrente",
  bairro: "Bairro",
  nota: "Nota",
};

export const knowledgeTipoIcones: Record<KnowledgeTipo, string> = {
  faq: "help",
  script: "record_voice_over",
  diferencial: "star",
  objecao: "shield",
  concorrente: "compare_arrows",
  bairro: "location_city",
  nota: "sticky_note_2",
};

export const MEDIA_TIPOS = ["imagem", "video", "pdf", "tour", "planta", "outro"] as const;
export type MediaTipo = (typeof MEDIA_TIPOS)[number];

export const mediaTipoLabels: Record<MediaTipo, string> = {
  imagem: "Imagem",
  video: "Vídeo",
  pdf: "PDF",
  tour: "Tour 360º",
  planta: "Planta",
  outro: "Outro",
};

export const mediaTipoIcones: Record<MediaTipo, string> = {
  imagem: "image",
  video: "movie",
  pdf: "picture_as_pdf",
  tour: "view_in_ar",
  planta: "grid_on",
  outro: "attach_file",
};

/** Eventos de domínio do Property Context — alimentam Timeline, Analytics e IA. */
export const PROPERTY_EVENTS = [
  "DeveloperCreated",
  "ProjectLaunched",
  "ReleaseCreated",
  "ReleaseStatusChanged",
  "TowerCreated",
  "UnitPriceChanged",
  "UnitStatusChanged",
  "PropertyKnowledgeAdded",
  "PropertyMediaAdded",
] as const;
export type PropertyEvent = (typeof PROPERTY_EVENTS)[number];

export const propertyEventLabels: Record<PropertyEvent, string> = {
  DeveloperCreated: "Construtora cadastrada",
  ProjectLaunched: "Empreendimento lançado",
  ReleaseCreated: "Nova fase criada",
  ReleaseStatusChanged: "Fase mudou de status",
  TowerCreated: "Torre cadastrada",
  UnitPriceChanged: "Preço da unidade alterado",
  UnitStatusChanged: "Estoque da unidade alterado",
  PropertyKnowledgeAdded: "Conhecimento adicionado",
  PropertyMediaAdded: "Material adicionado",
};

/** Variação percentual entre dois preços (para o histórico). */
export function variacao(anterior: number | null | undefined, novo: number): number | null {
  if (!anterior || anterior <= 0) return null;
  return Number((((novo - anterior) / anterior) * 100).toFixed(2));
}

/**
 * Score de liquidez (0-100): quanto mais fácil de vender, maior.
 * Heurística determinística — a IA refina depois, mas o número já existe hoje.
 */
export function scoreLiquidez(input: {
  preco?: number | null;
  precoMedio?: number | null;
  dormitorios?: number | null;
  vagas?: number | null;
  andar?: number | null;
  varanda?: boolean | null;
}): number {
  let score = 50;
  if (input.preco && input.precoMedio && input.precoMedio > 0) {
    const dif = (input.preco - input.precoMedio) / input.precoMedio;
    score += dif <= -0.1 ? 20 : dif < 0 ? 10 : dif > 0.1 ? -20 : -5;
  }
  if ((input.dormitorios ?? 0) >= 2) score += 8;
  if ((input.vagas ?? 0) >= 1) score += 7;
  if (input.varanda) score += 5;
  if ((input.andar ?? 0) >= 4) score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function liquidezLabel(score: number): { label: string; classe: string } {
  if (score >= 75) return { label: "Alta liquidez", classe: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 50) return { label: "Liquidez média", classe: "text-amber-600 dark:text-amber-400" };
  return { label: "Baixa liquidez", classe: "text-rose-600 dark:text-rose-400" };
}
