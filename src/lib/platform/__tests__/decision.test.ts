import { describe, expect, it } from "vitest";
import {
  MCMV_RENDA_TETO,
  MCMV_VALOR_TETO,
  COMPROMETIMENTO_MAX,
  calcularCapacidade,
  elegivelMcmv,
  bloqueiosDaUnidade,
  avaliarUnidade,
  recomendarUnidades,
  calcularOpportunityScore,
  temperaturaPorScore,
  proximaMelhorAcao,
  aderenciaLabel,
  perfilCompraLabels,
  PERFIS_COMPRA,
  type Qualificacao,
  type UnidadeCandidata,
  type SinaisOportunidade,
} from "../decision";

const qualificacaoBase: Qualificacao = {
  renda_mensal: 5000,
  entrada_disponivel: 20000,
  usa_fgts: false,
  fgts_valor: null,
  perfil: "moradia",
  bairros_desejados: [],
  cidade: null,
  uf: null,
  dormitorios_min: null,
  vagas_min: null,
  area_min: null,
  preco_teto: null,
  prazo_meses: null,
  banco_preferido: null,
  restricao_credito: false,
  primeiro_imovel: true,
};

const unidadeBase: UnidadeCandidata = {
  id: "u1",
  identificador: "101",
  status: "disponivel",
  preco: 300000,
  dormitorios: 2,
  suites: 1,
  vagas: 1,
  varanda: true,
  andar: 5,
  area_privativa: 60,
  comissao_percentual: 4,
  score_liquidez: 60,
  campanha: null,
  empreendimentoId: "e1",
  empreendimentoNome: "Empreendimento X",
  cidade: "Uberlândia",
  bairro: "Centro",
  segmento: "medio",
  status_obra: "em_obras",
};

describe("decision: labels", () => {
  it("todo perfil de compra tem label", () => {
    for (const v of PERFIS_COMPRA) expect(perfilCompraLabels[v]).toBeTruthy();
  });
});

describe("calcularCapacidade", () => {
  it("usa prazo default de 360 meses quando ausente ou inválido", () => {
    const cap = calcularCapacidade({ ...qualificacaoBase, prazo_meses: null });
    expect(cap.prazoMeses).toBe(360);
    const capZero = calcularCapacidade({ ...qualificacaoBase, prazo_meses: 0 });
    expect(capZero.prazoMeses).toBe(360);
  });

  it("parcela máxima é 30% da renda mensal", () => {
    const cap = calcularCapacidade({ ...qualificacaoBase, renda_mensal: 6000 });
    expect(cap.parcelaMaxima).toBe(6000 * COMPROMETIMENTO_MAX);
  });

  it("soma FGTS aos recursos próprios apenas quando usa_fgts é true", () => {
    const semFgts = calcularCapacidade({ ...qualificacaoBase, usa_fgts: false, fgts_valor: 10000 });
    const comFgts = calcularCapacidade({ ...qualificacaoBase, usa_fgts: true, fgts_valor: 10000 });
    expect(comFgts.recursosProprios - semFgts.recursosProprios).toBe(10000);
  });

  it("teto aplicado respeita o preco_teto informado, se menor que a capacidade total", () => {
    const cap = calcularCapacidade({ ...qualificacaoBase, preco_teto: 50000 });
    expect(cap.tetoAplicado).toBe(50000);
  });

  it("completa é true quando há renda ou preço teto informado", () => {
    expect(calcularCapacidade({ ...qualificacaoBase, renda_mensal: null, preco_teto: null }).completa).toBe(
      false,
    );
    expect(calcularCapacidade({ ...qualificacaoBase, renda_mensal: 1000 }).completa).toBe(true);
    expect(
      calcularCapacidade({ ...qualificacaoBase, renda_mensal: null, preco_teto: 100000 }).completa,
    ).toBe(true);
  });
});

describe("elegivelMcmv", () => {
  it("elegível quando dentro de todos os tetos", () => {
    expect(elegivelMcmv(qualificacaoBase, 300000)).toBe(true);
  });
  it("inelegível com restrição de crédito", () => {
    expect(elegivelMcmv({ ...qualificacaoBase, restricao_credito: true }, 300000)).toBe(false);
  });
  it("inelegível se não for primeiro imóvel", () => {
    expect(elegivelMcmv({ ...qualificacaoBase, primeiro_imovel: false }, 300000)).toBe(false);
  });
  it(`inelegível se renda ultrapassar o teto (${MCMV_RENDA_TETO})`, () => {
    expect(elegivelMcmv({ ...qualificacaoBase, renda_mensal: MCMV_RENDA_TETO + 1 }, 300000)).toBe(false);
    expect(elegivelMcmv({ ...qualificacaoBase, renda_mensal: MCMV_RENDA_TETO }, 300000)).toBe(true);
  });
  it(`inelegível se preço ultrapassar o teto (${MCMV_VALOR_TETO})`, () => {
    expect(elegivelMcmv(qualificacaoBase, MCMV_VALOR_TETO + 1)).toBe(false);
    expect(elegivelMcmv(qualificacaoBase, MCMV_VALOR_TETO)).toBe(true);
  });
  it("preço nulo não bloqueia (não há preço a comparar)", () => {
    expect(elegivelMcmv(qualificacaoBase, null)).toBe(true);
  });
});

