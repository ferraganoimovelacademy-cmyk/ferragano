import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { inviteMember, listTeam, revokeInvite } from "@/lib/platform/workspace.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon } from "@/components/Icon";
import { toast } from "sonner";

const ROLES = [
  { value: "administrador", label: "Administrador" },
  { value: "diretor", label: "Diretor" },
  { value: "gerente", label: "Gerente" },
  { value: "corretor", label: "Corretor" },
  { value: "marketing", label: "Marketing" },
  { value: "financeiro", label: "Financeiro" },
  { value: "suporte", label: "Suporte" },
  { value: "cliente", label: "Cliente" },
] as const;

export const Route = createFileRoute("/app/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Ferragano OS" },
      { name: "description", content: "Workspace, feature flags, permissões e auditoria." },
      { property: "og:title", content: "Configurações — Ferragano OS" },
      { property: "og:description", content: "Configurações da plataforma Ferragano OS." },
    ],
  }),
  component: ConfiguracoesPage,
});

const statusLabel: Record<string, string> = {
  trial: "Período de teste",
  ativo: "Ativo",
  suspenso: "Suspenso",
  arquivado: "Arquivado",
};

function ConfiguracoesPage() {
  const { data: session } = useSession();
  const workspace = session?.workspace;
  const isAdmin = (session?.roles ?? []).some((r) => r === "proprietario" || r === "administrador");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Workspace, equipe, papéis e módulos habilitados.
        </p>
      </header>

      {workspace && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-base font-semibold">Workspace</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Nome</dt>
              <dd className="mt-1 text-sm font-medium">{workspace.nome}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Status</dt>
              <dd className="mt-1">
                <Badge variant={workspace.status === "ativo" ? "default" : "soft"}>
                  {statusLabel[workspace.status] ?? workspace.status}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Plano</dt>
              <dd className="mt-1 text-sm font-medium capitalize">{workspace.plano}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Teste expira em</dt>
              <dd className="mt-1 text-sm font-medium">
                {workspace.trial_expira_em
                  ? new Date(workspace.trial_expira_em).toLocaleDateString("pt-BR")
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {workspace && isAdmin && <TeamSection workspaceId={workspace.id} />}
      {workspace && !isAdmin && (
        <p className="text-sm text-muted-foreground">
          Gestão de equipe disponível apenas para administradores do workspace.
        </p>
      )}
    </div>
  );
}

function TeamSection({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const fetchTeam = useServerFn(listTeam);
  const invite = useServerFn(inviteMember);
  const revoke = useServerFn(revokeInvite);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("corretor");

  const teamKey = ["team", workspaceId];
  const { data, isPending } = useQuery({
    queryKey: teamKey,
    queryFn: () => fetchTeam({ data: { workspaceId } }),
  });

  const inviteMutation = useMutation({
    mutationFn: () => invite({ data: { workspaceId, email, role: role as never } }),
    onSuccess: () => {
      toast.success("Convite criado.");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: teamKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => revoke({ data: { inviteId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKey }),
    onError: (e: Error) => toast.error(e.message),
  });

  const rolesByUser = new Map<string, string[]>();
  for (const r of data?.roles ?? []) {
    rolesByUser.set(r.user_id, [...(rolesByUser.get(r.user_id) ?? []), r.role as string]);
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-semibold">Convidar membro</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          O acesso é concedido automaticamente no primeiro login com este e-mail.
        </p>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            inviteMutation.mutate();
          }}
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="pessoa@ferragano.com.br"
            />
          </div>
          <div className="space-y-1.5 sm:w-48">
            <Label htmlFor="invite-role">Papel</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={inviteMutation.isPending}>
            Convidar
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-semibold">Equipe</h2>
        {isPending ? (
          <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {(data?.members ?? []).map((m) => {
              const profile = m.profile;
              return (
                <li key={m.user_id} className="flex items-center gap-3 py-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {(profile?.nome ?? profile?.email ?? "?").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{profile?.nome ?? "Sem nome"}</p>
                    <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(rolesByUser.get(m.user_id) ?? ["sem papel"]).map((r) => (
                      <Badge key={r} variant="soft" className="capitalize">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {(data?.invites?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-base font-semibold">Convites pendentes</h2>
          <ul className="mt-4 divide-y divide-border">
            {(data?.invites ?? []).map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.role} · expira {new Date(i.expira_em).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeMutation.mutate(i.id)}
                  disabled={revokeMutation.isPending}
                >
                  <Icon name="close" size={16} />
                  Cancelar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
