import { describe, expect, it } from "vitest";
import {
  acumular,
  analisarRegiao,
  consolidarObservacoes,
  lerAmbienteCredito,
  lerCorrecaoContratual,
  lerCustoObra,
  lerIndicador,
  mensalParaAnual,
  montarRadarEconomico,
  montarRadarRegional,
  type ObservacaoIndicador,
  type RegiaoBase,
  type SerieIndicador,
  type SnapshotRegiao,
} from "@/lib/platform/market";

const AGORA = new Date("2026-07-15T12:00:00.000Z");

const serie = (over: Partial<SerieIndicador> = {}): SerieIndicador => ({
  codigo: "ipca",
  nome: "IPCA",
  unidade: "% no mês",
  periodicidade: "mensal",
  fonteNome: "Banco Central do Brasil — SGS",
  fonteUrl: "https://api.bcb.gov.br/x",
  fonteSerie: "433",
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

describe("market — helpers", () => {
  it("converte taxa mensal em anual composta", () => {
    expect(mensalParaAnual(1)).toBe(12.68);
    expect(mensalParaAnual(0)).toBe(0);
  });

  it("acumula variações em cadeia, não por soma simples", () => {
    expect(acumular([1, 1])).toBe(2.01);
    expect(acumular([0.5, -0.5])).toBe(0);
  });

  it("mantém apenas a maior versão de cada competência", () => {
    const c = consolidarObservacoes([obs("2026-06-01", 0.2), obs("2026-06-01", 0.31, 2)]);
    expect(c).toHaveLength(1);
    expect(c[0]?.valor).toBe(0.31);
    expect(c[0]?.versao).toBe(2);
  });

  it("ordena da competência mais recente para a mais antiga", () => {
    const c = consolidarObservacoes([obs("2026-04-01", 1), obs("2026-06-01", 3), obs("2026-05-01", 2)]);
    expect(c.map((o) => o.valor)).toEqual([3, 2, 1]);
  });
});

describe("market — leitura de indicador (ADR-023)", () => {
  it("sem coleta devolve null com motivo, nunca zero", () => {
    const l = lerIndicador(serie(), [], AGORA);
    expect(l.valor).toBeNull();
    expect(l.frescor).toBe("sem_coleta");
    expect(l.proveniencia).toBeNull();
    expect(l.motivoAusencia).toContain("Nenhuma coleta registrada");
  });

  it("declara proveniência completa da última coleta", () => {
    const l = lerIndicador(serie(), [obs("2026-05-01", 0.4), obs("2026-06-01", 0.58)], AGORA);
    expect(l.valor).toBe(0.58);
    expect(l.proveniencia).toEqual({
      fonte: "Banco Central do Brasil — SGS",
      fonteUrl: "https://api.bcb.gov.br/x",
      fonteSerie: "433",
      referencia: "2026-06-01",
      coletadoEm: "2026-07-14T03:00:00.000Z",
      versao: 1,
    });
    expect(l.origem).toBe("externo");
  });

  it("mede variação em pontos percentuais e tendência", () => {
    const alta = lerIndicador(serie(), [obs("2026-05-01", 0.4), obs("2026-06-01", 0.6)], AGORA);
    expect(alta.variacaoAnterior).toBeCloseTo(0.2, 5);
    expect(alta.tendencia).toBe("positivo");

    const queda = lerIndicador(serie(), [obs("2026-05-01", 0.6), obs("2026-06-01", 0.4)], AGORA);
    expect(queda.tendencia).toBe("negativo");

    const estavel = lerIndicador(serie(), [obs("2026-05-01", 0.4), obs("2026-06-01", 0.4)], AGORA);
    expect(estavel.tendencia).toBe("neutro");
  });

  it("só acumula 12 meses com 12 competências coletadas", () => {
    const onze = Array.from({ length: 11 }, (_, i) =>
      obs(`2026-${String(i + 1).padStart(2, "0")}-01`, 0.5),
    );
    expect(lerIndicador(serie(), onze, AGORA).acumulado12m).toBeNull();

    const doze = Array.from({ length: 12 }, (_, i) =>
      obs(`2025-${String(i + 1).padStart(2, "0")}-01`, 0.5),
    );
    expect(lerIndicador(serie(), doze, AGORA).acumulado12m).toBeCloseTo(6.17, 2);
  });

  it("não acumula 12 meses em série diária", () => {
    const diaria = Array.from({ length: 20 }, (_, i) =>
      obs(`2026-07-${String(i + 1).padStart(2, "0")}`, 14.25),
    );
    const l = lerIndicador(
      serie({ codigo: "selic_meta", unidade: "% a.a.", periodicidade: "diaria" }),
      diaria,
      AGORA,
    );
    expect(l.acumulado12m).toBeNull();
  });

  it("classifica frescor pela defasagem da competência", () => {
    expect(lerIndicador(serie(), [obs("2026-06-01", 1)], AGORA).frescor).toBe("atual");
    expect(lerIndicador(serie(), [obs("2026-05-01", 1)], AGORA).frescor).toBe("defasado");
    expect(lerIndicador(serie(), [obs("2025-11-01", 1)], AGORA).frescor).toBe("obsoleto");
    expect(
      lerIndicador(serie({ periodicidade: "diaria", unidade: "% a.a." }), [obs("2026-07-13", 1)], AGORA)
        .frescor,
    ).toBe("atual");
  });
});

describe("market — ambientes com limiar determinístico", () => {
  const selic = (valor: number) =>
    lerIndicador(
      serie({ codigo: "selic_meta", nome: "Selic meta", unidade: "% a.a.", periodicidade: "diaria" }),
      [obs("2026-07-14", valor)],
      AGORA,
    );

  it("classifica crédito pelos limiares publicados", () => {
    expect(lerAmbienteCredito([selic(14.25)]).classe).toBe("restritivo");
    expect(lerAmbienteCredito([selic(11)]).classe).toBe("apertado");
    expect(lerAmbienteCredito([selic(9)]).classe).toBe("neutro");
    expect(lerAmbienteCredito([selic(6)]).classe).toBe("estimulante");
  });

  it("sem Selic a leitura de crédito fica indefinida", () => {
    const a = lerAmbienteCredito([]);
    expect(a.classe).toBe("indefinido");
    expect(a.fatores).toHaveLength(0);
    expect(a.proveniencias).toHaveLength(0);
  });

  it("anualiza os juros do financiamento e registra a base", () => {
    const financiamento = lerIndicador(
      serie({ codigo: "financiamento_imob_pf", nome: "Juros PF", unidade: "% a.m." }),
      [obs("2026-06-01", 1.12)],
      AGORA,
    );
    const a = lerAmbienteCredito([selic(14.25), financiamento]);
    expect(a.baseCodigos).toEqual(["selic_meta", "financiamento_imob_pf"]);
    expect(a.proveniencias).toHaveLength(2);
    expect(a.fatores[1]?.detalhe).toContain("14,30% a.a.");
  });

  it("custo de obra usa proxy declarado quando falta série de 12 meses", () => {
    const incc = lerIndicador(serie({ codigo: "incc", nome: "INCC-DI" }), [obs("2026-06-01", 0.78)], AGORA);
    const a = lerCustoObra([incc]);
    // 0,78% no mês × 12 = 9,36% -> acima do limiar de 9%.
    expect(a.classe).toBe("restritivo");
    expect(a.fatores[1]?.nome).toContain("proxy");
  });

  it("sem INCC o custo de obra não é inventado", () => {
    expect(lerCustoObra([]).classe).toBe("indefinido");
  });

  it("correção contratual usa o maior índice entre IGP-M, IPCA e TR", () => {
    const igpm = lerIndicador(serie({ codigo: "igpm", nome: "IGP-M" }), [obs("2026-06-01", 0.9)], AGORA);
    const tr = lerIndicador(serie({ codigo: "tr", nome: "TR" }), [obs("2026-06-01", 0.1)], AGORA);
    const a = lerCorrecaoContratual([igpm, tr]);
    expect(a.classe).toBe("restritivo");
    expect(a.baseCodigos).toEqual(["igpm", "tr"]);
    expect(lerCorrecaoContratual([]).classe).toBe("indefinido");
  });
});

describe("market — radar econômico", () => {
  it("mede cobertura e nunca conta série sem coleta como zero", () => {
    const comColeta = lerIndicador(serie(), [obs("2026-06-01", 0.58)], AGORA);
    const semColeta = lerIndicador(serie({ codigo: "igpm", nome: "IGP-M" }), [], AGORA);
    const radar = montarRadarEconomico([comColeta, semColeta], AGORA);

    expect(radar.seriesTotal).toBe(2);
    expect(radar.seriesComColeta).toBe(1);
    expect(radar.cobertura).toBe(50);
    expect(radar.ultimaColeta).toBe("2026-07-14T03:00:00.000Z");
    expect(radar.ambientes).toHaveLength(3);
  });

  it("lista séries obsoletas para pressionar a coleta", () => {
    const antiga = lerIndicador(serie({ nome: "IPCA" }), [obs("2024-01-01", 0.5)], AGORA);
    expect(montarRadarEconomico([antiga], AGORA).seriesObsoletas).toEqual(["IPCA"]);
  });

  it("catálogo vazio devolve cobertura zero sem quebrar", () => {
    expect(montarRadarEconomico([], AGORA).cobertura).toBe(0);
  });
});

describe("market — radar regional", () => {
  const regiao: RegiaoBase = {
    id: "r1",
    nome: "Pinheiros",
    tipo: "bairro",
    cidade: "São Paulo",
    uf: "SP",
  };

  const snap = (over: Partial<SnapshotRegiao> = {}): SnapshotRegiao => ({
    referencia: "2026-06-01",
    precoMedioM2: 14000,
    ofertaUnidades: 120,
    demandaIndice: null,
    absorcaoPct: 6,
    vacanciaPct: 8,
    tempoMedioVendaDias: 90,
    liquidezIndice: null,
    amostra: 45,
    fonteNome: "Secovi-SP",
    fonteUrl: "https://secovi.com.br/boletim",
    metodologia: "Boletim mensal do mercado imobiliário",
    coletadoEm: "2026-07-01T10:00:00.000Z",
    versao: 1,
    ...over,
  });

  it("sem coleta não gera liquidez nem aquecimento", () => {
    const a = analisarRegiao(regiao, [], AGORA);
    expect(a.atual).toBeNull();
    expect(a.liquidez).toBeNull();
    expect(a.aquecimento).toBe("indefinido");
    expect(a.cobertura).toBe(0);
    expect(a.motivoAusencia).toContain("Pinheiros");
  });

  it("declara proveniência e mede cobertura dos campos preenchidos", () => {
    const a = analisarRegiao(regiao, [snap()], AGORA);
    expect(a.proveniencia?.fonte).toBe("Secovi-SP");
    expect(a.proveniencia?.referencia).toBe("2026-06-01");
    expect(a.cobertura).toBe(71); // 5 de 7 campos de mercado
    expect(a.origem).toBe("externo");
  });

  it("liquidez sai da média dos sinais coletados", () => {
    const a = analisarRegiao(regiao, [snap()], AGORA);
    // tempo 90d -> 71 · absorção 6% -> 50 · vacância 8% -> 68
    expect(a.liquidez).toBe(63);
    expect(a.aquecimento).toBe("equilibrado");
  });

  it("liquidez exige pelo menos um sinal, senão explica a ausência", () => {
    const a = analisarRegiao(
      regiao,
      [snap({ absorcaoPct: null, vacanciaPct: null, tempoMedioVendaDias: null })],
      AGORA,
    );
    expect(a.liquidez).toBeNull();
    expect(a.motivoAusencia).toContain("ao menos um sinal");
  });

  it("classifica aquecimento por faixa de liquidez", () => {
    expect(analisarRegiao(regiao, [snap({ tempoMedioVendaDias: 40, absorcaoPct: 11, vacanciaPct: 2 })], AGORA).aquecimento).toBe("aquecido");
    expect(analisarRegiao(regiao, [snap({ tempoMedioVendaDias: 200, absorcaoPct: 2, vacanciaPct: 18 })], AGORA).aquecimento).toBe("travado");
  });

  it("mede variação de preço contra a competência mais antiga e informa a janela", () => {
    const a = analisarRegiao(
      regiao,
      [snap({ referencia: "2025-06-01", precoMedioM2: 12000 }), snap()],
      AGORA,
    );
    expect(a.variacaoPrecoPct).toBeCloseTo(16.7, 1);
    expect(a.janelaVariacaoMeses).toBe(12);
  });

  it("uma única competência não gera variação inventada", () => {
    const a = analisarRegiao(regiao, [snap()], AGORA);
    expect(a.variacaoPrecoPct).toBeNull();
    expect(a.janelaVariacaoMeses).toBeNull();
  });

  it("revisão da mesma competência prevalece pela versão", () => {
    const a = analisarRegiao(regiao, [snap(), snap({ precoMedioM2: 15500, versao: 2 })], AGORA);
    expect(a.atual?.precoMedioM2).toBe(15500);
    expect(a.amostra).toBe(1);
  });

  it("panorama regional ranqueia por liquidez e alerta sobre lacunas", () => {
    const forte = analisarRegiao(regiao, [snap({ tempoMedioVendaDias: 45, absorcaoPct: 10, vacanciaPct: 3 })], AGORA);
    const fraca = analisarRegiao(
      { ...regiao, id: "r2", nome: "Centro" },
      [snap({ tempoMedioVendaDias: 210, absorcaoPct: 1, vacanciaPct: 20 })],
      AGORA,
    );
    const vazia = analisarRegiao({ ...regiao, id: "r3", nome: "Moema" }, [], AGORA);

    const radar = montarRadarRegional([fraca, vazia, forte], AGORA);
    expect(radar.analises[0]?.regiao.nome).toBe("Pinheiros");
    expect(radar.regioesTotal).toBe(3);
    expect(radar.regioesComColeta).toBe(2);
    expect(radar.cobertura).toBe(67);
    expect(radar.destaques).toHaveLength(2);
    expect(radar.alertas.some((a) => a.includes("sem nenhuma coleta"))).toBe(true);
    expect(radar.alertas.some((a) => a.includes("Centro"))).toBe(true);
  });

  it("médias só usam regiões com coleta", () => {
    const comPreco = analisarRegiao(regiao, [snap({ precoMedioM2: 10000 })], AGORA);
    const semColeta = analisarRegiao({ ...regiao, id: "r4", nome: "Vazia" }, [], AGORA);
    const radar = montarRadarRegional([comPreco, semColeta], AGORA);
    expect(radar.precoMedioM2).toBe(10000);
    expect(radar.liquidezMedia).toBe(comPreco.liquidez);
  });

  it("radar vazio não quebra", () => {
    const radar = montarRadarRegional([], AGORA);
    expect(radar.cobertura).toBe(0);
    expect(radar.precoMedioM2).toBeNull();
    expect(radar.liquidezMedia).toBeNull();
  });
});