import { describe, expect, it } from "vitest";
import type { RecomendacaoPriorizada } from "@/lib/platform/decision-intelligence";
import {
  AMOSTRA_MINIMA_PRECISAO,
  chaveRecomendacao,
  impactoEsperado,
  paraMemoria,
  precisaoRecomendacoes,
  proximosStatus,
  quadranteDe,
  rankearRecomendacoes,
  resultadoAprendido,
  taxaAceitacao,
  taxaImplementacao,
  tiposIgnorados,
  urgencia,
  type RecommendationQuality,
} from "@/lib/platform/recommendation";

function rec(over: Partial<RecomendacaoPriorizada> = {}): RecomendacaoPriorizada {
  return {
    ruleId: over.ruleId ?? "11111111-1111-4111-8111-111111111111",
    nome: over.nome ?? "Follow-up 48h",
    tipo: over.tipo ?? "revisar_gatilho",
    score: over.score ?? 60,
    confianca: over.confianca ?? 95,
    mensagem: over.mensagem ?? "falhou em 20% dos efeitos",
    forecast: over.forecast ?? { texto: "recupera 20 h/mês", horasMes: 20, reducao: 0.2 },
  };
}

function qualidade(over: Partial<RecommendationQuality> = {}): RecommendationQuality {
  return {
    janelaDias: 90,
    desde: "2026-05-01T00:00:00Z",
    total: over.total ?? 20,
    vistas: over.vistas ?? 20,
    aceitas: over.aceitas ?? 10,
    implementadas: over.implementadas ?? 8,
    descartadas: over.descartadas ?? 4,
    avaliadas: over.avaliadas ?? 8,
    melhoraram: over.melhoraram ?? 6,
    neutras: over.neutras ?? 1,
    pioraram: over.pioraram ?? 1,
    porTipo: over.porTipo ?? [],
    geradoEm: "2026-07-31T00:00:00Z",
  };
}

describe("GATE 02 — impacto e urgência", () => {
  it("impacto sobe com horas/mês afetadas e confiança", () => {
    const alto = impactoEsperado(
      rec({ forecast: { texto: "", horasMes: 40, reducao: null }, confianca: 100 }),
    );
    const baixo = impactoEsperado(
      rec({ forecast: { texto: "", horasMes: 2, reducao: null }, confianca: 100, score: 10 }),
    );
    expect(alto).toBeGreaterThan(baixo);
  });

  it("evidência fraca não infla impacto acima do piso do score", () => {
    const semConfianca = impactoEsperado(
      rec({ forecast: { texto: "", horasMes: 40, reducao: null }, confianca: 0, score: 20 }),
    );
    expect(semConfianca).toBe(10);
  });

  it("urgência é maior para falha do que para consolidação", () => {
    expect(urgencia(rec({ tipo: "revisar_gatilho" }))).toBeGreaterThan(
      urgencia(rec({ tipo: "consolidar" })),
    );
  });

  it("quadrantes seguem a matriz impacto × urgência", () => {
    expect(quadranteDe(80, 80)).toBe("agir_agora");
    expect(quadranteDe(80, 10)).toBe("planejar");
    expect(quadranteDe(10, 80)).toBe("delegar");
    expect(quadranteDe(10, 10)).toBe("monitorar");
  });
});

describe("GATE 01 — ranking", () => {
  it("numera a fila e coloca a maior prioridade em primeiro", () => {
    const fila = rankearRecomendacoes([
      rec({ ruleId: "a", nome: "A", tipo: "consolidar", score: 20, confianca: 40 }),
      rec({
        ruleId: "b",
        nome: "B",
        tipo: "revisar_gatilho",
        score: 90,
        confianca: 98,
        forecast: { texto: "", horasMes: 60, reducao: 0.5 },
      }),
    ]);
    expect(fila[0]!.nome).toBe("B");
    expect(fila.map((f) => f.posicao)).toEqual([1, 2]);
    expect(fila[0]!.prioridade).toBeGreaterThan(fila[1]!.prioridade);
  });

  it("chave de memória é estável por tipo e regra", () => {
    expect(chaveRecomendacao(rec({ ruleId: "x", tipo: "eliminar" }))).toBe("eliminar:x");
  });

  it("payload de memória descarta ruleId que não é uuid (grupos consolidados)", () => {
    const itens = paraMemoria(
      rankearRecomendacoes([rec({ ruleId: "proposal.sent|task", tipo: "consolidar" })]),
    );
    expect(itens[0]!.ruleId).toBeNull();
    expect(itens[0]!.chave).toBe("consolidar:proposal.sent|task");
  });

  it("payload de memória preserva ruleId válido", () => {
    const itens = paraMemoria(rankearRecomendacoes([rec()]));
    expect(itens[0]!.ruleId).toBe("11111111-1111-4111-8111-111111111111");
  });
});

describe("GATE 03 — learning feedback", () => {
  it("problema encolheu = melhorou", () => {
    expect(resultadoAprendido(80, 40)).toBe("melhorou");
  });
  it("problema cresceu = piorou", () => {
    expect(resultadoAprendido(40, 80)).toBe("piorou");
  });
  it("variação pequena é neutra", () => {
    expect(resultadoAprendido(50, 45)).toBe("neutro");
  });
  it("sem baseline não inventa desfecho", () => {
    expect(resultadoAprendido(null, 45)).toBe("indefinido");
    expect(resultadoAprendido(45, null)).toBe("indefinido");
  });
});

describe("GATE 04 — ciclo de vida", () => {
  it("não permite pular etapas", () => {
    expect(proximosStatus("gerada")).toEqual(["aceita", "descartada"]);
    expect(proximosStatus("aceita")).toEqual(["implementada", "descartada"]);
    expect(proximosStatus("implementada")).toEqual(["arquivada"]);
    expect(proximosStatus("arquivada")).toEqual([]);
  });
});

describe("GATE 05 — qualidade do motor", () => {
  it("precisão é melhoraram / avaliadas", () => {
    expect(precisaoRecomendacoes(qualidade({ avaliadas: 8, melhoraram: 6 }))).toBeCloseTo(0.75);
  });

  it("amostra insuficiente devolve null, nunca zero", () => {
    expect(
      precisaoRecomendacoes(qualidade({ avaliadas: AMOSTRA_MINIMA_PRECISAO - 1, melhoraram: 0 })),
    ).toBeNull();
    expect(precisaoRecomendacoes(null)).toBeNull();
  });

  it("aceitação e implementação usam denominadores distintos", () => {
    const q = qualidade({ total: 20, aceitas: 10, implementadas: 8 });
    expect(taxaAceitacao(q)).toBeCloseTo(0.5);
    expect(taxaImplementacao(q)).toBeCloseTo(0.8);
  });

  it("aponta tipos sistematicamente ignorados", () => {
    const q = qualidade({
      porTipo: [
        { tipo: "consolidar", total: 10, aceitas: 1, implementadas: 0, avaliadas: 0, melhoraram: 0 },
        { tipo: "eliminar", total: 8, aceitas: 6, implementadas: 5, avaliadas: 5, melhoraram: 4 },
        { tipo: "ampliar", total: 2, aceitas: 0, implementadas: 0, avaliadas: 0, melhoraram: 0 },
      ],
    });
    expect(tiposIgnorados(q).map((t) => t.tipo)).toEqual(["consolidar"]);
  });
});