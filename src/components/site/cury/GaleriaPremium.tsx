import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { AtivoSlot } from "@/components/site/cury/AtivoSlot";
import { propsImagem } from "@/lib/site/imagem";

/**
 * GATE 03 — Galeria premium.
 * Miniaturas com lazy loading, visor fullscreen com navegação por teclado,
 * swipe no mobile e zoom por clique. Sem material licenciado, cai em placeholder.
 */
export function GaleriaPremium({ imagens, nome }: { imagens: string[]; nome: string }) {
  const [aberto, setAberto] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);

  const total = imagens.length;
  const mover = useCallback(
    (passo: number) => {
      setZoom(false);
      setAberto((i) => (i === null ? null : (i + passo + total) % total));
    },
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-2">
          <AtivoSlot
            titulo={`Perspectivas de ${nome}`}
            icone="photo_library"
            proporcao="aspect-[16/10]"
            nota="A galeria oficial entra aqui assim que a construtora liberar as imagens."
          />
        </div>
        <AtivoSlot titulo="Áreas comuns" icone="pool" proporcao="aspect-[4/5]" compacto />
      </div>
    );
  }

  let toqueX = 0;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {imagens.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setAberto(i)}
            aria-label={`Ampliar imagem ${i + 1} de ${total} de ${nome}`}
            className={`cine-frame press group relative overflow-hidden rounded-xl border border-border ${
              i === 0 ? "sm:col-span-2 sm:row-span-2 aspect-[16/10]" : "aspect-[4/3]"
            }`}
          >
            <img
              {...propsImagem(src, {
                sizes: i === 0 ? "(min-width: 1024px) 800px, 100vw" : "(min-width: 1024px) 400px, 50vw",
                prioridade: i < 3,
              })}
              alt={`${nome} — imagem ${i + 1}`}
              className="cine-media size-full object-cover"
            />
            <span className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-card/85 text-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Icon name="zoom_in" size={18} />
            </span>
          </button>
        ))}
      </div>

      {aberto !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Galeria de ${nome}`}
          className="fixed inset-0 z-[70] flex flex-col bg-background/96 backdrop-blur-xl fade-in-soft"
          onTouchStart={(ev) => {
            toqueX = ev.touches[0]?.clientX ?? 0;
          }}
          onTouchEnd={(ev) => {
            const dx = (ev.changedTouches[0]?.clientX ?? 0) - toqueX;
            if (Math.abs(dx) > 48) mover(dx < 0 ? 1 : -1);
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 md:px-8">
            <p className="text-sm text-muted-foreground">
              {aberto + 1} / {total} · {nome}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => !z)}
                aria-pressed={zoom}
                aria-label={zoom ? "Reduzir imagem" : "Ampliar imagem"}
                className="press grid size-11 place-items-center rounded-full border border-border bg-card"
              >
                <Icon name={zoom ? "zoom_out" : "zoom_in"} size={20} />
              </button>
              <button
                type="button"
                onClick={() => setAberto(null)}
                aria-label="Fechar galeria"
                autoFocus
                className="press grid size-11 place-items-center rounded-full border border-border bg-card"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto px-4 pb-6">
            <img
              src={imagens[aberto]}
              alt={`${nome} — imagem ${aberto + 1} ampliada`}
              className={`rounded-xl transition-transform duration-500 ${
                zoom ? "max-w-none scale-150 cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain"
              }`}
              onClick={() => setZoom((z) => !z)}
            />
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => mover(-1)}
                  aria-label="Imagem anterior"
                  className="press absolute left-3 grid size-12 place-items-center rounded-full border border-border bg-card/90 backdrop-blur"
                >
                  <Icon name="chevron_left" size={24} />
                </button>
                <button
                  type="button"
                  onClick={() => mover(1)}
                  aria-label="Próxima imagem"
                  className="press absolute right-3 grid size-12 place-items-center rounded-full border border-border bg-card/90 backdrop-blur"
                >
                  <Icon name="chevron_right" size={24} />
                </button>
              </>
            )}
          </div>
          <p className="px-4 pb-4 text-center text-xs text-muted-foreground md:hidden">
            Arraste para o lado para navegar.
          </p>
        </div>
      )}
    </>
  );
}