describe("bloqueiosDaUnidade", () => {
  const cap = calcularCapacidade(qualificacaoBase);

  it("sem bloqueios quando tudo compatível", () => {
    expect(bloqueiosDaUnidade(qualificacaoBase, unidadeBase, cap)).toEqual([]);
  });

  it("bloqueia unidade indisponível", () => {
    const bloqueios = bloqueiosDaUnidade(qualificacaoBase, { ...unidadeBase, status: "vendida" }, cap);
    expect(bloqueios).toContain("Unidade indisponível no estoque");
  });

  it("bloqueia unidade sem preço", () => {
    const bloqueios = bloqueiosDaUnidade(qualificacaoBase, { ...unidadeBase, preco: null }, cap);
    expect(bloqueios).toContain("Unidade sem preço definido");
  });

  it("bloqueia unidade acima da capacidade financeira", () => {
    const capBaixa = calcularCapacidade({ ...qualificacaoBase, renda_mensal: 1000, entrada_disponivel: 0, preco_teto: 10000 });
    const bloqueios = bloqueiosDaUnidade(qualificacaoBase, unidadeBase, capBaixa);
    expect(bloqueios).toContain("Acima da capacidade financeira estimada");
  });

  it("bloqueia por dormitórios/vagas/área mínimos não atendidos", () => {
    const q = { ...qualificacaoBase, dormitorios_min: 3, vagas_min: 2, area_min: 100 };
    const bloqueios = bloqueiosDaUnidade(q, unidadeBase, cap);
    expect(bloqueios).toEqual(
      expect.arrayContaining([
        "Menos de 3 dormitório(s)",
        "Menos de 2 vaga(s)",
        "Área menor que 100 m²",
      ]),
    );
  });
});

describe("avaliarUnidade", () => {
  const cap = calcularCapacidade(qualificacaoBase);

  it("score base 40 mais bônus de orçamento com boa folga", () => {
    const match = avaliarUnidade(qualificacaoBase, unidadeBase, cap);
    expect(match.aderencia).toBeGreaterThan(40);
    expect(match.motivos.length).toBeGreaterThan(0);
  });

  it("aderência sempre entre 0 e 100", () => {
    const match = avaliarUnidade(qualificacaoBase, { ...unidadeBase, preco: 1 }, cap);
    expect(match.aderencia).toBeGreaterThanOrEqual(0);
    expect(match.aderencia).toBeLessThanOrEqual(100);
  });

  it("motivos vêm ordenados por peso decrescente", () => {
    const match = avaliarUnidade(
      { ...qualificacaoBase, dormitorios_min: 2, vagas_min: 1, bairros_desejados: ["Centro"] },
      unidadeBase,
      cap,
    );
    const pesos = match.motivos.map((m) => m.peso);
    const ordenados = [...pesos].sort((a, b) => b - a);
    expect(pesos).toEqual(ordenados);
  });

  it("alerta de margem apertada quando unidade está no limite do orçamento", () => {
    const capApertada = calcularCapacidade({ ...qualificacaoBase, preco_teto: 300000 });
    const match = avaliarUnidade(qualificacaoBase, { ...unidadeBase, preco: 299000 }, capApertada);
    expect(match.alertas).toContain("Margem financeira apertada — confirmar entrada.");
  });

  it("alerta quando fora dos bairros desejados", () => {
    const q = { ...qualificacaoBase, bairros_desejados: ["Jardins"] };
    const match = avaliarUnidade(q, unidadeBase, cap);
    expect(match.alertas).toContain("Fora dos bairros informados pelo cliente.");
  });

  it("alerta de restrição de crédito e qualificação incompleta", () => {
    const q = { ...qualificacaoBase, restricao_credito: true, renda_mensal: null, preco_teto: null };
    const capIncompleta = calcularCapacidade(q);
    const match = avaliarUnidade(q, unidadeBase, capIncompleta);
    expect(match.alertas).toContain("Cliente com restrição de crédito declarada.");
    expect(match.alertas).toContain("Qualificação financeira incompleta — score parcial.");
  });

  it("perfil investimento soma pontos de liquidez em vez de varanda/suíte", () => {
    const q = { ...qualificacaoBase, perfil: "investimento" as const };
    const match = avaliarUnidade(q, { ...unidadeBase, score_liquidez: 80 }, cap);
    expect(match.motivos.some((m) => m.texto.includes("liquidez"))).toBe(true);
  });
});

