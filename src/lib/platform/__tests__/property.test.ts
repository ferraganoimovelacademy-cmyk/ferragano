import { describe, expect, it } from "vitest";
import {
  RELEASE_STATUS,
  KNOWLEDGE_TIPOS,
  MEDIA_TIPOS,
  PROPERTY_EVENTS,
  releaseStatusLabels,
  knowledgeTipoLabels,
  knowledgeTipoIcones,
  mediaTipoLabels,
  mediaTipoIcones,
  propertyEventLabels,
  variacao,
  scoreLiquidez,
  liquidezLabel,
} from "../property";

describe("property: completude de labels/ícones", () => {
  it("todo status de release tem label", () => {
    for (const v of RELEASE_STATUS) expect(releaseStatusLabels[v]).toBeTruthy();
  });
  it("todo tipo de conhecimento tem label e ícone", () => {
    for (const v of KNOWLEDGE_TIPOS) {
      expect(knowledgeTipoLabels[v]).toBeTruthy();
      expect(knowledgeTipoIcones[v]).toBeTruthy();
    }
  });
  it("todo tipo de mídia tem label e ícone", () => {
    for (const v of MEDIA_TIPOS) {
      expect(mediaTipoLabels[v]).toBeTruthy();
      expect(mediaTipoIcones[v]).toBeTruthy();
    }
  });
  it("todo evento de propriedade tem label", () => {
    for (const v of PROPERTY_EVENTS) expect(propertyEventLabels[v]).toBeTruthy();
  });
});

describe("variacao", () => {
  it("retorna null quando não há preço anterior ou é <= 0", () => {
    expect(variacao(null, 100)).toBeNull();
    expect(variacao(undefined, 100)).toBeNull();
    expect(variacao(0, 100)).toBeNull();
    expect(variacao(-10, 100)).toBeNull();
  });
  it("calcula variação percentual com 2 casas decimais", () => {
    expect(variacao(100, 110)).toBe(10);
    expect(variacao(300, 305)).toBe(1.67);
  });
  it("variação negativa quando preço cai", () => {
    expect(variacao(200, 150)).toBe(-25);
  });
});

describe("scoreLiquidez", () => {
  it("score base 50 sem nenhum atributo", () => {
    expect(scoreLiquidez({})).toBe(50);
  });
  it("preço bem abaixo da média (<=-10%) soma 20", () => {
    expect(scoreLiquidez({ preco: 90, precoMedio: 100 })).toBe(70);
  });
  it("preço um pouco abaixo da média (entre -10% e 0%) soma 10", () => {
    expect(scoreLiquidez({ preco: 95, precoMedio: 100 })).toBe(60);
  });
  it("preço acima da média (>10%) subtrai 20", () => {
    expect(scoreLiquidez({ preco: 115, precoMedio: 100 })).toBe(30);
  });
  it("preço levemente acima (0% a 10%) subtrai 5", () => {
    expect(scoreLiquidez({ preco: 105, precoMedio: 100 })).toBe(45);
  });
  it("soma bônus por dormitórios, vagas, varanda e andar alto", () => {
    const score = scoreLiquidez({ dormitorios: 3, vagas: 2, varanda: true, andar: 10 });
    expect(score).toBe(50 + 8 + 7 + 5 + 5);
  });
  it("nunca sai do intervalo 0-100", () => {
    expect(scoreLiquidez({ preco: 1000, precoMedio: 100 })).toBeLessThanOrEqual(100);
    expect(scoreLiquidez({ preco: 100, precoMedio: 100000 })).toBeGreaterThanOrEqual(0);
  });
});

describe("liquidezLabel", () => {
  it("classifica alta, média e baixa nos limites corretos", () => {
    expect(liquidezLabel(74).label).toBe("Liquidez média");
    expect(liquidezLabel(75).label).toBe("Alta liquidez");
    expect(liquidezLabel(49).label).toBe("Baixa liquidez");
    expect(liquidezLabel(50).label).toBe("Liquidez média");
  });
});
