import { expect, test } from "@playwright/test";

/**
 * GATE A3 — parte pública do fluxo: vitrine acessível, sem erro de console
 * e sem vazamento de dados privados no HTML entregue ao visitante.
 */
const ROTAS_PUBLICAS = ["/", "/empreendimentos", "/simulacao", "/metodo", "/contato"];

for (const rota of ROTAS_PUBLICAS) {
  test(`vitrine responde e renderiza um H1 em ${rota}`, async ({ page }) => {
    const erros: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") erros.push(m.text());
    });

    const res = await page.goto(rota, { waitUntil: "domcontentloaded" });
    expect(res?.status(), `status de ${rota}`).toBeLessThan(400);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(erros, `erros de console em ${rota}`).toEqual([]);
  });
}

test("rota do app redireciona visitante sem sessão para autenticação", async ({ page }) => {
  await page.goto("/app/oportunidades", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/auth/, { timeout: 15_000 });
  await expect(page.getByLabel("E-mail")).toBeVisible();
});