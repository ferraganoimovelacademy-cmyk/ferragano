import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AtivoSlot } from "@/components/site/cury/AtivoSlot";
import { formatBRL } from "@/lib/platform/comercial";
import type { CuryUnidade } from "@/lib/site/cury";
import { whatsappLink } from "@/lib/site/contato";

/**
 * GATE 03 — Plantas em cards grandes.
 * Ao abrir: amplia a planta, compara com outra tipologia e solicita o PDF oficial.
 * A planta humanizada é ativo licenciado — enquanto não liberada, exibe placeholder.
 */
type Tipologia = {
  id: string;
  nome: string;
  dormitorios: number | null;
  suites: number | null;
  vagas: number | null;
  varanda: boolean;
  area: number | null;
  precoMin: number | null;
  disponiveis: number;
};

function agrupar(unidades: CuryUnidade[]): Tipologia[] {
  const mapa = new Map<string, Tipologia>();
  for (const u of unidades) {
    const chave = `${u.dormitorios ?? 0}-${(u.area_privativa ?? 0).toFixed(0)}`;
    const atual = mapa.get(chave);
    if (!atual) {
      mapa.set(chave, {
        id: chave,
        nome: u.tipologia ?? `${u.dormitorios ?? "?"} dormitórios`,
        dormitorios: u.dormitorios,
        suites: u.suites,
        vagas: u.vagas,
        varanda: u.varanda,
        area: u.area_privativa,
        precoMin: u.preco,
        disponiveis: u.status === "disponivel" ? 1 : 0,
      });
      continue;
    }
    if (u.status === "disponivel") atual.disponiveis += 1;
    if (u.preco != null && (atual.precoMin == null || u.preco < atual.precoMin)) atual.precoMin = u.preco;
  }
  return [...mapa.values()].sort((a, b) => (a.area ?? 0) - (b.area ?? 0));
}

export function PlantasPremium({ unidades, nome }: { unidades: CuryUnidade[]; nome: string }) {
  const tipologias = useMemo(() => agrupar(unidades), [unidades]);
  const [aberta, setAberta] = useState<Tipologia | null>(null);
  const [comparar, setComparar] = useState<string>("");

  if (!tipologias.length) {
    return (
      <AtivoSlot
        titulo="Plantas humanizadas"
        icone="grid_on"
        proporcao="aspect-[16/7]"
        nota="As plantas entram aqui após liberação da construtora."
      />
    );
  }

  const outra = tipologias.find((t) => t.id === comparar) ?? null;

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        {tipologias.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setComparar("");
              setAberta(t);
            }}
            className="press group rounded-2xl border border-border bg-card p-6 text-left hover:border-primary/60"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="t-caps text-gold">Tipologia</p>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
                  {t.area ? `${t.area.toFixed(0)} m²` : t.nome}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.dormitorios ?? "—"} dorm.
                  {t.suites ? ` · ${t.suites} suíte${t.suites > 1 ? "s" : ""}` : ""}
                  {t.vagas ? ` · ${t.vagas} vaga${t.vagas > 1 ? "s" : ""}` : ""}
                  {t.varanda ? " · varanda" : ""}
                </p>
              </div>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-soft-foreground transition-transform group-hover:scale-110">
                <Icon name="open_in_full" size={20} />
              </span>
            </div>

            <div className="mt-5 flex aspect-[16/9] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border bg-gradient-to-br from-primary-soft/50 to-accent/40">
              <Icon name="grid_on" size={24} className="text-primary" />
              <span className="text-xs text-muted-foreground">Planta oficial em liberação</span>
            </div>

            <div className="mt-5 flex items-center justify-between text-sm">
              <span className="font-display font-semibold">{formatBRL(t.precoMin)}</span>
              <span className="text-muted-foreground">
                {t.disponiveis} disponív{t.disponiveis === 1 ? "el" : "eis"}
              </span>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={Boolean(aberta)} onOpenChange={(o) => !o && setAberta(null)}>
        <DialogContent className="max-w-3xl">
          {aberta && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl tracking-tight">
                  {aberta.area ? `${aberta.area.toFixed(0)} m² privativos` : aberta.nome}
                </DialogTitle>
                <DialogDescription>
                  {aberta.dormitorios ?? "—"} dormitórios · {nome}
                </DialogDescription>
              </DialogHeader>

              <div className={`grid gap-4 ${outra ? "sm:grid-cols-2" : ""}`}>
                <PlantaQuadro t={aberta} />
                {outra && <PlantaQuadro t={outra} />}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Comparar com:</span>
                {tipologias
                  .filter((t) => t.id !== aberta.id)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setComparar(comparar === t.id ? "" : t.id)}
                      aria-pressed={comparar === t.id}
                      className={`h-9 rounded-full border px-4 text-xs font-medium transition-colors ${
                        comparar === t.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      {t.area ? `${t.area.toFixed(0)} m²` : t.nome}
                    </button>
                  ))}
              </div>

              <a
                href={whatsappLink(
                  `Olá! Quero receber a planta em PDF da tipologia de ${aberta.area?.toFixed(0) ?? "—"} m² do ${nome}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground"
              >
                <Icon name="download" size={18} />
                Receber planta em PDF
              </a>
              <p className="text-xs text-muted-foreground">
                O PDF é o material oficial da construtora e é enviado pelo consultor após liberação.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PlantaQuadro({ t }: { t: Tipologia }) {
  return (
    <figure className="rounded-xl border border-border bg-card p-4">
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-gradient-to-br from-primary-soft/50 to-accent/40">
        <Icon name="grid_on" size={24} className="text-primary" />
        <span className="text-xs text-muted-foreground">Planta em liberação</span>
      </div>
      <figcaption className="mt-3 text-sm">
        <span className="font-display font-semibold">
          {t.area ? `${t.area.toFixed(0)} m²` : t.nome}
        </span>
        <span className="block text-xs text-muted-foreground">
          {t.dormitorios ?? "—"} dorm.{t.varanda ? " · varanda" : ""} · {formatBRL(t.precoMin)}
        </span>
      </figcaption>
    </figure>
  );
}