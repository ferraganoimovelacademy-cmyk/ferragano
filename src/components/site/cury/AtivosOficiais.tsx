import { Icon } from "@/components/Icon";
import { MidiaOficial } from "@/components/site/cury/MidiaOficial";
import type { CuryAtivo } from "@/lib/site/cury";

/**
 * Sprint UI 04.2 — GATE 05.
 * Plantas, vídeo, tour e material oficial publicados na Biblioteca de Mídia.
 * Sem ativo liberado, o bloco simplesmente não é renderizado.
 */
export function AtivosOficiais({
  nome,
  plantas,
  videos,
  tours,
  pdfs,
}: {
  nome: string;
  plantas: CuryAtivo[];
  videos: CuryAtivo[];
  tours: CuryAtivo[];
  pdfs: CuryAtivo[];
}) {
  const links = [
    ...videos.map((a) => ({ ...a, icone: "movie", rotulo: a.titulo ?? "Vídeo oficial" })),
    ...tours.map((a) => ({ ...a, icone: "view_in_ar", rotulo: a.titulo ?? "Tour virtual 360º" })),
    ...pdfs.map((a) => ({ ...a, icone: "picture_as_pdf", rotulo: a.titulo ?? "Material oficial" })),
  ];

  if (!plantas.length && !links.length) return null;

  return (
    <div className="grid gap-8">
      {plantas.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plantas.map((planta, i) => (
            <figure key={planta.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <MidiaOficial
                src={planta.url}
                alt={planta.alt ?? `Planta oficial do ${nome} — ${i + 1}`}
                proporcao="aspect-[4/3]"
                sizes="(min-width: 1024px) 400px, 100vw"
              />
              <figcaption className="p-3 text-sm">
                <span className="font-medium">{planta.titulo ?? `Planta ${i + 1}`}</span>
                {planta.legenda && (
                  <span className="mt-0.5 block text-xs text-muted-foreground">{planta.legenda}</span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {links.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="press flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft/60 text-primary">
                  <Icon name={item.icone} size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{item.rotulo}</span>
                  <span className="block text-xs text-muted-foreground">Material oficial · {nome}</span>
                </span>
                <Icon name="open_in_new" size={16} className="ml-auto text-muted-foreground" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
