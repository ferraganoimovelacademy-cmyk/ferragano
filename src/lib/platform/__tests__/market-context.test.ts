import { describe, expect, it } from "vitest";
import { lerIndicador, type ObservacaoIndicador, type SerieIndicador } from "@/lib/platform/market";
import {
  interpretarIndicador,
  medirConfianca,
  montarMarketContext,
  narrarIndicador,
} from "@/lib/platform/market-context";

const AGORA = new Date("2026-07-15T12:00:00.000Z");

const serie = (over: Partial<SerieIndicador> = {}): SerieIndicador => ({
  codigo: "selic_meta",
  nome: "Selic meta",
  unidade: "% a.a.",
  periodicidade: "diaria",
  fonteNome: "Banco Central do Brasil — SGS",
  fonteUrl: "https://api.bcb.gov.br/x",
  fonteSerie: "432",
  descricao: null,
  ordem: 1,
  ...over,
});

const obs = (referencia: string, valor: number, versao = 1): ObservacaoIndicador => ({
  referencia,
  valor,
  fonteNome: "Banco Central do Brasil — SGS",
  fonteUrl: "https://api.bcb.gov.br/x",
  coletadoEm: "2026-07-14T03:00:00.000Z",
  versao,
});

const ler = (over: Partial<SerieIndicador>, observacoes: ObservacaoIndicador[]) =>
  lerIndicador(serie(over), observacoes, AGORA);

const impactoDe = (over: Partial<SerieIndicador>, observacoes: ObservacaoIndicador[], publico: string) =>
  interpretarIndicador(ler(over, observacoes)).impactos.find((i) => i.publico === publico);

describe("market-context — confiança", () => {
  it("sem coleta a confiança é indefinida e nada é concluído", () => {
    const ctx = interpretarIndicador(ler({}, []));
    expect(ctx.confianca).toBe("indefinida");
    expect(ctx.impactos).toHaveLength(0);
    expect(ctx.acaoSugerida).toBeNull();
    expect(ctx.motivoAusencia).toContain("Selic meta");
  });

  it("série obsoleta derruba a confiança para baixa", () => {
    const l = ler({}, [obs("2025-01-02", 13.5), obs("2025-01-03", 13.75)]);
    expect(medirConfianca(l).confianca).toBe("baixa");
  });

  it("uma única competência não passa de confiança média", () => {
    expect(medirConfianca(ler({}, [obs("2026-07-14", 14.25)])).confianca).toBe("media");
  });

  it("coleta atual com série longa dá confiança alta", () => {
    const seis = Array.from({ length: 6 }, (_, i) => obs(`2026-07-${String(9 + i).padStart(2, "0")}`, 14 + i * 0.05));
    expect(medirConfianca(ler({}, seis)).confianca).toBe("alta");
  });
});

describe("market-context — juro básico", () => {
  const alta = [obs("2026-07-13", 13.75), obs("2026-07-14", 14.25)];
  const baixa = [obs("2026-07-13", 7.5), obs("2026-07-14", 7)];

  it("Selic restritiva encarece o crédito do comprador", () => {
    const i = impactoDe({}, alta, "comprador");
    expect(i?.direcao).toBe("negativo");
    expect(i?.titulo).toBe("Crédito mais caro");
    expect(i?.base).toBe("regra_negocio");
  });

  it("Selic restritiva deixa o investidor conservador", () => {
    expect(impactoDe({}, alta, "investidor")?.titulo).toBe("Investidor mais conservador");
  });

  it("Selic estimulante inverte a leitura do comprador", () => {
    const i = impactoDe({}, baixa, "comprador");
    expect(i?.direcao).toBe("positivo");
    expect(i?.titulo).toBe("Crédito mais acessível");
  });

  it("efeito no ciclo de venda depende de dado interno, nunca de regra externa", () => {
    expect(impactoDe({}, alta, "velocidade_vendas")?.base).toBe("dado_interno");
  });

  it("funding da construtora só é penalizado no patamar restritivo", () => {
    expect(impactoDe({}, alta, "construtora")?.direcao).toBe("negativo");
    expect(impactoDe({}, [obs("2026-07-13", 11), obs("2026-07-14", 11.5)], "construtora")?.direcao).toBe("neutro");
  });

  it("a regra declara o limiar aplicado", () => {
    expect(interpretarIndicador(ler({}, alta)).regra).toContain("13% restritivo");
  });
});

