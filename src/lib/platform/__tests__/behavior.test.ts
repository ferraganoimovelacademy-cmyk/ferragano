import { describe, expect, it } from "vitest";
import {
  analisarComportamento,
  canalFavorito,
  confiancaPorAmostra,
  engajamento,
  janelaFavorita,
  montarPanorama,
  objecoesRecorrentes,
  perfilDeCompra,
  propensaoIndicacao,
  responsividade,
  sensibilidadePreco,
  valorDoCliente,
  velocidadeDecisao,
  type PersonBehaviorRow,
} from "@/lib/platform/behavior";

const AGORA = new Date("2026-07-31T12:00:00.000Z");

const base = (over: Partial<PersonBehaviorRow> = {}): PersonBehaviorRow => ({
  personId: "p1",
  nome: "Carlos Andrade",
  estagio: "cliente",
  origem: "indicacao",
  responsavelId: "u1",
  responsavelNome: "João",
  criadoEm: "2026-01-10T12:00:00.000Z",
  ultimoContatoEm: null,
  perfil: null,
  precoTeto: null,
  primeiroImovel: null,
  restricaoCredito: null,
  interacoesTotal: 0,
  interacoes90d: 0,
  intWhatsapp: 0,
  intLigacao: 0,
  intEmail: 0,
  intMensagem: 0,
  intVisita: 0,
  primeiraInteracao: null,
  ultimaInteracao: null,
  horaFavorita: null,
  horaFavoritaAmostra: 0,
  diaSemanaFavorito: null,
  intervaloMedioHoras: null,
  respostaPropostaHoras: null,
  respostaPropostaAmostra: 0,
  visitasAgendadas: 0,
  visitasRealizadas: 0,
  visitasFaltou: 0,
  propostas: 0,
  propostasEnviadas: 0,
  propostasAceitas: 0,
  propostasRecusadas: 0,
  rodadasPropostaMax: 0,
  diasAtePrimeiraProposta: null,
  descontoMedioPct: null,
  vendas: 0,
  distratos: 0,
  ltv: 0,
  cicloFechamentoDias: null,
  oportunidades: 0,
  oportunidadesPerdidas: 0,
  motivosPerda: [],
  indicacoesFeitas: 0,
  ...over,
});

describe("confiancaPorAmostra", () => {
  it("é zero sem amostra", () => {
    expect(confiancaPorAmostra(0, 5)).toBe(0);
  });

  it("fica abaixo de 50 quando a amostra não atinge o mínimo", () => {
    expect(confiancaPorAmostra(2, 5)).toBeLessThan(50);
  });

  it("cresce com a amostra e satura em 95", () => {
    expect(confiancaPorAmostra(5, 5)).toBeGreaterThanOrEqual(45);
    expect(confiancaPorAmostra(500, 5)).toBeLessThanOrEqual(95);
    expect(confiancaPorAmostra(50, 5)).toBeGreaterThan(confiancaPorAmostra(10, 5));
  });
});

describe("GATE 01 — canal favorito", () => {
  it("não devolve canal sem amostra mínima", () => {
    const t = canalFavorito(base({ intWhatsapp: 2, interacoesTotal: 2 }), AGORA);
    expect(t.valor).toBeNull();
    expect(t.motivoAusencia).toContain("mínimo de 5");
    expect(t.nivel).toBe("insuficiente");
  });

  it("mede o canal dominante com participação", () => {
    const t = canalFavorito(
      base({ intWhatsapp: 18, intLigacao: 7, intEmail: 6, intVisita: 3, interacoesTotal: 34 }),
      AGORA,
    );
    expect(t.valor?.canal).toBe("whatsapp");
    expect(t.valor?.interacoes).toBe(18);
    expect(t.valor?.participacaoPct).toBeCloseTo(52.9, 1);
    expect(t.fatores[0]?.detalhe).toContain("18");
  });

  it("marca preferência fraca quando há empate", () => {
    const t = canalFavorito(base({ intWhatsapp: 10, intLigacao: 10, interacoesTotal: 20 }), AGORA);
    expect(t.fatores.some((f) => f.nome === "Preferência pouco marcada")).toBe(true);
  });
});

