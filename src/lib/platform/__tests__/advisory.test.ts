import { describe, expect, it } from "vitest";
import {
  advisorConfidence,
  briefingExecutivo,
  classificarPergunta,
  decisionTimeline,
  inteligenciaSemanal,
  responderPergunta,
  type AdvisoryEntrada,
} from "@/lib/platform/advisory";
import type { AutomationIntelligence } from "@/lib/platform/automation-intelligence";
import type { RecommendationRow } from "@/lib/platform/recommendation";

const regra = (over: Partial<AutomationIntelligence["regras"][number]> = {}) => ({
  ruleId: "11111111-1111-4111-8111-111111111111",
  nome: "Follow-up 48h",
  eventType: "opportunity.created",
  acao: "task" as const,
  canal: "interno" as const,
  ativa: true,
  dias: 90,
  execucoes: 200,
  entregues: 130,
  falhou: 60,
  descartados: 10,
  pendentes: 0,
  latenciaMediaSegundos: 30,
  tempoEconomizadoSegundos: 3600 * 20,
  oportunidadesTocadas: 100,
  conversoes: 30,
  ultimaExecucao: "2026-07-30T10:00:00.000Z",
  ...over,
});

const intel = (over: Partial<AutomationIntelligence> = {}): AutomationIntelligence => ({
  janelaDias: 90,
  desde: "2026-05-01T00:00:00.000Z",
  baseline: { oportunidades: 500, ganhas: 100 },
  regras: [regra()],
  geradoEm: "2026-07-31T00:00:00.000Z",
  ...over,
});

const entrada = (over: Partial<AdvisoryEntrada> = {}): AdvisoryEntrada => ({
  snapshot: {
    executivo: {
      oportunidadesAbertas: 42,
      ganhasMes: 4,
      novas30d: 23,
      pipelineTotal: 1_000_000,
      receitaPrevista: 400_000,
      valorGanhoMes: 200_000,
      tempoMedioCicloDias: 61,
      conversaoPercentual: 18.5,
      ticketMedio: 500_000,
      unidadesTotal: 100,
      unidadesDisponiveis: 40,
      vgvDisponivel: 20_000_000,
    },
    vendedores: [
      {
        responsavelId: "a",
        responsavelNome: "Carlos",
        oportunidadesAbertas: 10,
        ganhas30d: 3,
        conversaoPercentual: 22,
        followupPerdido: 2,
        semProximaAcao: 1,
        slaEstourado: 0,
        tarefasAtrasadas: 1,
        diasSemAtividade: 1,
      },
      {
        responsavelId: "b",
        responsavelNome: "Ana",
        oportunidadesAbertas: 6,
        ganhas30d: 1,
        conversaoPercentual: 11,
        followupPerdido: 0,
        semProximaAcao: 0,
        slaEstourado: 0,
        tarefasAtrasadas: 0,
        diasSemAtividade: 12,
      },
    ],
    origens: [
      {
        origem: "indicacao",
        pessoas30d: 10,
        oportunidades30d: 8,
        ganhasTotal: 9,
        perdidasTotal: 3,
        valorGanho: 900_000,
      },
    ],
  },
  sinais: [
    {
      codigo: "followup",
      titulo: "Follow-up perdido",
      evidencia: "2 oportunidades com follow-up vencido.",
      severidade: "atencao",
      area: "operacao",
    },
    {
      codigo: "ciclo",
      titulo: "Ciclo médio de venda",
      evidencia: "61 dias.",
      severidade: "ok",
      area: "vendas",
    },
  ],
  inteligencia: intel(),
  recomendacoes: [
    {
      ruleId: "11111111-1111-4111-8111-111111111111",
      nome: "Follow-up 48h",
      tipo: "revisar_gatilho",
      score: 80,
      confianca: 95,
      mensagem: '"Follow-up 48h" falhou em 30% dos efeitos concluídos.',
      forecast: { texto: "Corrigir recupera cerca de 6 h/mês.", horasMes: 6, reducao: 0.3 },
      posicao: 1,
      impacto: 70,
      urgencia: 84,
      quadrante: "agir_agora",
      prioridade: 76,
      chave: "revisar_gatilho:11111111-1111-4111-8111-111111111111",
    },
  ],
  empreendimentos: [
    {
      empreendimentoId: "e1",
      nome: "Reserva Vale",
      vendas30d: 3,
      vendas90d: 7,
      visitas30d: 23,
      oportunidadesAbertas: 12,
      unidadesDisponiveis: 18,
      conversaoPercentual: 21,
      velocidadeMensal: 2.4,
      estoqueMeses: 7.5,
    },
    {
      empreendimentoId: "e2",
      nome: "Torre Norte",
      vendas30d: 0,
      vendas90d: 0,
      visitas30d: 2,
      oportunidadesAbertas: 9,
      unidadesDisponiveis: 30,
      conversaoPercentual: 3,
      velocidadeMensal: 0,
      estoqueMeses: null,
    },
  ],
  memoria: [],
  qualidade: null,
  ...over,
});

