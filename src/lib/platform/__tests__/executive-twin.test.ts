import { describe, expect, it } from "vitest";
import {
  balancoOrganizacional,
  compararCenarios,
  correlacao,
  desvioEstrategico,
  montarTwin,
  narrativaExecutiva,
  organizationSnapshot,
  pulsoOrganizacional,
  regressao,
  simulacaoExecutiva,
  type EntradaTwin,
  type MesAgregado,
} from "@/lib/platform/executive-twin";

const mes = (i: number, over: Partial<MesAgregado> = {}): MesAgregado => ({
  mes: `2026-${String(i).padStart(2, "0")}`,
  oportunidadesCriadas: 10,
  ganhas: 3,
  perdidas: 2,
  valorGanho: 300_000,
  visitas: 8,
  propostas: 5,
  atividades: 40,
  cicloMedianoDias: 30,
  licoes: 1,
  versoesConhecimento: 1,
  automacoesEntregues: 20,
  ...over,
});

const serieCrescente = Array.from({ length: 12 }, (_, i) =>
  mes(i + 1, {
    oportunidadesCriadas: 10 + i * 3,
    ganhas: 3 + i,
    valorGanho: 300_000 + i * 50_000,
    visitas: 8 + i * 2,
    propostas: 5 + i,
    atividades: 40 + i * 5,
  }),
);

const entradaBase = (serie: MesAgregado[]): EntradaTwin => ({
  serie,
  esforco: [
    { area: "comercial", eventos: 100, fonte: "activities" },
    { area: "marketing", eventos: 10, fonte: "activities" },
    { area: "operacao", eventos: 40, fonte: "visits" },
    { area: "inteligencia", eventos: 30, fonte: "memory" },
    { area: "conhecimento", eventos: null, fonte: "org_knowledge_*" },
  ],
  pipeline: {
    oportunidadesAbertas: 20,
    pipelineTotal: 5_000_000,
    ticketMedio: 250_000,
    conversaoPercentual: 22,
    cicloMedioDias: 35,
  },
  pessoas: { total: 400, novas30d: 30, clientes: 60 },
  conhecimento: { playbooks: 4, licoes: 12, versoes: 9, usos: 5 },
  memoria: { decisoes: 20, decisoesAvaliadas: 8, campanhas: 3 },
  automacao: { regrasAtivas: 6, entregues30d: 120, falhas30d: 2 },
  riscos: { alertasAbertos: 1, tarefasAtrasadas: 4 },
  mercado: { indicadoresAtualizados: 6, regioes: 3 },
  fontesIndisponiveis: [],
});

describe("executive twin — estatística", () => {
  it("regressão exige ao menos 3 pontos", () => {
    expect(regressao([1, 2])).toBeNull();
    expect(regressao([1, 2, 3])?.slope).toBe(1);
  });

  it("correlação perfeita positiva é 1 e exige amostra mínima", () => {
    expect(correlacao([1, 2, 3], [2, 4, 6])).toBeNull();
    expect(correlacao([1, 2, 3, 4], [2, 4, 6, 8])).toBe(1);
  });

  it("correlação sem variância é nula", () => {
    expect(correlacao([1, 1, 1, 1], [1, 2, 3, 4])).toBeNull();
  });
});

describe("GATE 01 — organization snapshot", () => {
  it("marca toda medida como observação com janela declarada", () => {
    const s = organizationSnapshot(entradaBase(serieCrescente));
    expect(s.medidas.length).toBeGreaterThan(10);
    expect(s.medidas.every((m) => m.natureza === "observacao" && m.janela.length > 0)).toBe(true);
  });

  it("não estima o que não foi medido e reporta como lacuna", () => {
    const e = entradaBase(serieCrescente);
    e.pipeline.ticketMedio = null;
    const s = organizationSnapshot(e);
    expect(s.medidas.find((m) => m.chave === "ticket_medio")?.valor).toBeNull();
    expect(s.lacunas.join(" ")).toContain("Ticket médio");
  });

  it("aponta série curta e área sem medição", () => {
    const s = organizationSnapshot(entradaBase([mes(1), mes(2)]));
    expect(s.lacunas.some((l) => l.includes("menos de 3 meses"))).toBe(true);
    expect(s.lacunas.some((l) => l.includes("Conhecimento"))).toBe(true);
  });
});

