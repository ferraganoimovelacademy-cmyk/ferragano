/**
 * Sprint UI 06 — GATE 04 (Smart Location).
 *
 * Referências de entorno por bairro, curadas manualmente pela Ferragano.
 * Regras:
 * - Nenhum tempo é calculado por API: são estimativas de deslocamento em
 *   condição normal de trânsito, sempre rotuladas como estimativa na UI.
 * - Bairro sem curadoria não recebe número inventado: devolve `null` e a UI
 *   mostra o estado "a confirmar com o consultor".
 */
export type PoiCategoria =
  | "metro"
  | "shopping"
  | "hospital"
  | "escola"
  | "mercado"
  | "parque"
  | "via";

export type Poi = {
  categoria: PoiCategoria;
  nome: string;
  minutos: number;
  modo: "a pé" | "de carro";
};

export type Entorno = {
  bairro: string;
  resumo: string;
  pois: Poi[];
};

export const CATEGORIAS: Record<PoiCategoria, { rotulo: string; icone: string }> = {
  metro: { rotulo: "Metrô e trem", icone: "subway" },
  shopping: { rotulo: "Shopping", icone: "shopping_bag" },
  hospital: { rotulo: "Saúde", icone: "local_hospital" },
  escola: { rotulo: "Educação", icone: "school" },
  mercado: { rotulo: "Supermercado", icone: "storefront" },
  parque: { rotulo: "Parques", icone: "park" },
  via: { rotulo: "Principais vias", icone: "route" },
};

