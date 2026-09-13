/**
 * Dicionário do site público. Uma entrada por idioma, mesma forma para todos.
 * Só apresentação: nenhuma regra de negócio vive aqui.
 */
import type { Idioma } from "@/lib/site/i18n";

export type Textos = {
  nav: {
    home: string;
    metodo: string;
    sobre: string;
    manifesto: string;
    lancamentos: string;
    simulacao: string;
    blog: string;
    contato: string;
    carreiras: string;
  };
  chrome: {
    consultoria: string;
    falarAgora: string;
    verLancamentos: string;
    idioma: string;
    abrirMenu: string;
    fecharMenu: string;
    voltar: string;
    autoridade: string;
    rodapeLead: string;
    rodapeFrase: string;
    naoTraduzido: string;
  };
  home: {
    titulo: string;
    descricao: string;
    heroEyebrow: string;
    heroTitulo: string;
    heroLead: string;
    problemaTitulo: string;
    problemaLead: string;
    problemas: string[];
    metodoTitulo: string;
    metodoLead: string;
    provaTitulo: string;
    provas: { valor: string; rotulo: string }[];
    porqueTitulo: string;
    porqueLead: string;
    faqTitulo: string;
    faq: { pergunta: string; resposta: string }[];
    ctaTitulo: string;
    ctaLead: string;
  };
  metodo: {
    titulo: string;
    descricao: string;
    eyebrow: string;
    h1: string;
    lead: string;
    etapas: { titulo: string; texto: string }[];
  };
  sobre: {
    titulo: string;
    descricao: string;
    eyebrow: string;
    h1: string;
    lead: string;
    paragrafos: string[];
    marcos: { ano: string; texto: string }[];
  };
  manifesto: {
    titulo: string;
    descricao: string;
    eyebrow: string;
    h1: string;
    lead: string;
    blocos: { titulo: string; texto: string }[];
    fecho: string;
  };
  contato: {
    titulo: string;
    descricao: string;
    eyebrow: string;
    h1: string;
    lead: string;
    canaisTitulo: string;
    canais: { titulo: string; texto: string; icone: string }[];
  };
  simulacao: {
    titulo: string;
    descricao: string;
    eyebrow: string;
    h1: string;
    lead: string;
    aviso: string;
  };
  blog: {
    titulo: string;
    descricao: string;
    eyebrow: string;
    h1: string;
    lead: string;
    todos: string;
    ler: string;
    voltar: string;
    naoEncontrado: string;
  };
  lancamentos: {
    titulo: string;
    descricao: string;
    eyebrow: string;
    h1: string;
    lead: string;
    vazio: string;
    disponiveis: string;
    aPartirDe: string;
    entrega: string;
    dormitorios: string;
    verDetalhes: string;
    consultarUnidades: string;
    sobPedido: string;
    fichaTitulo: string;
    localizacao: string;
    metragem: string;
    estoque: string;
    avisoAtivos: string;
  };
  carreiras: {
    titulo: string;
    descricao: string;
    eyebrow: string;
    h1: string;
    lead: string;
    pontos: string[];
  };
  form: {
    titulo: string;
    lead: string;
    nome: string;
    telefone: string;
    email: string;
    objetivo: string;
    objetivos: { primeiro: string; investimento: string; troca: string; carreira: string };
    contexto: string;
    verificacao: string;
    outraConta: string;
    enviar: string;
    enviando: string;
    privacidade: string;
    sucessoTitulo: string;
    sucessoTexto: string;
    sucessoBotao: string;
    toastSucesso: string;
    toastErro: string;
    erroNome: string;
    erroEmail: string;
    erroTelefone: string;
    erroCaptcha: string;
    verificacaoIndisponivel: string;
  };
};

