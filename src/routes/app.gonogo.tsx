import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/hooks/use-session";
import { isAdminRole } from "@/lib/platform/roles";
import { getGoNogoReview } from "@/lib/platform/gonogo.functions";
import {
  criterioStatusLabels,
  dimensaoLabels,
  veredictoLabels,
  type CriterioDimensao,
  type CriterioStatus,
  type Veredito,
} from "@/lib/platform/gonogo";

export const Route = createFileRoute("/app/gonogo")({
  head: () => ({
    meta: [
      { title: "Revisão Go/No-Go · Ferragano OS" },
      {
        name: "description",
        content:
          "Revisão de 30 dias do piloto: metas medidas, critérios bloqueantes e veredito derivado da telemetria.",
      },
      { property: "og:title", content: "Revisão Go/No-Go · Ferragano OS" },
      {
        property: "og:description",
        content: "Veredito do piloto derivado das metas medidas, sem número digitado à mão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GoNogoPage,
});

const statusVariant: Record<CriterioStatus, "success" | "warning" | "destructive" | "outline"> = {
  atingida: "success",
  parcial: "warning",
  falha: "destructive",
  sem_dado: "outline",
};

const vereditoEstilo: Record<
  Veredito,
  { variant: "success" | "warning" | "outline"; icone: string }
> = {
  go: { variant: "success", icone: "verified" },
  hold: { variant: "warning", icone: "pause_circle" },
  insuficiente: { variant: "outline", icone: "help" },
};

const DIMENSOES: CriterioDimensao[] = ["operacao", "comercial", "produto", "satisfacao"];

function GoNogoPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const admin = isAdminRole(session?.roles);

  const fetchReview = useServerFn(getGoNogoReview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["gonogo-review", workspaceId],
    queryFn: () => fetchReview({ data: { workspaceId: workspaceId!, janelaDias: 30 } }),
    enabled: Boolean(workspaceId) && admin,
  });

  if (!admin) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Icon name="lock" size={28} className="mx-auto text-muted-foreground" />
        <h1 className="mt-3 font-display text-lg font-semibold">Acesso restrito</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A revisão Go/No-Go é do Pilot Manager: só proprietário e administrador enxergam.
        </p>
      </div>
    );
  }

  const resumo = data?.resumo;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Revisão Go/No-Go</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GATE P10 — janela de 30 dias. Nenhuma meta é declarada atingida sem medição; o veredito é
          derivado, não digitado.
        </p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Calculando a revisão…</p>}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          {(error as Error).message}
        </div>
      )}

      {resumo && (
        <>
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Icon
                name={vereditoEstilo[resumo.veredito].icone}
                size={28}
                className="text-muted-foreground"
              />
              <div>
                <Badge variant={vereditoEstilo[resumo.veredito].variant}>
                  {veredictoLabels[resumo.veredito]}
                </Badge>
                <p className="mt-2 text-sm text-muted-foreground">{resumo.justificativa}</p>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
              {[
                { label: "Cobertura", valor: `${resumo.cobertura}%` },
                { label: "Atingidas", valor: resumo.atingidas },
                { label: "Perto da meta", valor: resumo.parciais },
                { label: "Abaixo", valor: resumo.falhas },
                { label: "Sem medição", valor: resumo.semDado },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-xs text-muted-foreground">{item.label}</dt>
                  <dd className="font-display text-xl font-semibold tabular-nums">{item.valor}</dd>
                </div>
              ))}
            </dl>
          </section>

          {resumo.bloqueantesEmFalha.length > 0 && (
            <section className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
              <h2 className="text-sm font-semibold">Bloqueantes do GO</h2>
              <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                {resumo.bloqueantesEmFalha.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {DIMENSOES.map((dimensao) => {
            const criterios = resumo.criterios.filter((c) => c.dimensao === dimensao);
            if (criterios.length === 0) return null;
            return (
              <section key={dimensao} className="rounded-lg border border-border bg-card">
                <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
                  {dimensaoLabels[dimensao]}
                </h2>
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Critérios da dimensão {dimensaoLabels[dimensao]}
                  </caption>
                  <thead className="border-b border-border bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-2 font-medium">Critério</th>
                      <th className="px-4 py-2 font-medium">Meta</th>
                      <th className="px-4 py-2 font-medium">Medido</th>
                      <th className="px-4 py-2 font-medium">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criterios.map((criterio) => (
                      <tr key={criterio.key} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-2">
                          {criterio.label}
                          {criterio.bloqueante && (
                            <Badge variant="outline" className="ml-2">
                              bloqueante
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{criterio.meta}</td>
                        <td className="px-4 py-2 tabular-nums">{criterio.valor}</td>
                        <td className="px-4 py-2">
                          <Badge variant={statusVariant[criterio.status]}>
                            {criterioStatusLabels[criterio.status]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}

          <p className="text-xs text-muted-foreground">
            Fonte: `platform_metrics_summary`, `feature_adoption`, `decision_accuracy`,
            `pilot_feedback` e `academy_progress`. Decisão do Pilot Manager (#21), com veto do
            Release Manager (#20).
          </p>
        </>
      )}
    </div>
  );
}
