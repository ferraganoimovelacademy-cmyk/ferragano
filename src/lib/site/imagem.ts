/**
 * UI 04.1 — GATE 04. Otimização de imagens oficiais.
 *
 * Só a apresentação: recebe a URL publicada pela equipe comercial e devolve
 * `srcset`/`sizes` responsivos. Quando a URL é do storage da plataforma,
 * usa o transformador de imagem (WebP/AVIF negociado pelo navegador);
 * para qualquer outra origem, devolve a URL intacta.
 */
const LARGURAS = [480, 768, 1080, 1440, 1920] as const;

const ehStoragePlataforma = (src: string) => src.includes("/storage/v1/object/public/");

function transformar(src: string, largura: number) {
  if (!ehStoragePlataforma(src)) return src;
  const base = src.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}width=${largura}&resize=contain&quality=78`;
}

export type PropsImagem = {
  src: string;
  srcSet?: string;
  sizes?: string;
  loading: "lazy" | "eager";
  decoding: "async";
  fetchPriority?: "high" | "auto";
};

/** Props de `<img>` para uma mídia oficial. `prioridade` só no ativo above-the-fold. */
export function propsImagem(
  src: string,
  { sizes = "100vw", prioridade = false }: { sizes?: string; prioridade?: boolean } = {},
): PropsImagem {
  const otimizavel = ehStoragePlataforma(src);
  return {
    src: otimizavel ? transformar(src, 1440) : src,
    srcSet: otimizavel ? LARGURAS.map((w) => `${transformar(src, w)} ${w}w`).join(", ") : undefined,
    sizes: otimizavel ? sizes : undefined,
    loading: prioridade ? "eager" : "lazy",
    decoding: "async",
    fetchPriority: prioridade ? "high" : "auto",
  };
}