const pt: Textos = {
  nav: {
    home: "Início",
    metodo: "Método",
    sobre: "Sobre",
    manifesto: "Manifesto",
    lancamentos: "Lançamentos",
    simulacao: "Simulação",
    blog: "Blog",
    contato: "Contato",
    carreiras: "Trabalhe conosco",
  },
  chrome: {
    consultoria: "Consultoria",
    falarAgora: "Falar agora",
    verLancamentos: "Ver lançamentos",
    idioma: "Idioma",
    abrirMenu: "Abrir menu",
    fecharMenu: "Fechar menu",
    voltar: "Voltar",
    autoridade: "Especialista em Lançamentos Cury • Consultor em Construção Patrimonial",
    rodapeLead: "Consultoria patrimonial em lançamentos imobiliários em São Paulo.",
    rodapeFrase: "Construindo patrimônio, não apenas vendendo imóveis.",
    naoTraduzido: "Conteúdo disponível em português.",
  },
  home: {
    titulo: "Ferragano — Consultoria patrimonial em lançamentos",
    descricao: "Diagnóstico de crédito, curadoria de lançamentos e acompanhamento até as chaves.",
    heroEyebrow: "Construção de patrimônio",
    heroTitulo: "O imóvel certo pode mudar sua história.",
    heroLead: "Ajudo famílias e investidores a escolher o lançamento certo.",
    problemaTitulo: "Por que a maioria escolhe errado",
    problemaLead: "O erro raramente é o imóvel. É a ordem das decisões.",
    problemas: [
      "Visita antes do diagnóstico de crédito.",
      "Escolha por acabamento, não por região e liquidez.",
      "Fluxo de pagamento sem folga durante a obra.",
    ],
    metodoTitulo: "O Método Ferragano",
    metodoLead: "Sete etapas, do diagnóstico às chaves.",
    provaTitulo: "Resultados",
    provas: [
      { valor: "20+", rotulo: "anos de mercado" },
      { valor: "1.000+", rotulo: "famílias atendidas" },
      { valor: "São Paulo", rotulo: "leitura de bairro" },
    ],
    porqueTitulo: "Por que Cury",
    porqueLead: "Produto desenhado para caber no orçamento real das famílias.",
    faqTitulo: "Perguntas frequentes",
    faq: [],
    ctaTitulo: "Comece pelo diagnóstico",
    ctaLead: "Sem custo para você: a consultoria é remunerada pela incorporadora.",
  },
  metodo: {
    titulo: "Método Ferragano",
    descricao: "Sete etapas do diagnóstico às chaves.",
    eyebrow: "Método",
    h1: "Do diagnóstico às chaves",
    lead: "Um processo, sempre na mesma ordem.",
    etapas: [],
  },
  sobre: {
    titulo: "Sobre Carlos Ferragano",
    descricao: "Especialista em lançamentos e construção de patrimônio.",
    eyebrow: "Sobre",
    h1: "Carlos Ferragano",
    lead: "Especialista em lançamentos imobiliários.",
    paragrafos: [],
    marcos: [],
  },
  manifesto: {
    titulo: "Manifesto Ferragano",
    descricao: "No que acreditamos.",
    eyebrow: "Manifesto",
    h1: "Manifesto",
    lead: "",
    blocos: [],
    fecho: "",
  },
  contato: {
    titulo: "Contato",
    descricao: "Agende uma consultoria.",
    eyebrow: "Contato",
    h1: "Vamos conversar",
    lead: "",
    canaisTitulo: "Canais",
    canais: [],
  },
  simulacao: {
    titulo: "Simulação",
    descricao: "Projeção patrimonial.",
    eyebrow: "Simulação",
    h1: "Calculadora patrimonial",
    lead: "",
    aviso: "",
  },
  blog: {
    titulo: "Blog",
    descricao: "Conteúdo sobre mercado, crédito e patrimônio.",
    eyebrow: "Blog",
    h1: "Blog",
    lead: "",
    todos: "Todos",
    ler: "Ler",
    voltar: "Voltar",
    naoEncontrado: "Artigo não encontrado.",
  },
  lancamentos: {
    titulo: "Lançamentos",
    descricao: "Portfólio de lançamentos.",
    eyebrow: "Portfólio",
    h1: "Lançamentos",
    lead: "",
    vazio: "Nenhum empreendimento publicado no momento.",
    disponiveis: "unidades disponíveis",
    aPartirDe: "A partir de",
    entrega: "Entrega",
    dormitorios: "dormitórios",
    verDetalhes: "Ver detalhes",
    consultarUnidades: "Consultar unidades",
    sobPedido: "Sob consulta",
    fichaTitulo: "Ficha",
    localizacao: "Localização",
    metragem: "Metragem",
    estoque: "Estoque",
    avisoAtivos: "Imagens, plantas e materiais oficiais são enviados pelo consultor.",
  },
  carreiras: {
    titulo: "Trabalhe conosco",
    descricao: "Carreira em vendas de lançamentos.",
    eyebrow: "Carreiras",
    h1: "Trabalhe conosco",
    lead: "",
    pontos: [],
  },
  form: {
    titulo: "Agendar uma consultoria",
    lead: "Diagnóstico antes de visita: crédito, objetivo e cenário analisados primeiro.",
    nome: "Nome completo",
    telefone: "Telefone / WhatsApp",
    email: "E-mail",
    objetivo: "Objetivo",
    objetivos: {
      primeiro: "Primeiro imóvel",
      investimento: "Investimento",
      troca: "Troca de imóvel",
      carreira: "Carreira no mercado",
    },
    contexto: "Contexto (opcional)",
    verificacao: "Verificação",
    outraConta: "Outra conta",
    enviar: "Solicitar consultoria",
    enviando: "Enviando...",
    privacidade: "Seus dados são usados apenas para o atendimento da consultoria.",
    sucessoTitulo: "Solicitação recebida",
    sucessoTexto: "Você receberá um contato com o diagnóstico inicial e os próximos passos.",
    sucessoBotao: "Enviar outra solicitação",
    toastSucesso: "Solicitação enviada. Retornamos em breve.",
    toastErro: "Não foi possível enviar agora.",
    erroNome: "Informe seu nome completo.",
    erroEmail: "Informe um e-mail válido.",
    erroTelefone: "Informe DDD e número.",
    erroCaptcha: "Responda a verificação com um número.",
    verificacaoIndisponivel: "Verificação indisponível. Tente novamente em instantes.",
  },
};

