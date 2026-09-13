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

  it("todo módulo tem uma flag booleana definida (nasce desligado, exceto CRM)", () => {
    for (const m of ALL_MODULES) expect(typeof featureFlags[m]).toBe("boolean");
    expect(featureFlags.crm).toBe(true);
    for (const m of ALL_MODULES.filter((m) => m !== "crm")) {
      expect(featureFlags[m]).toBe(false);
    }
  });

  it("isModuleEnabled sem chave é sempre permitido (rota sem módulo associado)", () => {
    expect(isModuleEnabled(undefined)).toBe(true);
  });

  it("isModuleEnabled reflete o estado da flag", () => {
    expect(isModuleEnabled("crm")).toBe(true);
    expect(isModuleEnabled("erp")).toBe(false);
  });
});
