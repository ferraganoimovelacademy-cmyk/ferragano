/**
 * Regressão das barreiras de privilégio fechadas na correção da auditoria.
 *
 * Não repete o que a policy garante (isolamento por linha): valida o GRANT.
 * Se alguém reabrir `anon` para os Read Models, para as colunas internas de
 * `unidades`, para as tabelas de controle ou para as funções de infraestrutura,
 * um destes testes falha.
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

async function rest(caminho: string, init?: RequestInit) {
  const res = await fetch(`${url}/rest/v1/${caminho}`, {
    ...init,
    headers: { apikey: anonKey!, "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  return { status: res.status, corpo: await res.text() };
}

describe.skipIf(!habilitado)("grants — visitante sem sessão", () => {
  const READ_MODELS = [
    "customer_360",
    "executive_360",
    "sales_360",
    "property_360",
    "marketing_360",
  ] as const;

  it.each(READ_MODELS)("não tem privilégio direto em %s", async (view) => {
    const { status } = await rest(`${view}?select=workspace_id&limit=1`);
    expect(status).toBeGreaterThanOrEqual(400);
  });

  const COLUNAS_INTERNAS = [
    "comissao_percentual",
    "score_liquidez",
    "perfil_ideal",
    "argumentos",
    "objecoes",
    "campanha",
    "workspace_id",
    "criado_por",
  ] as const;

  it.each(COLUNAS_INTERNAS)("não tem privilégio na coluna unidades.%s", async (coluna) => {
    const { status } = await rest(`unidades?select=id,${coluna}&limit=1`);
    expect(status).toBeGreaterThanOrEqual(400);
  });

  it("mantém a projeção de vitrine de unidades legível", async () => {
    const { status } = await rest(
      "unidades?select=id,identificador,tipologia,dormitorios,suites,vagas,varanda,deposito,area_privativa,area_total,andar,final,preco,status&limit=1",
    );
    expect(status).toBe(200);
  });

  it("não escreve na vitrine", async () => {
    for (const tabela of ["unidades", "empreendimentos", "property_media", "property_knowledge"]) {
      const { status } = await rest(tabela, {
        method: "POST",
        body: JSON.stringify({ nome: "grant-probe" }),
      });
      expect(status).toBeGreaterThanOrEqual(400);
    }
  });

  it("não alcança public_form_hits (rate limit dos formulários)", async () => {
    const leitura = await rest("public_form_hits?select=id&limit=1");
    expect(leitura.status).toBeGreaterThanOrEqual(400);

    const escrita = await rest("public_form_hits", {
      method: "POST",
      body: JSON.stringify({ formulario: "probe", fingerprint: "probe", bloqueado: false }),
    });
    expect(escrita.status).toBeGreaterThanOrEqual(400);
  });

  const FUNCOES_INFRA = [
    "claim_outbox_batch",
    "complete_outbox_event",
    "log_job_run",
    "rollup_automation_daily_metrics",
    "refresh_read_models",
    "evaluate_platform_alerts",
    "upsert_platform_alert",
    "public_form_rate_check",
    "seed_role_permissions",
    "seed_default_pipeline",
    "seed_automation_rules",
    "record_platform_metric",
  ] as const;

  it.each(FUNCOES_INFRA)("não executa a função de infraestrutura %s", async (fn) => {
    const { status } = await rest(`rpc/${fn}`, { method: "POST", body: "{}" });
    expect(status).toBeGreaterThanOrEqual(400);
  });
});
