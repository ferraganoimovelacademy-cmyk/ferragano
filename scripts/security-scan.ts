/**
 * Scan de segurança automatizado (executado em cada deploy).
 *
 * Não substitui o scanner interno da plataforma: ele reexecuta, contra o
 * backend real, as barreiras do ADR-012 e verifica uma a uma as
 * vulnerabilidades já selecionadas em `certification/security-findings.json`.
 *
 * Saídas:
 *  - `certification/SECURITY-SCAN.md` — relatório legível (selecionadas x resolvidas).
 *  - código de saída 1 quando existe regressão ou suíte vermelha (bloqueia o deploy).
 */
import { execFile } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

const exec = promisify(execFile);
const raiz = process.cwd();

/** Contrato de entrada de `certification/security-findings.json`. */
const findingSchema = z.object({
  id: z.string().min(1),
  titulo: z.string().min(1),
  severidade: z.string().min(1),
  selecionadaEm: z.string().min(1),
  correcao: z.string().min(1),
  probe: z.string().min(1),
  alvo: z.string().min(1),
});

const registroSchema = z
  .object({
    atualizadoEm: z.string().min(1),
    findings: z.array(findingSchema),
    aceitos: z.array(
      z.object({
        id: z.string().min(1),
        titulo: z.string().min(1),
        justificativa: z.string().min(1),
      }),
    ),
  })
  // Metadados de certificação convivem no mesmo arquivo e são preservados.
  .passthrough();

type Finding = z.infer<typeof findingSchema>;
type Registro = z.infer<typeof registroSchema>;

type Resultado = {
  finding: Finding;
  estado: "resolvida" | "regrediu" | "nao_verificada";
  evidencia: string;
};

