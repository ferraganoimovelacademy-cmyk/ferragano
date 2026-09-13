import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/use-session";
import { isAdminRole } from "@/lib/platform/roles";
import { listAuditLog } from "@/lib/platform/audit.functions";

export const Route = createFileRoute("/app/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria · Ferragano OS" },
      {
        name: "description",
        content: "Trilha de auditoria do workspace: quem fez o quê, quando e em qual entidade.",
      },
    ],
  }),
  component: AuditoriaPage,
});

const PAGE_SIZE = 50;

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AuditoriaPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const admin = isAdminRole(session?.roles);

  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(0);

  const fetchAudit = useServerFn(listAuditLog);
  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", workspaceId, action, entity, page],
    queryFn: () =>
      fetchAudit({
        data: {
          workspaceId: workspaceId!,
          action: action.trim() || undefined,
          entity: entity.trim() || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        },
      }),
    enabled: Boolean(workspaceId) && admin,
  });

  if (!admin) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Icon name="lock" size={28} className="mx-auto text-muted-foreground" />
        <h1 className="mt-3 font-display text-lg font-semibold">Acesso restrito</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A trilha de auditoria é visível apenas para proprietários e administradores do workspace.
        </p>
      </div>
    );
  }

  const total = data?.total ?? 0;
  const eventos = data?.events ?? [];
  const ultimaPagina = (page + 1) * PAGE_SIZE >= total;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Auditoria</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro append-only de tudo que altera o workspace. Escrito apenas pelo servidor.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="min-w-40 flex-1">
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="filtro-acao">
            Ação
          </label>
          <Input
            id="filtro-acao"
            value={action}
            placeholder="workspace.bootstrap"
            onChange={(e) => {
              setPage(0);
              setAction(e.target.value);
            }}
          />
        </div>
        <div className="min-w-40 flex-1">
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="filtro-entidade">
            Entidade
          </label>
          <Input
            id="filtro-entidade"
            value={entity}
            placeholder="workspaces"
            onChange={(e) => {
              setPage(0);
              setEntity(e.target.value);
            }}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setAction("");
            setEntity("");
            setPage(0);
          }}
        >
          Limpar
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">Registro de auditoria do workspace</caption>
          <thead className="border-b border-border bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">Quando</th>
              <th className="px-4 py-2 font-medium">Ação</th>
              <th className="px-4 py-2 font-medium">Entidade</th>
              <th className="px-4 py-2 font-medium">Autor</th>
              <th className="px-4 py-2 font-medium">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  Carregando…
                </td>
              </tr>
            )}
            {!isLoading && eventos.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  Nenhum evento registrado com esses filtros.
                </td>
              </tr>
            )}
            {eventos.map((evento) => (
              <tr key={evento.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2 whitespace-nowrap text-muted-foreground tabular-nums">
                  {formatarData(evento.createdAt)}
                </td>
                <td className="px-4 py-2">
                  <Badge variant="soft" className="font-mono text-[11px]">
                    {evento.action}
                  </Badge>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                  {evento.entity}
                </td>
                <td className="max-w-48 truncate px-4 py-2">
                  {evento.actor?.nome ?? evento.actor?.email ?? "sistema"}
                </td>
                <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">
                  {Object.entries(evento.metadata).length
                    ? Object.entries(evento.metadata)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(" · ")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} evento{total === 1 ? "" : "s"}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={ultimaPagina}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
