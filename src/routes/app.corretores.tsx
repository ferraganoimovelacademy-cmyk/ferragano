import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/platform/StatCard";
import { useSession } from "@/hooks/use-session";
import { listCorretores } from "@/lib/platform/analytics.functions";
import { roleLabels } from "@/lib/platform/roles";
import { formatBRL } from "@/lib/platform/comercial";

export const Route = createFileRoute("/app/corretores")({
  head: () => ({
    meta: [
      { title: "Corretores — Ferragano OS" },
      {
        name: "description",
        content: "Time comercial, carteira de leads e performance individual.",
      },
      { property: "og:title", content: "Corretores — Ferragano OS" },
      { property: "og:description", content: "Performance do time comercial no Ferragano OS." },
    ],
  }),
  component: CorretoresPage,
});

function iniciais(nome?: string | null, email?: string | null) {
  const base = (nome ?? email ?? "?").trim();
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function CorretoresPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const fetchCorretores = useServerFn(listCorretores);

  const { data, isPending } = useQuery({
    queryKey: ["corretores", workspaceId],
    queryFn: () => fetchCorretores({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const corretores = data?.corretores ?? [];
  const totalLeads = corretores.reduce((s, c) => s + c.leads, 0);
  const totalFechados = corretores.reduce((s, c) => s + c.fechados, 0);
  const totalParados = corretores.reduce((s, c) => s + c.parados, 0);

  return (
    <section>
      <header className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
          <Icon name="badge" size={22} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Corretores
          </h1>
          <p className="text-sm text-muted-foreground">
            Time do workspace, carteira e conversão — leitura sobre leads e agenda.
          </p>
        </div>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pessoas no time" value={corretores.length} icon="groups" />
        <StatCard label="Leads atribuídos" value={totalLeads} icon="person_add" />
        <StatCard label="Fechamentos" value={totalFechados} icon="check_circle" />
        <StatCard
          label="Leads parados"
          value={totalParados}
          hint="Sem contato há mais de 7 dias"
          icon="warning"
        />
      </div>

      {data && data.semResponsavel > 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <strong className="font-medium text-foreground">{data.semResponsavel}</strong>{" "}
          {data.semResponsavel === 1 ? "lead está" : "leads estão"} sem responsável definido.
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pessoa</TableHead>
              <TableHead>Papéis</TableHead>
              <TableHead className="text-right">Carteira</TableHead>
              <TableHead className="text-right">Ativos</TableHead>
              <TableHead className="text-right">Fechados</TableHead>
              <TableHead className="text-right">Conversão</TableHead>
              <TableHead className="text-right">Parados</TableHead>
              <TableHead className="text-right">Agenda</TableHead>
              <TableHead className="text-right">VGV fechado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : corretores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum membro no workspace. Convide o time em Configurações.
                </TableCell>
              </TableRow>
            ) : (
              corretores.map((c) => (
                <TableRow key={c.userId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {iniciais(c.profile?.nome, c.profile?.email)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {c.profile?.nome ?? c.profile?.email ?? "Membro"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.profile?.email ?? "—"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.roles.length ? (
                        c.roles.map((r) => (
                          <Badge key={r} variant="soft">
                            {roleLabels[r] ?? r}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem papel</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.leads}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.ativos}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.fechados}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.conversao == null ? "—" : `${c.conversao}%`}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.parados > 0 ? (
                      <Badge variant="destructive">{c.parados}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.compromissosPendentes}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBRL(c.vgvFechado)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
