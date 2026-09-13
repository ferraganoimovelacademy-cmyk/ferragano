/**
 * Versões traduzidas dos artigos. Cada artigo mantém uma chave estável
 * (`id`) e um slug próprio por idioma — o slug é traduzido, por isso o
 * `hreflang` usa o mapa de slugs equivalentes.
 */
import type { Idioma } from "@/lib/site/i18n";

export type PostIntl = {
  id: string;
  categoria: string;
  titulo: string;
  resumo: string;
  leitura: string;
  paragrafos: string[];
};

/** slug por idioma de cada artigo (a chave é o `id`, igual ao slug em pt). */
export const SLUG_POST: Record<string, Record<Idioma, string>> = {
  "por-que-comprar-lancamento": {
    pt: "por-que-comprar-lancamento",
    en: "why-buying-off-plan-changes-the-math",
    es: "por-que-comprar-en-planos-cambia-las-cuentas",
  },
  "renda-que-compra-o-segundo-imovel": {
    pt: "renda-que-compra-o-segundo-imovel",
    en: "income-from-the-first-property-buys-the-second",
    es: "la-renta-del-primer-inmueble-paga-el-segundo",
  },
  "como-o-banco-avalia-seu-credito": {
    pt: "como-o-banco-avalia-seu-credito",
    en: "how-brazilian-banks-assess-your-credit",
    es: "como-el-banco-evalua-tu-credito",
  },
  "leitura-de-regiao-antes-do-produto": {
    pt: "leitura-de-regiao-antes-do-produto",
    en: "read-the-district-before-the-floor-plan",
    es: "lee-el-barrio-antes-de-la-planta",
  },
  "erros-de-quem-investe-em-imovel": {
    pt: "erros-de-quem-investe-em-imovel",
    en: "five-mistakes-that-erode-property-returns",
    es: "cinco-errores-que-destruyen-el-retorno-inmobiliario",
  },
};

export const CATEGORIAS_INTL: Record<Idioma, Record<string, string>> = {
  pt: {
    mercado: "Mercado",
    investimento: "Investimento",
    lancamentos: "Lançamentos",
    financiamento: "Financiamento",
    patrimonio: "Patrimônio",
  },
  en: {
    mercado: "Market",
    investimento: "Investment",
    lancamentos: "New developments",
    financiamento: "Financing",
    patrimonio: "Wealth",
  },
  es: {
    mercado: "Mercado",
    investimento: "Inversión",
    lancamentos: "Lanzamientos",
    financiamento: "Financiamiento",
    patrimonio: "Patrimonio",
  },
};

const en: PostIntl[] = [
  {
    id: "por-que-comprar-lancamento",
    categoria: "lancamentos",
    titulo: "Why buying off-plan changes the math of your wealth",
    resumo:
      "The difference between a finished apartment and an off-plan purchase is not price: it is the appreciation cycle you capture and the cash flow you preserve.",
    leitura: "6 min read",
    paragrafos: [
      "Whoever buys a finished apartment pays a price that is already formed. All the gain generated between launch and delivery stayed with the previous buyer. Whoever enters at pre-construction takes a controlled execution risk and, in exchange, participates in that cycle.",
      "The second effect is cash. Off-plan, the down payment is split into instalments and the construction instalments follow the developer's schedule. Bank financing only starts at delivery, when the property has already been re-appraised.",
      "This does not make every launch a good deal. It makes the launch an instrument — one that only works with a credit diagnosis, a reading of the district and an analysis of the developer's track record.",
    ],
  },
  {
    id: "renda-que-compra-o-segundo-imovel",
    categoria: "patrimonio",
    titulo: "The income from your first property is the down payment on the second",
    resumo:
      "Building a real estate portfolio means repeating one correct decision. The first asset funds the next step.",
    leitura: "5 min read",
    paragrafos: [
      "The most common mistake is to treat the purchase as a single event. Wealth is built in series: a well-chosen asset generates appreciation and income, and both turn into purchasing capacity.",
      "In practice the cycle is simple. Planned purchase, delivery, rental, equity accumulation and reinvestment. What decides the outcome is the quality of the first choice.",
      "That is why the diagnosis comes before the visit. Without clarity on timing and goal, the chosen property can freeze the plan instead of accelerating it.",
    ],
  },
  {
    id: "como-o-banco-avalia-seu-credito",
    categoria: "financiamento",
    titulo: "How Brazilian banks actually assess your borrowing capacity",
    resumo:
      "Documented income, debt ratio, term and risk profile. Understanding the rule before visiting avoids frustration.",
    leitura: "7 min read",
    paragrafos: [
      "The financing instalment has a practical ceiling: a share of documented household income. Above that, the proposal does not pass, regardless of how much the buyer wants it.",
      "Beyond income, term, age, banking relationship and how income is combined between co-borrowers all weigh in. Each bank applies a slightly different rule.",
      "Simulating first is what turns an exhausting search into three focused visits. You visit knowing what fits.",
    ],
  },
  {
    id: "leitura-de-regiao-antes-do-produto",
    categoria: "mercado",
    titulo: "Read the district before you look at the floor plan",
    resumo:
      "Transport, consolidated retail, future supply and rental profile explain the outcome better than the finishes do.",
    leitura: "6 min read",
    paragrafos: [
      "Two identical towers in different districts produce different results. The district accounts for much of the appreciation and almost all of the rental liquidity.",
      "What we look at: consolidated transport corridors, retail density, the announced pipeline of new developments and the district's absorption history.",
      "This reading is observational and built from public market data. It is not a forecast — it is context to decide with less noise.",
    ],
  },
  {
    id: "erros-de-quem-investe-em-imovel",
    categoria: "investimento",
    titulo: "Five mistakes that erode the return on an investment property",
    resumo:
      "Wrong unit size, a tight payment flow, a district without liquidity, ignored costs and no exit plan.",
    leitura: "5 min read",
    paragrafos: [
      "The first mistake is buying the floor plan you would like to live in, rather than the one the rental market in that district absorbs.",
      "The second is a payment flow with no slack: any surprise during construction turns into a rushed sale at a discount.",
      "The other three show up later: ignoring recurring costs, choosing a district without liquidity, and buying with no defined exit plan.",
    ],
  },
];

