/**
 * SPRINT 25.3 — CAUSAL EVIDENCE ENGINE (bounded context `Market Analytics`).
 *
 * Camada pura e determinística que fica ENTRE a Correlation Engine e o Advisor.
 * Não responde "o que causou": responde "quão sustentada está a observação".
 *
 * Regras duras (ADR-026):
 * - nenhum texto desta camada usa verbo causal ("causou", "provocou", "gerou");
 * - a força medida é da EVIDÊNCIA, nunca do efeito;
 * - critério não atendido é declarado, não escondido;
 * - sem correlação medida, a força é `muito_baixa` com o motivo.
 */

import {
  AMOSTRA_MINIMA,
  forcaLabels,
  medirLag,
  recortarJanela,
  type Correlacao,
  type DirecaoCorrelacao,
  type LagMeses,
  type LeituraCorrelacao,
  type SerieMensal,
} from "@/lib/platform/market-analytics";

export type ForcaEvidencia = "muito_baixa" | "baixa" | "moderada" | "alta";

export const forcaEvidenciaLabels: Record<ForcaEvidencia, string> = {
  muito_baixa: "Evidência muito baixa",
  baixa: "Evidência baixa",
  moderada: "Evidência moderada",
  alta: "Evidência alta",
};

export type ChaveCriterio =
  | "correlacao"
  | "repeticao"
  | "estabilidade"
  | "defasagem_consistente"
  | "significancia"
  | "elasticidade"
  | "evidencia_historica"
  | "consistencia_externa";

export const criterioLabels: Record<ChaveCriterio, string> = {
  correlacao: "Existe correlação medida",
  repeticao: "Existe repetição em mais de uma defasagem",
  estabilidade: "Existe estabilidade (nível e variação)",
  defasagem_consistente: "Existe defasagem consistente",
  significancia: "Existe significância estatística",
  elasticidade: "Existe elasticidade mensurável",
  evidencia_historica: "Existe histórico suficiente",
  consistencia_externa: "Consistência externa com o mercado",
};

export type CriterioEvidencia = {
  chave: ChaveCriterio;
  rotulo: string;
  atendido: boolean;
  detalhe: string;
  /** Informativo não entra no cálculo da força (ADR-026). */
  informativo?: boolean;
};

/** Padrão observado no mercado, para conferência — nunca entra no cálculo. */
export type ReferenciaExterna = {
  fonte: string;
  /** Direção observada fora do workspace para o mesmo indicador. */
  direcao: DirecaoCorrelacao;
  coeficiente?: number | null;
  amostra?: number;
};

export type ConsistenciaExterna = "confirmada" | "nao_confirmada" | "sem_referencia";

export const consistenciaExternaLabels: Record<ConsistenciaExterna, string> = {
  confirmada: "Consistência externa confirmada",
  nao_confirmada: "Consistência externa não confirmada",
  sem_referencia: "Sem referência externa para conferir",
};

/** Histórico considerado longo para sustentar leitura de série temporal. */
export const HISTORICO_ROBUSTO = 24;
/** Amplitude máxima do IC95% para o coeficiente ser tratado como estável. */
export const AMPLITUDE_IC_ESTAVEL = 0.5;

export type Evidencia = {
  chave: string;
  externo: Correlacao["externo"];
  interno: Correlacao["interno"];
  /** Sempre histórico do próprio workspace — nunca regra, nunca previsão. */
  base: "evidencia_historica";
  janelaMeses: number;
  forca: ForcaEvidencia;
  /** Critérios decisivos atendidos sobre o total decisivo (informativo fora). */
  criteriosAtendidos: number;
  criteriosTotal: number;
  /** Leitura informativa: o padrão também aparece fora do workspace? */
  consistenciaExterna: ConsistenciaExterna;
  criterios: CriterioEvidencia[];
  leitura: LeituraCorrelacao | null;
  /** Frase do Evidence Card. Nunca contém verbo causal. */
  narrativa: string;
  ressalva: string;
  motivoAusencia?: string;
};

const num = (v: number, casas = 2) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(v);

const mesmoSentido = (a: number, b: number) => a * b > 0;

function classificarForca(atendidos: number): ForcaEvidencia {
  if (atendidos <= 2) return "muito_baixa";
  if (atendidos <= 4) return "baixa";
  if (atendidos <= 5) return "moderada";
  return "alta";
}

