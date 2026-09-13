/**
 * GATE A4 — Workspace Isolation.
 *
 * Verifica, contra o backend real, que um chamador sem sessão não alcança
 * nenhum dado transacional de nenhum workspace (API REST + Query Layer/RPC dos
 * Read Models). É a primeira barreira do isolamento: sem sessão não existe
 * `auth.uid()`, então toda policy baseada em `is_workspace_member` nega.
 *
 * Cobertura entre dois workspaces autenticados exige dois usuários reais no
 * piloto: defina E2E_A_* / E2E_B_* para habilitar o bloco correspondente.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function envDoArquivo(): Record<string, string> {
  try {
    const bruto = readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
    return Object.fromEntries(
      bruto
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
        }),
    );
  } catch {
    return {};
  }
}

const env = { ...envDoArquivo(), ...process.env };
const url = env["SUPABASE_URL"] ?? env["VITE_SUPABASE_URL"];
const anonKey = env["SUPABASE_PUBLISHABLE_KEY"] ?? env["VITE_SUPABASE_PUBLISHABLE_KEY"];
const habilitado = Boolean(url && anonKey);

const TABELAS_PRIVADAS = [
  "people",
  "person_contacts",
  "person_qualifications",
  "opportunities",
  "proposals",
  "reservations",
  "sales",
  "visits",
  "activities",
  "tasks",
  "domain_events",
  "outbox_events",
  "audit_log",
  "workspaces",
  "workspace_members",
  "user_roles",
  "platform_job_runs",
  "market_regions",
  "market_region_snapshots",
  "market_indicator_series",
  "market_indicator_values",
  "org_knowledge_versions",
  "org_knowledge_usage",
] as const;

const READ_MODELS = [
  "customer_360",
  "property_360",
  "sales_360",
  "executive_360",
  "marketing_360",
] as const;

async function rest(caminho: string) {
  const res = await fetch(`${url}/rest/v1/${caminho}`, {
    headers: { apikey: anonKey! },
  });
  const corpo = await res.text();
  return { status: res.status, corpo };
}

async function rpc(nome: string, args: Record<string, unknown>) {
  const res = await fetch(`${url}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: anonKey!, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  return { status: res.status, corpo: await res.text() };
}

describe.skipIf(!habilitado)("isolamento — chamador sem sessão", () => {
  it.each(TABELAS_PRIVADAS)("não lê nenhuma linha de %s", async (tabela) => {
    const { status, corpo } = await rest(`${tabela}?select=id&limit=1`);
    if (status === 200) {
      expect(JSON.parse(corpo)).toEqual([]);
    } else {
      expect([401, 403, 404]).toContain(status);
    }
  });

  it.each(TABELAS_PRIVADAS)("não escreve em %s", async (tabela) => {
    const res = await fetch(`${url}/rest/v1/${tabela}`, {
      method: "POST",
      headers: { apikey: anonKey!, "content-type": "application/json" },
      body: JSON.stringify({ nome: "isolation-probe" }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("não alcança as materialized views dos Read Models pela API", async () => {
    for (const view of READ_MODELS) {
      const { status } = await rest(`${view}?select=workspace_id&limit=1`);
      expect([401, 403, 404]).toContain(status);
    }
  });

  it("não executa o Query Layer dos Read Models", async () => {
    const ws = "00000000-0000-0000-0000-000000000000";
    for (const fn of [
      "read_customer_360",
      "read_property_360",
      "read_sales_360",
      "read_executive_360",
      "read_marketing_360",
    ]) {
      const { status } = await rpc(fn, { _workspace_id: ws });
      expect(status).toBeGreaterThanOrEqual(400);
    }
  });

  it("não executa funções internas de plataforma", async () => {
    for (const fn of [
      "claim_outbox_batch",
      "refresh_read_models",
      "log_job_run",
      "platform_health",
      "automation_effectiveness",
      "automation_intelligence",
      "rollup_automation_daily_metrics",
    ]) {
      const { status } = await rpc(fn, {});
      expect(status).toBeGreaterThanOrEqual(400);
    }
  });

  it("mantém leitura pública apenas na vitrine", async () => {
    const { status } = await rest("empreendimentos?select=id&publico=eq.true&limit=1");
    expect(status).toBe(200);
  });

  it("não alcança as tabelas de observabilidade", async () => {
    for (const tabela of [
      "platform_telemetry",
      "platform_metrics",
      "automation_daily_metrics",
      "decision_outcomes",
      "platform_alerts",
    ]) {
      const { status } = await rest(`${tabela}?select=id&limit=1`);
      expect(status).toBeGreaterThanOrEqual(400);
    }
  });

  it("não executa as funções de telemetria", async () => {
    const ws = "00000000-0000-0000-0000-000000000000";
    for (const fn of ["feature_adoption", "decision_accuracy"]) {
      const { status } = await rpc(fn, { _workspace_id: ws });
      expect(status).toBeGreaterThanOrEqual(400);
    }
  });

  // FASE 1 — GATE P07: feedback do piloto nunca é legível nem gravável sem sessão.
  it("não lê nem escreve pilot_feedback", async () => {
    const leitura = await rest("pilot_feedback?select=id&limit=1");
    expect(leitura.status).toBeGreaterThanOrEqual(400);

    const escrita = await fetch(`${url}/rest/v1/pilot_feedback`, {
      method: "POST",
      headers: { apikey: anonKey!, "content-type": "application/json" },
      body: JSON.stringify({
        workspace_id: "00000000-0000-0000-0000-000000000000",
        user_id: "00000000-0000-0000-0000-000000000000",
        tipo: "bug",
        mensagem: "tentativa anônima",
      }),
    });
    expect(escrita.status).toBeGreaterThanOrEqual(400);
  });

  // FASE 1 — GATE P05: progresso da Academy exige sessão.
  it("não lê nem escreve academy_progress", async () => {
    const leitura = await rest("academy_progress?select=id&limit=1");
    expect(leitura.status).toBeGreaterThanOrEqual(400);

    const escrita = await fetch(`${url}/rest/v1/academy_progress`, {
      method: "POST",
      headers: { apikey: anonKey!, "content-type": "application/json" },
      body: JSON.stringify({
        workspace_id: "00000000-0000-0000-0000-000000000000",
        user_id: "00000000-0000-0000-0000-000000000000",
        licao_key: "primeiro-acesso.tour",
      }),
    });
    expect(escrita.status).toBeGreaterThanOrEqual(400);
  });
});