describe("market-context — financiamento imobiliário", () => {
  const over = { codigo: "financiamento_imob_pf", nome: "Juros PF", unidade: "% a.m.", periodicidade: "mensal" as const };

  it("taxa mensal é anualizada de forma composta antes do limiar", () => {
    const ctx = interpretarIndicador(ler(over, [obs("2026-06-01", 1.12)]));
    expect(ctx.regra).toContain("14,30% a.a.");
    expect(ctx.impactos.find((i) => i.publico === "comprador")?.titulo).toBe("Parcela pressionada");
  });

  it("taxa baixa vira argumento de conversão", () => {
    const ctx = interpretarIndicador(ler(over, [obs("2026-06-01", 0.7)]));
    expect(ctx.impactos.find((i) => i.publico === "comprador")?.direcao).toBe("positivo");
    expect(ctx.acaoSugerida).toContain("simulação de parcela");
  });
});

describe("market-context — custo de obra e correção contratual", () => {
  const incc = { codigo: "incc", nome: "INCC-DI", unidade: "% no mês", periodicidade: "mensal" as const };
  const igpm = { codigo: "igpm", nome: "IGP-M", unidade: "% no mês", periodicidade: "mensal" as const };

  it("INCC pressionado alerta a construtora e favorece estoque pronto", () => {
    const ctx = interpretarIndicador(ler(incc, [obs("2026-06-01", 0.78)]));
    expect(ctx.impactos.find((i) => i.publico === "construtora")?.direcao).toBe("negativo");
    expect(ctx.impactos.find((i) => i.publico === "investidor")?.direcao).toBe("positivo");
    expect(ctx.regra).toContain("proxy do mês × 12");
  });

  it("INCC contido não gera alerta de margem", () => {
    const ctx = interpretarIndicador(ler(incc, [obs("2026-06-01", 0.2)]));
    expect(ctx.impactos.find((i) => i.publico === "construtora")?.direcao).toBe("neutro");
  });

  it("IGP-M alto coloca o indexador em discussão", () => {
    const ctx = interpretarIndicador(ler(igpm, [obs("2026-06-01", 0.6)]));
    expect(ctx.impactos.find((i) => i.publico === "negociacao")?.titulo).toBe("Indexador entra em discussão");
    expect(ctx.acaoSugerida).toContain("indexadores");
  });

  it("IGP-M contido não sugere ação", () => {
    expect(interpretarIndicador(ler(igpm, [obs("2026-06-01", 0.1)])).acaoSugerida).toBeNull();
  });

  it("indicador sem regra publicada não é interpretado", () => {
    const ctx = interpretarIndicador(ler({ codigo: "pib", nome: "PIB" }, [obs("2026-07-14", 2)]));
    expect(ctx.impactos).toHaveLength(0);
    expect(ctx.motivoAusencia).toContain("regra de impacto publicada");
  });
});

describe("market-context — narrativa e agregação", () => {
  it("narra apenas movimento, com fonte e base declaradas", () => {
    const ctx = interpretarIndicador(ler({}, [obs("2026-07-13", 13.75), obs("2026-07-14", 14.25)]));
    const n = narrarIndicador(ctx);
    expect(n?.texto).toContain("subiu");
    expect(n?.texto).toContain("Banco Central do Brasil");
    expect(n?.texto).toContain("Ação sugerida");
    expect(n?.base).toBe("dado_interno");
  });

  it("indicador estável não gera narrativa", () => {
    const ctx = interpretarIndicador(ler({}, [obs("2026-07-13", 14.25), obs("2026-07-14", 14.25)]));
    expect(narrarIndicador(ctx)).toBeNull();
  });

  it("indicador sem coleta não gera narrativa", () => {
    expect(narrarIndicador(interpretarIndicador(ler({}, [])))).toBeNull();
  });

  it("agrega cobertura de interpretação e ordena por confiança", () => {
    const selic = ler({}, [obs("2026-07-13", 13.75), obs("2026-07-14", 14.25)]);
    const igpmObsoleto = ler(
      { codigo: "igpm", nome: "IGP-M", unidade: "% no mês", periodicidade: "mensal" },
      [obs("2025-01-01", 0.4), obs("2025-02-01", 0.9)],
    );
    const semColeta = ler({ codigo: "cdi", nome: "CDI" }, []);

    const c = montarMarketContext([igpmObsoleto, selic, semColeta], AGORA);
    expect(c.indicadoresComContexto).toBe(2);
    expect(c.indicadoresSemColeta).toBe(1);
    expect(c.narrativas).toHaveLength(2);
    expect(c.narrativas[0]?.chave).toBe("selic_meta");
    expect(c.narrativas[1]?.confianca).toBe("baixa");
    expect(c.geradoEm).toBe(AGORA.toISOString());
  });

  it("catálogo vazio não quebra", () => {
    const c = montarMarketContext([], AGORA);
    expect(c.indicadores).toHaveLength(0);
    expect(c.narrativas).toHaveLength(0);
  });
});
