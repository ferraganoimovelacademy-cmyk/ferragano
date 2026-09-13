import { describe, expect, it } from "vitest";
import {
  detectarRiscosCorretor,
  detectarRiscosEmpreendimento,
  detectarRiscosOportunidade,
  montarRadar,
  pontuarOportunidade,
  projetarForecast,
  proximaMelhorAcao,
  runRate,
  wilson,
  type ForecastBase,
  type OpportunitySignal,
} from "@/lib/platform/predictive";
import type { AdvisorVendedor } from "@/lib/platform/advisor";
import type { AdvisoryEmpreendimento } from "@/lib/platform/advisory";

const sinal = (over: Partial<OpportunitySignal> = {}): OpportunitySignal => ({
  opportunityId: "11111111-1111-4111-8111-111111111111",
  titulo: "Apto 302 — João",
  personId: "22222222-2222-4222-8222-222222222222",
  personNome: "João",
  responsavelId: "33333333-3333-4333-8333-333333333333",
  responsavelNome: "Marina",
  empreendimentoId: "44444444-4444-4444-8444-444444444444",
  empreendimentoNome: "Reserva Alto",
  estagio: "qualificado",
  stageNome: "Qualificação",
  stageProbabilidade: 30,
  slaHoras: 72,
  valor: 500000,
  diasNaEtapa: 2,
  diasDesdeCriacao: 10,
  interacoes30d: 4,
  diasSemInteracao: 1,
  visitasRealizadas: 1,
  propostas: 0,
  propostasEnviadas: 0,
  tarefasAtrasadas: 0,
  temProximaAcao: true,
  stageConversao: 40,
  stageAmostra: 60,
  empreendimentoVelocidade: 3,
  ...over,
});

const empreendimento = (over: Partial<AdvisoryEmpreendimento> = {}): AdvisoryEmpreendimento => ({
  empreendimentoId: "44444444-4444-4444-8444-444444444444",
  nome: "Reserva Alto",
  vendas30d: 2,
  vendas90d: 6,
  visitas30d: 12,
  oportunidadesAbertas: 8,
  unidadesDisponiveis: 20,
  conversaoPercentual: 18,
  velocidadeMensal: 2,
  estoqueMeses: 10,
  ...over,
});

const vendedor = (over: Partial<AdvisorVendedor> = {}): AdvisorVendedor => ({
  responsavelId: "33333333-3333-4333-8333-333333333333",
  responsavelNome: "Marina",
  oportunidadesAbertas: 5,
  ganhas30d: 2,
  conversaoPercentual: 22,
  followupPerdido: 0,
  semProximaAcao: 0,
  slaEstourado: 0,
  tarefasAtrasadas: 0,
  diasSemAtividade: 1,
  ...over,
});

const base = (over: Partial<ForecastBase> = {}): ForecastBase => ({
  ganhasMes: 6,
  valorGanhoMes: 3_000_000,
  ganhas90d: 18,
  criadas90d: 120,
  diasNoMes: 30,
  diasDecorridos: 15,
  oportunidadesAbertas: 40,
  pipelineTotal: 20_000_000,
  ticketMedio: 500_000,
  cicloMedioDias: 45,
  ...over,
});