/** Avalia a cadeia de evidência de um par medido pela Correlation Engine. */
export function avaliarEvidencia(
  correlacao: Correlacao,
  referenciaExterna?: ReferenciaExterna | null,
): Evidencia {
  const melhor = correlacao.melhor;
  const comum = {
    chave: correlacao.chave,
    externo: correlacao.externo,
    interno: correlacao.interno,
    base: "evidencia_historica" as const,
    janelaMeses: correlacao.janelaMeses,
    leitura: melhor,
    ressalva: "Nenhuma relação causal foi estabelecida.",
  };

  if (!melhor || melhor.coeficiente == null) {
    const criterios: CriterioEvidencia[] = (Object.keys(criterioLabels) as ChaveCriterio[]).map(
      (chave) => ({
        chave,
        rotulo: criterioLabels[chave],
        atendido: false,
        detalhe: "Sem correlação medida na janela.",
        ...(chave === "consistencia_externa" ? { informativo: true } : {}),
      }),
    );
    return {
      ...comum,
      forca: "muito_baixa",
      criteriosAtendidos: 0,
      criteriosTotal: criterios.filter((c) => !c.informativo).length,
      consistenciaExterna: "sem_referencia",
      criterios,
      narrativa: `Sem evidência histórica que sustente relacionar ${correlacao.externo.nome} e ${correlacao.interno.nome} neste workspace.`,
      motivoAusencia:
        melhor?.motivoAusencia ??
        `Nenhuma defasagem alcançou ${AMOSTRA_MINIMA} competências pareadas com significância.`,
    };
  }

  const r = melhor.coeficiente;
  const outras = correlacao.leituras.filter(
    (l) => l.lagMeses !== melhor.lagMeses && l.forca !== "sem_evidencia" && l.coeficiente != null,
  );
  const repetidas = outras.filter((l) => mesmoSentido(l.coeficiente as number, r));
  const vizinhas = repetidas.filter((l) => Math.abs(l.lagMeses - melhor.lagMeses) === 1);
  const amplitudeIC =
    melhor.icInferior == null || melhor.icSuperior == null
      ? null
      : melhor.icSuperior - melhor.icInferior;
  const icCruzaZero =
    melhor.icInferior == null || melhor.icSuperior == null
      ? true
      : melhor.icInferior * melhor.icSuperior <= 0;

  const criterios: CriterioEvidencia[] = [
    {
      chave: "correlacao",
      rotulo: criterioLabels["correlacao"],
      atendido: true,
      detalhe: `Coeficiente ${num(r)} (${forcaLabels[melhor.forca].toLowerCase()}) na defasagem de ${melhor.lagDias} dias.`,
    },
    {
      chave: "repeticao",
      rotulo: criterioLabels["repeticao"],
      atendido: repetidas.length >= 1,
      detalhe: repetidas.length
        ? `${repetidas.length + 1} de ${correlacao.leituras.length} defasagens no mesmo sentido.`
        : "A relação aparece em uma única defasagem.",
    },
    {
      chave: "estabilidade",
      rotulo: criterioLabels["estabilidade"],
      atendido: !melhor.alertaTendencia,
      detalhe: melhor.alertaTendencia
        ? "Correlaciona no nível, mas não na variação mês a mês: possível tendência comum."
        : `Sobrevive ao controle de tendência (variação ${num(melhor.coeficienteVariacao ?? 0)}).`,
    },
    {
      chave: "defasagem_consistente",
      rotulo: criterioLabels["defasagem_consistente"],
      atendido: vizinhas.length >= 1,
      detalhe: vizinhas.length
        ? `Defasagem vizinha (${vizinhas.map((l) => `${l.lagDias}d`).join(", ")}) aponta o mesmo sentido.`
        : "Nenhuma defasagem adjacente confirma o sentido observado.",
    },
    {
      chave: "significancia",
      rotulo: criterioLabels["significancia"],
      atendido: melhor.pValor != null && melhor.pValor <= 0.05 && !icCruzaZero,
      detalhe:
        melhor.pValor == null
          ? "p-valor não calculado nesta amostra."
          : `p ${num(melhor.pValor, 4)}${
              amplitudeIC == null
                ? ""
                : ` · IC95% ${num(melhor.icInferior as number)}–${num(melhor.icSuperior as number)}`
            }${icCruzaZero ? " (intervalo cruza zero)" : ""}`,
    },
    {
      chave: "elasticidade",
      rotulo: criterioLabels["elasticidade"],
      atendido: melhor.elasticidade != null && melhor.elasticidade !== 0,
      detalhe:
        melhor.elasticidade == null || melhor.elasticidade === 0
          ? "Sem elasticidade mensurável entre as séries."
          : `Cada ponto de ${correlacao.externo.nome} acompanhou ${num(Math.abs(melhor.elasticidade))}% ${melhor.elasticidade > 0 ? "a mais" : "a menos"} em ${correlacao.interno.nome}.`,
    },
    {
      chave: "evidencia_historica",
      rotulo: criterioLabels["evidencia_historica"],
      atendido: melhor.amostra >= HISTORICO_ROBUSTO && amplitudeIC != null && amplitudeIC <= AMPLITUDE_IC_ESTAVEL,
      detalhe: `Amostra de ${melhor.amostra} meses${
        amplitudeIC == null ? "" : ` · amplitude do IC95% ${num(amplitudeIC)}`
      } (robusto a partir de ${HISTORICO_ROBUSTO} meses e amplitude ${num(AMPLITUDE_IC_ESTAVEL)}).`,
    },
  ];

  const consistencia: ConsistenciaExterna =
    referenciaExterna == null || referenciaExterna.direcao === "indefinida"
      ? "sem_referencia"
      : referenciaExterna.direcao === melhor.direcao
        ? "confirmada"
        : "nao_confirmada";

  criterios.push({
    chave: "consistencia_externa",
    rotulo: criterioLabels["consistencia_externa"],
    atendido: consistencia === "confirmada",
    informativo: true,
    detalhe:
      consistencia === "sem_referencia"
        ? "Nenhuma leitura de mercado disponível para conferir o padrão. Informativo: não altera a força."
        : `${consistenciaExternaLabels[consistencia]} contra ${referenciaExterna?.fonte}` +
          `${referenciaExterna?.coeficiente == null ? "" : ` (coeficiente ${num(referenciaExterna.coeficiente)}`}` +
          `${referenciaExterna?.amostra == null ? (referenciaExterna?.coeficiente == null ? "" : ")") : `, amostra ${referenciaExterna.amostra} meses)`}` +
          ". Informativo: não altera a força.",
  });

  const decisivos = criterios.filter((c) => !c.informativo);
  const atendidos = decisivos.filter((c) => c.atendido).length;
  const forca = classificarForca(atendidos);
  const sentido = melhor.direcao === "positiva" ? "no mesmo sentido" : "em sentido oposto";
  const defasagem = melhor.lagDias === 0 ? "no mesmo mês" : `com defasagem de ${melhor.lagDias} dias`;

  return {
    ...comum,
    forca,
    criteriosAtendidos: atendidos,
    criteriosTotal: decisivos.length,
    consistenciaExterna: consistencia,
    criterios,
    narrativa:
      `${correlacao.externo.nome} e ${correlacao.interno.nome} se moveram ${sentido} ${defasagem}. ` +
      `${forcaEvidenciaLabels[forca]}: ${atendidos} de ${decisivos.length} critérios de sustentação atendidos ` +
      `(coeficiente ${num(r)}${
        amplitudeIC == null
          ? ""
          : `, IC95% ${num(melhor.icInferior as number)}–${num(melhor.icSuperior as number)}`
      }, amostra ${melhor.amostra} meses). Observação histórica deste workspace — não é causa.`,
  };
}

