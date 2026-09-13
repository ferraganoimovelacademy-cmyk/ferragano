import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimelinePanel } from "@/components/platform/TimelinePanel";
import { useSession } from "@/hooks/use-session";
import { isAdminRole, roleLabels } from "@/lib/platform/roles";
import { listUsuarios, updateMembro } from "@/lib/platform/usuarios.functions";
import { inviteMember, revokeInvite } from "@/lib/platform/workspace.functions";

export const Route = createFileRoute("/app/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — Ferragano One" },
      {
        name: "description",
        content:
          "Diretório de usuários da imobiliária: cargo, equipe, gestor, papel e último acesso.",
      },
      { property: "og:title", content: "Usuários — Ferragano One" },
      { property: "og:description", content: "Gestão de pessoas e acessos no Ferragano One." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsuariosPage,
});

const APP_ROLES = Object.keys(roleLabels);
const STATUS = ["ativo", "inativo", "suspenso"] as const;

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  ativo: "default",
  inativo: "secondary",
  suspenso: "destructive",
};

function UsuariosPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const admin = isAdminRole(session?.roles);
  const queryClient = useQueryClient();

  const carregar = useServerFn(listUsuarios);
  const atualizar = useServerFn(updateMembro);
  const convidar = useServerFn(inviteMember);
  const cancelar = useServerFn(revokeInvite);

  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [roleConvite, setRoleConvite] = useState("corretor");

  const { data, isPending } = useQuery({
    queryKey: ["usuarios", workspaceId],
    queryFn: () => carregar({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId),
  });

  const usuarios = data?.usuarios ?? [];
  const atual = usuarios.find((u) => u.user_id === selecionado) ?? null;

  const salvar = useMutation({
    mutationFn: (patch: {
      userId: string;
      equipe_id?: string | null;
      gestor_id?: string | null;
      status?: (typeof STATUS)[number];
      role?: string;
    }) =>
      atualizar({
        data: {
          workspaceId: workspaceId!,
          userId: patch.userId,
          equipe_id: patch.equipe_id,
          gestor_id: patch.gestor_id,
          status: patch.status,
          role: patch.role as never,
        },
      }),
    onSuccess: () => {
      toast.success("Usuário atualizado.");
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convite = useMutation({
    mutationFn: () =>
      convidar({ data: { workspaceId: workspaceId!, email, role: roleConvite as never } }),
    onSuccess: () => {
      toast.success("Convite enviado.");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelarConvite = useMutation({
    mutationFn: (inviteId: string) => cancelar({ data: { inviteId } }),
    onSuccess: () => {
      toast.success("Convite cancelado.");
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground text-sm">
            Pessoas com acesso ao workspace, seus papéis, equipes e gestores.
          </p>
        </div>
        {workspaceId && (
          <TimelinePanel
            workspaceId={workspaceId}
            entity="workspace_members"
            titulo="Histórico de acessos"
          />
        )}
      </header>

      {admin && (
        <div className="border-border flex flex-wrap items-end gap-3 rounded-md border p-4">
          <div className="grid min-w-56 flex-1 gap-1.5">
            <Label htmlFor="convite-email">Convidar por e-mail</Label>
            <Input
              id="convite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@imobiliaria.com"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Papel</Label>
            <Select value={roleConvite} onValueChange={setRoleConvite}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APP_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleLabels[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => convite.mutate()} disabled={!email || convite.isPending}>
            <Icon name="mail" size={18} />
            Convidar
          </Button>
        </div>
      )}

      {isPending ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <div className="border-border overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Equipe</TableHead>
                <TableHead>Gestor</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-semibold">
                        {u.profile?.avatar_url ? (
                          <img
                            src={u.profile.avatar_url}
                            alt={u.profile?.nome ?? "Avatar"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          (u.profile?.nome ?? u.profile?.email ?? "?").slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {u.profile?.nome ?? "Sem nome"}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">{u.profile?.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{u.profile?.cargo ?? "—"}</TableCell>
                  <TableCell className="text-sm">{u.equipe?.nome ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {u.gestor?.nome ?? u.gestor?.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {u.roles.map((r) => roleLabels[r] ?? r).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[u.status] ?? "secondary"}>{u.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {u.ultimo_acesso_em
                      ? new Date(u.ultimo_acesso_em).toLocaleString("pt-BR")
                      : "Nunca"}
                  </TableCell>
                  <TableCell>
                    {admin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar usuário"
                        onClick={() => setSelecionado(u.user_id)}
                      >
                        <Icon name="tune" size={18} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {(data?.invites ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Convites pendentes</h2>
          <div className="border-border divide-border divide-y rounded-md border">
            {(data?.invites ?? []).map((i) => (
              <div key={i.id} className="flex items-center gap-3 p-3 text-sm">
                <Icon name="mail" size={18} className="text-muted-foreground" />
                <span className="flex-1 truncate">{i.email}</span>
                <Badge variant="secondary">{roleLabels[i.role] ?? i.role}</Badge>
                {admin && (
                  <Button variant="ghost" size="sm" onClick={() => cancelarConvite.mutate(i.id)}>
                    Cancelar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <Sheet open={Boolean(atual)} onOpenChange={(o) => !o && setSelecionado(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{atual?.profile?.nome ?? atual?.profile?.email ?? "Usuário"}</SheetTitle>
            <SheetDescription>Vínculo com a empresa</SheetDescription>
          </SheetHeader>

          {atual && (
            <div className="grid gap-4 p-4">
              <div className="grid gap-1.5">
                <Label>Equipe</Label>
                <Select
                  value={atual.equipe_id ?? "none"}
                  onValueChange={(v) =>
                    salvar.mutate({ userId: atual.user_id, equipe_id: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem equipe</SelectItem>
                    {(data?.equipes ?? []).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label>Gestor</Label>
                <Select
                  value={atual.gestor_id ?? "none"}
                  onValueChange={(v) =>
                    salvar.mutate({ userId: atual.user_id, gestor_id: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem gestor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem gestor</SelectItem>
                    {usuarios
                      .filter((u) => u.user_id !== atual.user_id)
                      .map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.profile?.nome ?? u.profile?.email ?? u.user_id.slice(0, 8)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label>Papel</Label>
                <Select
                  value={atual.roles[0] ?? "corretor"}
                  onValueChange={(v) => salvar.mutate({ userId: atual.user_id, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APP_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabels[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label>Situação</Label>
                <Select
                  value={atual.status}
                  onValueChange={(v) =>
                    salvar.mutate({ userId: atual.user_id, status: v as (typeof STATUS)[number] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-muted-foreground text-xs">
                Entrou em {new Date(atual.joined_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
