import { describe, expect, it } from "vitest";
import { moduleLabels, featureFlags, isModuleEnabled, type ModuleKey } from "../feature-flags";

const ALL_MODULES: ModuleKey[] = [
  "crm",
  "erp",
  "academy",
  "ia",
  "analytics",
  "financeiro",
  "marketing",
  "portal_cliente",
];

describe("feature-flags", () => {
  it("todo módulo tem label", () => {
    for (const m of ALL_MODULES) expect(moduleLabels[m]).toBeTruthy();
  });

  it("todo módulo tem uma flag booleana definida e o CRM está sempre ligado", () => {
    for (const m of ALL_MODULES) expect(typeof featureFlags[m]).toBe("boolean");
    expect(featureFlags.crm).toBe(true);
  });

  it("isModuleEnabled sem chave é sempre permitido (rota sem módulo associado)", () => {
    expect(isModuleEnabled(undefined)).toBe(true);
  });

  it("isModuleEnabled reflete o estado da flag", () => {
    for (const m of ALL_MODULES) expect(isModuleEnabled(m)).toBe(featureFlags[m]);
  });
});