describe("recomendarUnidades", () => {
  it("separa recomendadas e descartadas, ordenando recomendadas por aderência", () => {
    const unidades: UnidadeCandidata[] = [
      unidadeBase,
      { ...unidadeBase, id: "u2", status: "vendida" },
      { ...unidadeBase, id: "u3", preco: 100000, bairro: "Centro" },
    ];
    const { recomendadas, descartadas } = recomendarUnidades(qualificacaoBase, unidades);
    expect(descartadas).toHaveLength(1);
    expect(descartadas[0].unidade.id).toBe("u2");
    expect(recomendadas.length).toBe(2);
    expect(recomendadas[0].aderencia).toBeGreaterThanOrEqual(recomendadas[1].aderencia);
  });

  it("respeita o limite informado", () => {
    const unidades = Array.from({ length: 5 }, (_, i) => ({ ...unidadeBase, id: `u${i}` }));
    const { recomendadas } = recomendarUnidades(qualificacaoBase, unidades, 2);
    expect(recomendadas).toHaveLength(2);
  });
});

const sinaisBase: SinaisOportunidade = {
  interacoes30d: 0,
  diasSemInteracao: null,
  visitasRealizadas: 0,
  propostasEnviadas: 0,
  propostaAceita: false,
  respostaCliente: false,
  documentosEntregues: 0,
  qualificacaoCompleta: false,
  estagio: "novo",
};

describe("calcularOpportunityScore", () => {
  it("score base 20 quando não há nenhum sinal positivo, com penalidade de sem interação e sem qualificação", () => {
    const { score } = calcularOpportunityScore(sinaisBase);
    // 20 - 10 (sem interação) - 5 (sem qualificação) = 5
    expect(score).toBe(5);
  });

  it("interações somam até no máximo 6 * 3 = 18 pontos", () => {
    const { score: score6 } = calcularOpportunityScore({ ...sinaisBase, interacoes30d: 6, diasSemInteracao: 1 });
    const { score: score20 } = calcularOpportunityScore({ ...sinaisBase, interacoes30d: 20, diasSemInteracao: 1 });
    expect(score6).toBe(score20);
  });

  it("mais de 30 dias sem interação penaliza mais que entre 14 e 30", () => {
    const { score: score20d } = calcularOpportunityScore({ ...sinaisBase, diasSemInteracao: 20 });
    const { score: score40d } = calcularOpportunityScore({ ...sinaisBase, diasSemInteracao: 40 });
    expect(score40d).toBeLessThan(score20d);
  });

  it("estágio perdido limita o score a no máximo 10", () => {
    const { score } = calcularOpportunityScore({
      ...sinaisBase,
      estagio: "perdido",
      propostaAceita: true,
      visitasRealizadas: 5,
      interacoes30d: 10,
    });
    expect(score).toBeLessThanOrEqual(10);
  });

  it("estágio fechado sempre resulta em score 100", () => {
    const { score } = calcularOpportunityScore({ ...sinaisBase, estagio: "fechado" });
    expect(score).toBe(100);
  });

  it("score nunca sai do intervalo 0-100", () => {
    const { score: min } = calcularOpportunityScore({ ...sinaisBase, diasSemInteracao: 100 });
    const { score: max } = calcularOpportunityScore({
      ...sinaisBase,
      interacoes30d: 100,
      diasSemInteracao: 1,
      visitasRealizadas: 100,
      propostasEnviadas: 5,
      propostaAceita: true,
      respostaCliente: true,
      documentosEntregues: 100,
      qualificacaoCompleta: true,
    });
    expect(min).toBeGreaterThanOrEqual(0);
    expect(max).toBeLessThanOrEqual(100);
  });

  it("fatores vêm ordenados por peso decrescente", () => {
    const { fatores } = calcularOpportunityScore({
      ...sinaisBase,
      interacoes30d: 3,
      visitasRealizadas: 1,
      propostasEnviadas: 1,
    });
    const pesos = fatores.map((f) => f.peso);
    expect(pesos).toEqual([...pesos].sort((a, b) => b - a));
  });
});

