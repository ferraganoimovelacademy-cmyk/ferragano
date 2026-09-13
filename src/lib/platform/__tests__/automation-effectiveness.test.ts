import { describe, expect, it } from "vitest";
import {
  resumoEfetividade,
  statusDaRegra,
  taxaEntrega,
  type AutomationEffectivenessRow,
} from "@/lib/platform/automation";

const base: AutomationEffectivenessRow = {
  ruleId: "r1",
  nome: "Tarefa ao criar oportunidade",
  eventType: "opportunity.created",
  acao: "task",
  canal: "interno",
  ativa: true,
  total: 0,
  entregues: 0,
  falhou: 0,
  pendentes: 0,
  descartados: 0,
  tentativasMedia: 0,
  latenciaMediaSegundos: 0,
  ultimaExecucao: null,
  ultimoErro: null,
};

const linha = (p: Partial<AutomationEffectivenessRow>) => ({ ...base, ...p });

describe("taxaEntrega", () => {
  it("ignora o que ainda está na fila", () => {
    expect(
      taxaEntrega(linha({ total: 12, entregues: 8, falhou: 2, pendentes: 2 })),
    ).toBeCloseTo(0.8);
  });

  it("é nula quando nada saiu da fila", () => {
    expect(taxaEntrega(linha({ total: 3, pendentes: 3 }))).toBeNull();
  });
});

describe("statusDaRegra", () => {
  it("marca regra desligada como inativa antes de qualquer métrica", () => {
    expect(statusDaRegra(linha({ ativa: false, falhou: 5, total: 5 }))).toBe("inativa");
  });

  it("distingue regra silenciosa de regra saudável", () => {
    expect(statusDaRegra(linha({ total: 0 }))).toBe("sem_dados");
    expect(statusDaRegra(linha({ total: 10, entregues: 10 }))).toBe("ok");
  });

  it("qualquer falha definitiva é crítica", () => {
    expect(statusDaRegra(linha({ total: 10, entregues: 9, falhou: 1 }))).toBe("critico");
  });

  it("entrega abaixo de 95% é atenção", () => {
    expect(statusDaRegra(linha({ total: 100, entregues: 90, descartados: 10 }))).toBe("atencao");
  });

  it("fila acumulada acima de 20 é atenção", () => {
    expect(statusDaRegra(linha({ total: 30, entregues: 5, pendentes: 25 }))).toBe("atencao");
  });
});

describe("resumoEfetividade", () => {
  it("agrega volumes, regras silenciosas e críticas", () => {
    const r = resumoEfetividade([
      linha({ ruleId: "a", total: 10, entregues: 10 }),
      linha({ ruleId: "b", total: 4, entregues: 3, falhou: 1 }),
      linha({ ruleId: "c" }),
      linha({ ruleId: "d", ativa: false, total: 2, entregues: 2 }),
    ]);

    expect(r.regras).toBe(4);
    expect(r.regrasAtivas).toBe(3);
    expect(r.regrasSilenciosas).toBe(1);
    expect(r.regrasCriticas).toBe(1);
    expect(r.total).toBe(16);
    expect(r.taxaEntrega).toBeCloseTo(15 / 16);
  });

  it("não inventa taxa sem execuções", () => {
    expect(resumoEfetividade([]).taxaEntrega).toBeNull();
  });
});
