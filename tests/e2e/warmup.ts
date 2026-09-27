import type { FullConfig } from "@playwright/test";

/**
 * Aquece o dev server: a primeira visita a cada rota dispara a compilação
 * sob demanda do Vite e pode estourar o timeout do primeiro teste.
 */
const ROTAS = ["/", "/empreendimentos", "/simulacao", "/metodo", "/contato", "/auth"];

export default async function warmup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:8080";
  for (const rota of ROTAS) {
    try {
      await fetch(new URL(rota, baseURL), { signal: AbortSignal.timeout(120_000) });
    } catch (e) {
      console.warn(`[warmup] ${rota}: ${(e as Error).message}`);
    }
  }
}
