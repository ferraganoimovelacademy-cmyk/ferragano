import { describe, expect, it } from "vitest";
import {
  GESTAO_ROLES,
  READ_MODELS,
  readModelLabels,
  origemLabels,
  isGestaoRole,
  num,
  moeda,
  numero,
  percentual,
  severidadeCores,
  type Severidade,
} from "../insights";

describe("insights: completude de labels", () => {
  it("todo read model tem label", () => {
    for (const v of READ_MODELS) expect(readModelLabels[v]).toBeTruthy();
  });
  it("toda origem conhecida tem label", () => {
    for (const o of ["instagram", "facebook", "google", "indicacao", "site", "portal", "whatsapp", "evento", "outro"]) {
      expect(origemLabels[o]).toBeTruthy();
    }
  });
  it("toda severidade tem classe de cor", () => {
    const severidades: Severidade[] = ["ok", "atencao", "critico"];
    for (const s of severidades) expect(severidadeCores[s]).toBeTruthy();
  });
});

describe("isGestaoRole", () => {
  it("true para papéis de gestão", () => {
    for (const r of GESTAO_ROLES) expect(isGestaoRole([r])).toBe(true);
  });
  it("false para papel não-gestão", () => {
    expect(isGestaoRole(["corretor"])).toBe(false);
  });
  it("false para lista vazia, null ou undefined", () => {
    expect(isGestaoRole([])).toBe(false);
    expect(isGestaoRole(null)).toBe(false);
    expect(isGestaoRole(undefined)).toBe(false);
  });
});

describe("num", () => {
  it("retorna null para null/undefined", () => {
    expect(num(null)).toBeNull();
    expect(num(undefined)).toBeNull();
  });
  it("mantém número já numérico", () => {
    expect(num(42)).toBe(42);
  });
  it("converte string numérica (formato PostgREST) para number", () => {
    expect(num("42.5")).toBe(42.5);
  });
});

describe("formatadores", () => {
  it("moeda: travessão para ausente, BRL sem decimais para valor", () => {
    expect(moeda(null)).toBe("—");
    expect(moeda(undefined)).toBe("—");
    expect(moeda(1000)).toContain("R$");
    expect(moeda(1000)).toContain("1.000");
  });

  it("numero: travessão para ausente, formata separador de milhar", () => {
    expect(numero(null)).toBe("—");
    expect(numero(1234567)).toBe("1.234.567");
  });

  it("percentual: travessão para ausente, sufixo % com 1 casa decimal", () => {
    expect(percentual(null)).toBe("—");
    expect(percentual(12.345)).toBe("12,3%");
    expect(percentual(0)).toBe("0%");
  });
});
