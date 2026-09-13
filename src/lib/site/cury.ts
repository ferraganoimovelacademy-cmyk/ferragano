/**
 * Sprint UI 04 — Property Experience (CURY).
 * Camada de apresentação: tipos do catálogo público, conteúdo institucional
 * e slots de ativos.
 *
 * ⚠️ Propriedade intelectual: nenhum logotipo, foto, planta, vídeo ou texto
 * oficial da construtora é embutido aqui. Todo ativo entra pelo modelo de
 * dados (`empreendimentos.capa_url`, `galeria`, `property_media`) depois de
 * liberado pela equipe comercial. Até lá, a UI mostra placeholders.
 */
import type { EmpreendimentoSegmento, EmpreendimentoStatus } from "@/lib/platform/comercial";

export const CONSTRUTORA_NOME = "Cury";
export const CONSTRUTORA_SLUG = "cury";

export type CuryUnidade = {
  id: string;
  identificador: string;
  tipologia: string | null;
  andar: number | null;
  final: string | null;
  dormitorios: number | null;
  suites: number | null;
  vagas: number | null;
  varanda: boolean;
  area_privativa: number | null;
  area_total: number | null;
  preco: number | null;
  status: "disponivel" | "reservada" | "vendida" | "bloqueada" | "em_analise";
};

export type CuryConhecimento = {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
};

export type CuryEmpreendimento = {
  id: string;
  nome: string;
  slug: string;
  construtora: string | null;
  cidade: string | null;
  uf: string | null;
  bairro: string | null;
  status: EmpreendimentoStatus;
  segmento: EmpreendimentoSegmento;
  preco_min: number | null;
  preco_max: number | null;
  entrega_prevista: string | null;
  capa_url: string | null;
  descricao: string | null;
  destaque: boolean;
  /** Derivado do estoque público — nunca informado pelo cliente. */
  dormitorios: number[];
  area_min: number | null;
  area_max: number | null;
  disponiveis: number;
  total_unidades: number;
};

/** Ativo oficial publicado pela equipe comercial (property_media, publico = true). */
export type CuryAtivo = {
  id: string;
  tipo: "imagem" | "video" | "pdf" | "tour" | "planta" | "outro";
  titulo: string | null;
  url: string;
  alt: string | null;
  legenda: string | null;
  largura: number | null;
  altura: number | null;
};

export type CuryDetalhe = {
  empreendimento: CuryEmpreendimento & { galeria: string[] };
  unidades: CuryUnidade[];
  conhecimento: CuryConhecimento[];
  /** Sprint UI 04.2 — mídia oficial agrupada por tipo. */
  ativos: {
    plantas: CuryAtivo[];
    videos: CuryAtivo[];
    tours: CuryAtivo[];
    pdfs: CuryAtivo[];
  };
};

/** MCMV é sinalizado pelo segmento do empreendimento (modelo já existente). */
export const ehMcmv = (e: { segmento: EmpreendimentoSegmento }) => e.segmento === "mcmv";

export function anoEntrega(data: string | null): string {
  if (!data) return "Pronto para morar";
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return "A definir";
  return `${d.getUTCMonth() + 1 < 7 ? "1º" : "2º"} semestre de ${d.getUTCFullYear()}`;
}

export const FAIXAS_PRECO = [
  { id: "ate-300", label: "Até R$ 300 mil", min: 0, max: 300000 },
  { id: "300-450", label: "R$ 300 a 450 mil", min: 300000, max: 450000 },
  { id: "450-700", label: "R$ 450 a 700 mil", min: 450000, max: 700000 },
  { id: "acima-700", label: "Acima de R$ 700 mil", min: 700000, max: Number.MAX_SAFE_INTEGER },
] as const;

/* ------------------------------------------------------------------ */
/* GATE 01 — conteúdo institucional (fatos públicos, sem material protegido) */
/* ------------------------------------------------------------------ */

