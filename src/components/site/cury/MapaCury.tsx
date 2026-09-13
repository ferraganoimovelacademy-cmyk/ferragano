import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { empStatusLabels, formatBRL } from "@/lib/platform/comercial";
import { whatsappLink } from "@/lib/site/contato";
import { anoEntrega, ehMcmv, type CuryEmpreendimento } from "@/lib/site/cury";

/**
 * GATE 06 — Mapa interativo (esquemático, SVG próprio: sem tiles, sem chave de API).
 * Posição derivada do bairro; bairros sem coordenada entram na lista lateral.
 */
const COORDS: Record<string, { x: number; y: number }> = {
  "vila leopoldina": { x: 24, y: 52 },
  lapa: { x: 40, y: 38 },
  "agua branca": { x: 52, y: 28 },
  "água branca": { x: 52, y: 28 },
  "vila anastacio": { x: 30, y: 32 },
  "vila anastácio": { x: 30, y: 32 },
  pirituba: { x: 42, y: 14 },
  butanta: { x: 46, y: 74 },
  butantã: { x: 46, y: 74 },
  pinheiros: { x: 64, y: 62 },
  perdizes: { x: 58, y: 44 },
  barrafunda: { x: 62, y: 34 },
  "barra funda": { x: 62, y: 34 },
};

const chave = (b: string | null) =>
  (b ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function posicao(item: CuryEmpreendimento, i: number) {
  const direto = COORDS[chave(item.bairro)] ?? COORDS[(item.bairro ?? "").toLowerCase()];
  if (direto) return direto;
  return { x: 20 + ((i * 17) % 60), y: 20 + ((i * 23) % 60) };
}

export function MapaCury({ itens }: { itens: CuryEmpreendimento[] }) {
  const [ativo, setAtivo] = useState<string | null>(itens[0]?.id ?? null);
  const selecionado = itens.find((i) => i.id === ativo) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary-soft/50 to-accent/30">
        <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label="Mapa esquemático dos empreendimentos">
          <g stroke="currentColor" className="text-border" strokeWidth="0.4" opacity="0.7">
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={(i + 1) * 10} x2="100" y2={(i + 1) * 10} />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`v${i}`} x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2="100" />
            ))}
          </g>
          <path
            d="M4 70 C 26 62, 40 48, 58 40 S 84 26, 96 18"
            fill="none"
            stroke="currentColor"
            className="text-primary/40"
            strokeWidth="1.4"
          />
          {itens.map((item, i) => {
            const p = posicao(item, i);
            const on = item.id === ativo;
            return (
              <g key={item.id} className="cursor-pointer">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={on ? 3.4 : 2.4}
                  className={on ? "fill-primary" : "fill-primary/60"}
                  onClick={() => setAtivo(item.id)}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="6"
                  fill="transparent"
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir ${item.nome}`}
                  onClick={() => setAtivo(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setAtivo(item.id);
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div>
        {selecionado ? (
          <article className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-lg font-semibold tracking-tight">
                  {selecionado.nome}
                </h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <Icon name="location_on" size={16} />
                  {[selecionado.bairro, selecionado.cidade].filter(Boolean).join(", ")}
                </p>
              </div>
              {ehMcmv(selecionado) && <Badge variant="gold">MCMV</Badge>}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">A partir de</dt>
                <dd className="font-medium">{formatBRL(selecionado.preco_min)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Estágio</dt>
                <dd className="font-medium">{empStatusLabels[selecionado.status]}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Entrega</dt>
                <dd className="font-medium">{anoEntrega(selecionado.entrega_prevista)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Disponíveis</dt>
                <dd className="font-medium">{selecionado.disponiveis}</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                to="/empreendimentos/cury/$slug"
                params={{ slug: selecionado.slug }}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Conhecer
                <Icon name="arrow_forward" size={18} />
              </Link>
              <a
                href={whatsappLink(
                  `Olá! Vi o empreendimento ${selecionado.nome} no mapa do site da Ferragano e quero mais informações.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
              >
                <Icon name="chat" size={18} />
                WhatsApp
              </a>
            </div>
          </article>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Selecione um ponto no mapa para ver o empreendimento.
          </p>
        )}

        <ul className="mt-4 grid gap-2">
          {itens.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setAtivo(item.id)}
                aria-pressed={item.id === ativo}
                className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  item.id === ativo ? "border-primary bg-primary-soft/40" : "border-border hover:bg-accent"
                }`}
              >
                <span className="truncate">{item.nome}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{item.bairro}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}