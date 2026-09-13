import { canonical, jsonLd, metaBasica, schemaBreadcrumb } from "@/lib/site/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { VitrineContato } from "@/components/platform/VitrineContato";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EMPREENDIMENTO_SEGMENTOS,
  EMPREENDIMENTO_STATUS,
  empStatusLabels,
  formatBRL,
  segmentoLabels,
} from "@/lib/platform/comercial";
import { listVitrine, type EmpreendimentoPublico } from "@/lib/platform/vitrine";

export const Route = createFileRoute("/empreendimentos/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { q?: string; cidade?: string; status?: string; segmento?: string } => ({
    q: typeof search.q === "string" ? search.q : undefined,
    cidade: typeof search.cidade === "string" ? search.cidade : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
    segmento: typeof search.segmento === "string" ? search.segmento : undefined,
  }),
  head: () => ({
    meta: metaBasica({
      titulo: "Lançamentos e empreendimentos — Ferragano",
      descricao:
        "Portfólio Ferragano: lançamentos, obras e prontos para morar, com faixa de preço, estágio e localização.",
      path: "/empreendimentos",
    }),
    links: canonical("/empreendimentos"),
    scripts: jsonLd(
      schemaBreadcrumb([
        { nome: "Início", path: "/" },
        { nome: "Lançamentos", path: "/empreendimentos" },
      ]),
    ),
  }),
  component: VitrinePage,
});

const TODOS = "todos";

function Filtro({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 w-full sm:w-[190px]" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODOS}>{label}: todos</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Capa({ item }: { item: EmpreendimentoPublico }) {
  if (item.capa_url) {
    return (
      <img
        src={item.capa_url}
        alt={`Fachada do empreendimento ${item.nome}`}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-soft to-accent">
      <Icon name="apartment" size={40} className="text-primary" />
    </div>
  );
}

function Card({ item }: { item: EmpreendimentoPublico }) {
  const local = [item.bairro, item.cidade, item.uf].filter(Boolean).join(", ");
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Capa item={item} />
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className="bg-primary text-primary-foreground">
            {empStatusLabels[item.status]}
          </Badge>
          {item.destaque && <Badge variant="gold">Destaque</Badge>}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {segmentoLabels[item.segmento]}
        </p>
        <h2 className="mt-1.5 font-display text-lg leading-snug font-semibold tracking-tight">
          {item.nome}
        </h2>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <Icon name="location_on" size={16} />
          {local || "Localização a divulgar"}
        </p>

        {item.descricao && (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{item.descricao}</p>
        )}

        <div className="mt-auto pt-5">
          <p className="text-xs text-muted-foreground">A partir de</p>
          <p className="font-display text-xl font-semibold tracking-tight">
            {formatBRL(item.preco_min ? Number(item.preco_min) : null)}
          </p>
          <a
            href={`/empreendimentos/${item.id}`}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Quero saber mais
            <Icon name="arrow_forward" size={18} />
          </a>
        </div>
      </div>
    </article>
  );
}

function VitrinePage() {
  const sp = Route.useSearch();
  const [busca, setBusca] = useState(sp.q ?? "");
  const [cidade, setCidade] = useState(sp.cidade ?? TODOS);
  const [status, setStatus] = useState(sp.status ?? TODOS);
  const [segmento, setSegmento] = useState(sp.segmento ?? TODOS);

  const { data, isPending, isError } = useQuery({
    queryKey: ["vitrine"],
    queryFn: listVitrine,
  });

  const cidades = useMemo(
    () => [...new Set((data ?? []).map((i) => i.cidade).filter(Boolean))].sort() as string[],
    [data],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (data ?? []).filter((i) => {
      if (cidade !== TODOS && i.cidade !== cidade) return false;
      if (status !== TODOS && i.status !== status) return false;
      if (segmento !== TODOS && i.segmento !== segmento) return false;
      if (!termo) return true;
      return [i.nome, i.bairro, i.cidade, i.construtora]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(termo));
    });
  }, [data, busca, cidade, status, segmento]);

  return (
    <SiteLayout>
      <section className="border-b border-border bg-gradient-to-b from-primary-soft/60 to-background">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8 md:py-20">
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Portfólio Ferragano
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[1.05] font-semibold tracking-tight md:text-6xl">
            O seu próximo endereço já está aqui.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Lançamentos, obras em andamento e prontos para morar. Selecione a cidade, o estágio da
            obra e fale direto com um especialista.
          </p>

          <div className="mt-9 grid gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-2 lg:flex lg:items-center">
            <div className="relative lg:flex-1">
              <Icon
                name="search"
                size={18}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, bairro ou construtora"
                className="h-11 pl-9"
                aria-label="Buscar empreendimento"
              />
            </div>
            <Filtro
              label="Cidade"
              value={cidade}
              onChange={setCidade}
              options={cidades.map((c) => ({ value: c, label: c }))}
            />
            <Filtro
              label="Estágio"
              value={status}
              onChange={setStatus}
              options={EMPREENDIMENTO_STATUS.map((s) => ({ value: s, label: empStatusLabels[s] }))}
            />
            <Filtro
              label="Segmento"
              value={segmento}
              onChange={setSegmento}
              options={EMPREENDIMENTO_SEGMENTOS.map((s) => ({
                value: s,
                label: segmentoLabels[s],
              }))}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 py-12 md:px-8 md:py-16">
        {isPending ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-[420px] w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Não foi possível carregar a vitrine agora. Tente novamente em instantes.
          </p>
        ) : filtrados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <Icon name="apartment" size={32} className="text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {(data ?? []).length === 0
                ? "Nenhum empreendimento publicado no site ainda."
                : "Nenhum empreendimento com esses filtros."}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              {filtrados.length} {filtrados.length === 1 ? "empreendimento" : "empreendimentos"}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtrados.map((item) => (
                <Card key={item.id} item={item} />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="border-t border-border bg-accent/40">
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-16 md:grid-cols-2 md:px-8 md:py-20">
          <div>
            <h2 className="font-display text-3xl leading-tight font-semibold tracking-tight md:text-4xl">
              Não achou o imóvel ideal?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Conte o que você procura. Um especialista Ferragano busca as melhores oportunidades,
              inclusive lançamentos que ainda não estão no site.
            </p>
          </div>
          <VitrineContato />
        </div>
      </section>
    </SiteLayout>
  );
}