describe("GATE 01b — janela favorita", () => {
  it("exige amostra para declarar horário", () => {
    const t = janelaFavorita(base({ interacoesTotal: 3, horaFavorita: 9, horaFavoritaAmostra: 2 }), AGORA);
    expect(t.valor).toBeNull();
  });

  it("classifica a faixa do dia e o dia da semana", () => {
    const t = janelaFavorita(
      base({ interacoesTotal: 20, horaFavorita: 19, horaFavoritaAmostra: 9, diaSemanaFavorito: 2 }),
      AGORA,
    );
    expect(t.valor?.faixa).toBe("noite");
    expect(t.valor?.diaLabel).toBe("Terça");
    expect(t.confianca).toBeGreaterThan(0);
  });
});

describe("GATE 02 — responsividade", () => {
  it("declara ausência quando nenhuma proposta foi respondida", () => {
    const t = responsividade(base({ intervaloMedioHoras: 72 }), AGORA);
    expect(t.valor).toBeNull();
    expect(t.motivoAusencia).toContain("Nenhuma proposta");
    expect(t.fatores[0]?.nome).toContain("proxy");
  });

  it("mede tempo médio de resposta e classifica", () => {
    const t = responsividade(base({ respostaPropostaHoras: 18, respostaPropostaAmostra: 4 }), AGORA);
    expect(t.valor?.classe).toBe("imediata");
    expect(t.valor?.horas).toBe(18);
  });

  it("classifica resposta acima de uma semana como muito lenta", () => {
    const t = responsividade(base({ respostaPropostaHoras: 200, respostaPropostaAmostra: 3 }), AGORA);
    expect(t.valor?.classe).toBe("muito_lenta");
  });
});

describe("GATE 03 — velocidade de decisão", () => {
  it("não inventa velocidade sem proposta nem venda", () => {
    const t = velocidadeDecisao(base(), AGORA);
    expect(t.valor).toBeNull();
    expect(t.confianca).toBe(0);
  });

  it("usa o ciclo de assinatura quando existe venda", () => {
    const t = velocidadeDecisao(
      base({ vendas: 1, cicloFechamentoDias: 22, propostasEnviadas: 2, diasAtePrimeiraProposta: 9 }),
      AGORA,
    );
    expect(t.valor?.classe).toBe("rapida");
    expect(t.valor?.cicloFechamentoDias).toBe(22);
    expect(t.valor?.diasAtePrimeiraProposta).toBe(9);
  });

  it("degrada a confiança quando só há proposta enviada", () => {
    const comVenda = velocidadeDecisao(base({ vendas: 3, cicloFechamentoDias: 40 }), AGORA);
    const semVenda = velocidadeDecisao(base({ propostasEnviadas: 3, diasAtePrimeiraProposta: 40 }), AGORA);
    expect(semVenda.confianca).toBeLessThan(comVenda.confianca);
  });

  it("classifica ciclo longo", () => {
    const t = velocidadeDecisao(base({ vendas: 1, cicloFechamentoDias: 140 }), AGORA);
    expect(t.valor?.classe).toBe("longa");
  });
});

describe("GATE 04 — sensibilidade a preço", () => {
  it("declara ausência sem desconto, renegociação ou recusa", () => {
    const t = sensibilidadePreco(base({ vendas: 1 }), AGORA);
    expect(t.valor).toBeNull();
  });

  it("detecta sensibilidade alta com desconto e renegociação", () => {
    const t = sensibilidadePreco(
      base({ vendas: 1, descontoMedioPct: 8, rodadasPropostaMax: 3, propostas: 3 }),
      AGORA,
    );
    expect(t.valor?.classe).toBe("alta");
    expect(t.valor?.descontoMedioPct).toBe(8);
  });

  it("reduz a sensibilidade quando comprou acima do teto declarado", () => {
    const t = sensibilidadePreco(
      base({ vendas: 1, descontoMedioPct: 3, rodadasPropostaMax: 2, precoTeto: 500_000, ltv: 620_000, propostas: 2 }),
      AGORA,
    );
    expect(t.fatores.some((f) => f.nome.includes("acima do teto"))).toBe(true);
    expect(t.valor?.classe).not.toBe("alta");
  });
});

