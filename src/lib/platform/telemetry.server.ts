import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { metricDaAcao, type TelemetryDomain } from "@/lib/platform/telemetry";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * SPRINT 12 — escrita de telemetria no servidor.
 */
export type TelemetryInput = {
  workspaceId: string;
  domain: TelemetryDomain;
  action: string;
  duracaoMs?: number | null;
  ok?: boolean;
  surface?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  sessionId?: string | null;
  erro?: string | null;
  metric?: string | null;
  metricType?: "latencia" | "contagem" | "taxa" | "erro" | "duracao";
};

export async function logSystemEvent(
  level: "info" | "warn" | "error" | "fatal",
  category: string,
  message: string,
  metadata: Record<string, any> = {},
) {
  const logFn = level === "fatal" || level === "error" ? console.error : console.log;
  logFn(`[${level.toUpperCase()}] [${category}] ${message}`, JSON.stringify(metadata));

  try {
    const { error } = await supabaseAdmin.from("platform_job_runs").insert({
      job: `telemetry_${category}`,
      status: level === "error" || level === "fatal" ? "failed" : "completed",
      detalhe: { ...metadata, level, message, timestamp: new Date().toISOString() },
      ok: level !== "error" && level !== "fatal",
      started_at: new Date().toISOString(),
    } as any);

    if (error) console.warn("Failed to persist telemetry to DB:", error.message);

    // Sprint UI 10.2: Webhook notification for fatal/critical errors
    if (level === "fatal" || (level === "error" && metadata.notify)) {
      const webhookUrl = process.env['TELEMETRY_WEBHOOK_URL'];
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'PLATFORM_ALERT',
            level,
            category,
            message,
            timestamp: new Date().toISOString(),
          }),
        }).catch(err => console.error("Webhook notification failed:", err));
      }
    }
  } catch (err) {
    // Silent catch
  }
}

export async function recordTelemetry(
  supabase: SupabaseClient<Database>,
  input: TelemetryInput,
): Promise<void> {
  const metric = input.metric ?? metricDaAcao(input.domain, input.action) ?? null;

  const { error } = await supabase.rpc("record_telemetry" as never, {
    _workspace_id: input.workspaceId,
    _domain: input.domain,
    _action: input.action,
    _duracao_ms: input.duracaoMs ?? undefined,
    _ok: input.ok ?? true,
    _surface: input.surface ?? undefined,
    _entity_type: input.entityType ?? undefined,
    _entity_id: input.entityId ?? undefined,
    _session_id: input.sessionId ?? undefined,
    _erro: input.erro ?? undefined,
    _metric_name: metric ?? undefined,
    _metric_type: input.metricType ?? undefined,
  } as never);

  if (error) {
    console.warn("[telemetry]", input.domain, input.action, error.message);
    await logSystemEvent("error", "telemetry_failure", error.message, { input });
  }
}
