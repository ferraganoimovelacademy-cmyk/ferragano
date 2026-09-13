import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { listAdminAccess } from "@/lib/platform/admin-access.functions";
import { atendeNivel, type AdminLevel, type AdminModule } from "@/lib/platform/admin-access";

export const adminAccessQueryKey = ["admin-access"] as const;

/**
 * Acesso administrativo efetivo do usuário atual. Serve apenas para decidir
 * o que a interface mostra — a autorização real está no servidor.
 */
export function useAdminAccess() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const carregar = useServerFn(listAdminAccess);

  const query = useQuery({
    queryKey: [...adminAccessQueryKey, workspaceId],
    queryFn: () => carregar({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  });

  const dados = query.data;

  function nivelDe(module: AdminModule): AdminLevel {
    return dados?.meuAcesso?.[module] ?? "nenhum";
  }

  function pode(module: AdminModule, minimo: AdminLevel = "leitura") {
    return atendeNivel(nivelDe(module), minimo);
  }

  function exigeMfa(module: AdminModule) {
    return Boolean(dados?.exigir2fa) && (dados?.modulosSensiveis ?? []).includes(module);
  }

  return {
    ...query,
    workspaceId,
    nivelDe,
    pode,
    exigeMfa,
    mfaAtiva: Boolean(dados?.mfaAtiva),
    bloqueadoPorMfa: (module: AdminModule) => exigeMfa(module) && !dados?.mfaAtiva,
  };
}