describe("GATE 01 — Opportunity Score", () => {
  it("usa a conversão histórica medida como base quando a amostra basta", () => {
    const r = pontuarOportunidade(sinal());
    expect(r.previsao.fatores[0]!.nome).toBe("Conversão histórica da etapa");
    expect(r.previsao.fatores[0]!.peso).toBe(40);
  });

  it("cai para a probabilidade configurada quando a amostra é insuficiente", () => {
    const r = pontuarOportunidade(sinal({ stageAmostra: 4, stageConversao: 90 }));
    expect(r.previsao.fatores[0]!.nome).toBe("Probabilidade configurada da etapa");
    expect(r.previsao.fatores[0]!.peso).toBe(30);
  });

  it("pontua alto com proposta enviada e cliente engajado", () => {
    const r = pontuarOportunidade(sinal({ propostas: 1, propostasEnviadas: 1, interacoes30d: 5 }));
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.faixa).toBe("alta");
  });

  it("derruba o score de oportunidade fria e estourada de SLA", () => {
    const r = pontuarOportunidade(
      sinal({ interacoes30d: 0, diasSemInteracao: 40, diasNaEtapa: 30, temProximaAcao: false }),
    );
    expect(r.score).toBeLessThan(45);
    expect(r.faixa).toBe("baixa");
  });

  it("nunca sai de 0–100 e sempre traz fatores, base e horário (ADR-021)", () => {
    const r = pontuarOportunidade(sinal({ stageConversao: 100, stageAmostra: 999, propostasEnviadas: 3 }));
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.previsao.fatores.length).toBeGreaterThan(1);
    expect(r.previsao.base).toContain("read_opportunity_signals");
    expect(Date.parse(r.previsao.calculadoEm)).not.toBeNaN();
  });

  it("declara confiança insuficiente quando a etapa não tem histórico", () => {
    const r = pontuarOportunidade(
      sinal({
        stageAmostra: 0,
        stageConversao: null,
        interacoes30d: 0,
        visitasRealizadas: 0,
        propostas: 0,
        diasSemInteracao: null,
        diasDesdeCriacao: 1,
      }),
    );
    expect(r.previsao.nivel).toBe("insuficiente");
  });
});

describe("GATE 02 — Risk Detection", () => {
  it("justifica o risco de cliente sem contato", () => {
    const [risco] = detectarRiscosOportunidade(sinal({ interacoes30d: 0, diasSemInteracao: null }));
    expect(risco!.codigo).toBe("cliente_sem_contato");
    expect(risco!.severidade).toBe("critico");
    expect(risco!.motivo).toContain("30 dias");
  });

  it("marca SLA como crítico quando dobra o limite", () => {
    const riscos = detectarRiscosOportunidade(sinal({ diasNaEtapa: 20, slaHoras: 72 }));
    const sla = riscos.find((r) => r.codigo === "sla_etapa_estourado");
    expect(sla?.severidade).toBe("critico");
  });

  it("não inventa risco de SLA quando a etapa não tem SLA", () => {
    const riscos = detectarRiscosOportunidade(sinal({ slaHoras: null, diasNaEtapa: 90 }));
    expect(riscos.some((r) => r.codigo === "sla_etapa_estourado")).toBe(false);
  });

  it("acusa proposta enviada sem retorno", () => {
    const riscos = detectarRiscosOportunidade(
      sinal({ propostas: 1, propostasEnviadas: 1, diasSemInteracao: 12 }),
    );
    expect(riscos.map((r) => r.codigo)).toContain("proposta_sem_resposta");
  });

  it("separa empreendimento sem venda de empreendimento perdendo tração", () => {
    expect(detectarRiscosEmpreendimento(empreendimento({ vendas90d: 0 }))[0]!.codigo).toBe(
      "empreendimento_sem_venda",
    );
    expect(
      detectarRiscosEmpreendimento(empreendimento({ vendas30d: 0, vendas90d: 5 }))[0]!.codigo,
    ).toBe("empreendimento_perdendo_tracao");
  });

  it("detecta estoque encalhado pelo giro medido", () => {
    const riscos = detectarRiscosEmpreendimento(empreendimento({ estoqueMeses: 40 }));
    expect(riscos.map((r) => r.codigo)).toContain("estoque_encalhado");
  });

  it("detecta queda de produtividade do corretor", () => {
    const riscos = detectarRiscosCorretor(vendedor({ diasSemAtividade: 20 }));
    expect(riscos[0]!.codigo).toBe("corretor_inativo");
    expect(riscos[0]!.severidade).toBe("critico");
  });

  it("corretor ativo e em dia não gera risco", () => {
    expect(detectarRiscosCorretor(vendedor())).toHaveLength(0);
  });
});

