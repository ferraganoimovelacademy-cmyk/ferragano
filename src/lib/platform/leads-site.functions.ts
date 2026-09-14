import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { siteLeadFunnelSchema, type SiteLeadFunnel } from "@/lib/platform/leads-site";

/**
 * Query Layer dos leads da vitrine. O isolamento por workspace é do banco:
 * `site_lead_funnel` valida a associação do usuário antes de ler qualquer linha.
 */
export const getSiteLeadFunnel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        dias: z.number().int().min(1).max(365).default(30),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<SiteLeadFunnel> => {
    const { data: row, error } = await context.supabase.rpc("site_lead_funnel", {
      _workspace_id: data.workspaceId,
      _dias: data.dias,
    });

    if (error) {
      console.error("[getSiteLeadFunnel]", error.message);
      throw new Error("Não foi possível carregar os leads da vitrine.");
    }

    return siteLeadFunnelSchema.parse(row);
  });
