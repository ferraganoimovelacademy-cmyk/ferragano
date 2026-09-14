/**
 * GATE S02 — Attack Simulation.
 *
 * Simula um atacante com a chave publicável (a única chave que sai para o
 * navegador) tentando: ler dado transacional, escrever em tabela de controle,
 * escalar privilégio via `user_roles` / `role_permissions`, executar rotinas de
 * sistema e extrair colunas internas da vitrine pública.
 *
 * Todo teste aqui é uma tentativa que DEVE falhar. Se algum passar, o release
 * está bloqueado (ADR-012).
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

const WS_FALSO = "00000000-0000-0000-0000-000000000000";

async function rest(caminho: string, init?: RequestInit) {
  const res = await fetch(`${url}/rest/v1/${caminho}`, {
    ...init,
    headers: {
      apikey: anonKey!,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return { status: res.status, corpo: await res.text() };
}

async function rpc(nome: string, args: Record<string, unknown>) {
  return rest(`rpc/${nome}`, { method: "POST", body: JSON.stringify(args) });
}

describe.skipIf(!habilitado)("ataque — escalonamento de privilégio", () => {
  it("não concede papel a si mesmo em user_roles", async () => {
    const { status } = await rest("user_roles", {
      method: "POST",
      body: JSON.stringify({
        user_id: WS_FALSO,
        workspace_id: WS_FALSO,
        role: "proprietario",
      }),
    });
    expect(status).toBeGreaterThanOrEqual(400);
  });

  it("não altera a matriz de permissões", async () => {
    for (const metodo of ["POST", "PATCH", "DELETE"]) {
      const { status } = await rest("role_permissions?workspace_id=eq." + WS_FALSO, {
        method: metodo,
        body: metodo === "DELETE" ? undefined : JSON.stringify({ nivel: "total" }),
      });
      expect(status).toBeGreaterThanOrEqual(400);
    }
  });

  it("não cria workspace nem se adiciona como membro", async () => {
    for (const tabela of ["workspaces", "workspace_members", "workspace_invites"]) {
      const { status } = await rest(tabela, {
        method: "POST",
        body: JSON.stringify({ nome: "attack-probe", workspace_id: WS_FALSO }),
      });
      expect(status).toBeGreaterThanOrEqual(400);
    }
  });

  it("não executa as rotinas de bootstrap de permissão e funil", async () => {
    for (const fn of [
      "seed_role_permissions",
      "seed_default_pipeline",
      "seed_automation_rules",
      "refresh_person_estagio",
    ]) {
      const { status } = await rpc(fn, { _workspace_id: WS_FALSO, _person_id: WS_FALSO });
      expect(status).toBeGreaterThanOrEqual(400);
    }
  });
});

describe.skipIf(!habilitado)("ataque — superfície de RPC sem sessão", () => {
  const FUNCOES_INTERNAS = [
    "record_telemetry",
    "record_platform_metric",
    "record_decision_outcome",
    "ack_platform_alert",
    "upsert_platform_alert",
    "evaluate_platform_alerts",
    "platform_metrics_summary",
    "feature_adoption",
    "decision_accuracy",
    "find_person_duplicates",
    "platform_health",
    "claim_outbox_batch",
    "complete_outbox_event",
    "refresh_read_models",
    "log_job_run",
    "list_outbox_queue",
    "list_platform_alerts",
    "retry_outbox_event",
    "has_role",
    "has_permission",
    "is_workspace_admin",
    "is_workspace_member",
    "shares_workspace",
  ] as const;

  it.each(FUNCOES_INTERNAS)("nega %s para chamador anônimo", async (fn) => {
    const { status } = await rpc(fn, {
      _workspace_id: WS_FALSO,
      _user_id: WS_FALSO,
      _id: WS_FALSO,
    });
    expect(status).toBeGreaterThanOrEqual(400);
  });
});

describe.skipIf(!habilitado)("ataque — extração de dado sensível pela vitrine", () => {
  it("mantém a leitura pública funcionando com as colunas de venda", async () => {
    const { status } = await rest("unidades?select=id,identificador,preco,status&limit=1");
    expect(status).toBe(200);
  });

  const COLUNAS_INTERNAS = [
    "comissao_percentual",
    "score_liquidez",
    "perfil_ideal",
    "argumentos",
    "objecoes",
    "campanha",
    "created_by",
  ] as const;

  it.each(COLUNAS_INTERNAS)("não expõe unidades.%s", async (coluna) => {
    const { status } = await rest(`unidades?select=id,${coluna}&limit=1`);
    expect(status).toBeGreaterThanOrEqual(400);
  });

  it("não usa a vitrine como ponte para pessoas ou oportunidades", async () => {
    for (const embed of ["people(nome)", "opportunities(id)", "proposals(id)"]) {
      const { status } = await rest(`empreendimentos?select=id,${embed}&limit=1`);
      expect(status).toBeGreaterThanOrEqual(400);
    }
  });

  it("não lê empreendimento privado nem burlando o filtro", async () => {
    const { status, corpo } = await rest("empreendimentos?select=id,publico&limit=200");
    expect(status).toBe(200);
    const linhas = JSON.parse(corpo) as Array<{ publico: boolean }>;
    expect(linhas.every((l) => l.publico === true)).toBe(true);
  });
});