const ENTORNO: Record<string, Entorno> = {
  "vila leopoldina": {
    bairro: "Vila Leopoldina",
    resumo:
      "Bairro consolidado entre a Marginal Pinheiros e a Lapa, com conversão industrial em residencial e comércio de bairro maduro.",
    pois: [
      { categoria: "metro", nome: "Estação Villa-Lobos–Jaguaré (Linha 9)", minutos: 12, modo: "a pé" },
      { categoria: "shopping", nome: "Shopping Bourbon Pompeia", minutos: 12, modo: "de carro" },
      { categoria: "hospital", nome: "Hospital São Camilo Ipiranga/Unidade Oeste", minutos: 14, modo: "de carro" },
      { categoria: "escola", nome: "Colégios e creches na Vila Leopoldina", minutos: 9, modo: "a pé" },
      { categoria: "mercado", nome: "CEAGESP e supermercados da Av. Imperatriz Leopoldina", minutos: 7, modo: "a pé" },
      { categoria: "parque", nome: "Parque Villa-Lobos", minutos: 10, modo: "de carro" },
      { categoria: "via", nome: "Marginal Pinheiros e Av. Imperatriz Leopoldina", minutos: 5, modo: "de carro" },
    ],
  },
  lapa: {
    bairro: "Lapa",
    resumo:
      "Um dos centros de bairro mais completos da zona oeste: comércio de rua, trem, hospitais e escolas no mesmo raio.",
    pois: [
      { categoria: "metro", nome: "Estação Lapa (Linha 8)", minutos: 11, modo: "a pé" },
      { categoria: "shopping", nome: "Shopping Anália Franco Oeste / Bourbon Pompeia", minutos: 13, modo: "de carro" },
      { categoria: "hospital", nome: "Hospital Alvorada Lapa", minutos: 8, modo: "de carro" },
      { categoria: "escola", nome: "Rede pública e particular da Rua Guaicurus", minutos: 8, modo: "a pé" },
      { categoria: "mercado", nome: "Supermercados da Rua 12 de Outubro", minutos: 6, modo: "a pé" },
      { categoria: "parque", nome: "Praça Cornélia e Parque da Água Branca", minutos: 12, modo: "de carro" },
      { categoria: "via", nome: "Marginal Tietê e Av. Antártica", minutos: 7, modo: "de carro" },
    ],
  },
  "agua branca": {
    bairro: "Água Branca",
    resumo:
      "Eixo em transformação com forte infraestrutura de mobilidade e áreas verdes preservadas no entorno.",
    pois: [
      { categoria: "metro", nome: "Estação Água Branca (Linha 8)", minutos: 9, modo: "a pé" },
      { categoria: "shopping", nome: "Shopping Bourbon Pompeia", minutos: 9, modo: "de carro" },
      { categoria: "hospital", nome: "Hospital e Maternidade São Camilo Pompeia", minutos: 11, modo: "de carro" },
      { categoria: "escola", nome: "Colégios na Av. Francisco Matarazzo", minutos: 10, modo: "a pé" },
      { categoria: "mercado", nome: "Supermercados da Av. Auro Soares", minutos: 8, modo: "a pé" },
      { categoria: "parque", nome: "Parque da Água Branca", minutos: 7, modo: "a pé" },
      { categoria: "via", nome: "Marginal Tietê e Av. Francisco Matarazzo", minutos: 5, modo: "de carro" },
    ],
  },
  pirituba: {
    bairro: "Pirituba",
    resumo:
      "Bairro residencial da zona noroeste com trem urbano, comércio local forte e preço de entrada mais acessível.",
    pois: [
      { categoria: "metro", nome: "Estação Piqueri / Vila Clarice (Linha 7)", minutos: 13, modo: "a pé" },
      { categoria: "shopping", nome: "Shopping Center Norte", minutos: 18, modo: "de carro" },
      { categoria: "hospital", nome: "Hospital Municipal Cármino Caricchio Oeste / UPA Pirituba", minutos: 10, modo: "de carro" },
      { categoria: "escola", nome: "Escolas municipais e estaduais de Pirituba", minutos: 8, modo: "a pé" },
      { categoria: "mercado", nome: "Supermercados da Av. Mutinga", minutos: 7, modo: "a pé" },
      { categoria: "parque", nome: "Parque Pinheirinho d'Água", minutos: 12, modo: "de carro" },
      { categoria: "via", nome: "Marginal Tietê e Av. Raimundo Pereira de Magalhães", minutos: 9, modo: "de carro" },
    ],
  },
  butanta: {
    bairro: "Butantã",
    resumo:
      "Vizinhança universitária com metrô, hospitais de referência e demanda constante de locação.",
    pois: [
      { categoria: "metro", nome: "Estação Butantã (Linha 4)", minutos: 10, modo: "a pé" },
      { categoria: "shopping", nome: "Shopping Eldorado", minutos: 12, modo: "de carro" },
      { categoria: "hospital", nome: "Hospital Universitário da USP", minutos: 9, modo: "de carro" },
      { categoria: "escola", nome: "USP e colégios da Av. Vital Brasil", minutos: 10, modo: "a pé" },
      { categoria: "mercado", nome: "Supermercados da Av. Corifeu de Azevedo Marques", minutos: 8, modo: "a pé" },
      { categoria: "parque", nome: "Praça do Relógio (USP) e Parque Villa-Lobos", minutos: 13, modo: "de carro" },
      { categoria: "via", nome: "Marginal Pinheiros e Av. Eusébio Matoso", minutos: 8, modo: "de carro" },
    ],
  },
  pinheiros: {
    bairro: "Pinheiros",
    resumo:
      "Endereço maduro e caro por metro quadrado, com a maior densidade de serviço, cultura e transporte da zona oeste.",
    pois: [
      { categoria: "metro", nome: "Estação Fradique Coutinho (Linha 4)", minutos: 8, modo: "a pé" },
      { categoria: "shopping", nome: "Shopping Eldorado / Iguatemi", minutos: 10, modo: "de carro" },
      { categoria: "hospital", nome: "Hospital Israelita Albert Einstein (unidade Pinheiros)", minutos: 12, modo: "de carro" },
      { categoria: "escola", nome: "Colégios particulares de Pinheiros", minutos: 9, modo: "a pé" },
      { categoria: "mercado", nome: "Mercado Municipal de Pinheiros", minutos: 7, modo: "a pé" },
      { categoria: "parque", nome: "Parque do Povo", minutos: 11, modo: "de carro" },
      { categoria: "via", nome: "Av. Rebouças e Marginal Pinheiros", minutos: 6, modo: "de carro" },
    ],
  },
  perdizes: {
    bairro: "Perdizes",
    resumo:
      "Bairro residencial de perfil familiar, com escolas tradicionais e comércio de vizinhança a pé.",
    pois: [
      { categoria: "metro", nome: "Estação Santa Cecília (Linha 3) / Água Branca (Linha 8)", minutos: 14, modo: "de carro" },
      { categoria: "shopping", nome: "Shopping Bourbon Pompeia", minutos: 8, modo: "de carro" },
      { categoria: "hospital", nome: "Hospital São Camilo Pompeia", minutos: 7, modo: "de carro" },
      { categoria: "escola", nome: "PUC-SP e colégios da Rua Turiassu", minutos: 9, modo: "a pé" },
      { categoria: "mercado", nome: "Supermercados da Av. Sumaré", minutos: 7, modo: "a pé" },
      { categoria: "parque", nome: "Praça Vilaboim e Parque da Água Branca", minutos: 10, modo: "de carro" },
      { categoria: "via", nome: "Av. Sumaré e Av. Pompeia", minutos: 5, modo: "de carro" },
    ],
  },
  "barra funda": {
    bairro: "Barra Funda",
    resumo:
      "Maior nó de mobilidade da região: metrô, trem, rodoviária e acesso rápido ao centro expandido.",
    pois: [
      { categoria: "metro", nome: "Terminal Palmeiras-Barra Funda (Linhas 3, 7 e 8)", minutos: 9, modo: "a pé" },
      { categoria: "shopping", nome: "Shopping West Plaza", minutos: 8, modo: "de carro" },
      { categoria: "hospital", nome: "Hospital Pérola Byington / São Camilo Pompeia", minutos: 12, modo: "de carro" },
      { categoria: "escola", nome: "Escolas técnicas e colégios da Av. Marquês de São Vicente", minutos: 11, modo: "a pé" },
      { categoria: "mercado", nome: "Supermercados da Av. Thomas Edison", minutos: 8, modo: "a pé" },
      { categoria: "parque", nome: "Parque da Água Branca", minutos: 9, modo: "de carro" },
      { categoria: "via", nome: "Marginal Tietê e Av. Francisco Matarazzo", minutos: 5, modo: "de carro" },
    ],
  },
  "vila anastacio": {
    bairro: "Vila Anastácio",
    resumo:
      "Antiga zona industrial vizinha à Lapa, com renovação residencial recente e acesso direto às marginais.",
    pois: [
      { categoria: "metro", nome: "Estação Lapa (Linha 8)", minutos: 13, modo: "a pé" },
      { categoria: "shopping", nome: "Shopping Bourbon Pompeia", minutos: 12, modo: "de carro" },
      { categoria: "hospital", nome: "Hospital Alvorada Lapa", minutos: 10, modo: "de carro" },
      { categoria: "escola", nome: "Escolas da Vila Anastácio e Lapa de Baixo", minutos: 10, modo: "a pé" },
      { categoria: "mercado", nome: "Supermercados da Rua Carlos Weber", minutos: 8, modo: "a pé" },
      { categoria: "parque", nome: "Parque Villa-Lobos", minutos: 13, modo: "de carro" },
      { categoria: "via", nome: "Marginal Tietê e Av. Ermano Marchetti", minutos: 5, modo: "de carro" },
    ],
  },
};

const chave = (b: string | null | undefined) =>
  (b ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Entorno curado do bairro, ou `null` quando não há curadoria confirmada. */
export function entornoDoBairro(bairro: string | null): Entorno | null {
  return ENTORNO[chave(bairro)] ?? null;
}

/** Menor tempo estimado até transporte sobre trilhos, quando houver curadoria. */
export function tempoAoMetro(e: Entorno): Poi | null {
  return e.pois.find((p) => p.categoria === "metro") ?? null;
}