export type PanoramaEvidencia = {
  evidencias: Evidencia[];
  total: number;
  comEvidenciaAlta: number;
  comEvidenciaModerada: number;
  /** Pares cujo padrão também aparece na referência de mercado. */
  consistenciaConfirmada: number;
  janelaMeses: number;
  geradoEm: string;
};

const ordem: Record<ForcaEvidencia, number> = {
  alta: 3,
  moderada: 2,
  baixa: 1,
  muito_baixa: 0,
};

/** Ordena por sustentação: o gestor lê primeiro o que está mais amparado. */
export function montarPanoramaEvidencia(
  correlacoes: Correlacao[],
  janelaMeses: number,
  agora = new Date(),
  /** Referência externa por chave de par — informativa (ADR-026). */
  referencias?: Record<string, ReferenciaExterna | null>,
): PanoramaEvidencia {
  const evidencias = correlacoes
    .map((c) => avaliarEvidencia(c, referencias?.[c.chave] ?? null))
    .sort(
      (a, b) =>
        ordem[b.forca] - ordem[a.forca] ||
        b.criteriosAtendidos - a.criteriosAtendidos ||
        Math.abs(b.leitura?.coeficiente ?? 0) - Math.abs(a.leitura?.coeficiente ?? 0),
    );

  return {
    evidencias,
    total: evidencias.length,
    comEvidenciaAlta: evidencias.filter((e) => e.forca === "alta").length,
    comEvidenciaModerada: evidencias.filter((e) => e.forca === "moderada").length,
    consistenciaConfirmada: evidencias.filter((e) => e.consistenciaExterna === "confirmada").length,
    janelaMeses,
    geradoEm: agora.toISOString(),
  };
}