export const CURY_INSTITUCIONAL = {
  eyebrow: "Construtora parceira",
  titulo: "Cury: escala industrial aplicada à moradia acessível",
  lead:
    "A Ferragano trabalha com o portfólio da Cury por um motivo simples: produto padronizado, " +
    "obra previsível e engenharia de crédito desenhada para caber na renda de quem compra.",
  historia: [
    "A Cury atua no segmento de habitação econômica e médio padrão nas regiões metropolitanas de São Paulo e do Rio de Janeiro, com foco em terrenos próximos a eixos de transporte.",
    "O modelo de negócio combina alta velocidade de vendas, ciclo de obra curto e estrutura própria de originação de crédito imobiliário — o que reduz o intervalo entre a assinatura e a aprovação do financiamento.",
    "Para o comprador, isso se traduz em previsibilidade: o empreendimento chega ao mercado com produto definido, tabela clara e cronograma de obra já amarrado.",
  ],
  diferenciais: [
    {
      icone: "hub",
      titulo: "Localização em eixo de transporte",
      texto: "Terrenos escolhidos por acesso a metrô, trem e corredores de ônibus, não por preço isolado.",
    },
    {
      icone: "speed",
      titulo: "Ciclo de obra curto",
      texto: "Projeto padronizado e canteiro industrializado encurtam o prazo entre lançamento e entrega.",
    },
    {
      icone: "account_balance",
      titulo: "Engenharia de crédito",
      texto: "Estrutura dedicada a enquadrar a renda familiar nas melhores condições disponíveis.",
    },
    {
      icone: "grid_view",
      titulo: "Produto racional",
      texto: "Plantas compactas e bem resolvidas, com lazer entregue equipado nas áreas comuns.",
    },
  ],
  garantias: [
    {
      titulo: "Memorial descritivo",
      texto: "Acabamentos e áreas comuns são contratuais: o que está no memorial é o que é entregue.",
    },
    {
      titulo: "Patrimônio de afetação",
      texto: "Cada incorporação registra o empreendimento como patrimônio separado do da incorporadora.",
    },
    {
      titulo: "Prazo de entrega em contrato",
      texto: "Data de habite-se prevista em contrato, com a tolerância legal de 180 dias.",
    },
    {
      titulo: "Assistência técnica",
      texto: "Prazos legais de garantia por sistema construtivo após a entrega das chaves.",
    },
  ],
  solidez: [
    { rotulo: "Companhia listada", valor: "B3", nota: "Capital aberto, com informações financeiras públicas e auditadas." },
    { rotulo: "Praças de atuação", valor: "SP e RJ", nota: "Regiões metropolitanas com maior demanda por habitação econômica." },
    { rotulo: "Segmento principal", valor: "Econômico", nota: "Produto elegível ao Minha Casa Minha Vida em boa parte do portfólio." },
    { rotulo: "Governança", valor: "Novo Mercado", nota: "Nível mais exigente de governança corporativa da bolsa brasileira." },
  ],
  aviso:
    "Indicadores acima têm caráter informativo e derivam de informações públicas da companhia. " +
    "Dados financeiros, materiais de marketing, plantas e tabelas oficiais são publicados nesta " +
    "plataforma somente após liberação da equipe comercial da construtora.",
  /** Sprint UI 05 — processo de compra, etapa por etapa (sem promessa de prazo). */
  processo: [
    {
      titulo: "Diagnóstico de crédito",
      texto:
        "Antes de qualquer visita: renda, FGTS, subsídio e restrições. É o diagnóstico que define a faixa de produto.",
    },
    {
      titulo: "Curadoria do lançamento",
      texto:
        "Seleção de empreendimentos compatíveis com o objetivo declarado — morar, investir ou construir patrimônio.",
    },
    {
      titulo: "Visita orientada",
      texto:
        "Decorado, implantação e entorno visitados com roteiro: o que olhar no memorial e o que perguntar sobre a obra.",
    },
    {
      titulo: "Proposta e fluxo de pagamento",
      texto:
        "Tabela vigente, entrada, parcelas de obra e saldo financiado montados sobre a sua capacidade real de pagamento.",
    },
    {
      titulo: "Assinatura e financiamento",
      texto:
        "Contrato, análise bancária e enquadramento conduzidos com a estrutura de crédito da construtora.",
    },
    {
      titulo: "Acompanhamento até as chaves",
      texto:
        "Evolução de obra, repasses e vistoria de entrega acompanhados por um responsável nomeado.",
    },
  ],
  faq: [
    {
      pergunta: "A Ferragano é a construtora dos empreendimentos?",
      resposta:
        "Não. A Ferragano é consultoria patrimonial e faz a curadoria, o diagnóstico de crédito e o acompanhamento da compra. A incorporação e a obra são da construtora.",
    },
    {
      pergunta: "Todos os empreendimentos aceitam Minha Casa Minha Vida?",
      resposta:
        "Não. O enquadramento depende do produto e da renda familiar. No catálogo, os empreendimentos elegíveis aparecem sinalizados com o selo MCMV.",
    },
    {
      pergunta: "O preço apresentado é o preço final?",
      resposta:
        "A faixa exibida é referência de partida. A tabela vigente, condições de entrada e saldo financiado são confirmadas pelo consultor antes de qualquer proposta.",
    },
    {
      pergunta: "Consigo reservar uma unidade pelo site?",
      resposta:
        "A reserva é feita pelo consultor. Pelo site você indica a unidade de interesse e a disponibilidade é confirmada no atendimento.",
    },
  ],
};

/** GATE 03/07 — slots de ativos que a plataforma já sabe receber. */
export const ATIVOS_SLOTS = [
  { id: "galeria", titulo: "Fotos e perspectivas", icone: "photo_library", proporcao: "aspect-[16/9]" },
  { id: "video", titulo: "Vídeo do empreendimento", icone: "play_circle", proporcao: "aspect-video" },
  { id: "implantacao", titulo: "Implantação", icone: "map", proporcao: "aspect-[4/3]" },
  { id: "plantas", titulo: "Plantas humanizadas", icone: "grid_on", proporcao: "aspect-[4/3]" },
  { id: "tour", titulo: "Tour virtual 360º", icone: "view_in_ar", proporcao: "aspect-video" },
  { id: "obra", titulo: "Progresso da obra", icone: "construction", proporcao: "aspect-[16/9]" },
  { id: "memorial", titulo: "Memorial descritivo", icone: "description", proporcao: "aspect-[4/3]" },
  { id: "tabela", titulo: "Tabela de preços", icone: "table_chart", proporcao: "aspect-[4/3]" },
] as const;

export const LAZER_ITENS = [
  { icone: "pool", nome: "Piscina" },
  { icone: "fitness_center", nome: "Espaço fitness" },
  { icone: "outdoor_grill", nome: "Churrasqueira" },
  { icone: "celebration", nome: "Salão de festas" },
  { icone: "sports_esports", nome: "Espaço games" },
  { icone: "child_care", nome: "Brinquedoteca" },
  { icone: "pets", nome: "Pet place" },
  { icone: "deck", nome: "Espaço gourmet" },
  { icone: "local_laundry_service", nome: "Lavanderia" },
  { icone: "chair", nome: "Coworking" },
];