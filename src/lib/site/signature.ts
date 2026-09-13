/**
 * GATE 06.5 — Ferragano Signature.
 *
 * Análise consultiva própria da Ferragano sobre cada empreendimento.
 * Regras:
 * - 100% determinística e derivada do que já está no catálogo público
 *   (preço, metragem, tipologia, estágio, disponibilidade, segmento).
 * - Não substitui nem contradiz informação oficial da construtora: é leitura
 *   consultiva, sempre rotulada como opinião da Ferragano.
 * - Nenhum número inventado: cada nota tem uma justificativa exibida na UI.
 */
import { ehMcmv, type CuryEmpreendimento } from "@/lib/site/cury";

export type NotaEixo = {
  id: string;
  rotulo: string;
  icone: string;
  /** 0 a 10, em passos de 0,5. */
  nota: number;
  leitura: string;
};

export type Assinatura = {
  /** Média dos eixos, 0 a 10. */
  score: number;
  selo: "recomendado" | "observar";
  resumo: string;
  notas: NotaEixo[];
  fortes: string[];
  atencoes: string[];
  perfil: string[];
};

const clamp = (n: number) => Math.max(2, Math.min(10, Math.round(n * 2) / 2));

function notaValorizacao(e: CuryEmpreendimento): NotaEixo {
  const naPlanta = e.status === "lancamento" || e.status === "em_obras";
  const base = naPlanta ? 8.5 : 6.5;
  const bonusEixo = e.bairro ? 0.5 : 0;
  return {
    id: "valorizacao",
    rotulo: "Potencial de valorização",
    icone: "trending_up",
    nota: clamp(base + bonusEixo),
    leitura: naPlanta
      ? "Compra antes da entrega captura o ciclo entre lançamento e habite-se, quando o produto costuma reprecificar."
      : "Produto pronto ou em fase final: a valorização passa a depender mais do bairro do que do ciclo de obra.",
  };
}

function notaLiquidez(e: CuryEmpreendimento): NotaEixo {
  const doisOuTres = e.dormitorios.some((d) => d === 2 || d === 3);
  const base = doisOuTres ? 8.5 : 7;
  const ticket = e.preco_min ?? 0;
  const ajuste = ticket > 0 && ticket <= 450000 ? 1 : ticket > 900000 ? -1 : 0;
  return {
    id: "liquidez",
    rotulo: "Liquidez na revenda",
    icone: "swap_horiz",
    nota: clamp(base + ajuste),
    leitura: doisOuTres
      ? "Tipologia de 2 e 3 dormitórios é a mais procurada na região metropolitana — o que encurta o prazo de revenda."
      : "Tipologia compacta atende bem investidor e solteiro, mas o público de saída é mais estreito.",
  };
}

function notaLocalizacao(e: CuryEmpreendimento): NotaEixo {
  const temBairro = Boolean(e.bairro);
  const capital = (e.cidade ?? "").toLowerCase().includes("são paulo");
  return {
    id: "localizacao",
    rotulo: "Localização",
    icone: "location_on",
    nota: clamp(7 + (temBairro ? 1 : 0) + (capital ? 1 : 0)),
    leitura: temBairro
      ? `Endereço em ${e.bairro}${capital ? ", dentro da capital" : ""} — a Cury escolhe terreno por acesso a transporte, não por preço isolado.`
      : "Endereço completo confirmado no atendimento; a leitura de entorno é feita junto com o consultor.",
  };
}

function notaCustoBeneficio(e: CuryEmpreendimento): NotaEixo {
  const preco = e.preco_min ?? 0;
  const area = e.area_min ?? 0;
  const porM2 = preco > 0 && area > 0 ? preco / area : 0;
  const nota = porM2 === 0 ? 7 : porM2 < 9000 ? 9 : porM2 < 12000 ? 8 : porM2 < 15000 ? 7 : 6;
  return {
    id: "custo",
    rotulo: "Custo-benefício",
    icone: "balance",
    nota: clamp(nota + (ehMcmv(e) ? 0.5 : 0)),
    leitura: porM2
      ? `Referência de partida em torno de ${porM2.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} R$/m² privativo${ehMcmv(e) ? ", com subsídio possível pelo MCMV" : ""}.`
      : "Tabela vigente confirmada pelo consultor antes de qualquer comparação por metro quadrado.",
  };
}

