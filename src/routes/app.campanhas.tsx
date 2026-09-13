import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, BarBreakdown } from "@/components/platform/StatCard";
import { useSession } from "@/hooks/use-session";
import { listCampanhas } from "@/lib/platform/analytics.functions";
import { formatBRL, origemLabels } from "@/lib/platform/comercial";

export const Route = createFileRoute("/app/campanhas")({
  head: () => ({
    meta: [
      { title: "Campanhas — Ferragano OS" },
      { name: "description", content: "Campanhas de mídia, landing pages e origem dos leads." },
      { property: "og:title", content: "Campanhas — Ferragano OS" },
      { property: "og:description", content: "Atribuição de campanhas e leads no Ferragano OS." },
    ],
  }),
  component: CampanhasPage,
});

function CampanhasPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const fetchCampanhas = useServerFn(listCampanhas);

  const { data, isPending } = useQuery({
    queryKey: ["campanhas", workspaceId],
    queryFn: () => fetchCampanhas({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const campanhas = data?.campanhas ?? [];

  return (
    <section>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
            <Icon name="campaign" size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-semibold tracking-tight sm:text-2xl">
              Campanhas
            </h1>
            <p className="text-sm text-muted-foreground">
              Agrupamento das landing pages por campanha e atribuição dos leads.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link to="/app/landing">
            <Icon name="web" size={18} />
            Landing pages
          </Link>
        </Button>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Campanhas" value={campanhas.length} icon="campaign" />
        <StatCard
          label="Leads atribuídos"
          value={campanhas.reduce((s, c) => s + c.leads, 0)}
          icon="person_add"
        />
        <StatCard
          label="Sem atribuição"
          value={data?.semAtribuicao ?? 0}
          hint="Leads sem landing page de origem"
          icon="help"
        />
        <StatCard
          label="VGV fechado"
          value={formatBRL(campanhas.reduce((s, c) => s + c.vgvFechado, 0))}
          icon="payments"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid gap-3">
          {isPending ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
          ) : campanhas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma landing page criada ainda. Cada página com um nome de campanha vira uma
                linha aqui.
              </p>
              <Button asChild className="mt-4">
                <Link to="/app/landing">Criar landing page</Link>
              </Button>
            </div>
          ) : (
            campanhas.map((c) => (
              <article key={c.nome} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-base font-semibold">{c.nome}</h2>
                    <p className="text-xs text-muted-foreground">
                      {c.paginas.length} {c.paginas.length === 1 ? "página" : "páginas"} ·{" "}
                      {c.ativas} ativa{c.ativas === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="tabular-nums">
                      <strong className="font-semibold">{c.leads}</strong>{" "}
                      <span className="text-muted-foreground">leads</span>
                    </span>
                    <span className="tabular-nums">
                      <strong className="font-semibold">
                        {c.conversao == null ? "—" : `${c.conversao}%`}
                      </strong>{" "}
                      <span className="text-muted-foreground">conversão</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatBRL(c.vgvFechado)}
                    </span>
                  </div>
                </div>

                <ul className="mt-3 grid gap-2 border-t border-border pt-3">
                  {c.paginas.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge variant={p.ativa ? "gold" : "outline"}>
                          {p.ativa ? "Ativa" : "Pausada"}
                        </Badge>
                        <span className="truncate">{p.titulo}</span>
                        <code className="truncate text-xs text-muted-foreground">/lp/{p.slug}</code>
                      </div>
                      <span className="tabular-nums text-muted-foreground">{p.leads} leads</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))
          )}
        </div>

        <aside className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Leads por origem
          </h2>
          <div className="mt-4">
            <BarBreakdown data={data?.porOrigem ?? {}} labels={origemLabels} />
          </div>
        </aside>
      </div>
    </section>
  );
}
