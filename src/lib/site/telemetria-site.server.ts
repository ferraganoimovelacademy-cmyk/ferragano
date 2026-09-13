import type { TelemetryDomain } from "@/lib/platform/telemetry";

/**
 * Telemetria de conversão do site público.
 *
 * `record_telemetry` exige sessão de membro do workspace (ADR-011), e o
 * visitante do site não tem sessão. Aqui a gravação é feita pelo servidor,
 * com `user_id` nulo, sempre a partir de dados já validados no servidor —
 * nunca com workspace vindo do cliente.
 */
type Admin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

export async function registrarTelemetriaSite(
  admin: Admin,
  entrada: {
    workspaceId: string;
    domain: TelemetryDomain;
    action: string;
    surface: string;
    ok?: boolean;
    erro?: string | null;
    entityType?: string | null;
    entityId?: string | null;
  },
): Promise<void> {
  const { error } = await admin.from("platform_telemetry").insert({
    workspace_id: entrada.workspaceId,
    user_id: null,
    domain: entrada.domain,
    action: entrada.action,
    surface: entrada.surface,
    ok: entrada.ok ?? true,
    erro: entrada.erro ? entrada.erro.slice(0, 500) : null,
    entity_type: entrada.entityType ?? null,
    entity_id: entrada.entityId ?? null,
  });

  if (error) console.warn("[telemetria-site]", entrada.action, error.message);
}