const es: PostIntl[] = [
  {
    id: "por-que-comprar-lancamento",
    categoria: "lancamentos",
    titulo: "Por qué comprar en planos cambia las cuentas de tu patrimonio",
    resumo:
      "La diferencia entre comprar terminado y comprar en planos no es el precio: es el ciclo de valorización que capturas y el flujo de caja que preservas.",
    leitura: "6 min de lectura",
    paragrafos: [
      "Quien compra un inmueble terminado paga un precio ya formado. Toda la ganancia generada entre el lanzamiento y la entrega quedó con el comprador anterior. Quien entra en preobra asume un riesgo de ejecución controlado y, a cambio, participa de ese ciclo.",
      "El segundo efecto es de caja. En el lanzamiento la entrada se divide en cuotas y las cuotas de obra siguen el cronograma de la constructora. El financiamiento bancario recién entra en la entrega, cuando el inmueble ya fue revalorizado.",
      "Esto no convierte a todo lanzamiento en un buen negocio. Convierte al lanzamiento en un instrumento, que solo funciona con diagnóstico de crédito, lectura de barrio y análisis del historial de la constructora.",
    ],
  },
  {
    id: "renda-que-compra-o-segundo-imovel",
    categoria: "patrimonio",
    titulo: "La renta del primer inmueble es la entrada del segundo",
    resumo:
      "Construir patrimonio inmobiliario es repetir una decisión correcta. El primer activo financia el siguiente paso.",
    leitura: "5 min de lectura",
    paragrafos: [
      "El error más común es tratar la compra como un evento único. El patrimonio se construye en serie: un activo bien elegido genera valorización y renta, y ambas se convierten en capacidad de adquisición.",
      "En la práctica el ciclo es simple. Compra planificada, entrega, arriendo, acumulación de equity y reinversión. Lo que decide el resultado es la calidad de la primera elección.",
      "Por eso el diagnóstico va antes de la visita. Sin claridad de plazo y objetivo, el inmueble elegido puede frenar el plan en vez de acelerarlo.",
    ],
  },
  {
    id: "como-o-banco-avalia-seu-credito",
    categoria: "financiamento",
    titulo: "Cómo evalúa el banco tu capacidad de crédito",
    resumo:
      "Ingreso comprobado, nivel de endeudamiento, plazo y perfil de riesgo. Entender la regla antes de visitar evita frustración.",
    leitura: "7 min de lectura",
    paragrafos: [
      "La cuota del financiamiento tiene un límite práctico: una parte del ingreso familiar comprobado. Por encima de eso la propuesta no pasa, sin importar la voluntad del comprador.",
      "Además del ingreso pesan el plazo, la edad, la relación bancaria y la composición de renta entre titulares. Cada banco aplica una regla algo distinta.",
      "Simular antes es lo que transforma una búsqueda agotadora en tres visitas objetivas. Visitas sabiendo qué te cabe.",
    ],
  },
  {
    id: "leitura-de-regiao-antes-do-produto",
    categoria: "mercado",
    titulo: "Lee el barrio antes de mirar la planta",
    resumo:
      "Transporte, comercio consolidado, oferta futura y perfil de arriendo explican más del resultado que los acabados.",
    leitura: "6 min de lectura",
    paragrafos: [
      "Dos torres idénticas en barrios distintos dan resultados distintos. El barrio explica buena parte de la valorización y casi toda la liquidez de arriendo.",
      "Lo que observamos: ejes de transporte consolidados, densidad de comercio, stock de lanzamientos anunciados e historial de absorción del barrio.",
      "Esta lectura es observacional y se construye con datos públicos de mercado. No es una previsión: es contexto para decidir con menos ruido.",
    ],
  },
  {
    id: "erros-de-quem-investe-em-imovel",
    categoria: "investimento",
    titulo: "Cinco errores que destruyen el retorno de un inmueble de inversión",
    resumo:
      "Metraje equivocado, flujo ajustado, barrio sin liquidez, costos ignorados y falta de plan de salida.",
    leitura: "5 min de lectura",
    paragrafos: [
      "El primer error es comprar la planta en la que te gustaría vivir y no la que el mercado de arriendo de ese barrio absorbe.",
      "El segundo es armar un flujo de pago sin holgura: cualquier imprevisto durante la obra se convierte en venta apresurada con descuento.",
      "Los otros tres aparecen después: ignorar costos recurrentes, elegir un barrio sin liquidez y comprar sin plan de salida definido.",
    ],
  },
];

const POR_IDIOMA: Record<Exclude<Idioma, "pt">, PostIntl[]> = { en, es };

export function postsIntl(idioma: Exclude<Idioma, "pt">): PostIntl[] {
  return POR_IDIOMA[idioma];
}

/** Encontra o artigo pelo slug traduzido do idioma. */
export function acharPostIntl(idioma: Exclude<Idioma, "pt">, slug: string) {
  const id = Object.keys(SLUG_POST).find((key) => SLUG_POST[key][idioma] === slug);
  if (!id) return null;
  const post = POR_IDIOMA[idioma].find((p) => p.id === id);
  return post ?? null;
}