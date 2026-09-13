import { describe, expect, it } from "vitest";
import type { AutomationIntelligence, AutomationIntelligenceRule } from "@/lib/platform/automation-intelligence";
import {
  automationConfidence,
  grafoDeRegras,
  priorizarRecomendacoes,
  resumoDecisionIntelligence,
  simularDesligarRegra,
} from "@/lib/platform/decision-intelligence";

function regra(over: Partial<AutomationIntelligenceRule> = {}): AutomationIntelligenceRule {
  return {
    ruleId: over.ruleId ?? "r1",
    nome: over.nome ?? "Follow-up 48h",
    eventType: over.eventType ?? "proposal.sent",
    acao: over.acao ?? "task",
    canal: over.canal ?? "interno",
    ativa: over.ativa ?? true,
    dias: over.dias ?? 90,
    execucoes: over.execucoes ?? 100,
    entregues: over.entregues ?? 100,
    falhou: over.falhou ?? 0,
    descartados: over.descartados ?? 0,
    pendentes: over.pendentes ?? 0,
    latenciaMediaSegundos: over.latenciaMediaSegundos ?? 12,
    tempoEconomizadoSegundos: over.tempoEconomizadoSegundos ?? 3600 * 10,
    oportunidadesTocadas: over.oportunidadesTocadas ?? 100,
    conversoes: over.conversoes ?? 30,
    ultimaExecucao: over.ultimaExecucao ?? "2026-07-01T00:00:00Z",
  };
}

function dados(regras: AutomationIntelligenceRule[], baseline = { oportunidades: 1000, ganhas: 200 }): AutomationIntelligence {
  return { janelaDias: 90, desde: "2026-05-01", baseline, regras, geradoEm: "2026-07-31T00:00:00Z" };
}

describe("GATE 01 — Automation Confidence", () => {
  it("mesma diferença tem mais confiança com amostra maior", () => {
    const pequena = automationConfidence(
      regra({ oportunidadesTocadas: 20, conversoes: 6 }),
      { oportunidades: 1000, ganhas: 200 },
    );
    const grande = automationConfidence(
      regra({ oportunidadesTocadas: 8000, conversoes: 2400 }),
      { oportunidades: 1000, ganhas: 200 },
    );
    expect(pequena).not.toBeNull();
    expect(grande).not.toBeNull();
    expect(pequena!.lift).toBeCloseTo(grande!.lift, 5);
    expect(grande!.confianca).toBeGreaterThan(pequena!.confianca);
    expect(grande!.sustentado).toBe(true);
    expect(pequena!.sustentado).toBe(false);
  });

  it("devolve null sem amostra mínima ou sem base", () => {
    expect(automationConfidence(regra({ oportunidadesTocadas: 5, conversoes: 2 }), { oportunidades: 1000, ganhas: 200 })).toBeNull();
    expect(automationConfidence(regra(), { oportunidades: 0, ganhas: 0 })).toBeNull();
  });

  it("confiança fica entre 0 e 100", () => {
    const c = automationConfidence(regra({ oportunidadesTocadas: 500, conversoes: 250 }), { oportunidades: 5000, ganhas: 500 });
    expect(c!.confianca).toBeGreaterThanOrEqual(0);
    expect(c!.confianca).toBeLessThanOrEqual(100);
  });
});

describe("GATES 02 e 03 — Recommendation Score e Impact Forecast", () => {
  it("ordena por score decrescente", () => {
    const recs = priorizarRecomendacoes(
      dados([
        regra({ ruleId: "a", nome: "Falhando", execucoes: 200, entregues: 100, falhou: 100 }),
        regra({ ruleId: "b", nome: "Fila", execucoes: 100, pendentes: 60 }),
      ]),
    );
    expect(recs.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1]!.score).toBeGreaterThanOrEqual(recs[i]!.score);
    }
    expect(recs[0]!.score).toBeLessThanOrEqual(100);
  });

  it("regra desligada gera eliminar com forecast de horas", () => {
    const recs = priorizarRecomendacoes(dados([regra({ ativa: false, execucoes: 0, tempoEconomizadoSegundos: 0 })]));
    expect(recs[0]!.tipo).toBe("eliminar");
    expect(recs[0]!.forecast.horasMes).toBe(0);
  });

  it("regras duplicadas geram consolidar com redução projetada", () => {
    const recs = priorizarRecomendacoes(
      dados([
        regra({ ruleId: "a", nome: "A", execucoes: 100 }),
        regra({ ruleId: "b", nome: "B", execucoes: 100 }),
      ]),
    );
    const consolidar = recs.find((r) => r.tipo === "consolidar");
    expect(consolidar).toBeDefined();
    expect(consolidar!.forecast.reducao).toBeCloseTo(0.5, 5);
  });

  it("lift sustentado gera ampliar", () => {
    const recs = priorizarRecomendacoes(
      dados([regra({ oportunidadesTocadas: 4000, conversoes: 1600 })]),
    );
    expect(recs.some((r) => r.tipo === "ampliar")).toBe(true);
  });

  it("fila acumulada gera alterar_delay", () => {
    const recs = priorizarRecomendacoes(dados([regra({ execucoes: 100, pendentes: 50 })]));
    expect(recs.some((r) => r.tipo === "alterar_delay")).toBe(true);
  });
});

