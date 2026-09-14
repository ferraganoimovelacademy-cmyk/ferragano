/**
 * Regressão dos hooks de cron: os jobs só rodam com o segredo de cron.
 * Antes da correção, três hooks aceitavam a chave publicável (que vai para o
 * navegador) e um deles não autenticava nada.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

const SEGREDO = "segredo-de-cron-para-teste";

function req(authorization?: string) {
  return new Request("https://exemplo.test/api/public/hooks/outbox-worker", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });
}

describe("authenticateCronRequest", () => {
  beforeEach(() => {
    process.env["LOVABLE_CRON_SECRET"] = SEGREDO;
    delete process.env["LOVABLE_CRON_SECRET_PREVIOUS"];
  });

  it("nega requisição sem Authorization", async () => {
    const r = await authenticateCronRequest(req());
    expect(r?.status).toBe(401);
  });

  it("nega token errado (ex.: chave publicável do navegador)", async () => {
    const r = await authenticateCronRequest(req("Bearer sb_publishable_qualquer"));
    expect(r?.status).toBe(401);
  });

  it("aceita o segredo de cron", async () => {
    const r = await authenticateCronRequest(req(`Bearer ${SEGREDO}`));
    expect(r).toBeNull();
  });

  it("aceita o segredo anterior durante a rotação", async () => {
    process.env["LOVABLE_CRON_SECRET_PREVIOUS"] = "segredo-anterior";
    const r = await authenticateCronRequest(req("Bearer segredo-anterior"));
    expect(r).toBeNull();
  });

  it("falha fechado quando o segredo não está configurado", async () => {
    delete process.env["LOVABLE_CRON_SECRET"];
    const r = await authenticateCronRequest(req(`Bearer ${SEGREDO}`));
    expect(r?.status).toBe(500);
  });
});
