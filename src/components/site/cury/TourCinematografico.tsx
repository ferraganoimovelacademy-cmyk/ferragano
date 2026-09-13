import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { AtivoSlot } from "@/components/site/cury/AtivoSlot";
import { propsImagem } from "@/lib/site/imagem";
import type { CuryAtivo } from "@/lib/site/cury";

type Capitulo = CuryAtivo & { rotulo: string; embutido: boolean };

const EXT_VIDEO = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

/** Converte URL de plataforma em endereço embutível; devolve null quando não dá. */
function urlEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed${u.pathname}?rel=0`;
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}?rel=0`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
    if (host.endsWith("vimeo.com")) return `https://player.vimeo.com/video/${u.pathname.replace(/\D+/g, "")}`;
    return url;
  } catch {
    return null;
  }
}

/**
 * Tour cinematográfico — vídeos e tours oficiais em tela cheia, com capítulos,
 * navegação por teclado e trava de scroll. Sem ativo liberado, cai em placeholder.
 */
export function TourCinematografico({
  nome,
  capa,
  videos,
  tours,
}: {
  nome: string;
  capa?: string | null;
  videos: CuryAtivo[];
  tours: CuryAtivo[];
}) {
  const capitulos: Capitulo[] = [
    ...videos.map((a) => ({ ...a, rotulo: a.titulo ?? "Vídeo oficial", embutido: false })),
    ...tours.map((a) => ({ ...a, rotulo: a.titulo ?? "Tour virtual 360º", embutido: true })),
  ];

  const [aberto, setAberto] = useState<number | null>(null);
  const total = capitulos.length;

  const mover = useCallback(
    (passo: number) => setAberto((i) => (i === null ? null : (i + passo + total) % total)),
    [total],
  );

  useEffect(() => {
    if (aberto === null) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setAberto(null);
      if (ev.key === "ArrowRight") mover(1);
      if (ev.key === "ArrowLeft") mover(-1);
    };
    window.addEventListener("keydown", onKey);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = anterior;
    };
  }, [aberto, mover]);

  if (!total) {
    return (
      <AtivoSlot
        titulo={`Tour cinematográfico do ${nome}`}
        icone="movie"
        proporcao="aspect-[16/9]"
        nota="O vídeo oficial e o tour 360º entram aqui assim que a construtora liberar as peças."
      />
    );
  }

  const atual = aberto === null ? null : capitulos[aberto];
  const embed = atual ? urlEmbed(atual.url) : null;
  const ehArquivo = Boolean(atual && EXT_VIDEO.test(atual.url));

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(0)}
        aria-label={`Abrir tour cinematográfico do ${nome} em tela cheia`}
        className="press group relative block w-full overflow-hidden rounded-2xl border border-border bg-card"
      >
        <div className="aspect-[16/9] w-full">
          {capa ? (
            <img
              {...propsImagem(capa, { sizes: "(min-width: 1024px) 1000px, 100vw" })}
              alt={`Cena do tour do ${nome}`}
              className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="size-full bg-gradient-to-br from-primary-soft/60 to-accent/40" />
          )}
        </div>
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <span className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-4 p-6 text-left">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white/95 text-black transition-transform duration-300 group-hover:scale-110">
            <Icon name="play_arrow" size={30} />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-lg font-semibold tracking-tight text-white md:text-2xl">
              Tour cinematográfico
            </span>
            <span className="block text-sm text-white/80">
              {total} {total === 1 ? "capítulo" : "capítulos"} · tela cheia
            </span>
          </span>
        </span>
      </button>

      <ul className="mt-4 flex flex-wrap gap-2">
        {capitulos.map((c, i) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setAberto(i)}
              className="press inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:border-primary"
            >
              <Icon name={c.embutido ? "view_in_ar" : "movie"} size={16} className="text-primary" />
              {c.rotulo}
            </button>
          </li>
        ))}
      </ul>

      {atual && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Tour do ${nome} — ${atual.rotulo}`}
          className="fixed inset-0 z-[100] flex flex-col bg-black/95 animate-fade-in"
        >
          <div className="flex items-center gap-3 p-4">
            <p className="min-w-0 truncate text-sm font-medium text-white">
              {atual.rotulo} · {nome}
            </p>
            <button
              type="button"
              onClick={() => setAberto(null)}
              aria-label="Fechar tour"
              className="ml-auto grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-4">
            {ehArquivo ? (
              <video
                key={atual.id}
                src={atual.url}
                controls
                autoPlay
                playsInline
                poster={capa ?? undefined}
                className="max-h-full w-full max-w-[1600px] rounded-lg bg-black"
              />
            ) : embed ? (
              <iframe
                key={atual.id}
                src={embed}
                title={`${atual.rotulo} — ${nome}`}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; fullscreen; xr-spatial-tracking"
                allowFullScreen
                className="h-full max-h-full w-full max-w-[1600px] rounded-lg border-0 bg-black"
              />
            ) : (
              <p className="text-sm text-white/80">Ativo indisponível.</p>
            )}
          </div>

          {total > 1 && (
            <div className="flex items-center justify-center gap-3 pb-6">
              <button
                type="button"
                onClick={() => mover(-1)}
                aria-label="Capítulo anterior"
                className="grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <Icon name="arrow_back" size={20} />
              </button>
              <span className="text-xs text-white/70">
                {(aberto ?? 0) + 1} / {total}
              </span>
              <button
                type="button"
                onClick={() => mover(1)}
                aria-label="Próximo capítulo"
                className="grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <Icon name="arrow_forward" size={20} />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
