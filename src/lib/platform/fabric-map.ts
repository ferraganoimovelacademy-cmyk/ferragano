/**
 * SPRINT 27.1 — tradução de jobs/telemetria para bounded contexts.
 * Módulo separado porque arquivos `*.functions.ts` só podem declarar server
 * functions no escopo do módulo (o splitting remove os demais símbolos).
 */
import type { Contexto } from "@/lib/platform/orchestrator";

export const CONTEXTO_POR_JOB_FABRIC: Record<string, Contexto> = {
  "market.collector": "market",
  "advisor.watchdog": "advisor",
  "outbox.worker": "dominio",
  "automation.rollup": "recommendation",
  "readmodels.refresh": "knowledge",
};

export const CONTEXTO_POR_DOMINIO_TELEMETRIA: Record<string, Contexto> = {
  crm: "dominio",
  pipeline: "dominio",
  produto: "dominio",
  vendas: "dominio",
  market: "market",
  comportamento: "behavior",
  evidencia: "evidence",
  recomendacao: "recommendation",
  advisor: "advisor",
  knowledge: "knowledge",
  observability: "executive",
  radar: "executive",
};

export const contextoDeEventoFabric = (agregado: string | null): Contexto => {
  switch (agregado) {
    case "market":
    case "market_region":
      return "market";
    case "person":
    case "people":
      return "behavior";
    case "recommendation":
      return "recommendation";
    case "advisor":
      return "advisor";
    default:
      return "dominio";
  }
};