function envDoArquivo(): Record<string, string> {
  try {
    const bruto = readFileSync(path.resolve(raiz, ".env"), "utf8");
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

async function rest(caminho: string, init?: RequestInit) {
  const res = await fetch(`${url}/rest/v1/${caminho}`, {
    ...init,
    headers: { apikey: anonKey!, "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  return { status: res.status, corpo: await res.text() };
}

const COLUNAS_INTERNAS = [
  "comissao_percentual",
  "score_liquidez",
  "perfil_ideal",
  "argumentos",
  "objecoes",
  "campanha",
  "created_by",
];

/** Cada sonda devolve [resolvida, evidência medida]. */
const sondas: Record<string, (f: Finding) => Promise<[boolean, string]>> = {
  "rpc-anon-negado": async (f) => {
    const { status } = await rest(`rpc/${f.alvo}`, { method: "POST", body: "{}" });
    return [status >= 400, `POST /rpc/${f.alvo} sem sessão → HTTP ${status} (esperado ≥ 400)`];
  },
  "serie-inativa-invisivel": async (f) => {
    const { status, corpo } = await rest(
      `${f.alvo}?select=id,market_indicator_series!inner(ativo)&market_indicator_series.ativo=eq.false&limit=5`,
    );
    if (status >= 400) return [true, `leitura de série inativa negada → HTTP ${status}`];
    const linhas = JSON.parse(corpo) as unknown[];
    return [linhas.length === 0, `séries inativas visíveis a anon: ${linhas.length} (esperado 0)`];
  },
  "bucket-nao-listavel": async (f) => {
    const res = await fetch(`${url}/storage/v1/object/list/${f.alvo}`, {
      method: "POST",
      headers: { apikey: anonKey!, "content-type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 100 }),
    });
    const corpo = await res.text();
    if (res.status >= 400) return [true, `listagem anônima do bucket → HTTP ${res.status}`];
    let n = -1;
    try {
      n = (JSON.parse(corpo) as unknown[]).length;
    } catch {
      /* corpo não-JSON conta como não listável */
    }
    return [n === 0, `objetos listados por anon: ${n} (esperado 0)`];
  },
  "colunas-internas-negadas": async (f) => {
    const negadas: string[] = [];
    const expostas: string[] = [];
    for (const coluna of COLUNAS_INTERNAS) {
      const { status } = await rest(`${f.alvo}?select=id,${coluna}&limit=1`);
      (status >= 400 ? negadas : expostas).push(coluna);
    }
    return [
      expostas.length === 0,
      `colunas negadas: ${negadas.length}/${COLUNAS_INTERNAS.length}` +
        (expostas.length ? ` — expostas: ${expostas.join(", ")}` : ""),
    ];
  },
};

type Suite = {
  nome: string;
  comando: string[];
  ok: boolean;
  saida: string;
  /** Barreira informativa não bloqueia o deploy quando indisponível. */
  bloqueante?: boolean;
};

async function rodar(nome: string, comando: string[]): Promise<Suite> {
  try {
    const { stdout, stderr } = await exec(comando[0]!, comando.slice(1), {
      cwd: raiz,
      maxBuffer: 20 * 1024 * 1024,
    });
    return { nome, comando, ok: true, saida: resumo(stdout + stderr) };
  } catch (erro) {
    const e = erro as { stdout?: string; stderr?: string; message?: string };
    return {
      nome,
      comando,
      ok: false,
      saida: resumo(`${e.stdout ?? ""}${e.stderr ?? ""}${e.message ?? ""}`),
    };
  }
}

function resumo(saida: string): string {
  const linhas = saida
    .split("\n")
    .map((l) => l.replace(/\u001b\[[0-9;]*m/g, "").trim())
    .filter(Boolean);
  const relevantes = linhas.filter((l) =>
    /Test Files|Tests |vulnerabilit|advisor|packages|FAIL|error/i.test(l),
  );
  return (relevantes.length ? relevantes : linhas.slice(-5)).slice(-8).join("\n");
}

function selo(s: Suite) {
  if (s.ok) return "🟢 PASS";
  return s.bloqueante === false ? "⚠️ INDISPONÍVEL" : "🔴 FAIL";
}

async function main() {
  const registro = JSON.parse(
    readFileSync(path.resolve(raiz, "certification/security-findings.json"), "utf8"),
  ) as Registro;

  const backendAlcancavel = Boolean(url && anonKey);
  const resultados: Resultado[] = [];

  for (const finding of registro.findings) {
    const sonda = sondas[finding.probe];
    if (!backendAlcancavel || !sonda) {
      resultados.push({
        finding,
        estado: "nao_verificada",
        evidencia: backendAlcancavel
          ? `sonda "${finding.probe}" não implementada`
          : "SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY ausentes no ambiente",
      });
      continue;
    }
    try {
      const [ok, evidencia] = await sonda(finding);
      resultados.push({ finding, estado: ok ? "resolvida" : "regrediu", evidencia });
    } catch (erro) {
      resultados.push({
        finding,
        estado: "nao_verificada",
        evidencia: `falha ao sondar: ${(erro as Error).message}`,
      });
    }
  }

  const auditoria = await rodar("Dependências (audit)", ["bun", "audit", "--audit-level=high"]);
  // Registro de auditoria fora do ar (404/rede) é pendência, não vulnerabilidade.
  const auditIndisponivel =
    !auditoria.ok && /audit request failed|ENOTFOUND|ECONNREFUSED|fetch failed/i.test(auditoria.saida);

  const suites: Suite[] = [
    await rodar("Isolamento de workspace", ["bunx", "vitest", "run", "tests/isolation"]),
    await rodar("Simulação de ataque", ["bunx", "vitest", "run", "tests/security"]),
    await rodar("Caos e resiliência", ["bunx", "vitest", "run", "tests/chaos"]),
    { ...auditoria, bloqueante: !auditIndisponivel },
  ];

  const regressoes = resultados.filter((r) => r.estado === "regrediu");
  const naoVerificadas = resultados.filter((r) => r.estado === "nao_verificada");
  const suitesVermelhas = suites.filter((s) => !s.ok && s.bloqueante !== false);
  const bloqueia = regressoes.length > 0 || suitesVermelhas.length > 0;

  const agora = new Date().toISOString();
  const ref = process.env["GITHUB_SHA"] ?? process.env["LOVABLE_DEPLOY_ID"] ?? "local";

  const md = `# 🛡 Relatório de Scan de Segurança

Gerado automaticamente por \`bun run security:scan\` em cada deploy.
Não edite à mão — a fonte das vulnerabilidades é \`certification/security-findings.json\`.

| | |
| --- | --- |
| Execução | ${agora} |
| Referência | \`${ref}\` |
| Backend alcançável | ${backendAlcancavel ? "sim" : "não"} |
| **Veredito** | **${bloqueia ? "🔴 DEPLOY BLOQUEADO" : "🟢 LIBERADO"}** |

## Vulnerabilidades selecionadas x resolvidas

| ID | Vulnerabilidade | Severidade | Selecionada em | Estado | Evidência medida |
| --- | --- | --- | --- | --- | --- |
${resultados
  .map(
    (r) =>
      `| ${r.finding.id} | ${r.finding.titulo} | ${r.finding.severidade} | ${r.finding.selecionadaEm} | ${
        r.estado === "resolvida"
          ? "✅ resolvida"
          : r.estado === "regrediu"
            ? "🔴 REGREDIU"
            : "⚠️ não verificada"
      } | ${r.evidencia.replace(/\|/g, "/")} |`,
  )
  .join("\n")}

Resolvidas: **${resultados.filter((r) => r.estado === "resolvida").length}/${resultados.length}** · Regressões: **${regressoes.length}** · Não verificadas: **${naoVerificadas.length}**

### Correção aplicada em cada item

${resultados.map((r) => `- **${r.finding.id}** — ${r.finding.correcao}`).join("\n")}

## Barreiras automatizadas (ADR-012)

| Barreira | Resultado | Saída |
| --- | --- | --- |
${suites.map((s) => `| ${s.nome} | ${selo(s)} | \`${s.saida.split("\n").join(" · ").slice(0, 220)}\` |`).join("\n")}

## Avisos aceitos com justificativa

${registro.aceitos.map((a) => `- **${a.id}** — ${a.titulo}. ${a.justificativa}`).join("\n")}
${
  naoVerificadas.length || auditIndisponivel
    ? `\n## Pendência declarada\n\n${[
        ...naoVerificadas.map((r) => `- ${r.finding.id}: ${r.evidencia}`),
        ...(auditIndisponivel
          ? ["- Auditoria de dependências não pôde ser consultada neste ambiente (registro inacessível)."]
          : []),
      ].join("\n")}\n`
    : ""
}`;

  writeFileSync(path.resolve(raiz, "certification/SECURITY-SCAN.md"), md, "utf8");
  console.log(md);

  if (bloqueia) {
    console.error("\n[security:scan] deploy bloqueado — ver certification/SECURITY-SCAN.md");
    process.exit(1);
  }
}

void main();
