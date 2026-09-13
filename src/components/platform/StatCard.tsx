import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";

/** Cartão de indicador — leitura, nunca cálculo. */
export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {icon ? <Icon name={icon} size={16} /> : null}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Distribuição simples em barras horizontais, para contagens por categoria. */
export function BarBreakdown({
  data,
  labels,
  empty = "Sem dados ainda.",
}: {
  data: Record<string, number>;
  labels?: Record<string, string>;
  empty?: string;
}) {
  const entries = Object.entries(data)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const max = entries.reduce((m, [, v]) => Math.max(m, v), 0);

  if (!entries.length) return <p className="text-sm text-muted-foreground">{empty}</p>;

  return (
    <ul className="grid gap-2.5">
      {entries.map(([key, value]) => (
        <li key={key} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3">
          <span className="truncate text-sm text-muted-foreground">{labels?.[key] ?? key}</span>
          <span className="h-2 rounded-full bg-muted">
            <span
              className="block h-2 rounded-full bg-primary"
              style={{ width: `${max ? (value / max) * 100 : 0}%` }}
            />
          </span>
          <span className="text-sm font-medium tabular-nums">{value}</span>
        </li>
      ))}
    </ul>
  );
}
