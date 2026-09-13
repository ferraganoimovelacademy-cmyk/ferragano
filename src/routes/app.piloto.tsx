import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/hooks/use-session";
import { isAdminRole } from "@/lib/platform/roles";
import { getPilotReadiness } from "@/lib/platform/pilot.functions";
import {
  pilotGateLabels,
  pilotStatusLabels,
  type PilotGate,
  type PilotStatus,
} from "@/lib/platform/pilot";

export const Route = createFileRoute("/app/piloto")({
  head: () => ({
    meta: [
      { title: "Prontidão do piloto · Ferragano OS" },
      {
        name: "description",
        content:
          "Gates P01 a P03 do piloto: funil, equipe real, empreendimento com estoque e flags conferidos pela medição do workspace.",
      },
      { property: "og:title", content: "Prontidão do piloto · Ferragano OS" },
      {
        property: "og:description",
        content:
          "Checklist derivado do workspace real: nada é declarado pronto sem evidência medida.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PilotoPage,
});

const statusVariant: Record<PilotStatus, "success" | "warning" | "destructive"> = {
  pronto: "success",
  parcial: "warning",
  pendente: "destructive",
};

const GATES: PilotGate[] = ["P01", "P02", "P03", "P09"];

function PilotoPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const admin = isAdminRole(session?.roles);

  const fetchReadiness = useServerFn(getPilotReadiness);
  const { data, isLoading, error } = useQuery({
    queryKey: ["pilot-readiness", workspaceId],
    queryFn: () => fetchReadiness({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId) && admin,
  });

  if (!admin) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Icon name="lock" size={28} className="mx-auto text-muted-foreground" />
        <h1 className="mt-3 font-display text-lg font-semibold">Acesso restrito</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A prontidão do piloto é do Pilot Manager: só proprietário e administrador enxergam.
        </p>
      </div>
    );
  }

  const resumo = data?.resumo;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Prontidão do piloto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GATES P01–P03 (com as flags do P09). Cada item lê o workspace real — item pendente não é
          contornado, é resolvido antes de abrir o piloto.
        </p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Medindo o workspace…</p>}
      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error).message}
        </p>
      )}

      {resumo && (
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={resumo.liberado ? "success" : "warning"}>
              <Icon name={resumo.liberado ? "verified" : "pending"} size={16} />
              {resumo.liberado ? "Liberado para abrir o piloto" : "Pendências bloqueantes"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {resumo.prontos}/{resumo.total} itens prontos ({resumo.percentual}%) ·{" "}
              {resumo.bloqueantesAbertos} bloqueante(s) aberto(s)
            </span>
          </div>
        </section>
      )}

      {GATES.map((gate) => {
        const itens = (data?.checks ?? []).filter((c) => c.gate === gate);
        if (itens.length === 0) return null;
        return (
          <section key={gate} className="rounded-lg border border-border bg-card">
            <h2 className="border-b border-border px-5 py-3 font-display text-sm font-semibold">
              {pilotGateLabels[gate]}
            </h2>
            <ul className="divide-y divide-border">
              {itens.map((item) => (
                <li
                  key={item.chave}
                  className="flex flex-wrap items-start justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-[14rem]">
                    <p className="text-sm font-medium">
                      {item.titulo}
                      {item.bloqueante && (
                        <span className="ml-2 text-xs text-muted-foreground">(bloqueante)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">Exigência: {item.exigencia}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{item.medido}</span>
                    <Badge variant={statusVariant[item.status]}>
                      {pilotStatusLabels[item.status]}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
