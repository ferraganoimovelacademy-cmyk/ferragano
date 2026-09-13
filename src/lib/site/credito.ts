/**
 * GATE 05 — Experience Calculator.
 *
 * Simulação de capacidade de compra 100% client-side e determinística.
 * Não consulta o backend, não grava nada e não é análise de crédito:
 * a taxa efetiva, o subsídio e o prazo finais são confirmados pelo banco.
 */
import type { CuryEmpreendimento } from "@/lib/site/cury";

export type FaixaMcmv = {
  id: string;
  rotulo: string;
  rendaMax: number;
  /** Juros nominais anuais usados na simulação. */
  taxaAno: number;
  subsidioMax: number;
  nota: string;
};

/** Faixas de referência do programa — usadas apenas para simular. */
export const FAIXAS_MCMV: FaixaMcmv[] = [
  {
    id: "f1",
    rotulo: "Faixa 1",
    rendaMax: 2850,
    taxaAno: 0.05,
    subsidioMax: 55000,
    nota: "Maior subsídio e menor juro do programa.",
  },
  {
    id: "f2",
    rotulo: "Faixa 2",
    rendaMax: 4700,
    taxaAno: 0.065,
    subsidioMax: 30000,
    nota: "Subsídio parcial e juro reduzido.",
  },
  {
    id: "f3",
    rotulo: "Faixa 3",
    rendaMax: 8600,
    taxaAno: 0.0825,
    subsidioMax: 0,
    nota: "Sem subsídio, juro abaixo do mercado livre.",
  },
  {
    id: "f4",
    rotulo: "Classe média",
    rendaMax: 12000,
    taxaAno: 0.1,
    subsidioMax: 0,
    nota: "Faixa de renda média com uso de FGTS permitido.",
  },
  {
    id: "livre",
    rotulo: "Mercado livre",
    rendaMax: Number.MAX_SAFE_INTEGER,
    taxaAno: 0.115,
    subsidioMax: 0,
    nota: "Fora do programa: taxa de mercado e entrada maior.",
  },
];

export const PRAZO_MESES = 360;
export const COMPROMETIMENTO = 0.3;

export type SimulacaoUnidade = {
  faixa: FaixaMcmv;
  /** Valor do imóvel usado na conta. */
  valorImovel: number;
  recursosProprios: number;
  subsidio: number;
  /** Valor efetivamente financiado. */
  financiado: number;
  parcela: number;
  taxaMes: number;
  /** Percentual da renda comprometido com a parcela (0 a 1+). */
  comprometimento: number;
  /** Renda mínima sugerida para manter a parcela em 30% da renda. */
  rendaSugerida: number;
  cabe: boolean;
};

/**
 * GATE 06 — simulação direta: parte do preço do empreendimento e devolve a
 * parcela. Determinística, client-side e sem análise de crédito real.
 */
export function simularUnidade(input: {
  valorImovel: number;
  renda: number;
  fgts: number;
  entrada: number;
  prazoMeses?: number;
}): SimulacaoUnidade {
  const valorImovel = Math.max(input.valorImovel, 0);
  const renda = Math.max(input.renda, 0);
  const meses = input.prazoMeses ?? PRAZO_MESES;
  const faixa = faixaPorRenda(renda);
  const recursosProprios = Math.max(input.fgts, 0) + Math.max(input.entrada, 0);
  const subsidio = faixa.subsidioMax > 0 && renda > 0 ? faixa.subsidioMax : 0;
  const financiado = Math.max(valorImovel - recursosProprios - subsidio, 0);
  const taxaMes = Math.pow(1 + faixa.taxaAno, 1 / 12) - 1;
  const parcela =
    financiado <= 0
      ? 0
      : taxaMes <= 0
        ? financiado / meses
        : (financiado * taxaMes) / (1 - Math.pow(1 + taxaMes, -meses));
  const comprometimento = renda > 0 ? parcela / renda : 0;

  return {
    faixa,
    valorImovel,
    recursosProprios,
    subsidio,
    financiado,
    parcela,
    taxaMes,
    comprometimento,
    rendaSugerida: parcela / COMPROMETIMENTO,
    cabe: renda > 0 && comprometimento <= COMPROMETIMENTO,
  };
}

