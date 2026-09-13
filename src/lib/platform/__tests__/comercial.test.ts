import { describe, expect, it } from "vitest";
import {
  LEAD_ESTAGIOS,
  LEAD_ORIGENS,
  LEAD_TEMPERATURAS,
  EMPREENDIMENTO_STATUS,
  EMPREENDIMENTO_SEGMENTOS,
  UNIDADE_STATUS,
  PROPOSTA_STATUS,
  estagioLabels,
  origemLabels,
  temperaturaLabels,
  empStatusLabels,
  segmentoLabels,
  unidadeStatusLabels,
  propostaStatusLabels,
  calcularScore,
  temperaturaPorScore,
  formatBRL,
  slugify,
} from "../comercial";

describe("comercial: completude de labels", () => {
  it("todo estágio de lead tem label", () => {
    for (const v of LEAD_ESTAGIOS) expect(estagioLabels[v]).toBeTruthy();
  });
  it("toda origem de lead tem label", () => {
    for (const v of LEAD_ORIGENS) expect(origemLabels[v]).toBeTruthy();
  });
  it("toda temperatura tem label", () => {
    for (const v of LEAD_TEMPERATURAS) expect(temperaturaLabels[v]).toBeTruthy();
  });
  it("todo status de empreendimento tem label", () => {
    for (const v of EMPREENDIMENTO_STATUS) expect(empStatusLabels[v]).toBeTruthy();
  });
  it("todo segmento tem label", () => {
    for (const v of EMPREENDIMENTO_SEGMENTOS) expect(segmentoLabels[v]).toBeTruthy();
  });
  it("todo status de unidade tem label", () => {
    for (const v of UNIDADE_STATUS) expect(unidadeStatusLabels[v]).toBeTruthy();
  });
  it("todo status de proposta tem label", () => {
    for (const v of PROPOSTA_STATUS) expect(propostaStatusLabels[v]).toBeTruthy();
  });
});

describe("calcularScore", () => {
  const base = {
    origem: "outro" as const,
    temperatura: "frio" as const,
    temTelefone: false,
    temEmail: false,
    temEmpreendimento: false,
    valorEstimado: null,
  };

  it("caso mínimo (origem outro, frio, sem nada)", () => {
    expect(calcularScore(base)).toBe(10); // 5 (outro) + 5 (frio)
  });

  it("caso máximo satura em 100", () => {
    const score = calcularScore({
      origem: "indicacao",
      temperatura: "quente",
      temTelefone: true,
      temEmail: true,
      temEmpreendimento: true,
      valorEstimado: 500000,
    });
    // 25 + 35 + 15 + 5 + 10 + 10 = 100
    expect(score).toBe(100);
  });

  it("nunca ultrapassa 100 mesmo com múltiplos bônus", () => {
    const score = calcularScore({
      origem: "indicacao",
      temperatura: "quente",
      temTelefone: true,
      temEmail: true,
      temEmpreendimento: true,
      valorEstimado: 999999,
    });
    expect(score).toBeLessThanOrEqual(100);
  });

  it("nunca fica negativo (piso 0)", () => {
    const score = calcularScore(base);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("valorEstimado nulo ou zero não soma pontos", () => {
    const semValor = calcularScore({ ...base, valorEstimado: null });
    const zero = calcularScore({ ...base, valorEstimado: 0 });
    const negativo = calcularScore({ ...base, valorEstimado: -100 });
    expect(semValor).toBe(zero);
    expect(zero).toBe(negativo);
  });

  it("valorEstimado positivo soma 10 pontos", () => {
    const semValor = calcularScore({ ...base, valorEstimado: null });
    const comValor = calcularScore({ ...base, valorEstimado: 1 });
    expect(comValor - semValor).toBe(10);
  });

  it("cada origem soma o peso correto (diferença isolada)", () => {
    const semTelefone = calcularScore({ ...base, origem: "indicacao" });
    const outro = calcularScore({ ...base, origem: "outro" });
    expect(semTelefone - outro).toBe(20); // 25 - 5
  });
});

describe("temperaturaPorScore", () => {
  it("score < 40 é frio", () => {
    expect(temperaturaPorScore(0)).toBe("frio");
    expect(temperaturaPorScore(39)).toBe("frio");
  });
  it("score entre 40 e 69 é morno (limites inclusive/exclusive)", () => {
    expect(temperaturaPorScore(40)).toBe("morno");
    expect(temperaturaPorScore(69)).toBe("morno");
  });
  it("score >= 70 é quente", () => {
    expect(temperaturaPorScore(70)).toBe("quente");
    expect(temperaturaPorScore(100)).toBe("quente");
  });
});

describe("formatBRL", () => {
  it("retorna travessão para null/undefined", () => {
    expect(formatBRL(null)).toBe("—");
    expect(formatBRL(undefined)).toBe("—");
  });
  it("formata valor em BRL sem casas decimais", () => {
    const out = formatBRL(1500);
    expect(out).toContain("1.500");
    expect(out).toMatch(/R\$/);
  });
  it("formata zero normalmente (não é tratado como ausência)", () => {
    expect(formatBRL(0)).not.toBe("—");
  });
});

describe("slugify", () => {
  it("remove acentos e caixa alta", () => {
    expect(slugify("São Paulo")).toBe("sao-paulo");
  });
  it("substitui caracteres especiais por hífen e remove bordas", () => {
    expect(slugify("--Ótimo Imóvel!!--")).toBe("otimo-imovel");
  });
  it("limita a 60 caracteres", () => {
    const longo = "a".repeat(100);
    expect(slugify(longo).length).toBeLessThanOrEqual(60);
  });
});
