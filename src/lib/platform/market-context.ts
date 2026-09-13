/**
 * SPRINT 25.1 — MARKET CONTEXT ENGINE / ECONOMIC IMPACT ENGINE.
 *
 * Camada pura e client-safe. Não prevê nada e não chama LLM: traduz cada
 * indicador externo já coletado (`market.ts`) em CONTEXTO de negócio por
 * público, com regra determinística e limiar publicado.
 *
 * Princípios (ADR-023 / ADR-024):
 * - todo impacto declara a base da conclusão: `regra_negocio` (limiar desta
 *   camada) ou `dado_interno` (só se confirma contra medição própria);
 * - sem coleta não existe impacto: a leitura devolve o motivo da ausência;
 * - nenhum número externo é somado ou comparado com número interno aqui.
 */

import type { Direcao } from "@/lib/platform/predictive";
import {
  mensalParaAnual,
  pct,
  type Frescor,
  type LeituraIndicador,
  type Proveniencia,
} from "@/lib/platform/market";

/* ------------------------------------------------------------------ *
 * Vocabulário
 * ------------------------------------------------------------------ */

export type PublicoImpactado =
  | "comprador"
  | "investidor"
  | "construtora"
  | "velocidade_vendas"
  | "negociacao";

export const publicoLabels: Record<PublicoImpactado, string> = {
  comprador: "Comprador",
  investidor: "Investidor",
  construtora: "Construtora",
  velocidade_vendas: "Velocidade de vendas",
  negociacao: "Negociação",
};

/**
 * De onde vem a conclusão — exigência do ADR-023 na comunicação.
 * `evidencia_historica` (ADR-025) é observação medida no histórico do próprio
 * workspace: não é regra publicada, não é modelo e não é causa.
 */
export type BaseConclusao = "regra_negocio" | "dado_interno" | "evidencia_historica";

export const baseConclusaoLabels: Record<BaseConclusao, string> = {
  regra_negocio: "Regra de negócio",
  dado_interno: "Depende do histórico interno",
  evidencia_historica: "Evidência histórica do workspace",
};

export type ConfiancaContexto = "alta" | "media" | "baixa" | "indefinida";

export const confiancaContextoLabels: Record<ConfiancaContexto, string> = {
  alta: "Confiança alta",
  media: "Confiança média",
  baixa: "Confiança baixa",
  indefinida: "Sem base",
};

export type ImpactoEconomico = {
  publico: PublicoImpactado;
  direcao: Direcao;
  titulo: string;
  /** Frase curta, no vocabulário do negócio. */
  leitura: string;
  base: BaseConclusao;
};

export type ContextoIndicador = {
  codigo: string;
  nome: string;
  valor: number | null;
  unidade: string;
  /** Variação em pontos percentuais contra a competência anterior. */
  variacaoAnterior: number | null;
  tendencia: Direcao | null;
  frescor: Frescor;
  confianca: ConfiancaContexto;
  motivoConfianca: string;
  /** Regra aplicada, com o limiar que a define. */
  regra: string | null;
  impactos: ImpactoEconomico[];
  /** Ação sugerida pela regra; null quando a regra não indica ação. */
  acaoSugerida: string | null;
  proveniencia: Proveniencia | null;
  motivoAusencia?: string;
};

export type NarrativaMercado = {
  chave: string;
  texto: string;
  base: BaseConclusao;
  confianca: ConfiancaContexto;
  fonte: string;
};

export type MarketContext = {
  indicadores: ContextoIndicador[];
  /** Frases prontas para o Advisor, com base e confiança declaradas. */
  narrativas: NarrativaMercado[];
  indicadoresComContexto: number;
  indicadoresSemColeta: number;
  geradoEm: string;
};

/* ------------------------------------------------------------------ *
 * Confiança — função do frescor e do tamanho da série coletada
 * ------------------------------------------------------------------ */

export function medirConfianca(leitura: LeituraIndicador): {
  confianca: ConfiancaContexto;
  motivo: string;
} {
  if (leitura.valor == null) {
    return { confianca: "indefinida", motivo: "Sem coleta registrada: nenhuma conclusão é emitida." };
  }
  if (leitura.frescor === "obsoleto") {
    return {
      confianca: "baixa",
      motivo: `Competência com ${leitura.defasagemDias ?? "?"} dias de defasagem: leitura obsoleta.`,
    };
  }
  if (leitura.amostra < 2) {
    return {
      confianca: "media",
      motivo: "Uma única competência coletada: sem base para medir variação.",
    };
  }
  if (leitura.frescor === "defasado") {
    return {
      confianca: "media",
      motivo: `Competência defasada em ${leitura.defasagemDias ?? "?"} dias.`,
    };
  }
  if (leitura.amostra >= 6) {
    return { confianca: "alta", motivo: `Coleta atual com ${leitura.amostra} competências na série.` };
  }
  return { confianca: "media", motivo: `Coleta atual, mas série curta (${leitura.amostra} competências).` };
}

