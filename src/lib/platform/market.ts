/**
 * SPRINT 25 — MARKET INTELLIGENCE (contexto Market).
 *
 * Camada pura e client-safe. Não consulta nada: recebe o que a Query Layer
 * (`market.functions.ts`) leu e devolve leituras de MERCADO.
 *
 * Princípio do ADR-023 — dado externo tem proveniência declarada:
 * - todo número externo carrega fonte, endereço, data de referência,
 *   momento da coleta e versão;
 * - dado externo NUNCA é somado, misturado ou comparado com dado interno
 *   (vendas, propostas, oportunidades) dentro do mesmo indicador;
 * - sem coleta não existe estimativa: devolve `valor: null` com o motivo;
 * - classificação qualitativa é regra determinística com limiar documentado,
 *   nunca opinião de LLM.
 */

import type { Direcao, Fator } from "@/lib/platform/predictive";

/* ------------------------------------------------------------------ *
 * Proveniência (ADR-023)
 * ------------------------------------------------------------------ */

export type Proveniencia = {
  /** Nome da instituição/fonte, exatamente como publicada. */
  fonte: string;
  fonteUrl: string | null;
  /** Série/identificador do dado na fonte, quando existir. */
  fonteSerie: string | null;
  /** Data de referência do dado (competência), não a data da coleta. */
  referencia: string;
  /** Quando a plataforma coletou. */
  coletadoEm: string;
  /** Revisões da fonte não sobrescrevem: cada revisão é uma versão. */
  versao: number;
};

/** Marcador obrigatório: separa o dado de mercado do dado próprio. */
export const ORIGEM_EXTERNA = "externo" as const;
export type OrigemDado = typeof ORIGEM_EXTERNA;

export type Frescor = "atual" | "defasado" | "obsoleto" | "sem_coleta";

export const frescorLabels: Record<Frescor, string> = {
  atual: "Atualizado",
  defasado: "Defasado",
  obsoleto: "Obsoleto",
  sem_coleta: "Sem coleta",
};

export type Periodicidade = "diaria" | "mensal" | "trimestral" | "anual";

