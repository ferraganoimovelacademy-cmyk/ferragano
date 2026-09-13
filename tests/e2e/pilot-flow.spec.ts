import { expect, test } from "@playwright/test";

/**
 * GATE A3 — fluxo completo do piloto:
 * Pessoa → Oportunidade → Visita → Proposta → Reserva → Venda → Decision Center.
 *
 * Exige um usuário real do workspace piloto:
 *   E2E_EMAIL / E2E_PASSWORD (e opcionalmente E2E_BASE_URL).
 * Sem essas variáveis o teste é ignorado, nunca falso-positivo.
 */
const email = process.env["E2E_EMAIL"];
const senha = process.env["E2E_PASSWORD"];
const marcador = `E2E ${Date.now()}`;

test.skip(!email || !senha, "defina E2E_EMAIL e E2E_PASSWORD do workspace piloto");
test.describe.configure({ mode: "serial" });

test("fluxo comercial completo chega ao Decision Center", async ({ page }) => {
  // 1. Autenticação
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await page.getByLabel("E-mail").fill(email!);
  await page.getByLabel("Senha").fill(senha!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/app/, { timeout: 20_000 });

  // 2. Pessoa
  await page.goto("/app/pessoas", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Nova pessoa" }).click();
  await page.getByLabel("Nome").fill(marcador);
  await page.getByLabel("E-mail").fill(`e2e-${Date.now()}@ferragano.test`);
  await page.getByRole("button", { name: /Salvar|Criar/ }).click();
  await expect(page.getByText(marcador).first()).toBeVisible();

  // 3. Oportunidade na ficha da pessoa
  await page.getByText(marcador).first().click();
  await page.getByRole("button", { name: "Nova oportunidade" }).click();
  await page.getByLabel("Título").fill(`${marcador} — oportunidade`);
  await page.getByLabel("Valor estimado").fill("450000");
  await page.getByRole("button", { name: "Criar" }).click();
  await expect(page.getByText(`${marcador} — oportunidade`).first()).toBeVisible();

  // 4. Kanban: seleciona pelo teclado e avança etapa sem mouse (GATE A2)
  await page.goto("/app/oportunidades", { waitUntil: "domcontentloaded" });
  const card = page.getByRole("button", { name: new RegExp(marcador) }).first();
  await card.focus();
  await page.keyboard.press("Control+ArrowRight");
  await expect(card).toBeVisible();

  // 5. Execução comercial: visita → proposta → reserva → venda
  await card.press("Enter");
  await page.getByRole("tab", { name: "Visitas" }).click();
  const daqui = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
  await page.getByLabel("Agendar visita").fill(daqui);
  await page.getByRole("button", { name: "Agendar" }).click();
  await page.getByRole("button", { name: "Compareceu" }).first().click();

  await page.getByRole("tab", { name: "Propostas" }).click();
  await page.getByLabel("Nova proposta (valor)").fill("430000");
  await page.getByRole("button", { name: "Criar" }).click();

  await page.getByRole("tab", { name: "Reserva" }).click();
  await page.getByLabel("Reservar até").fill(daqui);
  await page.getByRole("button", { name: "Reservar" }).click();

  // 5b. Cancelamento usa o ReasonDialog acessível (GATE A1)
  await page.getByRole("button", { name: "Cancelar reserva" }).first().click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByLabel(/Motivo/)).toBeFocused();
  await dialogo.getByLabel(/Motivo/).fill("Cancelado pelo teste E2E");
  await dialogo.getByRole("button", { name: "Cancelar reserva" }).click();

  await page.getByLabel("Reservar até").fill(daqui);
  await page.getByRole("button", { name: "Reservar" }).click();
  await page.getByLabel("Fechar venda (valor final)").fill("430000");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page.getByText(/Venda registrada/)).toBeVisible();

  // 6. Read Models / Decision Center
  await page.goto("/app/decisoes", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("tab").first()).toBeVisible();

  // 7. Observabilidade
  await page.goto("/app/admin/health", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});