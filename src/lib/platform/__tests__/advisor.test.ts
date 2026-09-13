import { describe, expect, it } from "vitest";
import {
  ADVISOR_SYSTEM_PROMPT,
  classificarPrioridade,
  derivarSinais,
  montarPromptAdvisor,
  montarTarefaDaAcao,
  resumirAceite,
  type AdvisorSnapshot,
} from "@/lib/platform/advisor";

const saudavel: AdvisorSnapshot = {
  executivo: {
    oportunidadesAbertas: 40,
    ganhasMes: 6,
    novas30d: 30,
    pipelineTotal: 10_000_000,
    receitaPrevista: 4_000_000,
    valorGanhoMes: 2_000_000,
    tempoMedioCicloDias: 45,
    conversaoPercentual: 22,
    ticketMedio: 700_000,
    unidadesTotal: 100,
    unidadesDisponiveis: 60,
    vgvDisponivel: 40_000_000,
  },
  vendedores: [
    {
      responsavelId: "a",
      responsavelNome: "Ana",
      oportunidadesAbertas: 12,
      ganhas30d: 3,
      conversaoPercentual: 25,
      followupPerdido: 0,
      semProximaAcao: 0,
      slaEstourado: 0,
      tarefasAtrasadas: 0,
      diasSemAtividade: 1,
    },
  ],
  origens: [
    { origem: "indicacao", pessoas30d: 10, oportunidades30d: 8, ganhasTotal: 9, perdidasTotal: 3, valorGanho: 5_000_000 },
    { origem: "portal", pessoas30d: 40, oportunidades30d: 20, ganhasTotal: 2, perdidasTotal: 20, valorGanho: 900_000 },
  ],
};

const achar = (s: AdvisorSnapshot, codigo: string) =>
  derivarSinais(s).find((x) => x.codigo === codigo);

describe("derivarSinais", () => {
  it("workspace saudável não gera sinal crítico", () => {
    const sinais = derivarSinais(saudavel);
    expect(sinais.some((s) => s.severidade === "critico")).toBe(false);
    expect(achar(saudavel, "conversao")!.severidade).toBe("ok");
    expect(achar(saudavel, "ciclo")!.severidade).toBe("ok");
  });

  it("conversão muito baixa é crítica", () => {
    const s = { ...saudavel, executivo: { ...saudavel.executivo!, conversaoPercentual: 3 } };
    expect(achar(s, "conversao")!.severidade).toBe("critico");
    expect(classificarPrioridade(derivarSinais(s))).toBe("critico");
  });

  it("ciclo muito longo é crítico", () => {
    const s = { ...saudavel, executivo: { ...saudavel.executivo!, tempoMedioCicloDias: 200 } };
    expect(achar(s, "ciclo")!.severidade).toBe("critico");
  });

  it("follow-up vencido acima do limite é crítico", () => {
    const s: AdvisorSnapshot = {
      ...saudavel,
      vendedores: [{ ...saudavel.vendedores[0]!, followupPerdido: 9 }],
    };
    const sinal = achar(s, "followup")!;
    expect(sinal.severidade).toBe("critico");
    expect(sinal.evidencia).toContain("9");
  });

  it("corretor parado gera sinal de inatividade com o nome medido", () => {
    const s: AdvisorSnapshot = {
      ...saudavel,
      vendedores: [{ ...saudavel.vendedores[0]!, diasSemAtividade: 12 }],
    };
    expect(achar(s, "inatividade")!.evidencia).toContain("Ana");
  });

  it("origem só entra no ranking com volume mínimo", () => {
    const poucos: AdvisorSnapshot = {
      ...saudavel,
      origens: [{ origem: "portal", pessoas30d: 2, oportunidades30d: 1, ganhasTotal: 1, perdidasTotal: 1, valorGanho: 1 }],
    };
    expect(achar(poucos, "origem")).toBeUndefined();
    expect(achar(saudavel, "origem")!.evidencia).toContain("indicacao");
  });

  it("sem executivo só avalia equipe e origem", () => {
    const sinais = derivarSinais({ ...saudavel, executivo: null });
    expect(sinais.map((s) => s.codigo)).not.toContain("conversao");
    expect(sinais.map((s) => s.codigo)).toContain("followup");
  });

  it("snapshot vazio não gera sinal e fica ok", () => {
    const sinais = derivarSinais({ executivo: null, vendedores: [], origens: [] });
    expect(sinais).toHaveLength(0);
    expect(classificarPrioridade(sinais)).toBe("ok");
  });
});

describe("montarPromptAdvisor", () => {
  it("injeta apenas evidência medida", () => {
    const prompt = montarPromptAdvisor(derivarSinais(saudavel));
    expect(prompt).toContain("Read Models 360");
    expect(prompt).toContain("Conversão do funil");
    expect(prompt).toContain("briefing da semana");
  });

  it("usa a pergunta do gestor quando existe", () => {
    const prompt = montarPromptAdvisor(derivarSinais(saudavel), "  onde perco venda?  ");
    expect(prompt).toContain("Pergunta do gestor: onde perco venda?");
  });

  it("avisa quando não há sinal", () => {
    expect(montarPromptAdvisor([])).toContain("Nenhum sinal disponível");
  });

  it("system prompt proíbe inventar número", () => {
    expect(ADVISOR_SYSTEM_PROMPT).toContain("não invente números");
  });
});
describe("resumirAceite", () => {
  it("retorna null nas taxas quando nada foi decidido", () => {
    const r = resumirAceite([{ status: "pendente" }, { status: "pendente" }]);
    expect(r.total).toBe(2);
    expect(r.pendentes).toBe(2);
    expect(r.taxaAceite).toBeNull();
    expect(r.taxaExecucao).toBeNull();
  });

  it("mede aceite sobre as decididas, ignorando pendentes", () => {
    const r = resumirAceite([
      { status: "aceita" },
      { status: "concluida" },
      { status: "descartada" },
      { status: "pendente" },
    ]);
    expect(r.taxaAceite).toBeCloseTo(66.67, 1);
    expect(r.taxaExecucao).toBeCloseTo(50, 5);
  });

  it("trata lista vazia sem dividir por zero", () => {
    const r = resumirAceite([]);
    expect(r).toMatchObject({ total: 0, taxaAceite: null, taxaExecucao: null });
  });
});

describe("montarTarefaDaAcao", () => {
  const base = { titulo: "Retomar follow-up", acao: "Ligar para os 12 leads parados.", prioridade: "alta" };

  it("prefixa o título e mantém o conselho como descrição", () => {
    const t = montarTarefaDaAcao(base, new Date("2026-01-01T00:00:00.000Z"));
    expect(t.titulo).toBe("Advisor: Retomar follow-up");
    expect(t.descricao).toBe("Ligar para os 12 leads parados.");
    expect(t.prioridade).toBe("alta");
  });

  it("anexa o sinal que sustenta a ação", () => {
    const t = montarTarefaDaAcao({ ...base, sinal: "followup" }, new Date("2026-01-01T00:00:00.000Z"));
    expect(t.descricao).toContain("Sinal: followup");
  });

  it("vence em 7 dias e normaliza prioridade desconhecida", () => {
    const t = montarTarefaDaAcao({ ...base, prioridade: "urgentissima" }, new Date("2026-01-01T00:00:00.000Z"));
    expect(t.venceEm).toBe("2026-01-08T00:00:00.000Z");
    expect(t.prioridade).toBe("baixa");
  });
});