/** Janelas de frescor por periodicidade, em dias desde a referência. */
const janelas: Record<Periodicidade, { atual: number; defasado: number }> = {
  diaria: { atual: 5, defasado: 15 },
  mensal: { atual: 45, defasado: 80 },
  trimestral: { atual: 120, defasado: 200 },
  anual: { atual: 400, defasado: 550 },
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round = (v: number, casas = 0) => {
  const f = 10 ** casas;
  return Math.round(v * f) / f;
};
const dias = (de: string, ate: Date) =>
  Math.floor((ate.getTime() - new Date(de).getTime()) / 86_400_000);

export const pct = (v: number, casas = 2) =>
  `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v)}%`;

/** Converte taxa mensal em anual equivalente (juros compostos). */
export function mensalParaAnual(taxaMensalPct: number): number {
  return round(((1 + taxaMensalPct / 100) ** 12 - 1) * 100, 2);
}

/** Acumula variações percentuais em cadeia (composto), não soma simples. */
export function acumular(variacoesPct: number[]): number {
  const resultado = round((variacoesPct.reduce((acc, v) => acc * (1 + v / 100), 1) - 1) * 100, 2);
  return resultado === 0 ? 0 : resultado;
}

/* ------------------------------------------------------------------ *
 * GATE 01 — Radar Econômico
 * ------------------------------------------------------------------ */

export type SerieIndicador = {
  codigo: string;
  nome: string;
  unidade: string;
  periodicidade: Periodicidade;
  fonteNome: string;
  fonteUrl: string | null;
  fonteSerie: string | null;
  descricao: string | null;
  ordem: number;
};

export type ObservacaoIndicador = {
  referencia: string;
  valor: number;
  fonteNome: string;
  fonteUrl: string | null;
  coletadoEm: string;
  versao: number;
};

export type LeituraIndicador = {
  codigo: string;
  nome: string;
  unidade: string;
  periodicidade: Periodicidade;
  descricao: string | null;
  origem: OrigemDado;
  valor: number | null;
  /** Variação em pontos percentuais contra a coleta anterior. */
  variacaoAnterior: number | null;
  /** Acumulado composto de 12 competências, apenas para série mensal em %. */
  acumulado12m: number | null;
  tendencia: Direcao | null;
  amostra: number;
  defasagemDias: number | null;
  frescor: Frescor;
  proveniencia: Proveniencia | null;
  /** Preenchido quando `valor` é null. */
  motivoAusencia?: string;
};

/** Mantém apenas a maior versão de cada competência, mais recente primeiro. */
export function consolidarObservacoes(obs: ObservacaoIndicador[]): ObservacaoIndicador[] {
  const porReferencia = new Map<string, ObservacaoIndicador>();
  for (const o of obs) {
    const atual = porReferencia.get(o.referencia);
    if (!atual || o.versao > atual.versao) porReferencia.set(o.referencia, o);
  }
  return [...porReferencia.values()].sort((a, b) => (a.referencia < b.referencia ? 1 : -1));
}

function classificarFrescor(periodicidade: Periodicidade, defasagem: number): Frescor {
  const janela = janelas[periodicidade];
  if (defasagem <= janela.atual) return "atual";
  if (defasagem <= janela.defasado) return "defasado";
  return "obsoleto";
}

const ehPercentualMensal = (unidade: string) => unidade.trim().toLowerCase() === "% no mês";

export function lerIndicador(
  serie: SerieIndicador,
  observacoes: ObservacaoIndicador[],
  agora = new Date(),
): LeituraIndicador {
  const base = {
    codigo: serie.codigo,
    nome: serie.nome,
    unidade: serie.unidade,
    periodicidade: serie.periodicidade,
    descricao: serie.descricao,
    origem: ORIGEM_EXTERNA,
  };

  const consolidadas = consolidarObservacoes(observacoes);
  const ultima = consolidadas[0];

  if (!ultima) {
    return {
      ...base,
      valor: null,
      variacaoAnterior: null,
      acumulado12m: null,
      tendencia: null,
      amostra: 0,
      defasagemDias: null,
      frescor: "sem_coleta",
      proveniencia: null,
      motivoAusencia: `Nenhuma coleta registrada para ${serie.nome}. Sem coleta não há valor — a plataforma não estima indicador de mercado.`,
    };
  }

  const anterior = consolidadas[1];
  const variacaoAnterior = anterior ? round(ultima.valor - anterior.valor, 4) : null;
  const tendencia: Direcao | null =
    variacaoAnterior == null
      ? null
      : variacaoAnterior > 0
        ? "positivo"
        : variacaoAnterior < 0
          ? "negativo"
          : "neutro";

  const acumulado12m =
    serie.periodicidade === "mensal" && ehPercentualMensal(serie.unidade) && consolidadas.length >= 12
      ? acumular(consolidadas.slice(0, 12).map((o) => o.valor))
      : null;

  const defasagemDias = Math.max(0, dias(ultima.referencia, agora));

  return {
    ...base,
    valor: ultima.valor,
    variacaoAnterior,
    acumulado12m,
    tendencia,
    amostra: consolidadas.length,
    defasagemDias,
    frescor: classificarFrescor(serie.periodicidade, defasagemDias),
    proveniencia: {
      fonte: ultima.fonteNome || serie.fonteNome,
      fonteUrl: ultima.fonteUrl ?? serie.fonteUrl,
      fonteSerie: serie.fonteSerie,
      referencia: ultima.referencia,
      coletadoEm: ultima.coletadoEm,
      versao: ultima.versao,
    },
  };
}

/* ------------------------------------------------------------------ *
 * GATE 02 — Leituras de ambiente (regra determinística, limiar explícito)
 * ------------------------------------------------------------------ */

export type ClasseAmbiente = "estimulante" | "neutro" | "apertado" | "restritivo" | "indefinido";

export const classeAmbienteLabels: Record<ClasseAmbiente, string> = {
  estimulante: "Estimulante",
  neutro: "Neutro",
  apertado: "Apertado",
  restritivo: "Restritivo",
  indefinido: "Sem base",
};

export type LeituraAmbiente = {
  chave: "credito" | "custo_obra" | "correcao";
  titulo: string;
  classe: ClasseAmbiente;
  resumo: string;
  fatores: Fator[];
  /** Códigos das séries usadas — auditoria da leitura. */
  baseCodigos: string[];
  proveniencias: Proveniencia[];
};

const fator = (nome: string, detalhe: string, direcao: Direcao, peso = 0): Fator => ({
  nome,
  detalhe,
  peso,
  direcao,
});

function usar(leituras: LeituraIndicador[], codigo: string): LeituraIndicador | undefined {
  return leituras.find((l) => l.codigo === codigo && l.valor != null);
}

/** Crédito: Selic meta + juros médios do financiamento imobiliário PF. */
export function lerAmbienteCredito(leituras: LeituraIndicador[]): LeituraAmbiente {
  const selic = usar(leituras, "selic_meta");
  const financiamento = usar(leituras, "financiamento_imob_pf");
  const fatores: Fator[] = [];
  const proveniencias: Proveniencia[] = [];
  const baseCodigos: string[] = [];

  let classe: ClasseAmbiente = "indefinido";
  let resumo = "Sem coleta de Selic: a leitura de crédito fica indefinida.";

  if (selic?.valor != null) {
    const s = selic.valor;
    classe = s >= 13 ? "restritivo" : s >= 10 ? "apertado" : s >= 8 ? "neutro" : "estimulante";
    resumo =
      classe === "restritivo"
        ? "Juro básico alto encarece a parcela e alonga o ciclo de decisão."
        : classe === "apertado"
          ? "Juro ainda pressiona a parcela; condição comercial pesa mais que preço."
          : classe === "neutro"
            ? "Juro em patamar intermediário; crédito não é o fator dominante."
            : "Juro baixo amplia a capacidade de compra financiada.";
    fatores.push(
      fator(
        "Selic meta",
        `${pct(s)} a.a. — limiar: ≥13% restritivo, ≥10% apertado, ≥8% neutro, abaixo estimulante.`,
        classe === "restritivo" || classe === "apertado" ? "negativo" : "positivo",
      ),
    );
    baseCodigos.push(selic.codigo);
    if (selic.proveniencia) proveniencias.push(selic.proveniencia);
  }

  if (financiamento?.valor != null) {
    const anual = mensalParaAnual(financiamento.valor);
    fatores.push(
      fator(
        "Financiamento imobiliário PF",
        `${pct(financiamento.valor)} a.m. — equivalente a ${pct(anual)} a.a. (juros compostos).`,
        anual >= 12 ? "negativo" : "positivo",
      ),
    );
    baseCodigos.push(financiamento.codigo);
    if (financiamento.proveniencia) proveniencias.push(financiamento.proveniencia);
  }

  return { chave: "credito", titulo: "Ambiente de crédito", classe, resumo, fatores, baseCodigos, proveniencias };
}

/** Custo de obra: INCC. Relevante para venda na planta. */
export function lerCustoObra(leituras: LeituraIndicador[]): LeituraAmbiente {
  const incc = usar(leituras, "incc");
  if (!incc || incc.valor == null) {
    return {
      chave: "custo_obra",
      titulo: "Custo de obra",
      classe: "indefinido",
      resumo: "Sem coleta de INCC: não é possível ler pressão de custo de obra.",
      fatores: [],
      baseCodigos: [],
      proveniencias: [],
    };
  }

  const anual = incc.acumulado12m;
  const referencia = anual ?? incc.valor * 12;
  const classe: ClasseAmbiente =
    referencia >= 9 ? "restritivo" : referencia >= 6 ? "apertado" : referencia >= 3 ? "neutro" : "estimulante";

  const fatores: Fator[] = [
    fator(
      "INCC no mês",
      `${pct(incc.valor)} na competência ${incc.proveniencia?.referencia ?? "—"}.`,
      incc.valor > 0.6 ? "negativo" : "neutro",
    ),
    fator(
      anual != null ? "INCC acumulado 12 meses" : "Projeção anualizada (proxy)",
      anual != null
        ? `${pct(anual)} — acumulado composto de 12 competências coletadas.`
        : `${pct(round(referencia, 2))} — proxy do mês × 12; menos de 12 competências coletadas.`,
      referencia >= 6 ? "negativo" : "neutro",
    ),
  ];

  return {
    chave: "custo_obra",
    titulo: "Custo de obra",
    classe,
    resumo:
      classe === "restritivo" || classe === "apertado"
        ? "Obra encarecendo: reajuste de tabela e correção de parcela na planta pesam na negociação."
        : "Custo de obra sob controle: reajuste de parcela tende a ser menos sensível na negociação.",
    fatores,
    baseCodigos: [incc.codigo],
    proveniencias: incc.proveniencia ? [incc.proveniencia] : [],
  };
}

/** Correção contratual: IGP-M, IPCA e TR. */
export function lerCorrecaoContratual(leituras: LeituraIndicador[]): LeituraAmbiente {
  const alvos = ["igpm", "ipca", "tr"];
  const usados = alvos
    .map((codigo) => usar(leituras, codigo))
    .filter((l): l is LeituraIndicador => Boolean(l));

  if (usados.length === 0) {
    return {
      chave: "correcao",
      titulo: "Correção contratual",
      classe: "indefinido",
      resumo: "Sem coleta de IGP-M, IPCA ou TR: correção de contrato fica sem base.",
      fatores: [],
      baseCodigos: [],
      proveniencias: [],
    };
  }

  const fatores = usados.map((l) =>
    fator(
      l.nome,
      l.acumulado12m != null
        ? `${pct(l.valor as number)} no mês · ${pct(l.acumulado12m)} em 12 meses.`
        : `${pct(l.valor as number)} no mês (menos de 12 competências coletadas).`,
      (l.valor as number) > 0.5 ? "negativo" : "neutro",
    ),
  );

  const maior = Math.max(...usados.map((l) => l.acumulado12m ?? (l.valor as number) * 12));
  const classe: ClasseAmbiente =
    maior >= 8 ? "restritivo" : maior >= 5 ? "apertado" : maior >= 2 ? "neutro" : "estimulante";

  return {
    chave: "correcao",
    titulo: "Correção contratual",
    classe,
    resumo:
      classe === "restritivo" || classe === "apertado"
        ? "Índices de correção elevados: revisar o indexador oferecido em contrato."
        : "Índices de correção contidos: indexador com baixo impacto na parcela.",
    fatores,
    baseCodigos: usados.map((l) => l.codigo),
    proveniencias: usados
      .map((l) => l.proveniencia)
      .filter((p): p is Proveniencia => Boolean(p)),
  };
}

export type RadarEconomico = {
  leituras: LeituraIndicador[];
  ambientes: LeituraAmbiente[];
  /** % de séries do catálogo com coleta registrada. */
  cobertura: number;
  seriesTotal: number;
  seriesComColeta: number;
  seriesObsoletas: string[];
  ultimaColeta: string | null;
  geradoEm: string;
};

export function montarRadarEconomico(
  leituras: LeituraIndicador[],
  agora = new Date(),
): RadarEconomico {
  const comColeta = leituras.filter((l) => l.valor != null);
  const coletas = comColeta
    .map((l) => l.proveniencia?.coletadoEm)
    .filter((c): c is string => Boolean(c))
    .sort();

  return {
    leituras,
    ambientes: [lerAmbienteCredito(leituras), lerCustoObra(leituras), lerCorrecaoContratual(leituras)],
    cobertura: leituras.length === 0 ? 0 : round((comColeta.length / leituras.length) * 100),
    seriesTotal: leituras.length,
    seriesComColeta: comColeta.length,
    seriesObsoletas: leituras.filter((l) => l.frescor === "obsoleto").map((l) => l.nome),
    ultimaColeta: coletas.length ? (coletas[coletas.length - 1] as string) : null,
    geradoEm: agora.toISOString(),
  };
}

/* ------------------------------------------------------------------ *
 * GATE 03 — Radar Regional
 * ------------------------------------------------------------------ */

export type TipoRegiao = "bairro" | "cidade" | "regiao";

export const tipoRegiaoLabels: Record<TipoRegiao, string> = {
  bairro: "Bairro",
  cidade: "Cidade",
  regiao: "Região",
};

export type RegiaoBase = {
  id: string;
  nome: string;
  tipo: TipoRegiao;
  cidade: string | null;
  uf: string | null;
};

export type SnapshotRegiao = {
  referencia: string;
  precoMedioM2: number | null;
  ofertaUnidades: number | null;
  demandaIndice: number | null;
  absorcaoPct: number | null;
  vacanciaPct: number | null;
  tempoMedioVendaDias: number | null;
  liquidezIndice: number | null;
  amostra: number | null;
  fonteNome: string;
  fonteUrl: string | null;
  metodologia: string | null;
  coletadoEm: string;
  versao: number;
};

export type ClasseAquecimento = "aquecido" | "equilibrado" | "lento" | "travado" | "indefinido";

export const classeAquecimentoLabels: Record<ClasseAquecimento, string> = {
  aquecido: "Aquecido",
  equilibrado: "Equilibrado",
  lento: "Lento",
  travado: "Travado",
  indefinido: "Sem base",
};

export type AnaliseRegiao = {
  regiao: RegiaoBase;
  origem: OrigemDado;
  atual: SnapshotRegiao | null;
  /** Variação % do preço médio do m² contra a competência mais antiga coletada. */
  variacaoPrecoPct: number | null;
  janelaVariacaoMeses: number | null;
  /** 0–100. Só existe com pelo menos um dos três sinais de liquidez coletado. */
  liquidez: number | null;
  aquecimento: ClasseAquecimento;
  /** % dos campos de mercado efetivamente preenchidos na última coleta. */
  cobertura: number;
  amostra: number;
  defasagemDias: number | null;
  frescor: Frescor;
  fatores: Fator[];
  proveniencia: Proveniencia | null;
  motivoAusencia?: string;
};

const camposMercado: (keyof SnapshotRegiao)[] = [
  "precoMedioM2",
  "ofertaUnidades",
  "demandaIndice",
  "absorcaoPct",
  "vacanciaPct",
  "tempoMedioVendaDias",
  "liquidezIndice",
];

function mesesEntre(de: string, ate: string): number {
  const a = new Date(de);
  const b = new Date(ate);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

export function analisarRegiao(
  regiao: RegiaoBase,
  snapshots: SnapshotRegiao[],
  agora = new Date(),
): AnaliseRegiao {
  const porReferencia = new Map<string, SnapshotRegiao>();
  for (const s of snapshots) {
    const atual = porReferencia.get(s.referencia);
    if (!atual || s.versao > atual.versao) porReferencia.set(s.referencia, s);
  }
  const ordenados = [...porReferencia.values()].sort((a, b) => (a.referencia < b.referencia ? 1 : -1));
  const atual = ordenados[0] ?? null;

  if (!atual) {
    return {
      regiao,
      origem: ORIGEM_EXTERNA,
      atual: null,
      variacaoPrecoPct: null,
      janelaVariacaoMeses: null,
      liquidez: null,
      aquecimento: "indefinido",
      cobertura: 0,
      amostra: 0,
      defasagemDias: null,
      frescor: "sem_coleta",
      fatores: [],
      proveniencia: null,
      motivoAusencia: `Nenhuma coleta de mercado registrada para ${regiao.nome}.`,
    };
  }

  const preenchidos = camposMercado.filter((c) => atual[c] != null).length;
  const cobertura = round((preenchidos / camposMercado.length) * 100);

  const maisAntigoComPreco = [...ordenados].reverse().find((s) => s.precoMedioM2 != null);
  const variacaoPrecoPct =
    atual.precoMedioM2 != null &&
    maisAntigoComPreco?.precoMedioM2 != null &&
    maisAntigoComPreco.referencia !== atual.referencia
      ? round(((atual.precoMedioM2 - maisAntigoComPreco.precoMedioM2) / maisAntigoComPreco.precoMedioM2) * 100, 1)
      : null;
  const janelaVariacaoMeses =
    variacaoPrecoPct == null || !maisAntigoComPreco
      ? null
      : mesesEntre(maisAntigoComPreco.referencia, atual.referencia);

  const fatores: Fator[] = [];
  const sinais: number[] = [];

  if (atual.tempoMedioVendaDias != null) {
    // 30 dias ou menos = 100; 240 dias ou mais = 0.
    const nota = clamp(round(((240 - atual.tempoMedioVendaDias) / 210) * 100), 0, 100);
    sinais.push(nota);
    fatores.push(
      fator(
        "Tempo médio de venda",
        `${atual.tempoMedioVendaDias} dias — nota ${nota}/100 (30 dias = 100, 240 dias = 0).`,
        nota >= 60 ? "positivo" : nota >= 35 ? "neutro" : "negativo",
        nota,
      ),
    );
  }
  if (atual.absorcaoPct != null) {
    const nota = clamp(round((atual.absorcaoPct / 12) * 100), 0, 100);
    sinais.push(nota);
    fatores.push(
      fator(
        "Absorção mensal",
        `${pct(atual.absorcaoPct, 1)} do estoque por mês — nota ${nota}/100 (12% = 100).`,
        nota >= 60 ? "positivo" : nota >= 35 ? "neutro" : "negativo",
        nota,
      ),
    );
  }
  if (atual.vacanciaPct != null) {
    const nota = clamp(round(((25 - atual.vacanciaPct) / 25) * 100), 0, 100);
    sinais.push(nota);
    fatores.push(
      fator(
        "Vacância",
        `${pct(atual.vacanciaPct, 1)} — nota ${nota}/100 (0% = 100, 25% = 0).`,
        nota >= 60 ? "positivo" : nota >= 35 ? "neutro" : "negativo",
        nota,
      ),
    );
  }

  const liquidez = sinais.length ? round(sinais.reduce((a, b) => a + b, 0) / sinais.length) : null;

  if (atual.precoMedioM2 != null) {
    fatores.push(
      fator(
        "Preço médio do m²",
        variacaoPrecoPct == null
          ? `R$ ${new Intl.NumberFormat("pt-BR").format(atual.precoMedioM2)} — série com uma única competência, sem variação calculável.`
          : `R$ ${new Intl.NumberFormat("pt-BR").format(atual.precoMedioM2)} — ${variacaoPrecoPct > 0 ? "+" : ""}${pct(variacaoPrecoPct, 1)} em ${janelaVariacaoMeses} meses.`,
        variacaoPrecoPct == null ? "neutro" : variacaoPrecoPct > 0 ? "positivo" : "negativo",
      ),
    );
  }
  if (atual.ofertaUnidades != null) {
    fatores.push(
      fator("Oferta", `${atual.ofertaUnidades} unidades disponíveis na coleta.`, "neutro"),
    );
  }
  if (atual.amostra != null) {
    fatores.push(fator("Amostra da coleta", `${atual.amostra} imóveis observados.`, "neutro"));
  }

  const defasagemDias = Math.max(0, dias(atual.referencia, agora));
  const aquecimento: ClasseAquecimento =
    liquidez == null
      ? "indefinido"
      : liquidez >= 70
        ? "aquecido"
        : liquidez >= 45
          ? "equilibrado"
          : liquidez >= 25
            ? "lento"
            : "travado";

  return {
    regiao,
    origem: ORIGEM_EXTERNA,
    atual,
    variacaoPrecoPct,
    janelaVariacaoMeses,
    liquidez,
    aquecimento,
    cobertura,
    amostra: ordenados.length,
    defasagemDias,
    frescor: classificarFrescor("mensal", defasagemDias),
    fatores,
    proveniencia: {
      fonte: atual.fonteNome,
      fonteUrl: atual.fonteUrl,
      fonteSerie: atual.metodologia,
      referencia: atual.referencia,
      coletadoEm: atual.coletadoEm,
      versao: atual.versao,
    },
    ...(liquidez == null
      ? {
          motivoAusencia:
            "Liquidez exige ao menos um sinal coletado entre tempo de venda, absorção e vacância.",
        }
      : {}),
  };
}

export type RadarRegional = {
  analises: AnaliseRegiao[];
  regioesTotal: number;
  regioesComColeta: number;
  cobertura: number;
  precoMedioM2: number | null;
  liquidezMedia: number | null;
  destaques: AnaliseRegiao[];
  alertas: string[];
  geradoEm: string;
};

export function montarRadarRegional(analises: AnaliseRegiao[], agora = new Date()): RadarRegional {
  const comColeta = analises.filter((a) => a.atual != null);
  const precos = comColeta
    .map((a) => a.atual?.precoMedioM2)
    .filter((v): v is number => typeof v === "number");
  const liquidezes = comColeta
    .map((a) => a.liquidez)
    .filter((v): v is number => typeof v === "number");

  const alertas: string[] = [];
  const semColeta = analises.length - comColeta.length;
  if (semColeta > 0) alertas.push(`${semColeta} região(ões) sem nenhuma coleta de mercado.`);
  const obsoletas = comColeta.filter((a) => a.frescor === "obsoleto");
  if (obsoletas.length)
    alertas.push(
      `${obsoletas.length} região(ões) com coleta obsoleta: ${obsoletas.map((a) => a.regiao.nome).join(", ")}.`,
    );
  const travadas = comColeta.filter((a) => a.aquecimento === "travado" || a.aquecimento === "lento");
  if (travadas.length)
    alertas.push(
      `Liquidez baixa em: ${travadas.map((a) => a.regiao.nome).join(", ")} — rever preço e esforço comercial.`,
    );

  return {
    analises: [...analises].sort((a, b) => (b.liquidez ?? -1) - (a.liquidez ?? -1)),
    regioesTotal: analises.length,
    regioesComColeta: comColeta.length,
    cobertura: analises.length === 0 ? 0 : round((comColeta.length / analises.length) * 100),
    precoMedioM2: precos.length ? round(precos.reduce((a, b) => a + b, 0) / precos.length, 2) : null,
    liquidezMedia: liquidezes.length
      ? round(liquidezes.reduce((a, b) => a + b, 0) / liquidezes.length)
      : null,
    destaques: [...comColeta].sort((a, b) => (b.liquidez ?? -1) - (a.liquidez ?? -1)).slice(0, 3),
    alertas,
    geradoEm: agora.toISOString(),
  };
}