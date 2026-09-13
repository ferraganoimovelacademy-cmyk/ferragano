import { describe, expect, it } from "vitest";
import {
  conversaoBaseline,
  conversionLift,
  recomendacoesAutomacao,
  resumoInteligencia,
  saudeDaRegra,
  taxaFalha,
  tempoEconomizadoHoras,
  type AutomationIntelligence,
  type AutomationIntelligenceRule,
} from "@/lib/platform/automation-intelligence";

const base: AutomationIntelligenceRule = {
  ruleId: "r1",
  nome: "Follow-up 48h",
  eventType: "proposal.sent",
  acao: "task",
  canal: "interno",
  ativa: true,
  dias: 30,
  execucoes: 0,
  entregues: 0,
  falhou: 0,
  descartados: 0,
  pendentes: 0,
  latenciaMediaSegundos: 0,
  tempoEconomizadoSegundos: 0,
  oportunidadesTocadas: 0,
  conversoes: 0,
  ultimaExecucao: null,
};

const regra = (p: Partial<AutomationIntelligenceRule>) => ({ ...base, ...p });

const dados = (
  regras: AutomationIntelligenceRule[],
  baseline = { oportunidades: 100, ganhas: 20 },
): AutomationIntelligence => ({
  janelaDias: 30,
  desde: "2026-07-01",
  baseline,
  regras,
  geradoEm: "2026-07-31T00:00:00Z",
});

describe("conversaoBaseline", () => {
  it("não inventa taxa sem oportunidades", () => {
    expect(conversaoBaseline({ oportunidades: 0, ganhas: 0 })).toBeNull();
  });

  it("usa ganhas sobre o total da janela", () => {
    expect(conversaoBaseline({ oportunidades: 50, ganhas: 10 })).toBeCloseTo(0.2);
  });
});

describe("conversionLift", () => {
  it("exige amostra mínima antes de afirmar diferença", () => {
    expect(
      conversionLift(regra({ oportunidadesTocadas: 9, conversoes: 9 }), {
        oportunidades: 100,
        ganhas: 20,
      }),
    ).toBeNull();
  });

  it("mede o ganho contra a base do workspace", () => {
    const r = conversionLift(regra({ oportunidadesTocadas: 50, conversoes: 17 }), {
      oportunidades: 100,
      ganhas: 20,
    });
    expect(r?.taxaRegra).toBeCloseTo(0.34);
    expect(r?.lift).toBeCloseTo(0.14);
  });

  it("aceita lift negativo — automação pode piorar o resultado", () => {
    const r = conversionLift(regra({ oportunidadesTocadas: 20, conversoes: 2 }), {
      oportunidades: 100,
      ganhas: 20,
    });
    expect(r!.lift).toBeLessThan(0);
  });
});

describe("tempoEconomizadoHoras / taxaFalha", () => {
  it("converte segundos poupados em horas", () => {
    expect(tempoEconomizadoHoras(regra({ tempoEconomizadoSegundos: 7200 }))).toBeCloseTo(2);
  });

  it("é nula enquanto nada saiu da fila", () => {
    expect(taxaFalha(regra({ execucoes: 5, pendentes: 5 }))).toBeNull();
  });
});

describe("saudeDaRegra", () => {
  it("regra sem execução na janela é morta", () => {
    expect(saudeDaRegra(regra({}))).toBe("morta");
  });

  it("falha a partir de 10% é suspeita", () => {
    expect(saudeDaRegra(regra({ execucoes: 10, entregues: 9, falhou: 1 }))).toBe("suspeita");
  });

  it("volume fora de escala é suspeita", () => {
    expect(saudeDaRegra(regra({ dias: 2, execucoes: 400, entregues: 400 }))).toBe("suspeita");
  });

  it("dispara raramente é baixa atividade", () => {
    expect(saudeDaRegra(regra({ execucoes: 2, entregues: 2 }))).toBe("baixa_atividade");
  });

  it("volume normal e sem falha é saudável", () => {
    expect(saudeDaRegra(regra({ execucoes: 40, entregues: 40 }))).toBe("saudavel");
  });
});

describe("recomendacoesAutomacao", () => {
  it("aponta falha, silêncio, congestionamento e ganho", () => {
    const msgs = recomendacoesAutomacao(
      dados([
        regra({ ruleId: "a", nome: "Falhona", execucoes: 10, entregues: 7, falhou: 3 }),
        regra({ ruleId: "b", nome: "Silenciosa" }),
        regra({ ruleId: "c", nome: "Cheia", execucoes: 40, entregues: 10, pendentes: 30 }),
        regra({
          ruleId: "d",
          nome: "Boa",
          execucoes: 60,
          entregues: 60,
          oportunidadesTocadas: 50,
          conversoes: 17,
        }),
      ]),
    ).map((r) => r.mensagem);

    expect(msgs.some((m) => m.includes("falhou 30%"))).toBe(true);
    expect(msgs.some((m) => m.includes("nunca foi executada"))).toBe(true);
    expect(msgs.some((m) => m.includes("30 efeitos na fila"))).toBe(true);
    expect(msgs.some((m) => m.includes("aumentou a conversão em 14"))).toBe(true);
  });

  it("sugere consolidar regras duplicadas no mesmo gatilho", () => {
    const r = recomendacoesAutomacao(
      dados([
        regra({ ruleId: "a", nome: "A", execucoes: 10, entregues: 10 }),
        regra({ ruleId: "b", nome: "B", execucoes: 10, entregues: 10 }),
      ]),
    );
    expect(r.some((x) => x.mensagem.includes("consolidar"))).toBe(true);
  });

  it("não gera ruído para regra desligada que já executou", () => {
    const r = recomendacoesAutomacao(
      dados([regra({ ativa: false, execucoes: 10, entregues: 5, falhou: 5 })]),
    );
    expect(r).toHaveLength(0);
  });
});

describe("resumoInteligencia", () => {
  it("consolida ROI, mortas e suspeitas", () => {
    const r = resumoInteligencia(
      dados([
        regra({
          ruleId: "a",
          execucoes: 60,
          entregues: 60,
          tempoEconomizadoSegundos: 7200,
          oportunidadesTocadas: 40,
          conversoes: 14,
        }),
        regra({ ruleId: "b" }),
        regra({ ruleId: "c", execucoes: 10, entregues: 8, falhou: 2 }),
      ]),
    );

    expect(r.regrasMortas).toBe(1);
    expect(r.regrasSuspeitas).toBe(1);
    expect(r.horasEconomizadas).toBeCloseTo(2);
    expect(r.taxaTocadas).toBeCloseTo(0.35);
    expect(r.lift).toBeCloseTo(0.15);
  });

  it("sem amostra, não há lift", () => {
    expect(resumoInteligencia(dados([regra({})])).lift).toBeNull();
  });
});
