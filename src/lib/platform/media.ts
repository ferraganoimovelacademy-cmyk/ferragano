/**
 * Sprint UI 04.2 — Cury Media Experience (camada pura, client-safe).
 *
 * Vocabulário da biblioteca de mídia: convenção de pastas, geração automática
 * de SEO (alt/title), Health Score e indicadores de ativos.
 * Nenhum ativo oficial é embutido no código — tudo entra por dados.
 */
import type { MediaTipo } from "@/lib/platform/property";

export const MEDIA_BUCKET = "cury-media";
export const MEDIA_MAX_BYTES = 25 * 1024 * 1024;

/** Ordem canônica de exibição na biblioteca. */
export const MEDIA_ORDEM_TIPOS: MediaTipo[] = ["imagem", "planta", "video", "tour", "pdf", "outro"];

export function nomeSeguro(nome: string): string {
  return (
    nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 120) || "arquivo"
  );
}

/**
 * GATE 02 — organização automática:
 * <workspace>/cury/<slug-do-empreendimento>/<tipo>/<uuid>-<arquivo>
 */
export function caminhoMidia(input: {
  workspaceId: string;
  slug: string;
  tipo: MediaTipo;
  nome: string;
}): string {
  return [
    input.workspaceId,
    "cury",
    nomeSeguro(input.slug),
    input.tipo,
    `${crypto.randomUUID()}-${nomeSeguro(input.nome)}`,
  ].join("/");
}

/** GATE 04 — alt descritivo automático quando a equipe não informa. */
export function altAutomatico(input: {
  empreendimento: string;
  cidade?: string | null;
  tipo: MediaTipo;
  indice: number;
  titulo?: string | null;
}): string {
  const local = input.cidade ? ` em ${input.cidade}` : "";
  const base: Record<MediaTipo, string> = {
    imagem: `Perspectiva do empreendimento ${input.empreendimento}${local}`,
    planta: `Planta humanizada do ${input.empreendimento}${local}`,
    video: `Vídeo oficial do ${input.empreendimento}${local}`,
    tour: `Tour virtual 360º do ${input.empreendimento}${local}`,
    pdf: `Material oficial do ${input.empreendimento}${local}`,
    outro: `Material do ${input.empreendimento}${local}`,
  };
  const complemento = input.titulo?.trim() ? ` — ${input.titulo.trim()}` : ` ${input.indice + 1}`;
  return `${base[input.tipo]}${complemento}`.slice(0, 160);
}

/** GATE 04 — title curto para tooltip/compartilhamento. */
export function tituloAutomatico(input: { empreendimento: string; tipo: MediaTipo }): string {
  const rotulo: Record<MediaTipo, string> = {
    imagem: "Foto oficial",
    planta: "Planta",
    video: "Vídeo",
    tour: "Tour virtual",
    pdf: "Material",
    outro: "Ativo",
  };
  return `${rotulo[input.tipo]} · ${input.empreendimento} · Cury`.slice(0, 110);
}

export function pesoLegivel(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  const un = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), un.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${un[i]}`;
}

export type MidiaItem = {
  id: string;
  tipo: MediaTipo;
  titulo: string | null;
  url: string;
  path: string | null;
  ordem: number;
  publico: boolean;
  alt: string | null;
  tituloSeo: string | null;
  legenda: string | null;
  largura: number | null;
  altura: number | null;
  bytes: number | null;
  mime: string | null;
  createdAt: string | null;
};

export type MediaChecklist = {
  capa: boolean;
  galeria: boolean;
  plantas: boolean;
  video: boolean;
  tour: boolean;
  pdf: boolean;
  seo: boolean;
};

/** GATE 07 — Health Score determinístico da mídia de um empreendimento. */
const PESOS: Record<keyof MediaChecklist, number> = {
  capa: 25,
  galeria: 25,
  plantas: 15,
  video: 10,
  tour: 10,
  pdf: 5,
  seo: 10,
};

export const GALERIA_MINIMA = 4;

export function avaliarMidia(input: {
  capaUrl: string | null;
  itens: MidiaItem[];
}): { checklist: MediaChecklist; score: number; estrelas: number; pendencias: string[] } {
  const imagens = input.itens.filter((m) => m.tipo === "imagem");
  const plantas = input.itens.filter((m) => m.tipo === "planta");
  const visuais = [...imagens, ...plantas];

  const checklist: MediaChecklist = {
    capa: Boolean(input.capaUrl),
    galeria: imagens.length >= GALERIA_MINIMA,
    plantas: plantas.length > 0,
    video: input.itens.some((m) => m.tipo === "video"),
    tour: input.itens.some((m) => m.tipo === "tour"),
    pdf: input.itens.some((m) => m.tipo === "pdf"),
    seo: visuais.length > 0 && visuais.every((m) => Boolean(m.alt?.trim())),
  };

  const score = (Object.keys(PESOS) as (keyof MediaChecklist)[]).reduce(
    (acc, k) => acc + (checklist[k] ? PESOS[k] : 0),
    0,
  );

  const rotulos: Record<keyof MediaChecklist, string> = {
    capa: "Sem capa definida",
    galeria: `Galeria com menos de ${GALERIA_MINIMA} imagens`,
    plantas: "Sem plantas",
    video: "Sem vídeo",
    tour: "Sem tour virtual",
    pdf: "Sem material em PDF",
    seo: "Texto alternativo pendente",
  };

  return {
    checklist,
    score,
    estrelas: Math.max(1, Math.round((score / 100) * 5)),
    pendencias: (Object.keys(checklist) as (keyof MediaChecklist)[])
      .filter((k) => !checklist[k])
      .map((k) => rotulos[k]),
  };
}

export const CHECKLIST_LABELS: Record<keyof MediaChecklist, string> = {
  capa: "Capa",
  galeria: "Galeria",
  plantas: "Plantas",
  video: "Vídeo",
  tour: "Tour",
  pdf: "PDF",
  seo: "SEO",
};