function notaInvestidor(e: CuryEmpreendimento): NotaEixo {
  const compacto = e.dormitorios.some((d) => d <= 2);
  const naPlanta = e.status === "lancamento" || e.status === "em_obras";
  return {
    id: "investidor",
    rotulo: "Perfil investidor",
    icone: "savings",
    nota: clamp(6.5 + (compacto ? 1.5 : 0) + (naPlanta ? 1 : 0)),
    leitura: compacto
      ? "Unidade compacta em eixo de transporte é o produto que melhor gira em locação."
      : "Metragem maior tende a render menos por m² alugado, mas sustenta melhor o valor no longo prazo.",
  };
}

function notaMoradia(e: CuryEmpreendimento): NotaEixo {
  const familia = e.dormitorios.some((d) => d >= 2);
  const pronto = e.status === "pronto" || e.status === "entregue";
  return {
    id: "moradia",
    rotulo: "Perfil moradia",
    icone: "family_restroom",
    nota: clamp(7 + (familia ? 1 : -0.5) + (pronto ? 1 : 0)),
    leitura: pronto
      ? "Pronto para morar: sem aluguel em paralelo à obra, com posse imediata após o repasse."
      : "Entrega futura exige planejar o período de obra — a entrada diluída costuma compensar essa espera.",
  };
}

export function assinaturaFerragano(e: CuryEmpreendimento): Assinatura {
  const notas = [
    notaValorizacao(e),
    notaLiquidez(e),
    notaLocalizacao(e),
    notaCustoBeneficio(e),
    notaInvestidor(e),
    notaMoradia(e),
  ];
  const score = Math.round((notas.reduce((s, n) => s + n.nota, 0) / notas.length) * 10) / 10;

  const fortes = notas
    .filter((n) => n.nota >= 8)
    .slice(0, 3)
    .map((n) => n.leitura);

  const atencoes: string[] = [];
  if (e.total_unidades > 0 && e.disponiveis / e.total_unidades < 0.25) {
    atencoes.push(
      "Estoque em fase final: as unidades com melhor posição e incidência solar costumam sair primeiro.",
    );
  }
  if (!ehMcmv(e)) {
    atencoes.push(
      "Produto fora do enquadramento MCMV — a entrada exigida tende a ser maior do que no segmento econômico.",
    );
  }
  if (e.status === "lancamento") {
    atencoes.push("Lançamento recente: tabela e cronograma de obra são revisados nos primeiros meses.");
  }
  if (!atencoes.length) {
    atencoes.push("Sem ressalva relevante nesta leitura — confirme a unidade específica com o consultor.");
  }

  const perfil: string[] = [];
  if (ehMcmv(e)) perfil.push("Primeiro imóvel");
  if (e.dormitorios.some((d) => d <= 2)) perfil.push("Investidor de locação");
  if (e.dormitorios.some((d) => d >= 2)) perfil.push("Famílias pequenas");
  if (e.status === "pronto" || e.status === "entregue") perfil.push("Quem precisa mudar agora");
  if (!perfil.length) perfil.push("Construção de patrimônio");

  const resumo = ehMcmv(e)
    ? `Leitura da Ferragano: ${e.nome} é uma entrada eficiente no mercado para quem quer sair do aluguel usando subsídio e FGTS, sem comprometer o orçamento familiar.`
    : `Leitura da Ferragano: ${e.nome} entrega produto racional em endereço consolidado — combinação que sustenta valor mesmo em ciclo de juros alto.`;

  return {
    score,
    selo: score >= 8 ? "recomendado" : "observar",
    resumo,
    notas,
    fortes: fortes.length ? fortes : [notas[0]!.leitura],
    atencoes: atencoes.slice(0, 3),
    perfil: perfil.slice(0, 4),
  };
}

/* ------------------------------------------------------------------ */
/* GATE 03 — narrativa e lifestyle (apresentação)                      */
/* ------------------------------------------------------------------ */