describe("GATE 03 — Next Best Action", () => {
  const acaoDe = (over: Partial<OpportunitySignal>) => {
    const s = sinal(over);
    return proximaMelhorAcao(s, pontuarOportunidade(s));
  };

  it("manda retomar contato quando não há interação", () => {
    expect(acaoDe({ interacoes30d: 0 }).acao).toBe("Retomar contato");
  });

  it("manda agendar visita quando há contato e nenhuma visita", () => {
    expect(acaoDe({ visitasRealizadas: 0 }).acao).toBe("Agendar visita");
  });

  it("manda emitir proposta depois da visita", () => {
    expect(acaoDe({ visitasRealizadas: 2, propostas: 0 }).acao).toBe("Emitir proposta");
  });

  it("cobra retorno de proposta enviada e parada", () => {
    expect(acaoDe({ propostas: 1, propostasEnviadas: 1, diasSemInteracao: 9 }).acao).toBe(
      "Cobrar retorno da proposta",
    );
  });

  it("explica a ação com fatores e confiança", () => {
    const a = acaoDe({ propostas: 1, propostasEnviadas: 1 });
    expect(a.previsao.valor).toBe(a.acao);
    expect(a.previsao.fatores[0]!.nome).toBe("Opportunity Score");
    expect(a.previsao.confianca).toBeGreaterThan(0);
  });
});

describe("GATE 04 — Forecast", () => {
  it("wilson devolve intervalo dentro de 0–100 e null sem amostra", () => {
    const i = wilson(18, 120)!;
    expect(i.min).toBeLessThan(i.esperado);
    expect(i.max).toBeGreaterThan(i.esperado);
    expect(i.min).toBeGreaterThanOrEqual(0);
    expect(wilson(0, 0)).toBeNull();
  });

  it("run-rate projeta o mês e nunca fica abaixo do realizado", () => {
    const i = runRate(6, 15, 30)!;
    expect(i.esperado).toBe(12);
    expect(i.min).toBeGreaterThanOrEqual(6);
    expect(runRate(3, 0, 30)).toBeNull();
  });

  it("declara ausência em vez de zerar quando não há ticket médio", () => {
    const f = projetarForecast(base({ ticketMedio: null }));
    expect(f.receitaMes.valor).toBeNull();
    expect(f.receitaMes.motivoAusencia).toContain("ticket médio");
  });

  it("aponta o gargalo previsto a partir dos riscos críticos", () => {
    const riscos = detectarRiscosOportunidade(sinal({ interacoes30d: 0 }));
    const f = projetarForecast(base(), riscos);
    expect(f.gargalo.valor).toBe("Cliente sem contato recente");
    expect(f.gargalo.fatores[0]!.detalhe).toContain("ocorrência");
  });

  it("sem risco crítico não inventa gargalo", () => {
    const f = projetarForecast(base(), []);
    expect(f.gargalo.valor).toBeNull();
    expect(f.gargalo.confianca).toBe(0);
  });

  it("conversão sem oportunidades criadas devolve null explicado", () => {
    const f = projetarForecast(base({ criadas90d: 0, ganhas90d: 0 }));
    expect(f.conversao.valor).toBeNull();
    expect(f.conversao.motivoAusencia).toContain("90 dias");
  });
});

describe("GATE 05 — Executive Radar", () => {
  const radar = () =>
    montarRadar({
      sinais: [
        sinal(),
        sinal({ opportunityId: "aaaaaaaa-1111-4111-8111-111111111111", interacoes30d: 0, valor: 900000 }),
      ],
      empreendimentos: [empreendimento(), empreendimento({ nome: "Vila Sul", vendas30d: 0, vendas90d: 0 })],
      vendedores: [vendedor(), vendedor({ responsavelNome: "Caio", diasSemAtividade: 30, ganhas30d: 0 })],
      forecastBase: base(),
    });

  it("lista críticas por valor em risco e ações priorizadas", () => {
    const r = radar();
    expect(r.criticas[0]!.valor).toBe(900000);
    expect(r.acoes.length).toBeGreaterThan(0);
  });

  it("ranqueia aceleração e destaques pelo medido", () => {
    const r = radar();
    expect(r.aceleracao[0]!.nome).toBe("Reserva Alto");
    expect(r.destaques[0]!.nome).toBe("Marina");
  });

  it("ordena riscos com críticos primeiro", () => {
    const r = radar();
    expect(r.riscos[0]!.severidade).toBe("critico");
  });

  it("sem evidência nenhuma, diz em voz alta em vez de mostrar zero", () => {
    const r = montarRadar({ sinais: [], empreendimentos: [], vendedores: [], forecastBase: null });
    expect(r.tendencias[0]).toContain("Sem evidência suficiente");
    expect(r.forecast.vendasMes.valor).toBeNull();
  });
});