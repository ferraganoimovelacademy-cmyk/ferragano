import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { isAdminRole, roleLabels } from "@/lib/platform/roles";
import {
  PERMISSION_LEVELS,
  PERMISSION_MODULES,
  PERMISSION_ROLES,
  levelLabels,
  listPermissoes,
  moduleLabels,
  setModuleFlag,
  setPermissao,
} from "@/lib/platform/permissoes.functions";

export const Route = createFileRoute("/app/permissoes")({
  head: () => ({
    meta: [
      { title: "Permissões — Ferragano One" },
      {
        name: "description",
        content: "Matriz de papéis e módulos: conceda ou bloqueie acesso sem escrever SQL.",
      },
      { property: "og:title", content: "Permissões — Ferragano One" },
      {
        property: "og:description",
        content: "Controle de acesso por papel e módulo no Ferragano One.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PermissoesPage,
});

function PermissoesPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const admin = isAdminRole(session?.roles);
  const queryClient = useQueryClient();

  const carregar = useServerFn(listPermissoes);
  const salvarNivel = useServerFn(setPermissao);
  const salvarFlag = useServerFn(setModuleFlag);

  const { data, isPending } = useQuery({
    queryKey: ["permissoes", workspaceId],
    queryFn: () => carregar({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId),
  });

  const nivelDe = (role: string, module: string) =>
    (data?.permissoes ?? []).find((p) => p.role === role && p.module === module)?.nivel ?? "nenhum";

  const mutNivel = useMutation({
    mutationFn: (v: { role: string; module: string; nivel: string }) =>
      salvarNivel({
        data: {
          workspaceId: workspaceId!,
          role: v.role as never,
          module: v.module as never,
          nivel: v.nivel as never,
        },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["permissoes"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const mutFlag = useMutation({
    mutationFn: (v: { module: string; enabled: boolean }) =>
      salvarFlag({
        data: { workspaceId: workspaceId!, module: v.module as never, enabled: v.enabled },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissoes"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Permissões</h1>
        <p className="text-muted-foreground text-sm">
          Defina o que cada papel enxerga em cada módulo e quais módulos estão ativos na empresa.
        </p>
      </header>

      {!admin && (
        <p className="border-border text-muted-foreground rounded-md border border-dashed p-3 text-sm">
          Visualização apenas. Só proprietário e administrador podem alterar acessos.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Módulos habilitados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PERMISSION_MODULES.map((m) => (
            <label
              key={m}
              className="border-border flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
            >
              <span>{moduleLabels[m]}</span>
              <Switch
                checked={Boolean(data?.flags?.[m])}
                disabled={!admin || mutFlag.isPending}
                onCheckedChange={(v) => mutFlag.mutate({ module: m, enabled: v })}
              />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matriz de acesso</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <caption className="sr-only">Matriz de acesso por papel e módulo</caption>
            <thead>
              <tr className="border-border border-b">
                <th className="p-2 text-left font-medium">Papel</th>
                {PERMISSION_MODULES.map((m) => (
                  <th key={m} className="p-2 text-left font-medium">
                    {moduleLabels[m]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_ROLES.map((role) => (
                <tr key={role} className="border-border border-b last:border-0">
                  <td className="p-2 font-medium">{roleLabels[role] ?? role}</td>
                  {PERMISSION_MODULES.map((m) => (
                    <td key={m} className="p-2">
                      <Select
                        value={nivelDe(role, m)}
                        disabled={!admin || role === "proprietario"}
                        onValueChange={(v) => mutNivel.mutate({ role, module: m, nivel: v })}
                      >
                        <SelectTrigger
                          className="h-8 w-28"
                          aria-label={`Nível de ${moduleLabels[m]} para ${roleLabels[role] ?? role}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERMISSION_LEVELS.map((l) => (
                            <SelectItem key={l} value={l}>
                              {levelLabels[l]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
