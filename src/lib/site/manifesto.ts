/**
 * Manifesto da marca Ferragano — fonte única do texto institucional.
 * Usado na Home (resumo), em /sobre (versão completa em blocos) e em
 * /manifesto (experiência premium de leitura).
 */

export const MANIFESTO_TITULO = "Minha missão é muito maior do que vender imóveis.";

export const MANIFESTO_RESUMO_HOME = [
  "O imóvel certo pode mudar sua história.",
  "Ajudo famílias e investidores a escolher o lançamento certo através de um diagnóstico preciso e curadoria técnica.",
] as const;

export const FRASE_RODAPE = "O verdadeiro patrimônio sempre serão as pessoas.";

export const ASSINATURA_FINAL = [
  "Eu não vendo imóveis.",
  "Desenvolvo pessoas.",
  "Construo patrimônios.",
  "Formo líderes.",
  "Lanço movimentos.",
] as const;

/** Fechamento do manifesto, lido em ritmo curto após a assinatura. */
export const ENCERRAMENTO = [
  "Esse é o meu compromisso.",
  "Essa é a minha identidade.",
  "Esse é o legado que escolhi construir.",
] as const;

/** Frase de fechamento em tela cheia. */
export const FRASE_FINAL_TELA =
  "Eu não vendo imóveis. Eu ajudo pessoas a construir patrimônio e legado.";

/** Marcos da trajetória — usados em /sobre e /manifesto. */
export const MARCOS_TRAJETORIA = [
  {
    marco: "Início",
    titulo: "Do estande à mesa de negociação",
    texto:
      "Primeiros anos vendendo lançamento em plantão: leitura de tabela, memorial e cronograma de obra como rotina diária.",
  },
  {
    marco: "Especialização",
    titulo: "Crédito imobiliário como ferramenta",
    texto:
      "Aprofundamento em enquadramento de renda, FGTS, subsídio e fluxo de obra — a parte que decide se a compra acontece.",
  },
  {
    marco: "Liderança",
    titulo: "Gerência comercial na Cury",
    texto:
      "Formação e condução de time comercial dentro do portfólio da construtora, com processo e meta acompanhados por indicador.",
  },
  {
    marco: "Hoje",
    titulo: "Consultoria em construção patrimonial",
    texto:
      "Operação própria com método, tecnologia e curadoria: o objetivo do cliente vem antes do estoque disponível.",
  },
] as const;

export interface BlocoManifesto {
  id: string;
  eyebrow: string;
  destaque?: string;
  paragrafos: string[];
  lista?: string[];
}

export const MANIFESTO_BLOCOS: BlocoManifesto[] = [
  {
    id: "escolha",
    eyebrow: "A escolha",
    paragrafos: [
      "Algumas pessoas vendem apartamentos.",
      "Outras ajudam famílias a encontrar um lugar para viver, investir e construir um patrimônio que atravessa gerações.",
      "Foi esse segundo caminho que escolhi seguir.",
    ],
  },
  {
    id: "principios",
    eyebrow: "Princípios",
    paragrafos: [
      "Meu nome é Carlos Ferragano.",
      "Sou cristão e acredito que grandes conquistas começam por grandes princípios. A fé me ensinou que liderança é servir, caráter vale mais do que talento e sucesso só faz sentido quando transforma a vida de outras pessoas.",
    ],
  },
  {
    id: "trajetoria",
    eyebrow: "Trajetória",
    destaque: "Imóveis são apenas o meio. O verdadeiro patrimônio sempre serão as pessoas.",
    paragrafos: [
      "Há mais de uma década dedico minha carreira ao mercado imobiliário. Nesse período participei da comercialização de mais de R$ 73 milhões em Valor Geral de Vendas (VGV), acompanhando de perto sonhos, investimentos e decisões que mudaram a história de muitas famílias.",
      "Cada negociação fortaleceu uma certeza.",
    ],
  },
  {
    id: "pessoas",
    eyebrow: "Pessoas",
    paragrafos: [
      "Foi por isso que minha atuação evoluiu. Além de orientar clientes, passei a desenvolver profissionais, formar líderes e construir equipes comprometidas com ética, excelência, disciplina e resultados sustentáveis.",
      "Para mim, resultado nunca foi apenas um número. Resultado é consequência de um método executado todos os dias.",
    ],
    lista: ["Resultado não é meta. Resultado é rotina."],
  },
  {
    id: "confianca",
    eyebrow: "Confiança",
    destaque: "Existe algo que nenhuma tecnologia substitui: a confiança.",
    paragrafos: [
      "Hoje uno estratégia comercial, inteligência de mercado, marketing imobiliário, comunicação consultiva e tecnologia para tornar cada decisão mais simples, segura e transparente.",
      "A confiança nasce quando existe escuta, preparo, responsabilidade e compromisso genuíno com cada pessoa atendida.",
    ],
    lista: ["Ouvir antes de falar.", "Orientar antes de convencer.", "Servir antes de vender."],
  },
  {
    id: "permanencia",
    eyebrow: "O que permanece",
    paragrafos: [
      "O mercado continuará evoluindo. Novas tecnologias surgirão, novos empreendimentos serão lançados e novas tendências transformarão o setor.",
      "Mas uma verdade permanecerá a mesma: as pessoas sempre buscarão alguém em quem possam confiar para uma das decisões mais importantes de suas vidas.",
      "É essa pessoa que procuro ser todos os dias.",
    ],
  },
  {
    id: "proposito",
    eyebrow: "Propósito",
    paragrafos: [
      "Meu propósito é elevar o nível do mercado imobiliário, desenvolver profissionais extraordinários, construir equipes de alta performance e ajudar cada cliente a transformar sonhos em patrimônio e patrimônio em legado.",
      "Esse é o meu compromisso. Essa é a minha identidade. Esse é o legado que escolhi construir.",
    ],
  },
];

/** Indicadores de impacto do manifesto — números declarados pela operação. */
export const NUMEROS_MANIFESTO = [
  { valor: 73, prefixo: "R$ ", sufixo: " mi", label: "Em VGV comercializado", icon: "payments" },
  { valor: 1400, sufixo: "+", label: "Famílias atendidas", icon: "groups" },
  { valor: 1, sufixo: " Especialista", label: "Em lançamentos Cury", icon: "verified" },
] as const;
