import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { EntityTimeline } from "@/components/platform/EntityTimeline";
import { useSession } from "@/hooks/use-session";
import { domains } from "@/lib/platform/navigation";
import { featureFlags, moduleLabels, type ModuleKey } from "@/lib/platform/feature-flags";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Ferragano OS" },
      {
        name: "description",
        content:
          "Painel operacional do Ferragano OS: domínios, módulos ativos e estado da plataforma.",
      },
      { property: "og:title", content: "Dashboard — Ferragano OS" },
      { property: "og:description", content: "Painel operacional da plataforma Ferragano OS." },
    ],
  }),
  component: AppDashboard,
});

function AppDashboard() {
  const { data: sessao } = useSession();
  const workspaceId = sessao?.workspace?.id;

  return (
    <section>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Painel central de operação Ferragano One. Todos os sistemas integrados.
      </p>

      {workspaceId ? (
        <div className="mt-8">
          <EntityTimeline workspaceId={workspaceId} limit={15} />
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Módulos
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(featureFlags) as ModuleKey[]).map((key) => (
            <div
              key={key}
              className="rounded-lg border border-border bg-card p-4 shadow-[var(--elevation-1)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{moduleLabels[key]}</span>
                <span
                  className={
                    featureFlags[key]
                      ? "rounded-sm bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary-soft-foreground uppercase"
                      : "rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
                  }
                >
                  {featureFlags[key] ? "Ativo" : "Desligado"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Domínios de negócio
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(domains).map(([key, d]) => (
            <div key={key} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Icon name="hub" size={18} className="text-muted-foreground" />
                <span className="font-medium">{d.label}</span>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {d.entities.map((e) => (
                  <li
                    key={e}
                    className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
