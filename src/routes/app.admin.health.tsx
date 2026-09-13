import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import { isAdminRole } from "@/lib/platform/roles";
import {
  formatDuracao,
  jobLabels,
  severidadeCores,
  severidadeDaFila,
  severidadeDoJob,
  severidadeLabels,
} from "@/lib/platform/health";
import { getPlatformHealth } from "@/lib/platform/health.functions";

export const Route = createFileRoute("/app/admin/health")({
  head: () => ({
    meta: [
      { title: "Saúde da plataforma — Ferragano One" },
      {
        name: "description",
        content:
          "Observabilidade do Ferragano One: eventos de domínio, fila de automações, execuções de job e volumes do workspace.",
      },
      { property: "og:title", content: "Saúde da plataforma — Ferragano One" },
      {
        property: "og:description",
        content: "Eventos, fila do Outbox, jobs e volumes do workspace em uma só tela.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HealthPage,
});

const dataHora = (v: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

const numero = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

function Metrica({ label, valor, detalhe }: { label: string; valor: string; detalhe?: string }) {
  return (
    <div className="border-border rounded-md border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-display text-xl font-semibold tabular-nums">{valor}</p>
      {detalhe && <p className="text-muted-foreground text-xs">{detalhe}</p>}
    </div>
  );
}

function HealthPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const admin = isAdminRole(session?.roles);
  const carregar = useServerFn(getPlatformHealth);

  const saude = useQuery({
    queryKey: ["platform-health", workspaceId],
    queryFn: () => carregar({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId) && admin,
    refetchInterval: 60_000,
  });

  if (!admin) {
    return (
      <p className="border-border text-muted-foreground rounded-md border border-dashed p-4 text-sm">
        Tela restrita a proprietário e administrador do workspace.
      </p>
    );
  }

  if (saude.isPending) return <Skeleton className="h-96 w-full" />;

  if (saude.isError || !saude.data) {
    return (
      <p className="border-border text-muted-foreground rounded-md border border-dashed p-4 text-sm">
        Não foi possível carregar as métricas agora.
      </p>
    );
  }

  const { eventos, outbox, regras, jobs, volumes, geradoEm } = saude.data;
  const filaSev = severidadeDaFila(outbox);
  const tiposTop = Object.entries(eventos.porTipo).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Saúde da plataforma
          </h1>
          <p className="text-muted-foreground text-sm">
            Eventos de domínio, fila de automações, jobs e volumes. Atualiza a cada minuto.
          </p>
        </div>
        <p className="text-muted-foreground text-xs">Leitura de {dataHora(geradoEm)}</p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Fila de automações</CardTitle>
          <Badge className={severidadeCores[filaSev]}>{severidadeLabels[filaSev]}</Badge>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metrica
            label="Pendentes"
            valor={numero(outbox.pendente)}
            detalhe={`${numero(outbox.atrasados)} atrasados`}
          />
          <Metrica label="Em processamento" valor={numero(outbox.processando)} />
          <Metrica
            label="Entregues"
            valor={numero(outbox.entregue)}
            detalhe={`latência média ${outbox.latenciaMediaSegundos}s`}
          />
          <Metrica
            label="Falharam"
            valor={numero(outbox.falhou)}
            detalhe={`${numero(outbox.descartado)} descartados · ${outbox.tentativasMedia} tentativas/média`}
          />
          {outbox.ultimoErro && (
            <div className="border-border bg-muted/40 rounded-md border p-3 sm:col-span-2 lg:col-span-4">
              <p className="text-muted-foreground text-xs">
                Último erro em <span className="font-mono">{outbox.ultimoErro.event_type}</span> ·{" "}
                {dataHora(outbox.ultimoErro.em)}
              </p>
              <p className="text-sm">{outbox.ultimoErro.erro}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eventos de domínio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metrica label="Total" valor={numero(eventos.total)} />
              <Metrica label="Últimas 24h" valor={numero(eventos.ultimas24h)} />
              <Metrica label="Últimos 7 dias" valor={numero(eventos.ultimos7d)} />
            </div>
            {tiposTop.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum evento nos últimos 7 dias.</p>
            ) : (
              <ul className="space-y-1">
                {tiposTop.map(([tipo, qtd]) => (
                  <li key={tipo} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs">{tipo}</span>
                    <span className="tabular-nums">{numero(qtd)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jobs (24h)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobs.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhuma execução registrada nas últimas 24 horas.
              </p>
            ) : (
              jobs.map((job) => {
                const sev = severidadeDoJob(job);
                return (
                  <div
                    key={job.job}
                    className="border-border flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{jobLabels[job.job] ?? job.job}</p>
                      <p className="text-muted-foreground text-xs">
                        {numero(job.execucoes)} execuções · último em {dataHora(job.ultimo_em)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        média {formatDuracao(job.duracao_media_ms)} · máx{" "}
                        {formatDuracao(job.duracao_max_ms)}
                      </span>
                      <Badge className={severidadeCores[sev]}>{severidadeLabels[sev]}</Badge>
                    </div>
                  </div>
                );
              })
            )}
            <div className="border-border text-muted-foreground flex items-center gap-2 rounded-md border border-dashed p-3 text-xs">
              <Icon name="bolt" className="text-base" />
              {regras.ativas} de {regras.total} regras de automação ativas.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volumes do workspace</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Metrica label="Pessoas" valor={numero(volumes.pessoas)} />
          <Metrica
            label="Oportunidades"
            valor={numero(volumes.oportunidades)}
            detalhe={`${numero(volumes.oportunidadesAbertas)} abertas`}
          />
          <Metrica label="Unidades" valor={numero(volumes.unidades)} />
          <Metrica label="Propostas" valor={numero(volumes.propostas)} />
          <Metrica label="Reservas ativas" valor={numero(volumes.reservas)} />
          <Metrica label="Vendas" valor={numero(volumes.vendas)} />
        </CardContent>
      </Card>
    </div>
  );
}