const en: Textos = {
  nav: {
    home: "Home",
    metodo: "Method",
    sobre: "About",
    manifesto: "Manifesto",
    lancamentos: "New developments",
    simulacao: "Simulator",
    blog: "Insights",
    contato: "Contact",
    carreiras: "Careers",
  },
  chrome: {
    consultoria: "Book a consultation",
    falarAgora: "Talk to us now",
    verLancamentos: "See developments",
    idioma: "Language",
    abrirMenu: "Open menu",
    fecharMenu: "Close menu",
    voltar: "Back",
    autoridade: "Sales Director at Cury • Wealth-building real estate advisor",
    rodapeLead: "Real estate wealth advisory for new developments in São Paulo, Brazil.",
    rodapeFrase: "We build wealth, we don't just sell apartments.",
    naoTraduzido: "This page is available in Portuguese.",
  },
  home: {
    titulo: "Ferragano — Real estate wealth advisory in São Paulo",
    descricao:
      "Credit diagnosis, curated new developments in São Paulo and full support until you get the keys. Advisory at no cost to the buyer.",
    heroEyebrow: "Building wealth through real estate",
    heroTitulo: "The right property can change your story.",
    heroLead:
      "We help families and investors choose the right new development in São Paulo — starting with the numbers, not with a showroom visit.",
    problemaTitulo: "Why most buyers choose badly",
    problemaLead: "The mistake is rarely the property. It is the order of the decisions.",
    problemas: [
      "Visiting showrooms before knowing how much credit the bank will actually approve.",
      "Choosing by finishes instead of by neighbourhood, demand and resale liquidity.",
      "Building a payment plan with no slack for the construction period.",
    ],
    metodoTitulo: "The Ferragano Method",
    metodoLead: "Seven steps, from credit diagnosis to the keys.",
    provaTitulo: "Track record",
    provas: [
      { valor: "20+", rotulo: "years in the market" },
      { valor: "1,000+", rotulo: "families advised" },
      { valor: "São Paulo", rotulo: "street-level market reading" },
    ],
    porqueTitulo: "Why Cury developments",
    porqueLead:
      "Product designed to fit a real household budget: instalments spread across construction, FGTS accepted and locations on consolidated transport corridors.",
    faqTitulo: "Frequently asked questions",
    faq: [
      {
        pergunta: "Is the advisory free for the buyer?",
        resposta:
          "Yes. The diagnosis, the curation and the follow-up are paid by the developer at closing, with no markup on your price table.",
      },
      {
        pergunta: "Can a foreigner buy property in Brazil?",
        resposta:
          "Yes. Urban property can be purchased by non-residents. You will need a Brazilian tax ID (CPF), which we help you arrange before signing.",
      },
      {
        pergunta: "Do I need a down payment to start the conversation?",
        resposta:
          "No. The first step is the credit diagnosis: it shows which down payment and which instalment fit your budget before any visit.",
      },
      {
        pergunta: "Why buy off-plan instead of a finished apartment?",
        resposta:
          "Off-plan means you enter at pre-construction pricing, capture the appreciation of the building cycle and spread the down payment across the schedule.",
      },
      {
        pergunta: "Does the support end when the contract is signed?",
        resposta:
          "No. A named person follows the bank transfer, construction adjustments and the final inspection until the keys are handed over.",
      },
    ],
    ctaTitulo: "Start with the diagnosis",
    ctaLead: "No cost to you: our advisory is paid by the developer.",
  },
  metodo: {
    titulo: "The Ferragano Method — from diagnosis to the keys",
    descricao:
      "Seven steps we repeat with every client: credit diagnosis, curation, comparison, visit, financing, contract and handover.",
    eyebrow: "Method",
    h1: "From diagnosis to the keys",
    lead: "One process, always in the same order. No step is skipped to close faster.",
    etapas: [
      { titulo: "1. Credit diagnosis", texto: "We map income, FGTS balance, timing and goal before looking at any unit." },
      { titulo: "2. Goal definition", texto: "Living, rental income or long-term wealth — each goal points to a different product." },
      { titulo: "3. Curation", texto: "We shortlist only the developments that match the plan and the approved budget." },
      { titulo: "4. Side-by-side comparison", texto: "Same criteria for every option: location, price per square metre, stock and delivery date." },
      { titulo: "5. Objective visits", texto: "Three visits with a clear question to answer, instead of ten with none." },
      { titulo: "6. Financing engineering", texto: "We structure the proposal with the bank and defend it until approval." },
      { titulo: "7. Follow-up to the keys", texto: "Construction adjustments, bank transfer and inspection, with a named person responsible." },
    ],
  },
  sobre: {
    titulo: "About Carlos Ferragano — real estate wealth advisor",
    descricao:
      "Two decades in the São Paulo new-development market, leading sales teams and advising families and investors on building wealth.",
    eyebrow: "About",
    h1: "Carlos Ferragano",
    lead: "Sales Director at Cury and advisor on wealth building through real estate.",
    paragrafos: [
      "I have spent more than two decades in the São Paulo new-development market — as a broker, as a manager and as the person who trains the teams that sell.",
      "That path taught me something simple: the property is the last decision, not the first. Before it come income, credit, timing and goal.",
      "Today I advise families buying their first home and investors building a portfolio, with the same method and the same transparency about what the numbers do and do not promise.",
    ],
    marcos: [
      { ano: "2004", texto: "First years as a broker in the São Paulo new-development market." },
      { ano: "2012", texto: "Sales management: team building, training and commercial process." },
      { ano: "2019", texto: "Specialisation in wealth building through off-plan purchases." },
      { ano: "Today", texto: "Sales Director at Cury and advisor to families and investors." },
    ],
  },
  manifesto: {
    titulo: "The Ferragano Manifesto — what we believe",
    descricao: "Why we put diagnosis before the visit, and clarity before the sale.",
    eyebrow: "Manifesto",
    h1: "What we believe",
    lead: "A property is not a product. It is a decision that shapes a family's next ten years.",
    blocos: [
      { titulo: "Numbers before emotion", texto: "Nobody should fall in love with a floor plan they cannot finance. We run the credit diagnosis first — always." },
      { titulo: "The neighbourhood decides", texto: "Two identical towers in different districts produce different results. We read the district before the finishes." },
      { titulo: "No promises we cannot prove", texto: "Every projection we show states its assumptions on screen. A projection is context, never a guarantee." },
      { titulo: "Wealth is built in sequence", texto: "The first asset finances the second. We advise for the next decade, not for this month's closing." },
      { titulo: "Support does not end at signature", texto: "Bank transfer, construction adjustments and inspection are part of the job." },
    ],
    fecho: "Building wealth, not just selling apartments.",
  },
  contato: {
    titulo: "Contact — book a real estate consultation in São Paulo",
    descricao:
      "Talk to Carlos Ferragano's team: credit diagnosis, curated developments and support until the keys. English-speaking service available.",
    eyebrow: "Contact",
    h1: "Let's talk",
    lead: "Tell us your goal and timing. We reply with an initial diagnosis and the next steps.",
    canaisTitulo: "Ways to reach us",
    canais: [
      { titulo: "WhatsApp", texto: "Fastest channel. We answer in English and Portuguese.", icone: "chat" },
      { titulo: "Consultation form", texto: "Send your context and receive a structured first diagnosis.", icone: "mail" },
      { titulo: "São Paulo, Brazil", texto: "In-person visits scheduled after the diagnosis.", icone: "location_on" },
    ],
  },
  simulacao: {
    titulo: "Wealth simulator — project your real estate assets",
    descricao:
      "Deterministic ten-year projection based on income, down payment and goal. Runs in your browser and stores nothing.",
    eyebrow: "Simulator",
    h1: "Wealth simulator",
    lead: "A projection to guide the conversation — with every assumption stated on screen.",
    aviso:
      "This projection is deterministic and illustrative. It is not a return guarantee and does not replace a credit analysis. Values in Brazilian reais (BRL).",
  },
  blog: {
    titulo: "Insights — São Paulo real estate market",
    descricao:
      "Market reading, financing, off-plan purchases and wealth building, written for buyers who decide with data.",
    eyebrow: "Insights",
    h1: "Market insights",
    lead: "What we read in the market, and how it changes a buying decision.",
    todos: "All",
    ler: "Read article",
    voltar: "Back to insights",
    naoEncontrado: "Article not found.",
  },
  lancamentos: {
    titulo: "New developments in São Paulo — curated portfolio",
    descricao:
      "Cury developments we advise on: neighbourhood, price range, unit sizes, delivery date and available stock.",
    eyebrow: "Portfolio",
    h1: "New developments",
    lead: "The portfolio we advise on, with the same criteria applied to every project.",
    vazio: "No development published at the moment. Talk to us for the current list.",
    disponiveis: "units available",
    aPartirDe: "From",
    entrega: "Delivery",
    dormitorios: "bedrooms",
    verDetalhes: "View development",
    consultarUnidades: "Ask about units",
    sobPedido: "On request",
    fichaTitulo: "Key facts",
    localizacao: "Location",
    metragem: "Unit size",
    estoque: "Availability",
    avisoAtivos: "Official images, floor plans and materials are sent by the advisor.",
  },
  carreiras: {
    titulo: "Careers — join the Ferragano sales team",
    descricao: "Training, method and portfolio for brokers who want to sell new developments with criteria.",
    eyebrow: "Careers",
    h1: "Work with us",
    lead: "We train brokers to advise, not to push inventory.",
    pontos: [
      "Structured training on credit, product and district reading.",
      "A portfolio of new developments with real stock.",
      "A method that survives the market cycle.",
    ],
  },
  form: {
    titulo: "Book a consultation",
    lead: "Diagnosis before visits: credit, goal and scenario analysed first.",
    nome: "Full name",
    telefone: "Phone / WhatsApp",
    email: "Email",
    objetivo: "Goal",
    objetivos: {
      primeiro: "First home",
      investimento: "Investment",
      troca: "Trading up",
      carreira: "Career in real estate",
    },
    contexto: "Context (optional)",
    verificacao: "Verification",
    outraConta: "Another sum",
    enviar: "Request consultation",
    enviando: "Sending...",
    privacidade: "Your data is used only to handle this consultation.",
    sucessoTitulo: "Request received",
    sucessoTexto: "You will be contacted with an initial diagnosis and the next steps.",
    sucessoBotao: "Send another request",
    toastSucesso: "Request sent. We'll get back to you shortly.",
    toastErro: "We couldn't send it right now.",
    erroNome: "Enter your full name.",
    erroEmail: "Enter a valid email address.",
    erroTelefone: "Enter country code and number.",
    erroCaptcha: "Answer the verification with a number.",
    verificacaoIndisponivel: "Verification unavailable. Please try again in a moment.",
  },
};