describe("temperaturaPorScore (decision)", () => {
  it("limites idênticos ao módulo comercial", () => {
    expect(temperaturaPorScore(39)).toBe("frio");
    expect(temperaturaPorScore(40)).toBe("morno");
    expect(temperaturaPorScore(69)).toBe("morno");
    expect(temperaturaPorScore(70)).toBe("quente");
  });
});

describe("proximaMelhorAcao (Next Best Action)", () => {
  const contextoBase = { temQualificacao: true, unidadesRecomendadas: 0 };

  it("estágio perdido retorna apenas ação de reengajamento", () => {
    const acoes = proximaMelhorAcao({ ...sinaisBase, estagio: "perdido" }, contextoBase);
    expect(acoes).toHaveLength(1);
    expect(acoes[0].acao).toBe("reengajar");
    expect(acoes[0].prioridade).toBe("baixa");
  });

  it("estágio fechado retorna apenas ação de fechar contrato", () => {
    const acoes = proximaMelhorAcao({ ...sinaisBase, estagio: "fechado" }, contextoBase);
    expect(acoes).toHaveLength(1);
    expect(acoes[0].acao).toBe("fechar_contrato");
  });

  it("sem qualificação recomenda qualificar com prioridade alta", () => {
    const acoes = proximaMelhorAcao(sinaisBase, { ...contextoBase, temQualificacao: false });
    expect(acoes.some((a) => a.acao === "qualificar" && a.prioridade === "alta")).toBe(true);
  });

  it("mais de 14 dias sem interação dispara reengajar com prioridade urgente", () => {
    const acoes = proximaMelhorAcao({ ...sinaisBase, diasSemInteracao: 15 }, contextoBase);
    expect(acoes[0].acao).toBe("reengajar");
    expect(acoes[0].prioridade).toBe("urgente");
  });

  it("proposta enviada sem resposta dispara cobrar_resposta", () => {
    const acoes = proximaMelhorAcao(
      { ...sinaisBase, propostasEnviadas: 1, propostaAceita: false, respostaCliente: false },
      contextoBase,
    );
    expect(acoes.some((a) => a.acao === "cobrar_resposta")).toBe(true);
  });

  it("proposta aceita sem documentos dispara solicitar_documentos urgente", () => {
    const acoes = proximaMelhorAcao(
      { ...sinaisBase, propostaAceita: true, documentosEntregues: 0 },
      contextoBase,
    );
    expect(acoes[0].acao).toBe("solicitar_documentos");
    expect(acoes[0].prioridade).toBe("urgente");
  });

  it("visitas realizadas sem proposta dispara enviar_proposta", () => {
    const acoes = proximaMelhorAcao({ ...sinaisBase, visitasRealizadas: 1 }, contextoBase);
    expect(acoes.some((a) => a.acao === "enviar_proposta")).toBe(true);
  });

  it("qualificado, sem visita e com unidades recomendadas dispara agendar_visita", () => {
    const acoes = proximaMelhorAcao(sinaisBase, { ...contextoBase, unidadesRecomendadas: 3 });
    expect(acoes.some((a) => a.acao === "agendar_visita")).toBe(true);
  });

  it("unidades recomendadas e zero interações dispara apresentar_unidades", () => {
    const acoes = proximaMelhorAcao(sinaisBase, {
      temQualificacao: false,
      unidadesRecomendadas: 2,
    });
    expect(acoes.some((a) => a.acao === "apresentar_unidades")).toBe(true);
  });

  it("nenhuma regra específica cai no fallback 'ligar'", () => {
    const sinaisNeutro: SinaisOportunidade = {
      ...sinaisBase,
      diasSemInteracao: 5,
      interacoes30d: 1,
    };
    const acoes = proximaMelhorAcao(sinaisNeutro, { temQualificacao: true, unidadesRecomendadas: 0 });
    expect(acoes[0].acao).toBe("ligar");
  });

  it("retorna no máximo 3 ações", () => {
    const acoes = proximaMelhorAcao(
      {
        ...sinaisBase,
        diasSemInteracao: 20,
        propostasEnviadas: 1,
        propostaAceita: true,
        documentosEntregues: 0,
        visitasRealizadas: 1,
      },
      { temQualificacao: false, unidadesRecomendadas: 2 },
    );
    expect(acoes.length).toBeLessThanOrEqual(3);
  });
});

describe("aderenciaLabel", () => {
  it("classifica alta, média e baixa nos limites corretos", () => {
    expect(aderenciaLabel(79).label).toBe("Aderência média");
    expect(aderenciaLabel(80).label).toBe("Aderência alta");
    expect(aderenciaLabel(59).label).toBe("Aderência baixa");
    expect(aderenciaLabel(60).label).toBe("Aderência média");
  });
});