const linha = (over: Partial<RecommendationRow> = {}): RecommendationRow => ({
  id: "r1",
  workspaceId: "w1",
  chave: "revisar_gatilho:x",
  tipo: "revisar_gatilho",
  ruleId: null,
  ruleNome: "Follow-up 48h",
  mensagem: "Regra falhando.",
  score: 80,
  confianca: 95,
  impacto: 70,
  urgencia: 80,
  quadrante: "agir_agora",
  status: "implementada",
  resultado: "melhorou",
  ocorrencias: 2,
  geradaEm: "2026-07-01T00:00:00.000Z",
  vistaEm: "2026-07-02T00:00:00.000Z",
  aceitaEm: "2026-07-03T00:00:00.000Z",
  implementadaEm: "2026-07-05T00:00:00.000Z",
  avaliadaEm: "2026-07-20T00:00:00.000Z",
  fechadaEm: null,
  ...over,
});

describe("GATE 05 — Advisor Confidence", () => {
  it("declara confiança com evidência de funil e automação", () => {
    const c = advisorConfidence(entrada());
    expect(c.valor).not.toBeNull();
    expect(c.motivos.length).toBeGreaterThan(0);
  });

  it("cai para indicação inicial sem dado algum", () => {
    const c = advisorConfidence(
      entrada({
        snapshot: { executivo: null, vendedores: [], origens: [] },
        inteligencia: null,
        qualidade: null,
      }),
    );
    expect(c.valor).toBeNull();
    expect(c.nivel).toBe("inicial");
  });

  it("incorpora a precisão histórica do motor na confiança", () => {
    const base = advisorConfidence(entrada()).valor!;
    const comPrecisaoBaixa = advisorConfidence(
      entrada({
        qualidade: {
          janelaDias: 90,
          desde: "2026-05-01T00:00:00.000Z",
          total: 20,
          vistas: 18,
          aceitas: 12,
          implementadas: 10,
          descartadas: 4,
          avaliadas: 10,
          melhoraram: 2,
          neutras: 4,
          pioraram: 4,
          porTipo: [],
          geradoEm: "2026-07-31T00:00:00.000Z",
        },
      }),
    );
    expect(comPrecisaoBaixa.valor!).toBeLessThan(base);
    expect(comPrecisaoBaixa.motivos.some((m) => m.includes("melhoraram"))).toBe(true);
  });
});

describe("GATE 01 — Executive Briefing", () => {
  it("saúda pelo horário e nome", () => {
    const b = briefingExecutivo(entrada(), {
      nome: "Carlos",
      agora: new Date("2026-07-31T09:00:00"),
    });
    expect(b.saudacao).toBe("Bom dia, Carlos.");
  });

  it("abre com números medidos", () => {
    const b = briefingExecutivo(entrada());
    expect(b.abertura).toContain("42");
    expect(b.numeros.some((l) => l.rotulo === "Conversão")).toBe(true);
  });

  it("aponta a regra com falha como atenção", () => {
    const b = briefingExecutivo(entrada());
    expect(b.atencoes.some((a) => a.includes("Follow-up 48h") && a.includes("30%"))).toBe(true);
  });

  it("indica próximo passo com previsão", () => {
    const b = briefingExecutivo(entrada());
    expect(b.proximoPasso).toContain("Corrigir recupera");
  });

  it("sem dados, diz que não há números", () => {
    const b = briefingExecutivo(
      entrada({ snapshot: { executivo: null, vendedores: [], origens: [] }, recomendacoes: [] }),
    );
    expect(b.numeros).toHaveLength(0);
    expect(b.proximoPasso).toBeNull();
  });
});