const es: Textos = {
  nav: {
    home: "Inicio",
    metodo: "Método",
    sobre: "Nosotros",
    manifesto: "Manifiesto",
    lancamentos: "Lanzamientos",
    simulacao: "Simulador",
    blog: "Análisis",
    contato: "Contacto",
    carreiras: "Carreras",
  },
  chrome: {
    consultoria: "Agendar consultoría",
    falarAgora: "Hablar ahora",
    verLancamentos: "Ver lanzamientos",
    idioma: "Idioma",
    abrirMenu: "Abrir menú",
    fecharMenu: "Cerrar menú",
    voltar: "Volver",
    autoridade: "Gerente Comercial de Cury • Consultor en construcción de patrimonio",
    rodapeLead: "Consultoría patrimonial en lanzamientos inmobiliarios en São Paulo, Brasil.",
    rodapeFrase: "Construimos patrimonio, no solo vendemos departamentos.",
    naoTraduzido: "Contenido disponible en portugués.",
  },
  home: {
    titulo: "Ferragano — Consultoría patrimonial inmobiliaria en São Paulo",
    descricao:
      "Diagnóstico de crédito, curaduría de lanzamientos en São Paulo y acompañamiento hasta las llaves. Sin costo para el comprador.",
    heroEyebrow: "Construcción de patrimonio",
    heroTitulo: "El inmueble correcto puede cambiar tu historia.",
    heroLead:
      "Ayudamos a familias e inversionistas a elegir el lanzamiento correcto en São Paulo — empezando por los números, no por la visita al piloto.",
    problemaTitulo: "Por qué la mayoría elige mal",
    problemaLead: "El error rara vez es el inmueble. Es el orden de las decisiones.",
    problemas: [
      "Visitar departamentos piloto antes de saber cuánto crédito aprueba el banco.",
      "Elegir por acabados y no por barrio, demanda y liquidez de reventa.",
      "Armar un flujo de pago sin holgura durante la obra.",
    ],
    metodoTitulo: "El Método Ferragano",
    metodoLead: "Siete etapas, del diagnóstico de crédito a las llaves.",
    provaTitulo: "Trayectoria",
    provas: [
      { valor: "20+", rotulo: "años en el mercado" },
      { valor: "1.000+", rotulo: "familias asesoradas" },
      { valor: "São Paulo", rotulo: "lectura barrio por barrio" },
    ],
    porqueTitulo: "Por qué Cury",
    porqueLead:
      "Producto diseñado para el presupuesto real de la familia: entrada diluida en la obra, uso del FGTS y ubicaciones sobre ejes de transporte consolidados.",
    faqTitulo: "Preguntas frecuentes",
    faq: [
      {
        pergunta: "¿La consultoría tiene costo para el comprador?",
        resposta:
          "No. El diagnóstico, la curaduría y el acompañamiento los remunera la constructora en la venta, sin recargo sobre tu tabla de precios.",
      },
      {
        pergunta: "¿Un extranjero puede comprar un inmueble en Brasil?",
        resposta:
          "Sí. Un no residente puede comprar inmuebles urbanos. Se necesita el CPF (identificación fiscal brasileña), que te ayudamos a obtener antes de firmar.",
      },
      {
        pergunta: "¿Necesito tener la entrada para empezar?",
        resposta:
          "No para empezar la conversación. El primer paso es el diagnóstico de crédito: muestra qué entrada y qué cuota caben en tu presupuesto.",
      },
      {
        pergunta: "¿Por qué comprar en planos y no un inmueble terminado?",
        resposta:
          "En planos entras con precio de preobra, capturas la valorización del ciclo de construcción y diluyes la entrada en el cronograma.",
      },
      {
        pergunta: "¿El acompañamiento termina al firmar el contrato?",
        resposta:
          "No. Una persona responsable acompaña el traspaso bancario, los ajustes de obra y la inspección hasta la entrega de llaves.",
      },
    ],
    ctaTitulo: "Empieza por el diagnóstico",
    ctaLead: "Sin costo para ti: la consultoría la remunera la constructora.",
  },
  metodo: {
    titulo: "El Método Ferragano — del diagnóstico a las llaves",
    descricao:
      "Siete etapas que repetimos con cada cliente: diagnóstico de crédito, curaduría, comparación, visita, financiamiento, contrato y entrega.",
    eyebrow: "Método",
    h1: "Del diagnóstico a las llaves",
    lead: "Un proceso, siempre en el mismo orden. Ninguna etapa se salta para cerrar más rápido.",
    etapas: [
      { titulo: "1. Diagnóstico de crédito", texto: "Mapeamos ingresos, saldo de FGTS, plazo y objetivo antes de mirar cualquier unidad." },
      { titulo: "2. Definición del objetivo", texto: "Vivienda, renta o patrimonio de largo plazo: cada objetivo apunta a un producto distinto." },
      { titulo: "3. Curaduría", texto: "Preseleccionamos solo los lanzamientos compatibles con el plan y el presupuesto aprobado." },
      { titulo: "4. Comparación lado a lado", texto: "Los mismos criterios para cada opción: ubicación, precio por m², stock y fecha de entrega." },
      { titulo: "5. Visitas objetivas", texto: "Tres visitas con una pregunta clara que responder, en vez de diez sin ninguna." },
      { titulo: "6. Ingeniería de financiamiento", texto: "Estructuramos la propuesta con el banco y la defendemos hasta la aprobación." },
      { titulo: "7. Acompañamiento hasta las llaves", texto: "Ajustes de obra, traspaso bancario e inspección, con un responsable con nombre." },
    ],
  },
  sobre: {
    titulo: "Sobre Carlos Ferragano — consultor patrimonial inmobiliario",
    descricao:
      "Dos décadas en el mercado de lanzamientos de São Paulo, liderando equipos comerciales y asesorando a familias e inversionistas.",
    eyebrow: "Nosotros",
    h1: "Carlos Ferragano",
    lead: "Gerente Comercial de Cury y consultor en construcción de patrimonio inmobiliario.",
    paragrafos: [
      "Llevo más de dos décadas en el mercado de lanzamientos de São Paulo: como corredor, como gerente y como quien forma a los equipos que venden.",
      "Ese camino me enseñó algo simple: el inmueble es la última decisión, no la primera. Antes vienen los ingresos, el crédito, el plazo y el objetivo.",
      "Hoy asesoro tanto a familias que compran su primera vivienda como a inversionistas que arman un portafolio, con el mismo método y la misma transparencia sobre lo que los números prometen y lo que no.",
    ],
    marcos: [
      { ano: "2004", texto: "Primeros años como corredor en el mercado de lanzamientos de São Paulo." },
      { ano: "2012", texto: "Gerencia comercial: formación de equipos, capacitación y proceso." },
      { ano: "2019", texto: "Especialización en construcción de patrimonio mediante compra en planos." },
      { ano: "Hoy", texto: "Gerente Comercial de Cury y consultor de familias e inversionistas." },
    ],
  },
  manifesto: {
    titulo: "Manifiesto Ferragano — en qué creemos",
    descricao: "Por qué ponemos el diagnóstico antes de la visita y la claridad antes de la venta.",
    eyebrow: "Manifiesto",
    h1: "En qué creemos",
    lead: "Un inmueble no es un producto. Es una decisión que define los próximos diez años de una familia.",
    blocos: [
      { titulo: "Números antes que emoción", texto: "Nadie debería enamorarse de una planta que no puede financiar. El diagnóstico de crédito va primero, siempre." },
      { titulo: "El barrio decide", texto: "Dos torres idénticas en barrios distintos dan resultados distintos. Leemos el barrio antes que los acabados." },
      { titulo: "Sin promesas que no podamos probar", texto: "Toda proyección declara sus premisas en pantalla. Una proyección es contexto, nunca una garantía." },
      { titulo: "El patrimonio se construye en serie", texto: "El primer activo financia el segundo. Asesoramos para la próxima década, no para el cierre del mes." },
      { titulo: "El acompañamiento no termina en la firma", texto: "Traspaso bancario, ajustes de obra e inspección son parte del trabajo." },
    ],
    fecho: "Construir patrimonio, no solo vender departamentos.",
  },
  contato: {
    titulo: "Contacto — agenda una consultoría inmobiliaria en São Paulo",
    descricao:
      "Habla con el equipo de Carlos Ferragano: diagnóstico de crédito, curaduría de lanzamientos y acompañamiento hasta las llaves. Atención en español.",
    eyebrow: "Contacto",
    h1: "Conversemos",
    lead: "Cuéntanos tu objetivo y tu plazo. Respondemos con un diagnóstico inicial y los próximos pasos.",
    canaisTitulo: "Canales de atención",
    canais: [
      { titulo: "WhatsApp", texto: "El canal más rápido. Atendemos en español y portugués.", icone: "chat" },
      { titulo: "Formulario de consultoría", texto: "Envía tu contexto y recibe un primer diagnóstico estructurado.", icone: "mail" },
      { titulo: "São Paulo, Brasil", texto: "Las visitas presenciales se agendan después del diagnóstico.", icone: "location_on" },
    ],
  },
  simulacao: {
    titulo: "Simulador patrimonial — proyecta tu patrimonio inmobiliario",
    descricao:
      "Proyección determinista a diez años según ingresos, entrada y objetivo. Corre en tu navegador y no guarda datos.",
    eyebrow: "Simulador",
    h1: "Simulador patrimonial",
    lead: "Una proyección para orientar la conversación, con todas las premisas declaradas en pantalla.",
    aviso:
      "La proyección es determinista e ilustrativa. No garantiza rentabilidad ni sustituye un análisis de crédito. Valores en reales brasileños (BRL).",
  },
  blog: {
    titulo: "Análisis — mercado inmobiliario de São Paulo",
    descricao:
      "Lectura de mercado, financiamiento, compra en planos y construcción de patrimonio para quien decide con datos.",
    eyebrow: "Análisis",
    h1: "Análisis de mercado",
    lead: "Lo que leemos en el mercado y cómo cambia una decisión de compra.",
    todos: "Todos",
    ler: "Leer artículo",
    voltar: "Volver a los análisis",
    naoEncontrado: "Artículo no encontrado.",
  },
  lancamentos: {
    titulo: "Lanzamientos en São Paulo — portafolio con curaduría",
    descricao:
      "Lanzamientos de Cury que asesoramos: barrio, rango de precio, metraje, fecha de entrega y stock disponible.",
    eyebrow: "Portafolio",
    h1: "Lanzamientos",
    lead: "El portafolio que asesoramos, con los mismos criterios aplicados a cada proyecto.",
    vazio: "No hay lanzamientos publicados en este momento. Escríbenos para la lista vigente.",
    disponiveis: "unidades disponibles",
    aPartirDe: "Desde",
    entrega: "Entrega",
    dormitorios: "dormitorios",
    verDetalhes: "Ver lanzamiento",
    consultarUnidades: "Consultar unidades",
    sobPedido: "A consultar",
    fichaTitulo: "Ficha técnica",
    localizacao: "Ubicación",
    metragem: "Metraje",
    estoque: "Disponibilidad",
    avisoAtivos: "Las imágenes, plantas y materiales oficiales los envía el consultor.",
  },
  carreiras: {
    titulo: "Carreras — súmate al equipo Ferragano",
    descricao: "Formación, método y portafolio para corredores que quieren vender lanzamientos con criterio.",
    eyebrow: "Carreras",
    h1: "Trabaja con nosotros",
    lead: "Formamos corredores para asesorar, no para empujar stock.",
    pontos: [
      "Formación estructurada en crédito, producto y lectura de barrio.",
      "Portafolio de lanzamientos con stock real.",
      "Un método que resiste el ciclo del mercado.",
    ],
  },
  form: {
    titulo: "Agendar una consultoría",
    lead: "Diagnóstico antes de la visita: crédito, objetivo y escenario analizados primero.",
    nome: "Nombre completo",
    telefone: "Teléfono / WhatsApp",
    email: "Correo electrónico",
    objetivo: "Objetivo",
    objetivos: {
      primeiro: "Primera vivienda",
      investimento: "Inversión",
      troca: "Cambio de inmueble",
      carreira: "Carrera en el mercado",
    },
    contexto: "Contexto (opcional)",
    verificacao: "Verificación",
    outraConta: "Otra cuenta",
    enviar: "Solicitar consultoría",
    enviando: "Enviando...",
    privacidade: "Tus datos se usan solo para atender esta consultoría.",
    sucessoTitulo: "Solicitud recibida",
    sucessoTexto: "Recibirás un contacto con el diagnóstico inicial y los próximos pasos.",
    sucessoBotao: "Enviar otra solicitud",
    toastSucesso: "Solicitud enviada. Te respondemos en breve.",
    toastErro: "No fue posible enviar ahora.",
    erroNome: "Indica tu nombre completo.",
    erroEmail: "Indica un correo válido.",
    erroTelefone: "Indica código de país y número.",
    erroCaptcha: "Responde la verificación con un número.",
    verificacaoIndisponivel: "Verificación no disponible. Intenta de nuevo en unos instantes.",
  },
};

export const TEXTOS: Record<Idioma, Textos> = { pt, en, es };

export const textos = (idioma: Idioma): Textos => TEXTOS[idioma];