/** Conteúdo editorial estático do blog institucional. Somente apresentação. */
export const CATEGORIAS = [
  "Mercado",
  "Investimento",
  "Lançamentos",
  "Financiamento",
  "Patrimônio",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export type Post = {
  slug: string;
  categoria: Categoria;
  titulo: string;
  resumo: string;
  leitura: string;
  paragrafos: string[];
};

export const POSTS: Post[] = [
  {
    slug: "por-que-comprar-lancamento",
    categoria: "Lançamentos",
    titulo: "Por que comprar lançamento muda a matemática do seu patrimônio",
    resumo:
      "A diferença entre comprar pronto e comprar na planta não é preço: é o ciclo de valorização que você captura e o fluxo de caixa que preserva.",
    leitura: "6 min de leitura",
    paragrafos: [
      "Quem compra um imóvel pronto paga o preço já formado. Todo o ganho gerado entre o lançamento e a entrega ficou com o comprador anterior. Quem entra na pré-obra assume um risco controlado de execução e, em troca, participa desse ciclo.",
      "O segundo efeito é de caixa. No lançamento, a entrada é parcelada e as parcelas de obra acompanham o cronograma da construtora. O financiamento bancário só entra na entrega, quando o imóvel já foi reavaliado.",
      "Isso não faz de todo lançamento um bom negócio. Faz do lançamento um instrumento — que só funciona com diagnóstico de crédito, leitura de região e análise do histórico da construtora.",
    ],
  },
  {
    slug: "renda-que-compra-o-segundo-imovel",
    categoria: "Patrimônio",
    titulo: "A renda do primeiro imóvel é a entrada do segundo",
    resumo:
      "Construir patrimônio imobiliário é repetir uma decisão certa. O primeiro ativo financia o próximo passo.",
    leitura: "5 min de leitura",
    paragrafos: [
      "O erro mais comum é tratar a compra como evento único. Patrimônio se constrói em série: um ativo bem escolhido gera valorização e renda, e essas duas coisas viram capacidade de aquisição.",
      "Na prática, o ciclo é simples. Compra planejada, entrega, locação, acúmulo de equity e reaplicação. O que decide o resultado é a qualidade da primeira escolha.",
      "É por isso que o diagnóstico vem antes da visita. Sem clareza de prazo e objetivo, o imóvel escolhido pode travar o plano em vez de acelerá-lo.",
    ],
  },
  {
    slug: "como-o-banco-avalia-seu-credito",
    categoria: "Financiamento",
    titulo: "Como o banco realmente avalia sua capacidade de crédito",
    resumo:
      "Renda comprovada, comprometimento, prazo e perfil de risco. Entender a régua antes de visitar evita frustração.",
    leitura: "7 min de leitura",
    paragrafos: [
      "A parcela do financiamento tem um limite prático: parte da renda familiar comprovada. Acima disso, a proposta não passa, independentemente da vontade do comprador.",
      "Além da renda, pesam prazo, idade, relacionamento bancário e composição de renda entre titulares. Cada banco tem uma régua ligeiramente diferente.",
      "Simular antes é o que transforma uma busca cansativa em três visitas objetivas. Você visita sabendo o que cabe.",
    ],
  },
  {
    slug: "leitura-de-regiao-antes-do-produto",
    categoria: "Mercado",
    titulo: "Leia a região antes de olhar a planta",
    resumo:
      "Transporte, comércio consolidado, oferta futura e perfil de locação explicam mais sobre o resultado do que o acabamento.",
    leitura: "6 min de leitura",
    paragrafos: [
      "Duas torres idênticas em bairros diferentes têm resultados diferentes. A região responde por boa parte da valorização e quase toda a liquidez de locação.",
      "O que observamos: eixos de transporte consolidados, densidade de comércio, estoque de lançamentos anunciados e histórico de absorção do bairro.",
      "Essa leitura é observacional e feita a partir de dados públicos de mercado. Não é previsão — é contexto para decidir com menos ruído.",
    ],
  },
  {
    slug: "erros-de-quem-investe-em-imovel",
    categoria: "Investimento",
    titulo: "Cinco erros que corroem o retorno de um imóvel de investimento",
    resumo:
      "Metragem errada, fluxo apertado, região sem liquidez, custo ignorado e ausência de plano de saída.",
    leitura: "5 min de leitura",
    paragrafos: [
      "O primeiro erro é comprar a planta que você gostaria de morar, e não a que o mercado de locação daquela região absorve.",
      "O segundo é montar um fluxo de pagamento sem folga: qualquer imprevisto durante a obra vira venda apressada e desconto.",
      "Os outros três aparecem depois: ignorar custos recorrentes, escolher região sem liquidez e comprar sem plano de saída definido.",
    ],
  },
];

export function acharPost(slug: string) {
  return POSTS.find((p) => p.slug === slug);
}
