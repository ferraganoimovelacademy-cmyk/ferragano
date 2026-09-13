import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type NotificationInput = {
  workspaceId: string;
  userId: string;
  titulo: string;
  mensagem?: string | null;
  tipo?: "info" | "sucesso" | "alerta" | "erro";
  link?: string | null;
  entity?: string | null;
  entityId?: string | null;
};

/**
 * GATE 03.5 — motor de notificações.
 * Ponto único de escrita em `notifications`. Não existe policy de INSERT:
 * só o servidor cria aviso. Falha aqui nunca derruba a operação de negócio.
 */
export async function notify(
  client: SupabaseClient<Database>,
  input: NotificationInput | NotificationInput[],
): Promise<void> {
  const lista = Array.isArray(input) ? input : [input];
  if (!lista.length) return;

  const { error } = await client.from("notifications").insert(
    lista.map((n) => ({
      workspace_id: n.workspaceId,
      user_id: n.userId,
      titulo: n.titulo,
      mensagem: n.mensagem ?? null,
      tipo: n.tipo ?? "info",
      link: n.link ?? null,
      entity: n.entity ?? null,
      entity_id: n.entityId ?? null,
    })),
  );

  if (error) console.error("[notify] falha ao notificar", error.message);
}

/** Notifica todos os membros ativos do workspace, exceto quem disparou a ação. */
export async function notifyWorkspace(
  client: SupabaseClient<Database>,
  workspaceId: string,
  input: Omit<NotificationInput, "workspaceId" | "userId">,
  exceptUserId?: string | null,
): Promise<void> {
  const { data: membros, error } = await client
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("ativo", true);

  if (error) {
    console.error("[notifyWorkspace]", error.message);
    return;
  }

  await notify(
    client,
    (membros ?? [])
      .map((m) => m.user_id)
      .filter((id) => id !== exceptUserId)
      .map((userId) => ({ ...input, workspaceId, userId })),
  );
}
