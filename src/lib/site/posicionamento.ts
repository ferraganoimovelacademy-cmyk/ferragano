/**
 * Posicionamento da marca — fonte única de verdade da narrativa pública.
 *
 * Regra estratégica: a marca principal é FERRAGANO. A Cury entra como
 * autoridade (construtora parceira), nunca como dona da experiência.
 * Quando a Ferragano Negócios Imobiliários existir, basta trocar `PAPEL`.
 */
export const MARCA = "Ferragano";
/** O produto é da Cury; o diferencial competitivo é a consultoria Ferragano. */
export const ASSINATURA = "Cury Collection Specialist";
export const PAPEL = "Consultor em Construção Patrimonial";
export const RESPONSAVEL = "Carlos Ferragano";

/** Linha de autoridade exibida no hero e no rodapé. */
export const LINHA_AUTORIDADE = "Especialista em Lançamentos Cury • Consultor Patrimonial";

export const PROMESSA =
  "Transformando o mercado imobiliário através de princípios, método e excelência. Minha missão é construir legados e patrimônio real.";

export const HERO_TITULO_1 = "O imóvel certo";
export const HERO_TITULO_2 = "muda sua história.";

/** Diferenciais da construtora parceira — apenas fatos públicos. */
export const DIFERENCIAIS_CURY = [
  {
    icon: "home_work",
    titulo: "Minha Casa Minha Vida",
    texto: "Produto desenhado dentro do programa, com subsídio e juros reduzidos quando a renda permite.",
  },
  {
    icon: "payments",
    titulo: "Entrada facilitada",
    texto: "Entrada diluída ao longo da obra, sem exigir capital concentrado na assinatura.",
  },
  {
    icon: "savings",
    titulo: "FGTS na compra",
    texto: "Saldo de FGTS pode compor entrada ou amortizar o financiamento.",
  },
  {
    icon: "calendar_month",
    titulo: "Parcelamento longo",
    texto: "Fluxo de pagamento estruturado até a entrega das chaves.",
  },
  {
    icon: "location_city",
    titulo: "Grandes localizações",
    texto: "Terrenos próximos a eixos de transporte, comércio e serviços consolidados.",
  },
  {
    icon: "trending_up",
    titulo: "Potencial de valorização",
    texto: "Compra na planta captura o ciclo entre lançamento e entrega.",
  },
] as const;

/** Como funciona — jornada do cliente em 5 passos. */
export const PASSOS_JORNADA = [
  { n: 1, titulo: "Descobrimos seu perfil", texto: "Renda, FGTS, objetivo e prazo antes de qualquer visita." },
  { n: 2, titulo: "Selecionamos os lançamentos", texto: "Curadoria do portfólio compatível com o seu plano." },
  { n: 3, titulo: "Visitamos o decorado", texto: "Agenda organizada, com comparação lado a lado." },
  { n: 4, titulo: "Aprovamos o financiamento", texto: "Engenharia de crédito conduzida junto ao banco." },
  { n: 5, titulo: "Entrega das chaves", texto: "Acompanhamento de obra e repasse até a posse." },
] as const;