describe("GATE 05 — perfil de compra", () => {
  it("não classifica sem qualificação e sem histórico", () => {
    const t = perfilDeCompra(base(), AGORA);
    expect(t.valor).toBeNull();
  });

  it("observa investidor por recorrência", () => {
    const t = perfilDeCompra(base({ vendas: 3, estagio: "investidor" }), AGORA);
    expect(t.valor?.observado).toBe("investidor");
  });

  it("observa moradia quando é primeiro imóvel", () => {
    const t = perfilDeCompra(base({ perfil: "moradia", primeiroImovel: true }), AGORA);
    expect(t.valor?.declarado).toBe("moradia");
    expect(t.valor?.observado).toBe("moradia");
  });
});

describe("GATE 06 — objeções", () => {
  it("distingue ausência de perda de perda sem motivo", () => {
    expect(objecoesRecorrentes(base(), AGORA).motivoAusencia).toContain("Nenhuma oportunidade perdida");
    expect(objecoesRecorrentes(base({ oportunidadesPerdidas: 2 }), AGORA).motivoAusencia).toContain(
      "sem motivo preenchido",
    );
  });

  it("lista motivos registrados como fatores", () => {
    const t = objecoesRecorrentes(base({ oportunidadesPerdidas: 2, motivosPerda: ["Preço", "Prazo de entrega"] }), AGORA);
    expect(t.valor).toEqual(["Preço", "Prazo de entrega"]);
    expect(t.fatores).toHaveLength(2);
  });
});

describe("GATE 07 — valor e indicação", () => {
  it("não reporta LTV zero como medição", () => {
    const t = valorDoCliente(base(), AGORA);
    expect(t.valor).toBeNull();
    expect(t.motivoAusencia).toContain("não estimado");
  });

  it("soma o valor realizado e penaliza distrato", () => {
    const t = valorDoCliente(base({ vendas: 2, ltv: 1_250_000, distratos: 1 }), AGORA);
    expect(t.valor?.ltv).toBe(1_250_000);
    expect(t.fatores.some((f) => f.direcao === "negativo")).toBe(true);
  });

  it("classifica propensão a indicar como alta com indicação registrada", () => {
    const t = propensaoIndicacao(base({ indicacoesFeitas: 2, vendas: 1 }), AGORA);
    expect(t.valor?.classe).toBe("alta");
  });

  it("derruba a propensão quando há distrato", () => {
    const t = propensaoIndicacao(base({ vendas: 1, distratos: 1 }), AGORA);
    expect(t.valor?.classe).toBe("baixa");
  });
});

describe("GATE 08 — engajamento", () => {
  it("não trata ausência de registro como desengajamento", () => {
    const t = engajamento(base(), AGORA);
    expect(t.valor).toBeNull();
    expect(t.motivoAusencia).toContain("ausência de registro");
  });

  it("pontua alto com interação recente, visita e proposta", () => {
    const t = engajamento(
      base({
        interacoesTotal: 30,
        interacoes90d: 8,
        visitasRealizadas: 2,
        propostasEnviadas: 1,
        ultimoContatoEm: "2026-07-29T12:00:00.000Z",
      }),
      AGORA,
    );
    expect(t.valor?.classe).toBe("ativo");
    expect(t.valor?.score).toBeGreaterThanOrEqual(70);
  });

  it("marca contato frio", () => {
    const t = engajamento(
      base({ interacoesTotal: 10, interacoes90d: 0, ultimoContatoEm: "2025-12-01T12:00:00.000Z" }),
      AGORA,
    );
    expect(t.valor?.classe).toBe("inativo");
  });

  it("mantém o score entre 0 e 100", () => {
    const t = engajamento(
      base({ interacoesTotal: 500, interacoes90d: 200, visitasRealizadas: 9, propostasEnviadas: 9, ultimoContatoEm: AGORA.toISOString() }),
      AGORA,
    );
    expect(t.valor!.score).toBeLessThanOrEqual(100);
  });
});