describe("GATE 02 — Weekly Intelligence", () => {
  it("lista gargalos de follow-up", () => {
    const w = inteligenciaSemanal(entrada());
    expect(w.gargalos.some((g) => g.includes("follow-up"))).toBe(true);
  });

  it("ranqueia melhores corretores por venda", () => {
    const w = inteligenciaSemanal(entrada());
    expect(w.melhoresCorretores[0]?.nome).toBe("Carlos");
  });

  it("marca corretor inativo como risco", () => {
    const w = inteligenciaSemanal(entrada());
    expect(w.riscos.some((r) => r.includes("Ana"))).toBe(true);
  });

  it("lista automação crítica com evidência", () => {
    const w = inteligenciaSemanal(entrada());
    expect(w.automacoesCriticas[0]?.nome).toBe("Follow-up 48h");
  });

  it("lista empreendimento em alta pelo giro medido", () => {
    const w = inteligenciaSemanal(entrada());
    expect(w.empreendimentosEmAlta[0]?.nome).toBe("Reserva Vale");
  });

  it("acusa empreendimento com pipeline e sem venda em 90 dias", () => {
    const w = inteligenciaSemanal(entrada());
    expect(w.riscos.some((r) => r.includes("Torre Norte"))).toBe(true);
  });

  it("não inventa empreendimento em alta sem Property 360", () => {
    const w = inteligenciaSemanal(entrada({ empreendimentos: [] }));
    expect(w.empreendimentosEmAlta).toHaveLength(0);
  });

  it("não afirma tendência sem histórico", () => {
    const w = inteligenciaSemanal(entrada({ inteligencia: null }));
    expect(w.tendencia).toContain("não pode ser afirmada");
  });
});

describe("GATE 03 — Natural Language Query", () => {
  it("classifica perguntas conhecidas", () => {
    expect(classificarPergunta("Quais regras estão prejudicando vendas?")).toBe(
      "regras_prejudicando",
    );
    expect(classificarPergunta("Quem é o melhor corretor?")).toBe("melhor_corretor");
    expect(classificarPergunta("")).toBe("desconhecida");
  });

  it("responde sobre regras citando falha medida", () => {
    const r = responderPergunta("Quais regras estão prejudicando vendas?", entrada());
    expect(r.resposta).toContain("Follow-up 48h");
    expect(r.evidencias.length).toBeGreaterThan(0);
  });

  it("admite não saber quando falta evidência", () => {
    const r = responderPergunta(
      "Quanto tempo a automação economizou?",
      entrada({ inteligencia: null }),
    );
    expect(r.resposta).toContain("Não tenho evidência medida");
  });

  it("devolve orientação para pergunta fora de escopo", () => {
    const r = responderPergunta("Qual a cotação do dólar?", entrada());
    expect(r.intencao).toBe("desconhecida");
    expect(r.evidencias).toHaveLength(0);
  });

  it("responde qual empreendimento perdeu mais oportunidades", () => {
    const r = responderPergunta(
      "Qual empreendimento perdeu mais oportunidades este mês?",
      entrada(),
    );
    expect(r.intencao).toBe("empreendimento");
    expect(r.resposta).toContain("Torre Norte");
  });

  it("responde qual empreendimento está em alta", () => {
    const r = responderPergunta("Qual empreendimento está em alta?", entrada());
    expect(r.resposta).toContain("Reserva Vale");
  });

  it("responde prioridade a partir da fila rankeada", () => {
    const r = responderPergunta("O que eu faço primeiro?", entrada());
    expect(r.intencao).toBe("prioridade");
    expect(r.resposta).toContain("Comece por");
  });
});

describe("GATE 04 — Decision Timeline", () => {
  it("monta a sequência completa do ciclo", () => {
    const t = decisionTimeline([linha()]);
    expect(t.itens[0]!.etapas.map((e) => e.etapa)).toEqual([
      "gerada",
      "vista",
      "aceita",
      "implementada",
      "avaliada",
    ]);
  });

  it("mede dias até a implementação", () => {
    const t = decisionTimeline([linha()]);
    expect(t.itens[0]!.diasAteImplementacao).toBe(4);
    expect(t.tempoMedioImplementacaoDias).toBe(4);
  });

  it("não inventa média sem implementação", () => {
    const t = decisionTimeline([
      linha({ status: "gerada", implementadaEm: null, avaliadaEm: null, resultado: "indefinido" }),
    ]);
    expect(t.tempoMedioImplementacaoDias).toBeNull();
    expect(t.ciclosFechados).toBe(0);
  });

  it("conta ciclo fechado só com desfecho avaliado", () => {
    const t = decisionTimeline([linha(), linha({ id: "r2", resultado: "indefinido" })]);
    expect(t.ciclosFechados).toBe(1);
  });
});