/* ------------------------------------------------------------------ *
 * Economic Impact Engine — regras por família de indicador (ADR-024)
 * ------------------------------------------------------------------ */

const impacto = (
  publico: PublicoImpactado,
  direcao: Direcao,
  titulo: string,
  leitura: string,
  base: BaseConclusao = "regra_negocio",
): ImpactoEconomico => ({ publico, direcao, titulo, leitura, base });

type Regra = {
  regra: string;
  impactos: ImpactoEconomico[];
  acao: string | null;
};

/** Selic, Selic acumulada e CDI: custo do dinheiro. Limiar: 13% / 10% / 8% a.a. */
function regraJuroBasico(nome: string, valor: number, subiu: boolean | null): Regra {
  const apertado = valor >= 10;
  const restritivo = valor >= 13;
  return {
    regra: `${nome} em ${pct(valor)} a.a. — limiar: 13% restritivo, 10% apertado, 8% neutro, abaixo estimulante.`,
    impactos: [
      impacto(
        "comprador",
        apertado ? "negativo" : "positivo",
        apertado ? "Crédito mais caro" : "Crédito mais acessível",
        apertado
          ? "Parcela do financiamento sobe e reduz o valor aprovado do comprador."
          : "Parcela mais leve amplia o valor aprovado do comprador.",
      ),
      impacto(
        "investidor",
        apertado ? "negativo" : "positivo",
        apertado ? "Investidor mais conservador" : "Investidor mais disposto ao risco",
        apertado
          ? "Renda fixa fica competitiva com o imóvel: o investidor exige desconto ou rentabilidade maior."
          : "Renda fixa perde atratividade e o imóvel volta a competir por capital.",
      ),
      impacto(
        "velocidade_vendas",
        apertado ? "negativo" : "positivo",
        apertado ? "Ciclo de decisão tende a alongar" : "Ciclo de decisão tende a encurtar",
        "Compare com o ciclo médio medido do seu funil antes de revisar meta: o efeito só existe se aparecer na operação.",
        "dado_interno",
      ),
      impacto(
        "negociacao",
        apertado ? "negativo" : "neutro",
        apertado ? "Condição pesa mais que preço" : "Preço volta ao centro da conversa",
        apertado
          ? "Entrada, prazo e parcela decidem mais que desconto sobre a tabela."
          : "Com parcela mais leve, o valor de tabela volta a ser o ponto principal.",
      ),
      impacto(
        "construtora",
        restritivo ? "negativo" : "neutro",
        restritivo ? "Funding mais caro" : "Funding sob controle",
        restritivo
          ? "Custo de capital de obra e de estoque aumenta: carregar unidade pronta fica mais caro."
          : "Custo de carregamento de estoque em patamar administrável.",
      ),
    ],
    acao: apertado
      ? subiu === true
        ? "Priorizar clientes com crédito pré-aprovado e revisar a tabela de condições (entrada e prazo)."
        : "Priorizar clientes com crédito pré-aprovado e destacar condição de pagamento na abordagem."
      : "Explorar o momento de crédito na comunicação: parcela como argumento de conversão.",
  };
}

/** Juros médios do financiamento imobiliário PF (taxa mensal). Limiar: 12% a.a. */
function regraFinanciamento(valorMensal: number): Regra {
  const anual = mensalParaAnual(valorMensal);
  const caro = anual >= 12;
  return {
    regra: `Juros de financiamento em ${pct(valorMensal)} a.m. (${pct(anual)} a.a. compostos) — limiar: 12% a.a. encarece a parcela.`,
    impactos: [
      impacto(
        "comprador",
        caro ? "negativo" : "positivo",
        caro ? "Parcela pressionada" : "Parcela mais leve",
        caro
          ? "O mesmo imóvel passa a exigir renda maior para aprovação."
          : "A mesma renda aprova um ticket maior.",
      ),
      impacto(
        "negociacao",
        caro ? "negativo" : "positivo",
        caro ? "Prazo e entrada no centro" : "Financiamento facilita o fechamento",
        caro
          ? "Simular alongamento de prazo e reforço de entrada antes de discutir desconto."
          : "Simulação de financiamento tende a acelerar a decisão.",
      ),
      impacto(
        "velocidade_vendas",
        caro ? "negativo" : "neutro",
        "Efeito no ciclo depende do funil",
        "Só o ciclo médio medido do workspace confirma se a taxa mudou a velocidade de venda.",
        "dado_interno",
      ),
    ],
    acao: caro
      ? "Trabalhar a aprovação de crédito antes da visita: pré-aprovação reduz perda por reprovação."
      : "Usar simulação de parcela como gatilho na primeira abordagem.",
  };
}

