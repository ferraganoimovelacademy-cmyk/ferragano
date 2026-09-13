import type { MidiaItem } from "@/lib/platform/media";

/** Projeção mínima de `property_media` usada pelo Asset Intelligence. */
export const SELECT_ATIVO_MIDIA =
  "id, empreendimento_id, tipo, titulo, url, path, ordem, publico, alt, titulo_seo, legenda, largura, altura, bytes, mime, created_at";

export function mapearAtivoMidia(row: Record<string, unknown>): MidiaItem {
  return {
    id: String(row.id),
    tipo: row.tipo as MidiaItem["tipo"],
    titulo: (row.titulo as string) ?? null,
    url: String(row.url ?? ""),
    path: (row.path as string) ?? null,
    ordem: Number(row.ordem ?? 0),
    publico: Boolean(row.publico),
    alt: (row.alt as string) ?? null,
    tituloSeo: (row.titulo_seo as string) ?? null,
    legenda: (row.legenda as string) ?? null,
    largura: row.largura == null ? null : Number(row.largura),
    altura: row.altura == null ? null : Number(row.altura),
    bytes: row.bytes == null ? null : Number(row.bytes),
    mime: (row.mime as string) ?? null,
    createdAt: (row.created_at as string) ?? null,
  };
}