/** Storytelling da página: história, não lista de características. */
export function narrativa(e: CuryEmpreendimento): { titulo: string; paragrafos: string[] } {
  const local = e.bairro ?? e.cidade ?? "a região";
  const dorm = e.dormitorios.length ? `${e.dormitorios.join(" e ")} dormitórios` : "plantas bem resolvidas";

  return {
    titulo: "Como é morar aqui",
    paragrafos: [
      `Imagine chegar em casa depois de um dia intenso e encontrar um condomínio pensado para devolver tranquilidade: portaria que reconhece você, elevador em segundos, e a porta de um apartamento de ${dorm} onde nada foi desperdiçado em metro quadrado inútil.`,
      `No fim de semana, a rotina muda de escala. A piscina fica a um andar de distância, o churrasco não precisa de reserva em outro bairro e as crianças brincam onde você consegue ver. ${e.nome} foi desenhado para que o lazer aconteça sem sair de casa.`,
      `E ${local} faz o resto do trabalho: transporte perto, comércio consolidado e o tipo de vizinhança que dá liquidez ao seu imóvel no dia em que você decidir mudar de vida outra vez.`,
    ],
  };
}

/** Lifestyle apresentado como cena, não como lista de itens. */
export const LIFESTYLE_CENAS = [
  {
    id: "piscina",
    icone: "pool",
    titulo: "Sábado começa na piscina",
    texto: "Deck ensolarado e água tratada logo abaixo de casa — o passeio de fim de semana vira rotina.",
  },
  {
    id: "fitness",
    icone: "fitness_center",
    titulo: "Treino sem trânsito",
    texto: "Academia equipada no condomínio: o exercício deixa de competir com o horário do escritório.",
  },
  {
    id: "coworking",
    icone: "chair",
    titulo: "Reunião no andar de baixo",
    texto: "Espaço de coworking para quando o home office precisa de silêncio e boa conexão.",
  },
  {
    id: "churrasqueira",
    icone: "outdoor_grill",
    titulo: "Churrasco sem logística",
    texto: "Espaço gourmet equipado para receber a família sem transformar a sala em restaurante.",
  },
  {
    id: "brinquedoteca",
    icone: "child_care",
    titulo: "As crianças por perto",
    texto: "Brinquedoteca e playground em área comum: brincadeira à vista, sem sair do condomínio.",
  },
  {
    id: "festas",
    icone: "celebration",
    titulo: "Aniversário em casa",
    texto: "Salão de festas para as datas que merecem espaço — e não cabem no apartamento.",
  },
] as const;
/* ------------------------------------------------------------------ */
/* UI 04.1 — GATE 03 — Análise Ferragano (bloco consultivo da página)  */
/* ------------------------------------------------------------------ */

export type AnaliseFerragano = {
  perfilIdeal: string;
  valorizacao: { titulo: string; texto: string; nota: number };
  publico: string[];
  fortes: string[];
  oportunidades: string[];
};

/**
 * Leitura consultiva exibida na página do empreendimento.
 * Determinística e derivada da assinatura — o produto é da Cury,
 * a interpretação é da Ferragano.
 */
export function analiseFerragano(e: CuryEmpreendimento, a: Assinatura): AnaliseFerragano {
  const eixoValorizacao = a.notas.find((n) => n.id === "valorizacao") ?? a.notas[0]!;
  const dorm = e.dormitorios.length ? `${e.dormitorios.join(" e ")} dormitórios` : "plantas compactas";
  const local = e.bairro ?? e.cidade ?? "São Paulo";

  const perfilIdeal = ehMcmv(e)
    ? `Quem hoje paga aluguel em ${local}, tem renda familiar enquadrável no Minha Casa Minha Vida e quer transformar a parcela em patrimônio com ${dorm}.`
    : `Quem busca ${dorm} em ${local} com foco em preservação de valor: entrada estruturada, produto racional e endereço já consolidado.`;

  const oportunidades: string[] = [...a.atencoes];
  if (e.disponiveis > 0 && e.total_unidades > 0) {
    oportunidades.push(
      `Com ${e.disponiveis} de ${e.total_unidades} unidades disponíveis, ainda há escolha de posição, andar e orientação solar — o que costuma valer mais que desconto na tabela.`,
    );
  }

  return {
    perfilIdeal,
    valorizacao: {
      titulo: eixoValorizacao.rotulo,
      texto: eixoValorizacao.leitura,
      nota: eixoValorizacao.nota,
    },
    publico: a.perfil,
    fortes: a.fortes,
    oportunidades: oportunidades.slice(0, 3),
  };
}

/* ------------------------------------------------------------------ */
/* Sprint UI 06 — GATE 05 — Liquidez e comparação com a vitrine        */
/* ------------------------------------------------------------------ */

export type Liquidez = {
  nivel: "alta" | "moderada" | "seletiva";
  /** 0 a 10, em passos de 0,5. */
  nota: number;
  texto: string;
  criterios: string[];
};