describe("GATE 04 — Rule Dependencies", () => {
  it("liga regra de tarefa a regra disparada por task.created", () => {
    const g = grafoDeRegras(
      dados([
        regra({ ruleId: "a", acao: "task", eventType: "proposal.sent" }),
        regra({ ruleId: "b", acao: "notification", eventType: "task.created" }),
      ]),
    );
    expect(g.nos.find((n) => n.ruleId === "a")!.dispara).toEqual(["b"]);
    expect(g.nos.find((n) => n.ruleId === "b")!.disparadaPor).toEqual(["a"]);
    expect(g.loops).toHaveLength(0);
  });

  it("detecta loop de regra que dispara a si mesma", () => {
    const g = grafoDeRegras(dados([regra({ ruleId: "a", acao: "task", eventType: "task.created" })]));
    expect(g.loops.length).toBe(1);
    expect(g.nos[0]!.emLoop).toBe(true);
  });

  it("marca órfã a regra ativa sem ligação e sem execução", () => {
    const g = grafoDeRegras(dados([regra({ ruleId: "a", acao: "email", eventType: "sale.signed", execucoes: 0 })]));
    expect(g.orfas).toEqual(["a"]);
  });

  it("marca gargalo quando recebe disparo e acumula fila", () => {
    const g = grafoDeRegras(
      dados([
        regra({ ruleId: "a", acao: "task", eventType: "proposal.sent" }),
        regra({ ruleId: "b", acao: "email", eventType: "task.created", pendentes: 80 }),
      ]),
    );
    expect(g.gargalos).toEqual(["b"]);
  });
});

describe("GATE 05 — Automation Simulator", () => {
  it("não desliga regra com lift sustentado", () => {
    const s = simularDesligarRegra(dados([regra({ oportunidadesTocadas: 4000, conversoes: 1600 })]), "r1");
    expect(s!.veredito).toBe("nao_desligar");
  });

  it("não desliga regra com dependentes", () => {
    const s = simularDesligarRegra(
      dados([
        regra({ ruleId: "a", acao: "task", oportunidadesTocadas: 0, conversoes: 0 }),
        regra({ ruleId: "b", acao: "email", eventType: "task.created" }),
      ]),
      "a",
    );
    expect(s!.veredito).toBe("nao_desligar");
    expect(s!.dependentes).toEqual(["b"]);
  });

  it("libera desligar regra sem execuções", () => {
    const s = simularDesligarRegra(
      dados([regra({ acao: "email", execucoes: 0, oportunidadesTocadas: 0, conversoes: 0, tempoEconomizadoSegundos: 0 })]),
      "r1",
    );
    expect(s!.veredito).toBe("pode_desligar");
  });

  it("pede avaliação quando poupa horas sem lift comprovado", () => {
    const s = simularDesligarRegra(
      dados([
        regra({
          acao: "email",
          oportunidadesTocadas: 20,
          conversoes: 4,
          tempoEconomizadoSegundos: 3600 * 40,
        }),
      ]),
      "r1",
    );
    expect(s!.veredito).toBe("avaliar");
    expect(s!.horasEconomizadas).toBeCloseTo(40, 5);
  });

  it("devolve null para regra inexistente", () => {
    expect(simularDesligarRegra(dados([regra()]), "zzz")).toBeNull();
  });
});

describe("Resumo do painel", () => {
  it("consolida recomendações, confiança e grafo", () => {
    const r = resumoDecisionIntelligence(
      dados([
        regra({ ruleId: "a", oportunidadesTocadas: 4000, conversoes: 1600 }),
        regra({ ruleId: "b", nome: "Morta", acao: "email", execucoes: 0, oportunidadesTocadas: 0, conversoes: 0, tempoEconomizadoSegundos: 0 }),
      ]),
    );
    expect(r.recomendacoes).toBeGreaterThan(0);
    expect(r.regrasSustentadas).toBe(1);
    expect(r.orfas).toBe(1);
    expect(r.baseline).toBeCloseTo(0.2, 5);
  });
});