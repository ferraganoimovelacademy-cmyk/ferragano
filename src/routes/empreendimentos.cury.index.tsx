import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { Faixa, TituloSecao } from "@/components/site/Bloco";
import { AvisoAtivos } from "@/components/site/cury/AtivoSlot";
import { LIMITE_COMPARACAO } from "@/components/site/cury/ComparadorCury";
import { VitrineCury } from "@/components/site/cury/VitrineCury";
import { empStatusLabels } from "@/lib/platform/comercial";
import { listCuryEmpreendimentos } from "@/lib/platform/cury.functions";
import { FAIXAS_PRECO, type CuryEmpreendimento } from "@/lib/site/cury";
import { canonical, jsonLd, metaBasica, schemaBreadcrumb } from "@/lib/site/seo";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  dorm: fallback(z.string(), "").default(""),
  faixa: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "").default(""),
  sel: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/empreendimentos/cury/")({
  validateSearch: zodValidator(searchSchema),
  loader: () => listCuryEmpreendimentos(),
  head: () => ({
    meta: metaBasica({
      titulo: "Empreendimentos Cury em São Paulo | Ferragano",
      descricao:
        "Catálogo de empreendimentos da construtora Cury com curadoria Ferragano: tipologia, metragem, faixa de preço, estágio de obra e elegibilidade ao MCMV.",
      path: "/empreendimentos/cury",
    }),
    links: canonical("/empreendimentos/cury"),
    scripts: jsonLd(
      schemaBreadcrumb([
        { nome: "Início", path: "/" },
        { nome: "Empreendimentos", path: "/empreendimentos" },
        { nome: "Cury", path: "/empreendimentos/cury" },
      ]),
    ),
  }),
  component: CatalogoCury,
});

type Filtros = { q: string; dorm: string; faixa: string; status: string; sel: string };

function filtrar(itens: CuryEmpreendimento[], s: Filtros) {
  const termo = s.q.trim().toLowerCase().slice(0, 80);
  const faixa = FAIXAS_PRECO.find((f) => f.id === s.faixa);
  const dorm = Number(s.dorm);

  return itens.filter((e) => {
    if (termo) {
      const alvo = `${e.nome} ${e.bairro ?? ""} ${e.cidade ?? ""}`.toLowerCase();
      if (!alvo.includes(termo)) return false;
    }
    if (s.status && e.status !== s.status) return false;
    if (Number.isFinite(dorm) && dorm > 0 && !e.dormitorios.includes(dorm)) return false;
    if (faixa) {
      const preco = e.preco_min ?? 0;
      if (preco < faixa.min || preco > faixa.max) return false;
    }
    return true;
  });
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`h-9 rounded-full border px-4 text-xs font-medium transition-colors ${
        ativo
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function CatalogoCury() {
  const itens: CuryEmpreendimento[] = Route.useLoaderData();
  const search: Filtros = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const lista = filtrar(itens, search);
  const selecionados = search.sel.split(",").filter(Boolean);

  const set = (patch: Partial<typeof search>) =>
    void navigate({ search: (prev: Filtros) => ({ ...prev, ...patch }) });

  const alternar = (slug: string) => {
    const proximo = selecionados.includes(slug)
      ? selecionados.filter((s) => s !== slug)
      : [...selecionados, slug].slice(0, LIMITE_COMPARACAO);
    set({ sel: proximo.join(",") });
  };

  return (
    <SiteLayout>
      <section className="border-b border-border bg-gradient-to-b from-primary-soft/50 to-background">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-14 md:px-8 md:py-20">
          <p className="t-caps text-gold">Cury Collection</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl leading-tight font-semibold tracking-tight md:text-5xl">
            Lançamentos de Elite com Curadoria Ferragano One
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
            {itens.length} empreendimento{itens.length === 1 ? "" : "s"} no ar. Filtre por
            tipologia, faixa de preço e estágio de obra — e compare lado a lado antes de falar com
            um consultor.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/construtoras/cury"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-card px-5 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Icon name="corporate_fare" size={18} />
              Sobre a Cury
            </Link>
            <Link
              to="/empreendimentos/cury/mapa"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-card px-5 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Icon name="map" size={18} />
              Ver no mapa
            </Link>
          </div>
        </div>
      </section>

      <Faixa>
        <TituloSecao eyebrow="Catálogo" titulo="Escolha por critério, não por foto" />

        <div className="mt-8 grid gap-4 rounded-xl border border-border bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input
              value={search.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Buscar por nome, bairro ou cidade"
              aria-label="Buscar empreendimento"
            />
            <p className="self-center text-xs text-muted-foreground">
              {lista.length} resultado{lista.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="self-center text-xs text-muted-foreground">Dormitórios:</span>
            {[1, 2, 3].map((d) => (
              <Chip
                key={d}
                ativo={search.dorm === String(d)}
                onClick={() => set({ dorm: search.dorm === String(d) ? "" : String(d) })}
              >
                {d} dorm.
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="self-center text-xs text-muted-foreground">Preço:</span>
            {FAIXAS_PRECO.map((f) => (
              <Chip
                key={f.id}
                ativo={search.faixa === f.id}
                onClick={() => set({ faixa: search.faixa === f.id ? "" : f.id })}
              >
                {f.label}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="self-center text-xs text-muted-foreground">Estágio:</span>
            {(Object.keys(empStatusLabels) as (keyof typeof empStatusLabels)[]).map((s) => (
              <Chip
                key={s}
                ativo={search.status === s}
                onClick={() => set({ status: search.status === s ? "" : s })}
              >
                {empStatusLabels[s]}
              </Chip>
            ))}
          </div>
        </div>

        {selecionados.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary-soft/40 p-4">
            <p className="text-sm">
              {selecionados.length} de {LIMITE_COMPARACAO} selecionados para comparação
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => set({ sel: "" })}
                className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-accent"
              >
                Limpar
              </button>
              <Link
                to="/empreendimentos/cury/comparar"
                search={{ sel: selecionados.join(",") }}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <Icon name="compare_arrows" size={18} />
                Comparar
              </Link>
            </div>
          </div>
        )}

        {!lista.length ? (
          <p className="mt-8 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nenhum empreendimento com esses filtros. Ajuste os critérios ou fale com um consultor.
          </p>
        ) : (
          <VitrineCury itens={lista} selecionados={selecionados} onAlternar={alternar} />
        )}

        <AvisoAtivos className="mt-10" />
      </Faixa>
    </SiteLayout>
  );
}