describe("analisarComportamento", () => {
  const rico = base({
    interacoesTotal: 34,
    interacoes90d: 12,
    intWhatsapp: 18,
    intLigacao: 7,
    intEmail: 6,
    intVisita: 3,
    horaFavorita: 19,
    horaFavoritaAmostra: 12,
    diaSemanaFavorito: 3,
    respostaPropostaHoras: 200,
    respostaPropostaAmostra: 3,
    propostas: 3,
    propostasEnviadas: 2,
    propostasRecusadas: 1,
    rodadasPropostaMax: 3,
    diasAtePrimeiraProposta: 12,
    descontoMedioPct: 7,
    vendas: 2,
    ltv: 1_400_000,
    cicloFechamentoDias: 60,
    oportunidades: 3,
    oportunidadesPerdidas: 1,
    motivosPerda: ["Preço acima do orçamento"],
    indicacoesFeitas: 1,
    ultimoContatoEm: "2026-07-28T12:00:00.000Z",
  });

  it("todo traço carrega base, fatores e timestamp (ADR-021)", () => {
    const p = analisarComportamento(rico, AGORA);
    for (const t of [p.canal, p.janela, p.resposta, p.velocidade, p.preco, p.objecoes, p.valor, p.indicacao, p.engajamento]) {
      expect(t.base.length).toBeGreaterThan(0);
      expect(t.calculadoEm).toBe(AGORA.toISOString());
      if (t.valor == null) expect(t.motivoAusencia).toBeTruthy();
    }
  });

  it("gera recomendações de abordagem só a partir de traços medidos", () => {
    const p = analisarComportamento(rico, AGORA);
    expect(p.comoAbordar.some((s) => s.includes("WhatsApp"))).toBe(true);
    expect(p.comoAbordar.some((s) => s.includes("19h"))).toBe(true);
    expect(p.comoAbordar.some((s) => s.includes("condição fechada"))).toBe(true);
    expect(p.comoAbordar.some((s) => s.includes("Preço acima do orçamento"))).toBe(true);
  });

  it("pessoa sem histórico tem cobertura zero e nenhuma recomendação", () => {
    const p = analisarComportamento(base(), AGORA);
    expect(p.cobertura).toBe(0);
    expect(p.comoAbordar).toHaveLength(0);
  });

  it("cobertura cresce com evidência", () => {
    expect(analisarComportamento(rico, AGORA).cobertura).toBeGreaterThan(
      analisarComportamento(base({ interacoesTotal: 6, intWhatsapp: 6 }), AGORA).cobertura,
    );
  });
});

describe("montarPanorama", () => {
  it("consolida canais, engajamento e objeções da carteira", () => {
    const perfis = [
      analisarComportamento(
        base({
          personId: "a",
          interacoesTotal: 20,
          interacoes90d: 6,
          intWhatsapp: 15,
          intLigacao: 5,
          horaFavorita: 10,
          horaFavoritaAmostra: 9,
          respostaPropostaHoras: 20,
          respostaPropostaAmostra: 3,
          vendas: 1,
          ltv: 500_000,
          cicloFechamentoDias: 30,
          ultimoContatoEm: "2026-07-30T12:00:00.000Z",
          oportunidadesPerdidas: 1,
          motivosPerda: ["Preço"],
        }),
        AGORA,
      ),
      analisarComportamento(
        base({
          personId: "b",
          interacoesTotal: 12,
          intLigacao: 9,
          intEmail: 3,
          horaFavorita: 20,
          horaFavoritaAmostra: 6,
          oportunidadesPerdidas: 1,
          motivosPerda: ["Preço"],
        }),
        AGORA,
      ),
      analisarComportamento(base({ personId: "c" }), AGORA),
    ];

    const pan = montarPanorama(perfis, AGORA);
    expect(pan.pessoas).toBe(3);
    expect(pan.comEvidencia).toBe(2);
    expect(pan.canais[0]?.canal).toBe("whatsapp");
    expect(pan.faixas.map((f) => f.faixa)).toEqual(expect.arrayContaining(["manhã", "noite"]));
    expect(pan.objecoesTop[0]).toEqual({ motivo: "Preço", ocorrencias: 2 });
    expect(pan.ltvTotal).toBe(500_000);
    expect(pan.respostaMediaHoras).toBe(20);
    expect(pan.cicloMedioDias).toBe(30);
  });

  it("devolve médias nulas quando nada foi medido", () => {
    const pan = montarPanorama([analisarComportamento(base(), AGORA)], AGORA);
    expect(pan.respostaMediaHoras).toBeNull();
    expect(pan.cicloMedioDias).toBeNull();
    expect(pan.coberturaMedia).toBe(0);
  });
});
