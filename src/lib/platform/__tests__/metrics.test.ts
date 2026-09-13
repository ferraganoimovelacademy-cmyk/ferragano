import { describe, expect, it } from "vitest";
import {
  HEALTH_WEIGHTS,
  PERFORMANCE_BUDGETS,
  bloqueiaRelease,
  budgetByKey,
  calcularHealthScore,
  classificarBudget,
  formatBudgetValor,
  formatBytes,
  medicoesPorChave,
  notaDeOperacao,
  notaDePerformance,
  taxaDeConversao,
  tierDoScore,
  type HealthDimension,
} from "@/lib/platform/metrics";

describe("GATE A5 — orçamento de performance", () => {
  it("declara meta única por chave, sem duplicidade", () => {
    const keys = PERFORMANCE_BUDGETS.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("classifica dentro, atenção e estourado para meta de teto", () => {
    const lcp = budgetByKey["web.lcp"]!;
    expect(classificarBudget(lcp, 1200)).toBe("dentro");
    expect(classificarBudget(lcp, 2200)).toBe("atencao");
    expect(classificarBudget(lcp, 2600)).toBe("estourado");
  });

  it("inverte a regra quando maior é melhor (FPS)", () => {
    const fps = budgetByKey["kanban.fps"]!;
    expect(classificarBudget(fps, 60)).toBe("dentro");
    expect(classificarBudget(fps, 57)).toBe("atencao");
    expect(classificarBudget(fps, 40)).toBe("estourado");
  });

  it("não inventa nota sem medição", () => {
    expect(classificarBudget(budgetByKey["web.fcp"]!, null)).toBe("sem_dado");
    expect(notaDePerformance({})).toBeNull();
  });

  it("bloqueia release apenas em orçamento bloqueante estourado", () => {
    expect(bloqueiaRelease({ "kanban.fps": 30 }).bloqueado).toBe(false);
    const r = bloqueiaRelease({ "query.customer_360": 900 });
    expect(r.bloqueado).toBe(true);
    expect(r.violacoes).toContain("People 360");
  });

  it("formata valor conforme unidade", () => {
    expect(formatBudgetValor("ms", 250)).toBe("250 ms");
    expect(formatBudgetValor("ms", 30_000)).toBe("30.0 s");
    expect(formatBudgetValor("kb", 287.4)).toBe("287 KB");
    expect(formatBudgetValor("fps", 60)).toBe("60 FPS");
    expect(formatBudgetValor("ms", null)).toBe("—");
  });

  it("usa p95 e cai para média quando p95 falta", () => {
    const medicoes = medicoesPorChave([
      { metric_name: "web.lcp", metric_type: "latencia", amostras: 10, media: 1000, p95: 1800, maximo: 2000, ultimo_em: null },
      { metric_name: "web.fcp", metric_type: "latencia", amostras: 3, media: 900, p95: null, maximo: 1200, ultimo_em: null },
    ]);
    expect(medicoes["web.lcp"]).toBe(1800);
    expect(medicoes["web.fcp"]).toBe(900);
  });

  it("média das medições vira nota de performance", () => {
    expect(notaDePerformance({ "web.lcp": 1000, "web.fcp": 1000 })).toBe(100);
    expect(notaDePerformance({ "web.lcp": 3000, "web.fcp": 1000 })).toBe(50);
  });
});

describe("Ferragano Health Score", () => {
  const notas = (v: number) =>
    Object.fromEntries(
      (Object.keys(HEALTH_WEIGHTS) as HealthDimension[]).map((d) => [d, v]),
    ) as Record<HealthDimension, number>;

  it("soma dos pesos é 100", () => {
    expect(Object.values(HEALTH_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("nota cheia gera 100 Platinum", () => {
    const r = calcularHealthScore(notas(100));
    expect(r.score).toBe(100);
    expect(r.tier).toBe("platinum");
  });

  it("pondera cada dimensão pelo peso declarado", () => {
    const r = calcularHealthScore({ ...notas(100), performance: 0 });
    expect(r.score).toBe(80);
    expect(r.contribuicoes.find((c) => c.dimensao === "performance")?.pontos).toBe(0);
  });

  it("limita nota fora da faixa 0–100", () => {
    expect(calcularHealthScore({ ...notas(0), arquitetura: 500 }).score).toBe(20);
  });

  it("faixas de certificação seguem a tabela da Sprint 11", () => {
    expect(tierDoScore(96)).toBe("platinum");
    expect(tierDoScore(95)).toBe("gold");
    expect(tierDoScore(90)).toBe("gold");
    expect(tierDoScore(89)).toBe("silver");
    expect(tierDoScore(79)).toBe("action_required");
  });
});

describe("Operação e formatação", () => {
  it("plataforma limpa vale 100 de operação", () => {
    expect(
      notaDeOperacao({ outboxFalhou: 0, outboxPendente: 3, cronFalhas: 0, cronExecucoes: 120 }),
    ).toBe(100);
  });

  it("cron parado e job falho derrubam a nota", () => {
    expect(
      notaDeOperacao({ outboxFalhou: 2, outboxPendente: 0, cronFalhas: 1, cronExecucoes: 0 }),
    ).toBe(30);
    expect(
      notaDeOperacao({ outboxFalhou: 99, outboxPendente: 99, cronFalhas: 99, cronExecucoes: 0 }),
    ).toBe(0);
  });

  it("conversão só considera oportunidades fechadas", () => {
    expect(taxaDeConversao(0, 0)).toBe(0);
    expect(taxaDeConversao(3, 1)).toBe(75);
  });

  it("formata volume de arquivos", () => {
    expect(formatBytes(0)).toBe("0 KB");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});