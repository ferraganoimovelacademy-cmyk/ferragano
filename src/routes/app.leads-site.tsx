import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import { useTrackScreen } from "@/hooks/use-telemetry";
import { getSiteLeadFunnel } from "@/lib/platform/leads-site.functions";
import { rotuloEstagio, taxaConversao } from "@/lib/platform/leads-site";

export const Route = createFileRoute("/app/leads-site")({
  component: LeadsSiteRoute,
  head: () => ({
    meta: [
      { title: "Leads da vitrine — Ferragano" },
      {
        name: "description",
        content:
          "Funil dos leads captados pelo site e pelas landing pages: origem, campanha, etapa e conversão.",
      },
    ],
  }),
});

function LeadsSiteRoute() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const buscar = useServerFn(getSiteLeadFunnel);
  useTrackScreen("marketing", "leads_site", { surface: "app.leads-site" });

  const funil = useQuery({
    queryKey: ["site-lead-funnel", workspaceId, session?.user?.id],
    queryFn: () => buscar({ data: { workspaceId: workspaceId!, dias: 30 } }),
    enabled: Boolean(workspaceId && session?.user?.id),
  });

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Leads da vitrine</h1>
        <p className="text-sm text-muted-foreground">
          Últimos 30 dias — captação pelo site e pelas landing pages, com origem, campanha e etapa.
        </p>
      </header>

      {funil.isPending ? (
        <div role="status" aria-live="polite" className="space-y-3">
          <span className="sr-only">Carregando leads da vitrine…</span>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : funil.isError ? (
        <div role="alert" aria-live="assertive" className="panel p-6">
          <Icon name="error" size={24} className="text-destructive" />
          <p className="mt-2 text-sm">
            {(funil.error as Error)?.message ?? "Erro ao carregar os leads da vitrine."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void funil.refetch()}
            disabled={funil.isFetching}
          >
            {funil.isFetching ? "Tentando novamente…" : "Tentar novamente"}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Metrica titulo="Leads captados" valor={funil.data.total} />
            <Metrica titulo="Ganhos" valor={funil.data.ganhos} />
            <Metrica titulo="Perdidos" valor={funil.data.perdidos} />
            <Metrica titulo="Conversão" valor={`${taxaConversao(funil.data)}%`} />
          </div>

          <section className="panel p-4">
            <h2 className="text-sm font-semibold">Etapas do funil</h2>
            {funil.data.etapas.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhum lead captado pela vitrine nesta janela.
              </p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {funil.data.etapas.map((e) => (
                  <li key={e.estagio}>
                    <Badge variant="secondary">
                      {rotuloEstagio(e.estagio)} · {e.total}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel overflow-x-auto p-4">
            <h2 className="text-sm font-semibold">Leads recentes</h2>
            {funil.data.leads.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Assim que um visitante enviar uma consulta, ela aparece aqui.
              </p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2">Pessoa</th>
                    <th className="py-2">Interesse</th>
                    <th className="py-2">Origem</th>
                    <th className="py-2">Campanha / rota</th>
                    <th className="py-2">Etapa</th>
                    <th className="py-2">Captado em</th>
                  </tr>
                </thead>
                <tbody>
                  {funil.data.leads.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="py-2">{l.pessoa ?? "—"}</td>
                      <td className="py-2">
                        {l.empreendimento ?? l.titulo}
                        {l.unidade ? ` · ${l.unidade}` : ""}
                      </td>
                      <td className="py-2">{l.origem}</td>
                      <td className="py-2 text-muted-foreground">
                        {[l.campanha, l.rota_origem].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="py-2">
                        <Badge variant="outline">{rotuloEstagio(l.estagio)}</Badge>
                        {l.eventos.length > 1 ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {l.eventos.length} mudanças
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(l.created_at).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Metrica({ titulo, valor }: { titulo: string; valor: number | string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold">{valor}</p>
    </div>
  );
}