/** INCC: custo de obra. Limiar em 12 meses (ou proxy mês × 12): 9% / 6% / 3%. */
function regraCustoObra(valorMes: number, referencia12m: number, proxy: boolean): Regra {
  const pressiona = referencia12m >= 6;
  return {
    regra: `INCC ${pct(valorMes)} no mês e ${pct(referencia12m)} em 12 meses${proxy ? " (proxy do mês × 12)" : ""} — limiar: 9% restritivo, 6% apertado, 3% neutro.`,
    impactos: [
      impacto(
        "construtora",
        pressiona ? "negativo" : "neutro",
        pressiona ? "Custo de obra aumentando" : "Custo de obra contido",
        pressiona
          ? "Lançamentos podem revisar a tabela de preços para preservar margem."
          : "Margem de obra sem pressão relevante de custo.",
      ),
      impacto(
        "comprador",
        pressiona ? "negativo" : "neutro",
        pressiona ? "Parcela de obra corrigida" : "Correção de obra suave",
        pressiona
          ? "Compra na planta tem parcela corrigida por INCC: explicar o reajuste na proposta reduz distrato."
          : "Reajuste da parcela na planta com baixo impacto no orçamento do comprador.",
      ),
      impacto(
        "negociacao",
        pressiona ? "negativo" : "neutro",
        pressiona ? "Objeção de reajuste" : "Reajuste pouco sensível",
        pressiona
          ? "Antecipar a simulação do reajuste no fechamento reduz objeção posterior."
          : "O reajuste tende a não ser o ponto central da objeção.",
      ),
      impacto(
        "investidor",
        pressiona ? "positivo" : "neutro",
        pressiona ? "Estoque pronto valoriza" : "Sem prêmio de estoque",
        pressiona
          ? "Custo de reposição maior favorece a unidade pronta comprada antes do reajuste."
          : "Sem prêmio relevante para unidade pronta por custo de reposição.",
      ),
    ],
    acao: pressiona
      ? "Revisar a tabela dos lançamentos e padronizar a explicação do reajuste de obra na proposta."
      : "Manter a tabela e usar a previsibilidade de parcela como argumento na planta.",
  };
}

/** IGP-M, IPCA e TR: correção contratual. Limiar 12m: 8% / 5% / 2%. */
function regraCorrecao(nome: string, valorMes: number, referencia12m: number, proxy: boolean): Regra {
  const alta = referencia12m >= 5;
  return {
    regra: `${nome} ${pct(valorMes)} no mês e ${pct(referencia12m)} em 12 meses${proxy ? " (proxy do mês × 12)" : ""} — limiar: 8% restritivo, 5% apertado, 2% neutro.`,
    impactos: [
      impacto(
        "comprador",
        alta ? "negativo" : "neutro",
        alta ? "Saldo devedor corrigido acima" : "Correção de saldo contida",
        alta
          ? "Índice elevado aumenta o saldo devedor e as parcelas futuras."
          : "Correção do saldo com efeito pequeno na parcela.",
      ),
      impacto(
        "negociacao",
        alta ? "negativo" : "neutro",
        alta ? "Indexador entra em discussão" : "Indexador não é objeção",
        alta
          ? "Revisar o indexador oferecido em contrato e explicar a base de correção na proposta."
          : "O indexador atual tende a passar sem objeção.",
      ),
      impacto(
        "investidor",
        alta ? "positivo" : "neutro",
        alta ? "Receita de locação indexada sobe" : "Reajuste de locação estável",
        alta
          ? "Contratos de locação indexados acompanham o índice e sustentam a rentabilidade nominal."
          : "Reajuste de locação sem ganho nominal relevante.",
      ),
    ],
    acao: alta
      ? "Comparar indexadores antes de renovar a tabela e padronizar a explicação da correção."
      : null,
  };
}

const JURO_BASICO = new Set(["selic_meta", "selic_12m", "cdi"]);
const CORRECAO = new Set(["igpm", "ipca", "tr"]);

