import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { VitrineContato } from "@/components/platform/VitrineContato";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  empStatusLabels,
  formatBRL,
  segmentoLabels,
  unidadeStatusLabels,
  type UnidadeStatus,
} from "@/lib/platform/comercial";
import { getEmpreendimentoPublico } from "@/lib/platform/vitrine.functions";
import type { EmpreendimentoDetalhePublico } from "@/lib/platform/vitrine";

export const Route = createFileRoute("/empreendimentos/$id")({
  loader: async ({ params }): Promise<EmpreendimentoDetalhePublico> => {
    const data = await getEmpreendimentoPublico({ data: { id: params.id } });
    if (!data) throw notFound();
    return data as unknown as EmpreendimentoDetalhePublico;
  },
  head: ({ params, loaderData }) => {
    const e = loaderData?.empreendimento;
    if (!e) return { meta: [{ title: "Empreendimento — Ferragano" }] };

    const local = [e.bairro, e.cidade, e.uf].filter(Boolean).join(", ");
    const titulo = `${e.nome}${local ? ` — ${local}` : ""} | Ferragano`;
    const descricao =
      e.descricao?.slice(0, 155) ??
      `${e.nome}: ${empStatusLabels[e.status]}${local ? ` em ${local}` : ""}. A partir de ${formatBRL(
        e.preco_min ? Number(e.preco_min) : null,
      )}.`;
    const url = `/empreendimentos/${params.id}`;

    return {
      meta: [
        { title: titulo },
        { name: "description", content: descricao },
        { property: "og:title", content: titulo },
        { property: "og:description", content: descricao },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(e.capa_url?.startsWith("https://")
          ? [
              { property: "og:image", content: e.capa_url },
              { name: "twitter:image", content: e.capa_url },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Residence",
            name: e.nome,
            description: descricao,
            ...(e.capa_url ? { image: e.capa_url } : {}),
            address: {
              "@type": "PostalAddress",
              addressLocality: e.cidade ?? undefined,
              addressRegion: e.uf ?? undefined,
              streetAddress: e.bairro ?? undefined,
              addressCountry: "BR",
            },
            ...(e.preco_min
              ? {
                  makesOffer: {
                    "@type": "Offer",
                    price: Number(e.preco_min),
                    priceCurrency: "BRL",
                    availability: "https://schema.org/InStock",
                  },
                }
              : {}),
          }),
        },
      ],
    };
  },
  errorComponent: () => (
    <SiteLayout>
      <Aviso titulo="Não foi possível carregar" texto="Tente novamente em instantes." />
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <Aviso
        titulo="Empreendimento não encontrado"
        texto="Ele pode ter saído do site ou o endereço está incorreto."
      />
    </SiteLayout>
  ),
  component: DetalhePage,
});

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-24 text-center md:px-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{titulo}</h1>
      <p className="mt-3 text-muted-foreground">{texto}</p>
      <Button asChild className="mt-6">
        <Link to="/empreendimentos">Ver todos os empreendimentos</Link>
      </Button>
    </div>
  );
}

const TODOS = "todos";