describe("GATE 02 — organizational pulse", () => {
  it("classifica crescimento em série crescente", () => {
    const p = pulsoOrganizacional(serieCrescente);
    expect(p.metricas.find((m) => m.chave === "oportunidades")?.tendencia).toBe("crescimento");
    expect(p.resumo).toBe("crescimento");
  });

  it("classifica estabilidade em série constante", () => {
    const p = pulsoOrganizacional(Array.from({ length: 12 }, (_, i) => mes(i + 1)));
    expect(p.metricas.every((m) => m.tendencia === "estabilidade")).toBe(true);
  });

  it("classifica desaceleração em série decrescente", () => {
    const serie = Array.from({ length: 12 }, (_, i) => mes(i + 1, { ganhas: 20 - i }));
    expect(pulsoOrganizacional(serie).metricas.find((m) => m.chave === "ganhas")?.tendencia).toBe(
      "desaceleracao",
    );
  });

  it("marca saturação quando a entrada cresce sem ganho proporcional", () => {
    const serie = Array.from({ length: 12 }, (_, i) =>
      mes(i + 1, { oportunidadesCriadas: 10 + i * 5, ganhas: 3 }),
    );
    expect(pulsoOrganizacional(serie).metricas.find((m) => m.chave === "ganhas")?.tendencia).toBe(
      "saturacao",
    );
  });

  it("sem série suficiente não calcula tendência", () => {
    const p = pulsoOrganizacional([mes(1), mes(2)]);
    expect(p.resumo).toBe("indisponivel");
    expect(p.limitacoes.length).toBeGreaterThan(0);
  });
});

describe("GATE 03 — scenario comparison", () => {
  it("compara dois meses existentes e calcula variação", () => {
    const c = compararCenarios(serieCrescente, "2026-01", "2026-12");
    expect(c.disponivel).toBe(true);
    const ganhas = c.linhas.find((l) => l.chave === "ganhas")!;
    expect(ganhas.de).toBe(3);
    expect(ganhas.para).toBe(14);
    expect(ganhas.variacaoPercentual).toBeGreaterThan(0);
  });

  it("mês inexistente vira limitação, não estimativa", () => {
    const c = compararCenarios(serieCrescente, "2025-01", "2026-12");
    expect(c.disponivel).toBe(false);
    expect(c.linhas.every((l) => l.de === null)).toBe(true);
  });

  it("declara que comparação não é tendência", () => {
    expect(compararCenarios(serieCrescente, "2026-01", "2026-02").limitacoes.join(" ")).toContain(
      "não representa tendência",
    );
  });
});

describe("GATE 04 — organizational balance", () => {
  it("calcula participação apenas sobre áreas medidas", () => {
    const b = balancoOrganizacional(entradaBase(serieCrescente).esforco);
    expect(b.totalEventos).toBe(180);
    expect(b.areasSemMedicao).toEqual(["conhecimento"]);
    expect(b.areas.find((a) => a.area === "comercial")?.situacao).toBe("concentracao");
    expect(b.areas.find((a) => a.area === "marketing")?.situacao).toBe("lacuna");
  });

  it("área sem medição não recebe percentual", () => {
    const b = balancoOrganizacional([{ area: "comercial", eventos: null, fonte: "x" }]);
    expect(b.areas[0]!.participacaoPercentual).toBeNull();
    expect(b.totalEventos).toBe(0);
  });
});

describe("GATE 05 — strategic drift", () => {
  it("aponta mês acima do padrão histórico sem julgamento", () => {
    const serie = [
      ...Array.from({ length: 11 }, (_, i) => mes(i + 1, { ganhas: 3 + (i % 3) })),
      mes(12, { ganhas: 30 }),
    ];
    const d = desvioEstrategico(serie);
    expect(d.metricas.find((m) => m.chave === "ganhas")?.classificacao).toBe("acima_do_padrao");
    expect(d.aviso).toContain("sem julgar");
  });

  it("sem desvio-padrão histórico o z-score fica indisponível — nada é estimado", () => {
    const serie = [...Array.from({ length: 11 }, (_, i) => mes(i + 1)), mes(12, { ganhas: 30 })];
    const d = desvioEstrategico(serie);
    expect(d.metricas.find((m) => m.chave === "ganhas")?.zScore).toBeNull();
    expect(d.metricas.find((m) => m.chave === "ganhas")?.classificacao).toBe("indisponivel");
  });

  it("série sem variância mantém tudo indisponível ou dentro do padrão", () => {
    const d = desvioEstrategico(Array.from({ length: 12 }, (_, i) => mes(i + 1)));
    expect(d.desviosRelevantes).toBe(0);
  });
});