/** Interpreta uma leitura em contexto de negócio. Sem coleta, não conclui. */
export function interpretarIndicador(leitura: LeituraIndicador): ContextoIndicador {
  const { confianca, motivo } = medirConfianca(leitura);
  const base: ContextoIndicador = {
    codigo: leitura.codigo,
    nome: leitura.nome,
    valor: leitura.valor,
    unidade: leitura.unidade,
    variacaoAnterior: leitura.variacaoAnterior,
    tendencia: leitura.tendencia,
    frescor: leitura.frescor,
    confianca,
    motivoConfianca: motivo,
    regra: null,
    impactos: [],
    acaoSugerida: null,
    proveniencia: leitura.proveniencia,
  };

  if (leitura.valor == null) {
    return {
      ...base,
      motivoAusencia:
        leitura.motivoAusencia ??
        `Sem coleta de ${leitura.nome}: nenhum impacto é atribuído sem valor medido.`,
    };
  }

  const subiu = leitura.variacaoAnterior == null ? null : leitura.variacaoAnterior > 0;
  const proxy = leitura.acumulado12m == null;
  const ref12m = leitura.acumulado12m ?? leitura.valor * 12;

  let regra: Regra | null = null;
  if (JURO_BASICO.has(leitura.codigo)) regra = regraJuroBasico(leitura.nome, leitura.valor, subiu);
  else if (leitura.codigo === "financiamento_imob_pf") regra = regraFinanciamento(leitura.valor);
  else if (leitura.codigo === "incc") regra = regraCustoObra(leitura.valor, ref12m, proxy);
  else if (CORRECAO.has(leitura.codigo)) regra = regraCorrecao(leitura.nome, leitura.valor, ref12m, proxy);

  if (!regra) {
    return {
      ...base,
      motivoAusencia: `Não existe regra de impacto publicada para ${leitura.nome}. A plataforma não interpreta indicador sem regra.`,
    };
  }

  return { ...base, regra: regra.regra, impactos: regra.impactos, acaoSugerida: regra.acao };
}

/* ------------------------------------------------------------------ *
 * Narrativa para o Advisor — base e confiança sempre explícitas
 * ------------------------------------------------------------------ */

export function narrarIndicador(ctx: ContextoIndicador): NarrativaMercado | null {
  if (ctx.valor == null || ctx.impactos.length === 0) return null;
  // Só narra movimento: valor estável não gera recomendação nova.
  if (ctx.variacaoAnterior == null || ctx.variacaoAnterior === 0) return null;

  const principal = ctx.impactos.find((i) => i.direcao !== "neutro") ?? ctx.impactos[0];
  if (!principal) return null;

  const dependeInterno = ctx.impactos.some((i) => i.base === "dado_interno");
  const movimento = ctx.variacaoAnterior > 0 ? "subiu" : "recuou";
  const abertura = `${ctx.nome} ${movimento} ${pct(Math.abs(ctx.variacaoAnterior))} p.p. desde a competência anterior (${pct(ctx.valor)}, fonte ${ctx.proveniencia?.fonte ?? "não declarada"}).`;
  const efeito = `Por regra de negócio: ${principal.leitura}`;
  const ressalva = dependeInterno
    ? " O efeito na velocidade de venda só se confirma contra o ciclo medido do seu funil."
    : "";
  const acao = ctx.acaoSugerida ? ` Ação sugerida: ${ctx.acaoSugerida}` : "";

  return {
    chave: ctx.codigo,
    texto: `${abertura} ${efeito}${ressalva}${acao}`,
    base: dependeInterno ? "dado_interno" : "regra_negocio",
    confianca: ctx.confianca,
    fonte: ctx.proveniencia?.fonte ?? "não declarada",
  };
}

const ordemNarrativa: Record<ConfiancaContexto, number> = {
  alta: 0,
  media: 1,
  baixa: 2,
  indefinida: 3,
};

export function montarMarketContext(leituras: LeituraIndicador[], agora = new Date()): MarketContext {
  const indicadores = leituras.map(interpretarIndicador);
  const narrativas = indicadores
    .map(narrarIndicador)
    .filter((n): n is NarrativaMercado => n !== null)
    .sort((a, b) => ordemNarrativa[a.confianca] - ordemNarrativa[b.confianca]);

  return {
    indicadores,
    narrativas,
    indicadoresComContexto: indicadores.filter((i) => i.impactos.length > 0).length,
    indicadoresSemColeta: indicadores.filter((i) => i.valor == null).length,
    geradoEm: agora.toISOString(),
  };
}
