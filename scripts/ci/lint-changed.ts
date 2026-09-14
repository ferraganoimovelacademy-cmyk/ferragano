/**
 * Lint com escopo — estratégia de baseline.
 *
 * O repositório tem milhares de apontamentos antigos (na maioria formatação),
 * e normalizar tudo em uma tacada mistura risco com ruído. Então o CI só
 * reprova o que mudou: os arquivos alterados em relação à base do PR/push.
 * Dívida antiga fica visível pelo `bun run lint`, mas não bloqueia; dívida
 * nova é impedida na entrada.
 *
 * Uso: bun scripts/ci/lint-changed.ts [base-ref]
 */
const base = process.argv[2] ?? process.env["LINT_BASE_REF"] ?? "origin/main";

async function run(cmd: string[]): Promise<{ code: number; out: string }> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  return { code, out: out + err };
}

const diff = await run(["git", "diff", "--name-only", "--diff-filter=ACMR", `${base}...HEAD`]);
if (diff.code !== 0) {
  console.error(`[lint-changed] não foi possível comparar com ${base}:\n${diff.out.trim()}`);
  console.error("[lint-changed] rodando lint apenas do diff local (HEAD~1).");
}

const fonte = diff.code === 0 ? diff.out : (await run(["git", "diff", "--name-only", "HEAD~1"])).out;

const arquivos = fonte
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => /\.(ts|tsx|js|jsx)$/.test(l))
  .filter((l) => !l.startsWith("src/integrations/supabase/"))
  .filter((l) => l !== "src/routeTree.gen.ts");

if (arquivos.length === 0) {
  console.log("[lint-changed] nenhum arquivo de código alterado — nada a lintar.");
  process.exit(0);
}

const existentes: string[] = [];
for (const a of arquivos) {
  if (await Bun.file(a).exists()) existentes.push(a);
}

if (existentes.length === 0) {
  console.log("[lint-changed] arquivos alterados foram removidos — nada a lintar.");
  process.exit(0);
}

console.log(`[lint-changed] lintando ${existentes.length} arquivo(s) alterado(s):`);
for (const a of existentes) console.log(`  - ${a}`);

const lint = await run(["bunx", "eslint", ...existentes]);
console.log(lint.out.trim());
process.exit(lint.code === 0 ? 0 : 1);