function Galeria({
  capa,
  imagens,
  nome,
}: {
  capa: string | null;
  imagens: string[];
  nome: string;
}) {
  const fotos = [capa, ...imagens].filter(Boolean) as string[];
  const [ativa, setAtiva] = useState(0);

  if (!fotos.length) {
    return (
      <div className="grid aspect-[16/9] w-full place-items-center rounded-xl bg-gradient-to-br from-primary-soft to-accent">
        <Icon name="apartment" size={56} className="text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-[16/9] w-full overflow-hidden rounded-xl border border-border">
        <img
          src={fotos[ativa]}
          alt={`${nome} — imagem ${ativa + 1}`}
          className="h-full w-full object-cover"
        />
      </div>
      {fotos.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {fotos.map((f, i) => (
            <button
              key={f + i}
              type="button"
              onClick={() => setAtiva(i)}
              aria-label={`Ver imagem ${i + 1}`}
              className={`h-20 w-28 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                i === ativa ? "border-primary" : "border-transparent"
              }`}
            >
              <img src={f} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function statusVariant(status: UnidadeStatus) {
  if (status === "disponivel") return "default" as const;
  if (status === "reservada") return "gold" as const;
  return "secondary" as const;
}

function DetalhePage() {
  const { empreendimento: e, unidades } = Route.useLoaderData() as EmpreendimentoDetalhePublico;
  const [tipo, setTipo] = useState(TODOS);

  const galeria = Array.isArray(e.galeria)
    ? (e.galeria.filter((g: unknown) => typeof g === "string") as string[])
    : [];
  const local = [e.bairro, e.cidade, e.uf].filter(Boolean).join(", ");

  const tipologias = useMemo(
    () => [...new Set(unidades.map((u) => u.tipologia).filter(Boolean))].sort() as string[],
    [unidades],
  );

  const filtradas = useMemo(
    () => (tipo === TODOS ? unidades : unidades.filter((u) => u.tipologia === tipo)),
    [unidades, tipo],
  );

  const disponiveis = unidades.filter((u) => u.status === "disponivel").length;

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8 md:py-14">
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/empreendimentos" className="hover:text-foreground">
            Empreendimentos
          </Link>
          <Icon name="chevron_right" size={16} />
          <span className="text-foreground">{e.nome}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <Galeria capa={e.capa_url} imagens={galeria} nome={e.nome} />

            <div className="mt-8 flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">
                {empStatusLabels[e.status]}
              </Badge>
              <Badge variant="secondary">{segmentoLabels[e.segmento]}</Badge>
              {e.destaque && <Badge variant="gold">Destaque</Badge>}
            </div>

            <h1 className="mt-4 font-display text-3xl leading-tight font-semibold tracking-tight md:text-5xl">
              Experiência Digital: {e.nome}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
              <Icon name="location_on" size={18} />
              {local || "Localização a divulgar"}
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { t: "A partir de", v: formatBRL(e.preco_min ? Number(e.preco_min) : null) },
                { t: "Até", v: formatBRL(e.preco_max ? Number(e.preco_max) : null) },
                { t: "Construtora", v: e.construtora ?? "—" },
                {
                  t: "Entrega",
                  v: e.entrega_prevista
                    ? new Date(e.entrega_prevista).toLocaleDateString("pt-BR", {
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "—",
                },
              ].map((i) => (
                <div key={i.t} className="rounded-lg border border-border bg-card p-4">
                  <dt className="text-xs text-muted-foreground">{i.t}</dt>
                  <dd className="mt-1 font-display text-base font-semibold tracking-tight">
                    {i.v}
                  </dd>
                </div>
              ))}
            </dl>

            {e.descricao && (
              <section className="mt-10">
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  Sobre o empreendimento
                </h2>
                <p className="mt-3 leading-relaxed whitespace-pre-line text-muted-foreground">
                  {e.descricao}
                </p>
              </section>
            )}

            <section className="mt-12">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">Unidades</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {unidades.length} unidades · {disponiveis} disponíveis
                  </p>
                </div>
                {tipologias.length > 0 && (
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger className="h-10 w-[200px]" aria-label="Filtrar por tipologia">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TODOS}>Todas as tipologias</SelectItem>
                      {tipologias.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {filtradas.length === 0 ? (
                <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Nenhuma unidade publicada para este filtro. Fale com um especialista para
                  disponibilidade atualizada.
                </p>
              ) : (
                <div className="mt-6 overflow-hidden rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Tipologia</TableHead>
                        <TableHead className="text-right">Área</TableHead>
                        <TableHead className="text-right">Dorm.</TableHead>
                        <TableHead className="text-right">Vagas</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtradas.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.identificador}</TableCell>
                          <TableCell>{u.tipologia ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            {u.area_privativa ? `${Number(u.area_privativa)} m²` : "—"}
                          </TableCell>
                          <TableCell className="text-right">{u.dormitorios ?? "—"}</TableCell>
                          <TableCell className="text-right">{u.vagas ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            {formatBRL(u.preco ? Number(u.preco) : null)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(u.status as UnidadeStatus)}>
                              {unidadeStatusLabels[u.status as UnidadeStatus]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <VitrineContato empreendimentoId={e.id} empreendimentoNome={e.nome} compact />
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}
