import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VitrineContato } from "@/components/platform/VitrineContato";
import { getLandingPublica, type LandingPublica } from "@/lib/platform/landing.functions";
import {
  empStatusLabels,
  formatBRL,
  segmentoLabels,
  type EmpreendimentoSegmento,
  type EmpreendimentoStatus,
} from "@/lib/platform/comercial";

export const Route = createFileRoute("/lp/$slug")({
  loader: async ({ params }) => {
    const data = await getLandingPublica({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Página indisponível — Ferragano" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const emp = loaderData.empreendimento;
    const titulo = loaderData.landing?.titulo ?? emp?.nome ?? "Ferragano";
    const descricao =
      loaderData.landing?.subtitulo ??
      emp?.descricao?.slice(0, 155) ??
      "Fale com um especialista Ferragano e receba as melhores oportunidades.";
    const capa = loaderData.landing?.hero_url ?? emp?.capa_url ?? null;

    return {
      meta: [
        { title: `${titulo} — Ferragano` },
        { name: "description", content: descricao },
        { property: "og:title", content: `${titulo} — Ferragano` },
        { property: "og:description", content: descricao },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `/lp/${params.slug}` },
        { name: "twitter:card", content: "summary_large_image" },
        ...(capa?.startsWith("https://")
          ? [
              { property: "og:image", content: capa },
              { name: "twitter:image", content: capa },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: `/lp/${params.slug}` }],
    };
  },
  errorComponent: () => <LandingAviso texto="Não foi possível carregar esta página agora." />,
  notFoundComponent: () => <LandingAviso texto="Esta página não está mais disponível." />,
  component: LandingPage,
});

function LandingAviso({ texto }: { texto: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <Icon name="link_off" size={36} className="text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{texto}</p>
      <Link
        to="/empreendimentos"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Ver empreendimentos
      </Link>
    </div>
  );
}

function LandingPage() {
  const data = Route.useLoaderData();
  const { landing, empreendimento: emp } = data;
  const unidades = data.unidades as LandingPublica["unidades"];

  const titulo = landing?.titulo ?? emp?.nome ?? "Ferragano";
  const subtitulo =
    landing?.subtitulo ?? [emp?.bairro, emp?.cidade, emp?.uf].filter(Boolean).join(" · ") ?? "";
  const descricao = landing?.descricao ?? emp?.descricao ?? null;
  const hero = landing?.hero_url ?? emp?.capa_url ?? null;
  const precoMin = emp?.preco_min ? Number(emp.preco_min) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Cabeçalho enxuto: LP é página de conversão, sem menu que disperse. */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-[1100px] items-center justify-between px-4 md:px-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-lg font-semibold tracking-tight">Ferragano</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a
              href="#contato"
              className="rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Falar agora
            </a>
          </div>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-[1100px] gap-10 px-4 py-14 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-20">
          <div>
            <div className="flex flex-wrap gap-2">
              {emp && (
                <Badge variant="gold">{empStatusLabels[emp.status as EmpreendimentoStatus]}</Badge>
              )}
              {emp && (
                <Badge variant="outline">
                  {segmentoLabels[emp.segmento as EmpreendimentoSegmento]}
                </Badge>
              )}
            </div>
            <h1 className="mt-5 font-display text-4xl leading-[1.08] font-semibold tracking-tight md:text-5xl">
              {titulo}
            </h1>
            {subtitulo && <p className="mt-4 text-lg text-muted-foreground">{subtitulo}</p>}
            {precoMin !== null && (
              <p className="mt-6 text-sm text-muted-foreground">
                A partir de{" "}
                <span className="font-display text-2xl font-semibold text-foreground">
                  {formatBRL(precoMin)}
                </span>
              </p>
            )}
            {descricao && (
              <p className="mt-6 max-w-xl whitespace-pre-line text-muted-foreground">{descricao}</p>
            )}

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { icon: "verified", texto: "Atendimento por especialista dedicado" },
                { icon: "bolt", texto: "Retorno no mesmo dia útil" },
                { icon: "request_quote", texto: "Simulação de financiamento sem custo" },
                { icon: "apartment", texto: "Condições diretas com a construtora" },
              ].map((b) => (
                <li key={b.icon} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Icon name={b.icon} size={18} className="mt-0.5 text-primary" />
                  {b.texto}
                </li>
              ))}
            </ul>
          </div>

          <div id="contato" className="scroll-mt-20">
            {hero && (
              <img
                src={hero}
                alt={titulo}
                loading="lazy"
                className="mb-6 aspect-[4/3] w-full rounded-xl object-cover"
              />
            )}
            <VitrineContato
              empreendimentoId={emp?.id ?? null}
              empreendimentoNome={emp?.nome ?? null}
              landingPageId={landing?.id ?? null}
              ctaTexto={landing?.cta_texto ?? null}
              compact
            />
          </div>
        </div>
      </section>

      {unidades.length > 0 && (
        <section className="mx-auto w-full max-w-[1100px] px-4 py-14 md:px-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Unidades disponíveis
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unidades.slice(0, 9).map((u) => (
              <article key={u.id} className="rounded-xl border border-border bg-card p-5">
                <p className="font-medium">Unidade {u.identificador}</p>
                <p className="mt-1 text-sm text-muted-foreground">{u.tipologia ?? "—"}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {[
                    u.dormitorios ? `${u.dormitorios} dorm.` : null,
                    u.vagas ? `${u.vagas} vaga(s)` : null,
                    u.area_privativa ? `${Number(u.area_privativa)} m²` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                <p className="mt-3 font-display text-lg font-semibold">
                  {formatBRL(u.preco ? Number(u.preco) : null)}
                </p>
              </article>
            ))}
          </div>
          {emp && (
            <Link
              to="/empreendimentos/$id"
              params={{ id: emp.id }}
              className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver todas as unidades e a ficha completa
              <Icon name="arrow_forward" size={16} />
            </Link>
          )}
        </section>
      )}

      <footer className="border-t border-border bg-card">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-8 text-xs text-muted-foreground md:px-8">
          © {new Date().getFullYear()} Ferragano · Ao enviar seus dados você concorda em ser
          contatado por um especialista.
        </div>
      </footer>
    </div>
  );
}