/* ------------------------------------------------------------------ *
 * Drift Detection — o padrão continua igual ou mudou?
 * ------------------------------------------------------------------ */

export type EstadoDrift = "estavel" | "em_drift" | "indefinido";

export const estadoDriftLabels: Record<EstadoDrift, string> = {
  estavel: "Padrão estável",
  em_drift: "Modelo em drift",
  indefinido: "Drift indeterminado",
};

export type Drift = {
  estado: EstadoDrift;
  lagMeses: LagMeses;
  /** Janela mais antiga da série. */
  anterior: { coeficiente: number | null; amostra: number; direcao: DirecaoCorrelacao };
  /** Janela recente da série. */
  recente: { coeficiente: number | null; amostra: number; direcao: DirecaoCorrelacao };
  /** Diferença absoluta entre os coeficientes das duas janelas. */
  variacaoCoeficiente: number | null;
  detalhe: string;
};

/** Diferença de coeficiente a partir da qual o padrão é tratado como mudado. */
export const DRIFT_DELTA = 0.3;

const janelas = (serie: SerieMensal, recenteMeses: number) => {
  const total = serie.pontos.length;
  const corte = Math.max(0, total - recenteMeses);
  return {
    anterior: { ...serie, pontos: serie.pontos.slice(0, corte) },
    recente: { ...serie, pontos: serie.pontos.slice(corte) },
  };
};

/**
 * Compara a mesma defasagem em duas janelas de tempo. Não afirma causa nem
 * prevê: apenas diz se a relação medida antes continua aparecendo agora.
 */
export function detectarDrift(
  externa: SerieMensal,
  interna: SerieMensal,
  lagMeses: LagMeses,
  recenteMeses = AMOSTRA_MINIMA,
): Drift {
  const jx = janelas(externa, recenteMeses);
  const jy = janelas(interna, recenteMeses);
  const antes = medirLag(jx.anterior, jy.anterior, lagMeses);
  const agora = medirLag(jx.recente, jy.recente, lagMeses);

  const resumo = (l: LeituraCorrelacao) => ({
    coeficiente: l.forca === "sem_evidencia" ? null : l.coeficiente,
    amostra: l.amostra,
    direcao: l.direcao,
  });

  const a = resumo(antes);
  const b = resumo(agora);
  const delta = a.coeficiente == null || b.coeficiente == null ? null : Math.abs(a.coeficiente - b.coeficiente);

  let estado: EstadoDrift = "indefinido";
  let detalhe = `Amostra insuficiente em uma das janelas (${a.amostra} e ${b.amostra} meses): não é possível comparar o padrão.`;

  if (a.coeficiente != null && b.coeficiente == null) {
    estado = "em_drift";
    detalhe = `A relação aparecia na janela anterior (coeficiente ${num(a.coeficiente)}, ${a.amostra} meses) e não aparece nos últimos ${recenteMeses} meses.`;
  } else if (a.coeficiente != null && b.coeficiente != null) {
    const inverteu = !mesmoSentido(a.coeficiente, b.coeficiente);
    const distante = (delta as number) > DRIFT_DELTA;
    estado = inverteu || distante ? "em_drift" : "estavel";
    detalhe =
      `Coeficiente ${num(a.coeficiente)} na janela anterior e ${num(b.coeficiente)} nos últimos ${recenteMeses} meses` +
      `${inverteu ? ", com inversão de sentido" : ""} (variação ${num(delta as number)}, limite ${num(DRIFT_DELTA)}).`;
  } else if (a.coeficiente == null && b.coeficiente != null) {
    estado = "em_drift";
    detalhe = `A relação não aparecia na janela anterior e aparece nos últimos ${recenteMeses} meses (coeficiente ${num(b.coeficiente)}).`;
  }

  return {
    estado,
    lagMeses,
    anterior: a,
    recente: b,
    variacaoCoeficiente: delta == null ? null : Number(delta.toFixed(4)),
    detalhe: `${detalhe} Leitura de estabilidade do padrão — não é causa.`,
  };
}
