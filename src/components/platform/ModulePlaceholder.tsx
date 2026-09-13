import { Icon } from "@/components/Icon";
import { domains, type DomainKey } from "@/lib/platform/navigation";

/**
 * Placeholder estrutural de módulo.
 * GATE 02/03: a rota e o domínio existem; a funcionalidade chega em sprints seguintes.
 */
export function ModulePlaceholder({
  title,
  domain,
  description,
  icon = "widgets",
}: {
  title: string;
  domain: DomainKey;
  description: string;
  icon?: string;
}) {
  const d = domains[domain];
  return (
    <section>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
            <Icon name={icon} size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-semibold tracking-tight sm:text-2xl">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">Domínio {d.label}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Estrutura
        </span>
      </header>

      <p className="mt-6 max-w-2xl text-sm text-muted-foreground">{description}</p>

      <div className="mt-6 rounded-lg border border-dashed border-border bg-card p-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Entidades do domínio
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {d.entities.map((e) => (
            <li key={e} className="rounded-md bg-muted px-2.5 py-1 text-sm text-muted-foreground">
              {e}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
