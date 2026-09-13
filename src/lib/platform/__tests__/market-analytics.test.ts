import { describe, expect, it } from "vitest";
import {
  AMOSTRA_MINIMA,
  correlacionar,
  deslocarCompetencia,
  inclinacao,
  medirLag,
  montarMarketAnalytics,
  parear,
  pearson,
  pValorPearson,
  recortarJanela,
  serieDeContagem,
  serieDeMedia,
  type SerieMensal,
} from "@/lib/platform/market-analytics";

const AGORA = new Date("2026-07-15T12:00:00.000Z");

const competencias = (n: number, inicio = 1, ano = 2024) =>
  Array.from({ length: n }, (_, i) => {
    const total = ano * 12 + (inicio - 1) + i;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
  });

const serie = (
  chave: string,
  valores: number[],
  origem: "externo" | "interno" = "externo",
): SerieMensal => ({
  chave,
  nome: chave === "selic_meta" ? "Selic meta" : chave,
  unidade: origem === "externo" ? "% a.a." : "un/mês",
  origem,
  pontos: competencias(valores.length).map((referencia, i) => ({
    referencia,
    valor: valores[i] as number,
  })),
});

describe("market-analytics — estatística", () => {
  it("mede correlação perfeita positiva e negativa", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBe(1);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBe(-1);
  });

  it("série constante não tem correlação definida", () => {
    expect(pearson([1, 1, 1, 1], [1, 2, 3, 4])).toBeNull();
  });

  it("amostra menor que 3 não gera coeficiente", () => {
    expect(pearson([1, 2], [2, 4])).toBeNull();
  });

  it("p-valor cai conforme a correlação e a amostra crescem", () => {
    const fraco = pValorPearson(0.2, 12) as number;
    const forte = pValorPearson(0.9, 12) as number;
    expect(forte).toBeLessThan(0.001);
    expect(fraco).toBeGreaterThan(0.05);
    expect(pValorPearson(0.6, 12)!).toBeGreaterThan(pValorPearson(0.6, 30)!);
  });

  it("inclinação mede a variação de y por unidade de x", () => {
    expect(inclinacao([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(10, 6);
  });
});

describe("market-analytics — pareamento e defasagem", () => {
  it("desloca competência atravessando o ano", () => {
    expect(deslocarCompetencia("2025-11", 3)).toBe("2026-02");
    expect(deslocarCompetencia("2026-01", 0)).toBe("2026-01");
  });

  it("pareia externo(t) com interno(t + lag), nunca o contrário", () => {
    const externa = serie("selic_meta", [10, 11, 12]);
    const interna = serie("visitas", [30, 20, 10], "interno");
    const pares = parear(externa, interna, 1);
    expect(pares).toHaveLength(2);
    expect(pares[0]).toEqual({ referencia: "2024-01", externo: 10, interno: 20 });
  });

  it("competência sem par do outro lado é descartada", () => {
    const externa = serie("selic_meta", [10, 11, 12, 13]);
    const interna: SerieMensal = { ...serie("visitas", [1], "interno") };
    expect(parear(externa, interna, 0)).toHaveLength(1);
  });
});

describe("market-analytics — leitura por defasagem", () => {
  const crescente = Array.from({ length: 24 }, (_, i) => 8 + i * 0.25);
  const caindo = crescente.map((v) => 200 - v * 4);

  it("abaixo da amostra mínima não conclui nada", () => {
    const l = medirLag(serie("selic_meta", crescente.slice(0, 6)), serie("visitas", caindo.slice(0, 6), "interno"), 0);
    expect(l.forca).toBe("sem_evidencia");
    expect(l.coeficiente).toBeNull();
    expect(l.motivoAusencia).toContain(`mínimo de ${AMOSTRA_MINIMA}`);
  });

  it("relação inversa forte é reportada como negativa", () => {
    const l = medirLag(serie("selic_meta", crescente), serie("visitas", caindo, "interno"), 0);
    expect(l.forca).toBe("forte");
    expect(l.direcao).toBe("negativa");
    expect(l.coeficiente).toBeCloseTo(-1, 3);
    expect(l.confiancaPct).toBeGreaterThan(99);
  });

  it("ruído não vira evidência", () => {
    const ruido = [3, -1, 4, -1, 5, -9, 2, 6, -5, 3, 5, -8, 9, 7, -9, 3, 2, 3, -8, 4, 6, -2, 6, 4];
    const l = medirLag(serie("selic_meta", ruido), serie("visitas", ruido.slice().reverse(), "interno"), 0);
    expect(l.forca).toBe("sem_evidencia");
    expect(l.motivoAusencia).toBeDefined();
  });

  it("marca possível tendência comum quando só o nível correlaciona", () => {
    const l = medirLag(serie("selic_meta", crescente), serie("visitas", crescente.map((v, i) => v * 2 + (i % 2 ? 9 : -9)), "interno"), 0);
    expect(l.forca).not.toBe("sem_evidencia");
    expect(l.alertaTendencia).toBe(true);
  });

  it("expõe a defasagem em dias, não só em competências", () => {
    expect(medirLag(serie("selic_meta", crescente), serie("visitas", caindo, "interno"), 3).lagDias).toBe(90);
  });
});

describe("market-analytics — correlação de um par", () => {
  const externa = serie("selic_meta", Array.from({ length: 30 }, (_, i) => 8 + i * 0.2));
  const internaComLag2: SerieMensal = {
    ...serie(
      "visitas",
      Array.from({ length: 30 }, (_, i) => (i < 2 ? 100 : 300 - (8 + (i - 2) * 0.2) * 10)),
      "interno",
    ),
  };

  it("avalia as quatro defasagens", () => {
    const c = correlacionar(externa, internaComLag2, 30);
    expect(c.leituras.map((l) => l.lagDias)).toEqual([0, 30, 60, 90]);
    expect(c.base).toBe("evidencia_historica");
  });

  it("escolhe a defasagem de maior coeficiente com evidência", () => {
    const c = correlacionar(externa, internaComLag2, 30);
    expect(c.melhor?.lagMeses).toBe(2);
    expect(c.narrativa).toContain("defasagem de 60 dias");
  });

  it("a narrativa nunca afirma causa e sempre declara a amostra", () => {
    const c = correlacionar(externa, internaComLag2, 30);
    expect(c.narrativa).toContain("não é causa");
    expect(c.narrativa).toMatch(/amostra \d+ meses/);
  });

  it("sem evidência a narrativa admite a ausência", () => {
    const c = correlacionar(serie("cdi", [1, 2, 3]), serie("vendas", [1, 2, 3], "interno"), 24);
    expect(c.melhor).toBeNull();
    expect(c.narrativa).toContain("Sem evidência histórica suficiente");
  });
});

describe("market-analytics — agregação e séries", () => {
  it("conta eventos por competência", () => {
    const s = serieDeContagem("visitas", "Visitas", "un/mês", [
      "2026-05-03T10:00:00Z",
      "2026-05-20T10:00:00Z",
      "2026-06-01T10:00:00Z",
    ]);
    expect(s.pontos).toEqual([
      { referencia: "2026-05-01", valor: 2 },
      { referencia: "2026-06-01", valor: 1 },
    ]);
    expect(s.origem).toBe("interno");
  });

  it("média mensal ignora valor ausente, não conta como zero", () => {
    const s = serieDeMedia("ticket", "Ticket", "R$", [
      { data: "2026-05-03T10:00:00Z", valor: 400000 },
      { data: "2026-05-09T10:00:00Z", valor: null },
      { data: "2026-05-19T10:00:00Z", valor: 600000 },
    ]);
    expect(s.pontos[0]?.valor).toBe(500000);
  });

  it("recorta a janela mantendo as competências mais recentes", () => {
    const s = serie("selic_meta", [1, 2, 3, 4, 5]);
    expect(recortarJanela(s, 2).pontos.map((p) => p.valor)).toEqual([4, 5]);
  });

  it("panorama ordena por evidência e mede a cobertura de pares", () => {
    const externa = serie("selic_meta", Array.from({ length: 24 }, (_, i) => 8 + i * 0.25));
    const forte = serie("visitas", Array.from({ length: 24 }, (_, i) => 200 - i * 3), "interno");
    const curta = serie("vendas", [1, 2, 3], "interno");

    const a = montarMarketAnalytics([externa], [forte, curta], 24, AGORA);
    expect(a.paresAvaliados).toBe(2);
    expect(a.paresComEvidencia).toBe(1);
    expect(a.correlacoes[0]?.interno.chave).toBe("visitas");
    expect(a.geradoEm).toBe(AGORA.toISOString());
  });

  it("sem séries não quebra", () => {
    const a = montarMarketAnalytics([], [], 24, AGORA);
    expect(a.paresAvaliados).toBe(0);
    expect(a.amostraMinima).toBe(0);
  });
});