/**
 * Leitura de liquidez: facilidade estimada de revenda/locação do produto.
 * Determinística e explicada — cada critério que moveu a nota é exibido.
 * Não é promessa de rentabilidade: é leitura de perfil de demanda.
 */
export function liquidez(e: CuryEmpreendimento, entornoComMetro: boolean): Liquidez {
  const criterios: string[] = [];
  let nota = 6;

  if (ehMcmv(e)) {
    nota += 1.5;
    criterios.push("Ticket enquadrável no Minha Casa Minha Vida — maior base de compradores com crédito aprovável.");
  }
  if (e.dormitorios.includes(2)) {
    nota += 1;
    criterios.push("Tipologia de 2 dormitórios: a mais procurada em revenda e locação na capital.");
  }
  if (e.dormitorios.length >= 2) {
    nota += 0.5;
    criterios.push("Mais de uma tipologia no mesmo condomínio amplia o público na hora de repassar.");
  }
  if (entornoComMetro) {
    nota += 1;
    criterios.push("Transporte sobre trilhos no entorno — critério que sustenta demanda de locação.");
  }
  if (e.bairro) {
    nota += 0.5;
    criterios.push(`Endereço identificado (${e.bairro}), com histórico de negociação comparável.`);
  }
  if (e.total_unidades > 0 && e.disponiveis / e.total_unidades > 0.7) {
    nota -= 0.5;
    criterios.push("Estoque ainda amplo: concorrência com a própria construtora em uma revenda antecipada.");
  }
  if (e.segmento === "alto") {
    nota -= 0.5;
    criterios.push("Segmento de ticket mais alto: público menor e prazo médio de venda maior.");
  }

  const final = clamp(nota);
  const nivel: Liquidez["nivel"] = final >= 8.5 ? "alta" : final >= 7 ? "moderada" : "seletiva";
  const texto =
    nivel === "alta"
      ? "Produto com saída rápida no mercado secundário: tipologia e ticket coincidem com a maior fatia da demanda."
      : nivel === "moderada"
        ? "Liquidez equilibrada: a revenda depende mais do timing e da posição da unidade do que do endereço."
        : "Liquidez seletiva: o público é menor, então a decisão faz mais sentido com horizonte de uso ou de longo prazo.";

  return { nivel, nota: final, texto, criterios: criterios.slice(0, 4) };
}

export type ComparativoVitrine = {
  /** Quantos empreendimentos da vitrine entraram na comparação. */
  comparados: number;
  /** Posição por preço de partida (1 = mais acessível). */
  posicaoPreco: number;
  precoMedio: number;
  scoreMedio: number;
  score: number;
  texto: string;
};

/**
 * Compara o empreendimento com os demais da própria vitrine Ferragano.
 * Só usa dados públicos do catálogo — sem projeção de rentabilidade.
 */
export function comparativoVitrine(
  e: CuryEmpreendimento,
  itens: CuryEmpreendimento[],
  score: number,
): ComparativoVitrine | null {
  const base = itens.filter((i) => (i.preco_min ?? 0) > 0);
  if (base.length < 2) return null;

  const precos = base.map((i) => i.preco_min ?? 0).sort((a, b) => a - b);
  const precoMedio = precos.reduce((s, p) => s + p, 0) / precos.length;
  const meu = e.preco_min ?? 0;
  const posicaoPreco = meu > 0 ? precos.filter((p) => p < meu).length + 1 : base.length;
  const scoreMedio =
    base.reduce((s, i) => s + assinaturaFerragano(i).score, 0) / base.length;

  const relPreco =
    meu <= 0
      ? "sem preço público de partida no momento"
      : meu < precoMedio
        ? `preço de partida abaixo da média da vitrine (${posicaoPreco}º mais acessível de ${base.length})`
        : `preço de partida acima da média da vitrine (${posicaoPreco}º de ${base.length} em ordem crescente)`;
  const relScore =
    score >= scoreMedio
      ? "e nota Ferragano igual ou superior à média do portfólio"
      : "e nota Ferragano abaixo da média do portfólio — o que costuma indicar um ponto específico a checar, não um produto ruim";

  return {
    comparados: base.length,
    posicaoPreco,
    precoMedio,
    scoreMedio: Math.round(scoreMedio * 10) / 10,
    score,
    texto: `Frente aos outros empreendimentos que a Ferragano acompanha, este tem ${relPreco} ${relScore}.`,
  };
}
