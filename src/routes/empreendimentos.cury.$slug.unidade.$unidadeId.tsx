import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { Faixa, TituloSecao } from "@/components/site/Bloco";
import { AtivoSlot, AvisoAtivos } from "@/components/site/cury/AtivoSlot";
import { VitrineContato } from "@/components/platform/VitrineContato";
import { formatBRL } from "@/lib/platform/comercial";
import { getCuryEmpreendimento } from "@/lib/platform/cury.functions";
import { anoEntrega, type CuryDetalhe, type CuryUnidade } from "@/lib/site/cury";
import { whatsappLink } from "@/lib/site/contato";
import { canonical, jsonLd, metaBasica, schemaBreadcrumb } from "@/lib/site/seo";

/** GATE 04 — página da unidade: ficha física, comercial e ação de interesse. */
export const Route = createFileRoute("/empreendimentos/cury/$slug/unidade/$unidadeId")({
  loader: async ({ params }): Promise<{ empreendimento: CuryDetalhe["empreendimento"]; unidade: CuryUnidade }> => {
    const detalhe = await getCuryEmpreendimento({ data: { slug: params.slug } });
    const unidade = detalhe?.unidades.find((u) => u.id === params.unidadeId);
    if (!detalhe || !unidade) throw notFound();
    return { empreendimento: detalhe.empreendimento, unidade };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Unidade indisponível — Ferragano" }, { name: "robots", content: "noindex" }],
      };
    }
    const { empreendimento: e, unidade: u } = loaderData;
    const path = `/empreendimentos/cury/${params.slug}/unidade/${params.unidadeId}`;
    const titulo = `Unidade ${u.identificador} — ${e.nome} | Ferragano`;
    const descricao = `${u.dormitorios ?? "—"} dormitórios, ${
      u.area_privativa ? `${u.area_privativa.toFixed(0)} m² privativos` : "metragem a confirmar"
    }, ${formatBRL(u.preco)}. Disponibilidade confirmada com o consultor Ferragano.`;
    return {
      meta: metaBasica({ titulo, descricao, path, noindex: u.status !== "disponivel" }),
      links: canonical(path),
      scripts: jsonLd(
        schemaBreadcrumb([
          { nome: "Início", path: "/" },
          { nome: "Cury", path: "/empreendimentos/cury" },
          { nome: e.nome, path: `/empreendimentos/cury/${params.slug}` },
          { nome: `Unidade ${u.identificador}`, path },
        ]),
      ),
    };
  },
  component: UnidadeCury,
});

const statusLabels: Record<string, string> = {
  disponivel: "Disponível",
  reservada: "Reservada",
  vendida: "Vendida",
  bloqueada: "Indisponível",
  em_analise: "Em análise",
};

function UnidadeCury() {
  const { empreendimento: e, unidade: u }: { empreendimento: CuryDetalhe["empreendimento"]; unidade: CuryUnidade } =
    Route.useLoaderData();

  const fisico = [
    { rotulo: "Dormitórios", valor: u.dormitorios ? String(u.dormitorios) : "—" },
    { rotulo: "Suítes", valor: u.suites ? String(u.suites) : "—" },
    { rotulo: "Vagas", valor: u.vagas != null ? String(u.vagas) : "—" },
    { rotulo: "Andar", valor: u.andar != null ? String(u.andar) : "—" },
    { rotulo: "Final", valor: u.final ?? "—" },
    { rotulo: "Varanda", valor: u.varanda ? "Sim" : "Não" },
    {
      rotulo: "Área privativa",
      valor: u.area_privativa ? `${u.area_privativa.toFixed(2)} m²` : "—",
    },
    { rotulo: "Área total", valor: u.area_total ? `${u.area_total.toFixed(2)} m²` : "—" },
  ];

  return (
    <SiteLayout>
      <Faixa>
        <nav aria-label="Trilha" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link to="/empreendimentos/cury" className="hover:text-foreground">
            Portfólio Cury
          </Link>
          <Icon name="chevron_right" size={14} />
          <Link to="/empreendimentos/cury/$slug" params={{ slug: e.slug }} className="hover:text-foreground">
            {e.nome}
          </Link>
          <Icon name="chevron_right" size={14} />
          <span className="text-foreground">Unidade {u.identificador}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={u.status === "disponivel" ? "gold" : "outline"}>
                {statusLabels[u.status] ?? u.status}
              </Badge>
              {u.tipologia && <Badge variant="outline">{u.tipologia}</Badge>}
            </div>
            <h1 className="mt-4 font-display text-3xl leading-tight font-semibold tracking-tight md:text-4xl">
              Unidade {u.identificador}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {e.nome} · {[e.bairro, e.cidade].filter(Boolean).join(", ")}
            </p>

            <p className="mt-6 font-display text-3xl font-semibold tracking-tight">
              {formatBRL(u.preco)}
            </p>
            <p className="text-xs text-muted-foreground">
              Valor de referência. Condições de entrada e saldo financiado confirmados na proposta.
            </p>

            <TituloSecao titulo="Ficha técnica" />
            <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {fisico.map((f) => (
                <div key={f.rotulo} className="rounded-lg border border-border bg-card p-4">
                  <dt className="text-xs text-muted-foreground">{f.rotulo}</dt>
                  <dd className="mt-1 font-medium">{f.valor}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 rounded-lg border border-border bg-card p-5 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <Icon name="event_available" size={18} className="text-primary" />
                Entrega prevista: {anoEntrega(e.entrega_prevista)}
              </p>
              <p className="mt-2 text-muted-foreground">
                Esta unidade faz parte do estoque público do empreendimento. Reserva, tabela e
                condições especiais são tratadas diretamente com o consultor.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={whatsappLink(
                  `Olá! Tenho interesse na unidade ${u.identificador} do empreendimento ${e.nome}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <Icon name="chat" size={18} />
                Tenho interesse
              </a>
              <Link
                to="/empreendimentos/cury/$slug"
                params={{ slug: e.slug }}
                className="inline-flex h-12 items-center gap-2 rounded-md border border-border px-6 text-sm font-medium transition-colors hover:bg-accent"
              >
                <Icon name="arrow_back" size={18} />
                Ver outras unidades
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <AtivoSlot
              titulo={`Planta da unidade ${u.identificador}`}
              icone="grid_on"
              proporcao="aspect-[4/3]"
              nota="Planta humanizada oficial em liberação."
            />
            <VitrineContato empreendimentoId={e.id} empreendimentoNome={`${e.nome} — unidade ${u.identificador}`} />
          </div>
        </div>

        <AvisoAtivos className="mt-10" />
      </Faixa>
    </SiteLayout>
  );
}