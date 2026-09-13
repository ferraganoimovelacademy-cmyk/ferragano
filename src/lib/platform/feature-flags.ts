/**
 * Feature Flags — Ferragano OS
 * Todo módulo novo nasce DESLIGADO. Liga quando estiver pronto.
 * Fonte única de verdade no client; futuramente sincronizado com o workspace no banco.
 */

export type ModuleKey =
  | "crm"
  | "erp"
  | "academy"
  | "ia"
  | "analytics"
  | "financeiro"
  | "marketing"
  | "portal_cliente";

export const moduleLabels: Record<ModuleKey, string> = {
  crm: "CRM",
  erp: "ERP",
  academy: "Academy",
  ia: "IA",
  analytics: "Analytics",
  financeiro: "Financeiro",
  marketing: "Marketing",
  portal_cliente: "Portal do Cliente",
};

export const featureFlags: Record<ModuleKey, boolean> = {
  crm: true,
  erp: true,
  academy: true,
  ia: true,
  analytics: true,
  financeiro: true,
  marketing: true,
  portal_cliente: true,
};

export function isModuleEnabled(key?: ModuleKey) {
  if (!key) return true;
  return featureFlags[key];
}