export function faixaPorRenda(renda: number): FaixaMcmv {
  return FAIXAS_MCMV.find((f) => renda <= f.rendaMax) ?? FAIXAS_MCMV[FAIXAS_MCMV.length - 1]!;
}

export type Simulacao = {
  faixa: FaixaMcmv;
  parcela: number;
  taxaMes: number;
  financiavel: number;
  subsidio: number;
  recursosProprios: number;
  /** Faixa de imóvel viável: piso conservador e teto otimista. */
  valorMin: number;
  valorMax: number;
};

/** Valor presente de uma série de parcelas fixas (tabela de juros compostos). */
function valorPresente(parcela: number, taxaMes: number, meses: number) {
  if (taxaMes <= 0) return parcela * meses;
  return (parcela * (1 - Math.pow(1 + taxaMes, -meses))) / taxaMes;
}

export function simularCompra(input: {
  renda: number;
  fgts: number;
  entrada: number;
  faixaId?: string;
}): Simulacao {
  const renda = Math.max(input.renda, 0);
  const faixa =
    FAIXAS_MCMV.find((f) => f.id === input.faixaId && renda <= f.rendaMax) ?? faixaPorRenda(renda);

  const parcela = renda * COMPROMETIMENTO;
  const taxaMes = Math.pow(1 + faixa.taxaAno, 1 / 12) - 1;
  const financiavel = valorPresente(parcela, taxaMes, PRAZO_MESES);

  const recursosProprios = Math.max(input.fgts, 0) + Math.max(input.entrada, 0);
  const subsidio = faixa.subsidioMax > 0 && renda > 0 ? faixa.subsidioMax : 0;

  const valorMax = financiavel + recursosProprios + subsidio;
  return {
    faixa,
    parcela,
    taxaMes,
    financiavel,
    subsidio,
    recursosProprios,
    valorMin: valorMax * 0.78,
    valorMax,
  };
}

/** Empreendimentos cujo preço de partida cabe no teto simulado. */
export function compativeis(
  itens: CuryEmpreendimento[],
  s: Simulacao,
  cidade: string,
): CuryEmpreendimento[] {
  const alvo = cidade.trim().toLowerCase();
  return itens
    .filter((e) => {
      const preco = e.preco_min ?? 0;
      if (preco <= 0 || preco > s.valorMax) return false;
      if (!alvo) return true;
      return `${e.cidade ?? ""} ${e.bairro ?? ""}`.toLowerCase().includes(alvo);
    })
    .sort((a, b) => (b.preco_min ?? 0) - (a.preco_min ?? 0))
    .slice(0, 3);
}

/** Recomendação consultiva — texto derivado da própria simulação. */
export function recomendacaoFerragano(s: Simulacao, encontrados: number): string {
  if (s.parcela <= 0) return "Informe a renda familiar para a Ferragano montar o cenário.";
  if (!encontrados) {
    return (
      "Com esse cenário, nenhum empreendimento do portfólio atual entra no teto simulado. " +
      "O caminho costuma ser somar renda de um segundo comprador, usar mais FGTS ou aguardar um lançamento com tabela de entrada."
    );
  }
  if (s.subsidio > 0) {
    return (
      "Sua renda entra no trecho subsidiado do programa: priorize assinar antes de mudanças de faixa, " +
      "porque o subsídio é travado na data da contratação."
    );
  }
  if (s.recursosProprios >= s.valorMax * 0.25) {
    return (
      "Você tem recursos próprios acima do usual para essa faixa. Vale reduzir o prazo em vez do valor do imóvel — " +
      "o mesmo orçamento compra um endereço melhor com menos juro total."
    );
  }
  return (
    "Cenário equilibrado: a parcela fica dentro dos 30% da renda e sobra espaço para os custos de escritura e ITBI. " +
    "Traga a documentação e o consultor valida a taxa real com o banco."
  );
}