describe("GATE 06 — executive simulation", () => {
  it("declara natureza, hipóteses, limitações e aviso", () => {
    const s = simulacaoExecutiva(serieCrescente, "visitas", -20);
    expect(s.natureza).toBe("simulacao");
    expect(s.hipoteses.length).toBeGreaterThan(0);
    expect(s.limitacoes.join(" ")).toContain("causa e efeito");
    expect(s.aviso).toContain("Não é previsão garantida");
  });

  it("projeta cenário quando há correlação histórica forte", () => {
    const s = simulacaoExecutiva(serieCrescente, "visitas", -20);
    const ganhas = s.efeitos.find((e) => e.chave === "ganhas")!;
    expect(ganhas.confiavel).toBe(true);
    expect(ganhas.variacaoPercentual).toBeLessThan(0);
  });

  it("não projeta com série curta", () => {
    const s = simulacaoExecutiva([mes(1), mes(2), mes(3)], "visitas", 20);
    expect(s.disponivel).toBe(false);
    expect(s.efeitos.every((e) => e.confiavel === false)).toBe(true);
  });

  it("não projeta quando a correlação é fraca", () => {
    const serie = Array.from({ length: 12 }, (_, i) =>
      mes(i + 1, { visitas: i % 2 === 0 ? 2 : 30, ganhas: 5 }),
    );
    const ganhas = simulacaoExecutiva(serie, "visitas", 20).efeitos.find((e) => e.chave === "ganhas")!;
    expect(ganhas.confiavel).toBe(false);
  });

  it("não simula a própria variável", () => {
    expect(simulacaoExecutiva(serieCrescente, "propostas", 10).efeitos.some((e) => e.chave === "propostas")).toBe(
      false,
    );
  });
});

describe("GATE 07 — executive narrative", () => {
  it("separa observação de tendência em parágrafos rotulados", () => {
    const entrada = entradaBase(serieCrescente);
    const snapshot = organizationSnapshot(entrada);
    const pulso = pulsoOrganizacional(entrada.serie);
    const balanco = balancoOrganizacional(entrada.esforco);
    const desvio = desvioEstrategico(entrada.serie);
    const n = narrativaExecutiva(entrada, { snapshot, pulso, balanco, desvio });
    expect(n.paragrafos.some((p) => p.natureza === "observacao")).toBe(true);
    expect(n.paragrafos.some((p) => p.natureza === "tendencia")).toBe(true);
    expect(n.paragrafos.every((p) => p.fontes.length > 0)).toBe(true);
    expect(n.paragrafos.some((p) => p.natureza === "simulacao")).toBe(false);
  });

  it("registra fontes indisponíveis como pendência", () => {
    const entrada = entradaBase(serieCrescente);
    entrada.fontesIndisponiveis = ["visits"];
    const snapshot = organizationSnapshot(entrada);
    const pulso = pulsoOrganizacional(entrada.serie);
    const n = narrativaExecutiva(entrada, {
      snapshot,
      pulso,
      balanco: balancoOrganizacional(entrada.esforco),
      desvio: desvioEstrategico(entrada.serie),
    });
    expect(n.pendencias.join(" ")).toContain("visits");
  });
});

describe("twin completo", () => {
  it("monta todos os gates com janela e meses declarados", () => {
    const t = montarTwin(entradaBase(serieCrescente));
    expect(t.meses).toHaveLength(12);
    expect(t.comparacaoPadrao?.disponivel).toBe(true);
    expect(t.snapshot.medidas.length).toBeGreaterThan(0);
    expect(t.narrativa.paragrafos.length).toBeGreaterThan(3);
    expect(new Date(t.geradoEm).toString()).not.toBe("Invalid Date");
  });

  it("série vazia não quebra e não inventa números", () => {
    const t = montarTwin(entradaBase([]));
    expect(t.comparacaoPadrao).toBeNull();
    expect(t.pulso.resumo).toBe("indisponivel");
  });
});
