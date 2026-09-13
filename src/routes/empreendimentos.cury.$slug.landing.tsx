import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { Bloco, Faixa, TituloSecao } from "@/components/site/Bloco";
import { AtivoSlot, AvisoAtivos } from "@/components/site/cury/AtivoSlot";
import { VitrineContato } from "@/components/platform/VitrineContato";
import { empStatusLabels, formatBRL } from "@/lib/platform/comercial";
import { getCuryEmpreendimento } from "@/lib/platform/cury.functions";
import { anoEntrega, ehMcmv, CURY_INSTITUCIONAL, type CuryDetalhe } from "@/lib/site/cury";
import { whatsappLink } from "@/lib/site/contato";
import { canonical, jsonLd, metaBasica, schemaBreadcrumb } from "@/lib/site/seo";

/** GATE 07 — landing de conversão do empreendimento (tráfego pago). */
export const Route = createFileRoute("/empreendimentos/cury/$slug/landing")({
  loader: async ({ params }): Promise<CuryDetalhe> => {
    const detalhe = await getCuryEmpreendimento({ data: { slug: params.slug } });
    if (!detalhe) throw notFound();
    return detalhe;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Campanha indisponível — Ferragano" }, { name: "robots", content: "noindex" }],
      };
    }
    const e = loaderData.empreendimento;
    const path = `/empreendimentos/cury/${params.slug}/landing`;
    const titulo = `${e.nome}: condições e disponibilidade | Ferragano`;
    const descricao = `Fale com um consultor Ferragano sobre o ${e.nome}. A partir de ${formatBRL(
      e.preco_min,
    )}, ${e.disponiveis} unidades disponíveis, simulação de crédito no mesmo atendimento.`;
    return {
      meta: metaBasica({ titulo, descricao, path }),
      links: canonical(path),
      scripts: jsonLd(
        schemaBreadcrumb([
          { nome: "Início", path: "/" },
          { nome: "Cury", path: "/empreendimentos/cury" },
          { nome: e.nome, path: `/empreendimentos/cury/${params.slug}` },
          { nome: "Campanha", path },
        ]),
      ),
    };
  },
  component: LandingCury,
});

function LandingCury() {
  const { empreendimento: e, unidades }: CuryDetalhe = Route.useLoaderData();
  const menorArea = unidades
    .map((u) => u.area_privativa)
    .filter((a): a is number => typeof a === "number")
    .sort((a, b) => a - b)[0];

  return (
    <SiteLayout>
      <section className="border-b border-border bg-gradient-to-br from-primary-soft/70 via-background to-accent/30">
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{empStatusLabels[e.status]}</Badge>
              {ehMcmv(e) && <Badge variant="gold">Elegível ao MCMV</Badge>}
            </div>
            <h1 className="mt-4 font-display text-3xl leading-[1.08] font-semibold tracking-tight md:text-5xl">
              {e.nome}: {e.dormitorios.length ? `${e.dormitorios.join(" e ")} dormitórios` : "unidades"} em{" "}
              {e.bairro ?? e.cidade ?? "São Paulo"}
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground md:text-lg">
              A partir de <strong className="text-foreground">{formatBRL(e.preco_min)}</strong>
              {menorArea ? `, desde ${menorArea.toFixed(0)} m² privativos` : ""}. Entrega{" "}
              {anoEntrega(e.entrega_prevista).toLowerCase()}. A Ferragano faz a curadoria, o
              diagnóstico de crédito e acompanha a compra do começo ao fim.
            </p>

            <ul className="mt-7 grid gap-2 text-sm">
              {[
                "Simulação de financiamento e subsídio na primeira conversa",
                "Disponibilidade real de unidades, não tabela vencida",
                "Acompanhamento até a assinatura e o repasse bancário",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Icon name="check_circle" size={18} className="mt-0.5 text-primary" />
                  {t}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={whatsappLink(
                  `Olá! Vi a campanha do ${e.nome} e quero falar com um consultor da Ferragano.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <Icon name="chat" size={18} />
                Quero falar agora
              </a>
              <Link
                to="/empreendimentos/cury/$slug"
                params={{ slug: e.slug }}
                className="inline-flex h-12 items-center gap-2 rounded-md border border-border bg-card px-6 text-sm font-medium transition-colors hover:bg-accent"
              >
                Ver ficha completa
                <Icon name="arrow_forward" size={18} />
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <AtivoSlot
              titulo={`Campanha ${e.nome}`}
              icone="campaign"
              proporcao="aspect-[4/3]"
              nota="Peça oficial de campanha entra aqui após aprovação."
            />
            <VitrineContato empreendimentoId={e.id} empreendimentoNome={e.nome} />
          </div>
        </div>
      </section>

      <Faixa>
        <TituloSecao eyebrow="Por que a Cury" titulo="Produto pensado para caber na renda" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CURY_INSTITUCIONAL.diferenciais.map((d, i) => (
            <Bloco
              key={d.titulo}
              as="article"
              delay={i * 70}
              className="rounded-xl border border-border bg-card p-6"
            >
              <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
                <Icon name={d.icone} size={22} />
              </span>
              <h2 className="mt-4 font-display text-base font-semibold tracking-tight">{d.titulo}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.texto}</p>
            </Bloco>
          ))}
        </div>
        <AvisoAtivos className="mt-10" />
      </Faixa>
    </SiteLayout>
  );
}