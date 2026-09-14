/**
 * Ecossistema Ferragano — camada pura.
 *
 * Responsabilidades:
 *  1. Catálogo das oito verticais (status, dependências, próximos passos).
 *  2. Personas da Ferragano AI e mapeamento persona → telas → ações.
 *  3. Validação formal de privacidade para agregação entre workspaces (ADR-034).
 *  4. Modelos e validações essenciais de Network e Capital (contrato, compliance, liquidez).
 *  5. Onboarding por vertical: perguntas e trilha de evidência de prontidão.
 *
 * Nenhuma função aqui acessa banco, rede ou relógio implícito: tudo é entrada → saída.
 */

/* ─────────────────────────── 1. Verticais ─────────────────────────── */

export type VerticalKey =
  "academy" | "intelligence" | "analytics" | "ai" | "labs" | "ventures" | "network" | "capital";

export type VerticalStatus = "operacional" | "em_construcao" | "fundacao_pronta" | "bloqueada";

export type CamadaKey = "produto" | "conhecimento" | "rede" | "estrategia";

export type Vertical = {
  key: VerticalKey;
  nome: string;
  camada: CamadaKey;
  status: VerticalStatus;
  proposito: string;
  /** Rotas do app que já sustentam a vertical. */
  telas: string[];
  /** Outras verticais ou gates necessários antes de avançar. */
  dependencias: string[];
  proximosPassos: string[];
  /** Quando presente, explica por que a vertical está bloqueada. */
  bloqueio?: string;
};

export const camadas: Record<CamadaKey, string> = {
  produto: "Produto (software entregue ao cliente)",
  conhecimento: "Conhecimento (evidência, memória e decisão)",
  rede: "Rede (relação entre empresas e pessoas)",
  estrategia: "Estratégia (capital, risco e novos negócios)",
};

export const statusLabels: Record<VerticalStatus, string> = {
  operacional: "Operacional",
  fundacao_pronta: "Fundação pronta",
  em_construcao: "Em construção",
  bloqueada: "Bloqueada",
};

export const verticais: Vertical[] = [
  {
    key: "academy",
    nome: "Ferragano Academy",
    camada: "produto",
    status: "operacional",
    proposito: "Formar o time do cliente dentro do próprio produto, com progresso medido.",
    telas: ["/app/academy", "/academy"],
    dependencias: ["Sprint ZERO — gates de UX e performance"],
    proximosPassos: [
      "Trilhas por papel (corretor, gerente, diretor)",
      "Certificado interno vinculado a academy_progress",
    ],
  },
  {
    key: "intelligence",
    nome: "Ferragano Intelligence",
    camada: "conhecimento",
    status: "bloqueada",
    bloqueio:
      "Gate H12 (LGPD) e ADR-034 em aberto: benchmark cross-workspace só libera com consentimento, agregação k >= 5 e supressão de células pequenas.",
    proposito: "Comparar o desempenho da empresa com o mercado sem expor dado de ninguém.",
    telas: ["/app/mercado", "/app/knowledge"],
    dependencias: ["ADR-034 — privacidade de agregação", "Gate H12 — LGPD"],
    proximosPassos: [
      "Aplicar os critérios de aceite do ADR-034 em toda consulta agregada",
      "Publicar benchmark somente com k ≥ 5 workspaces e supressão de células pequenas",
    ],
  },
  {
    key: "analytics",
    nome: "Ferragano Analytics",
    camada: "produto",
    status: "fundacao_pronta",
    proposito: "Análise self-service sobre os read models, sem consulta a tabela transacional.",
    telas: ["/app/relatorios", "/app/decisoes", "/app/platform"],
    dependencias: ["Query Layer (InsightsService)", "Read models 360"],
    proximosPassos: [
      "Construtor de indicadores sobre os read models",
      "Exportação auditável com registro em audit_log",
    ],
  },
  {
    key: "ai",
    nome: "Ferragano AI",
    camada: "conhecimento",
    status: "em_construcao",
    proposito: "Personas que explicam, recomendam e lembram — sempre com procedência.",
    telas: ["/app/advisor", "/app/knowledge", "/app/memoria", "/app/radar"],
    dependencias: ["Knowledge Provenance (ADR-027)", "Predições explicáveis (ADR-021)"],
    proximosPassos: [
      "Fechar as quatro personas faltantes (Knowledge, Advisor, Recommendation, Memory)",
      "Cada resposta da persona carrega origem e força de evidência",
    ],
  },
  {
    key: "labs",
    nome: "Ferragano Labs",
    camada: "estrategia",
    status: "em_construcao",
    proposito: "Experimentar hipóteses de produto com registro de resultado, não de opinião.",
    telas: ["/app/fabric", "/app/orquestracao"],
    dependencias: ["Enterprise Memory (ADR-031)"],
    proximosPassos: [
      "Registro de experimento com hipótese, métrica e prazo",
      "Encerramento obrigatório com resultado observado",
    ],
  },
  {
    key: "ventures",
    nome: "Ferragano Ventures",
    camada: "estrategia",
    status: "em_construcao",
    proposito: "Avaliar novos negócios com a mesma exigência de evidência do produto.",
    telas: ["/app/executive", "/app/institucional"],
    dependencias: ["Executive Digital Twin (ADR-033)"],
    proximosPassos: ["Tese de investimento versionada", "Comitê com decisão registrada"],
  },
  {
    key: "network",
    nome: "Ferragano Network",
    camada: "rede",
    status: "em_construcao",
    proposito: "Conectar incorporadoras, imobiliárias e corretores com contrato explícito.",
    telas: ["/app/construtoras", "/app/corretores"],
    dependencias: ["Modelo de contrato e compliance", "ADR-034 para qualquer dado compartilhado"],
    proximosPassos: [
      "Contrato de parceria com escopo de dado e vigência",
      "Compliance de habilitação (CRECI, CNPJ, documentos)",
    ],
  },
  {
    key: "capital",
    nome: "Ferragano Capital",
    camada: "rede",
    status: "bloqueada",
    bloqueio:
      "Gate H12 (LGPD) em aberto e Network sem compliance aprovado: operação de recebíveis não pode ser habilitada.",
    proposito: "Antecipação e estruturação de recebíveis com risco medido.",
    telas: [],
    dependencias: ["Gate H12 — LGPD", "Network com compliance aprovado"],
    proximosPassos: [
      "Modelo de liquidez com cobertura e concentração",
      "Trilha de auditoria de cada operação",
    ],
  },
];

export const getVertical = (key: VerticalKey): Vertical => {
  const v = verticais.find((x) => x.key === key);
  if (!v) throw new Error(`vertical desconhecida: ${key}`);
  return v;
};

export const verticaisPorCamada = (): Array<{ camada: CamadaKey; itens: Vertical[] }> =>
  (Object.keys(camadas) as CamadaKey[]).map((camada) => ({
    camada,
    itens: verticais.filter((v) => v.camada === camada),
  }));

/* ─────────────────────── 2. Personas da Ferragano AI ─────────────────────── */

export type PersonaKey = "knowledge" | "advisor" | "recommendation" | "memory";

export type PersonaAcao = {
  acao: string;
  tela: string;
  /** O que a persona precisa ler para agir. */
  entrada: string[];
  /** O que ela devolve, sempre com procedência. */
  saida: string;
  /** Nível mínimo de papel exigido. */
  requerAdmin: boolean;
};

export type Persona = {
  key: PersonaKey;
  nome: string;
  missao: string;
  /** Limite duro: o que a persona nunca faz. */
  limites: string[];
  acoes: PersonaAcao[];
};

export const personas: Persona[] = [
  {
    key: "knowledge",
    nome: "Curador de Conhecimento",
    missao: "Garantir que todo número exibido tenha origem, data e força de evidência.",
    limites: [
      "Nunca apresenta correlação como causa",
      "Nunca usa indicador externo para afirmar comportamento interno",
      "Nunca oculta conhecimento vencido: marca como desatualizado",
    ],
    acoes: [
      {
        acao: "Explicar a origem de um indicador",
        tela: "/app/knowledge",
        entrada: ["nó do grafo", "procedência", "frescor"],
        saida: "trilha de procedência com data e força de evidência",
        requerAdmin: false,
      },
      {
        acao: "Sinalizar conhecimento fora de vigência",
        tela: "/app/institucional",
        entrada: ["org_knowledge_versions", "SLA de decaimento"],
        saida: "lista de conhecimento a revisar com motivo",
        requerAdmin: true,
      },
    ],
  },
  {
    key: "advisor",
    nome: "Conselheiro Executivo",
    missao: "Transformar o estado da empresa em leitura executiva com lacunas declaradas.",
    limites: [
      "Nunca inventa número: lacuna é resposta",
      "Nunca mistura observação, tendência e simulação",
    ],
    acoes: [
      {
        acao: "Gerar briefing executivo",
        tela: "/app/advisor",
        entrada: ["read models 360", "sinais de risco"],
        saida: "briefing com fatos, tendências e lacunas separadas",
        requerAdmin: true,
      },
      {
        acao: "Responder pergunta de negócio",
        tela: "/app/advisor",
        entrada: ["classificação de domínio", "InsightsService"],
        saida: "resposta com fonte e recorte de período",
        requerAdmin: true,
      },
      {
        acao: "Apontar desvio estratégico",
        tela: "/app/executive",
        entrada: ["snapshot organizacional", "z-score do pulso"],
        saida: "desvio com magnitude e hipótese explícita",
        requerAdmin: true,
      },
    ],
  },
  {
    key: "recommendation",
    nome: "Estrategista de Recomendação",
    missao: "Priorizar ação por impacto e urgência e aprender com o que foi aceito.",
    limites: [
      "Nunca recomenda sem estimar impacto",
      "Nunca reapresenta recomendação descartada sem novo dado",
    ],
    acoes: [
      {
        acao: "Ranquear recomendações do período",
        tela: "/app/decisoes",
        entrada: ["recommendation_history", "score de impacto e urgência"],
        saida: "fila priorizada com justificativa por item",
        requerAdmin: true,
      },
      {
        acao: "Registrar aceite e criar tarefa",
        tela: "/app/decisoes",
        entrada: ["decisão do gestor", "responsável"],
        saida: "tarefa atribuída e desfecho a medir",
        requerAdmin: true,
      },
      {
        acao: "Avaliar qualidade da recomendação",
        tela: "/app/platform",
        entrada: ["score na implementação", "score atual"],
        saida: "resultado melhorou/neutro/piorou",
        requerAdmin: true,
      },
    ],
  },
  {
    key: "memory",
    nome: "Guardião da Memória",
    missao: "Preservar decisão, contexto, motivo e resultado como patrimônio da empresa.",
    limites: [
      "Nunca aceita decisão sem contexto e motivo",
      "Nunca aceita lição sem evidência",
      "Nunca sobrescreve versão anterior",
    ],
    acoes: [
      {
        acao: "Registrar decisão com contexto e responsável",
        tela: "/app/memoria",
        entrada: ["contexto", "motivo", "aprovador"],
        saida: "decisão auditável na linha do tempo",
        requerAdmin: true,
      },
      {
        acao: "Derivar lição de campanha encerrada",
        tela: "/app/memoria",
        entrada: ["campanha", "evidências"],
        saida: "lição vinculada a decisão ou campanha",
        requerAdmin: true,
      },
      {
        acao: "Versionar playbook",
        tela: "/app/institucional",
        entrada: ["o que mudou", "por que mudou", "evidências"],
        saida: "nova versão com histórico preservado",
        requerAdmin: true,
      },
    ],
  },
];

export const getPersona = (key: PersonaKey): Persona => {
  const p = personas.find((x) => x.key === key);
  if (!p) throw new Error(`persona desconhecida: ${key}`);
  return p;
};

/** Mapa tela → personas e ações que operam nela. */
export const mapaTelaPersonas = (): Array<{
  tela: string;
  itens: Array<{ persona: PersonaKey; acao: string }>;
}> => {
  const mapa = new Map<string, Array<{ persona: PersonaKey; acao: string }>>();
  for (const p of personas) {
    for (const a of p.acoes) {
      const lista = mapa.get(a.tela) ?? [];
      lista.push({ persona: p.key, acao: a.acao });
      mapa.set(a.tela, lista);
    }
  }
  return [...mapa.entries()]
    .map(([tela, itens]) => ({ tela, itens }))
    .sort((a, b) => a.tela.localeCompare(b.tela));
};

/* ───────── 2.1 Controle de acesso por persona (limites duros) ───────── */

export type PapelUsuario = "admin" | "membro";

export type AcessoAcao = {
  acao: string;
  tela: string;
  permitido: boolean;
  /** Sempre preenchido: por que liberou ou por que negou. */
  motivo: string;
};

export type TelaNegada = { tela: string; motivo: string };

export type AcessoPersona = {
  persona: PersonaKey;
  nome: string;
  papel: PapelUsuario;
  limites: string[];
  acoes: AcessoAcao[];
  telasPermitidas: string[];
  telasNegadas: TelaNegada[];
};

/** Todas as telas do hub que alguma persona opera. */
export const telasDoHub = (): string[] =>
  [...new Set(personas.flatMap((p) => p.acoes.map((a) => a.tela)))].sort((a, b) =>
    a.localeCompare(b),
  );

/** Verticais que expõem a tela — usadas para herdar bloqueio de governança. */
export const verticaisDaTela = (tela: string): Vertical[] =>
  verticais.filter((v) => v.telas.includes(tela));

/**
 * Decide uma ação de persona. Nega por padrão: ação fora do mapa da persona é
 * limite duro, não falta de permissão.
 */
export const podeOperar = (
  persona: PersonaKey,
  papel: PapelUsuario,
  tela: string,
  acao: string,
): { permitido: boolean; motivo: string } => {
  const p = getPersona(persona);
  const alvo = p.acoes.find((a) => a.acao === acao && a.tela === tela);
  if (!alvo) {
    return {
      permitido: false,
      motivo: `fora do limite duro de ${p.nome}: a persona não opera "${acao}" em ${tela}`,
    };
  }
  if (alvo.requerAdmin && papel !== "admin") {
    return { permitido: false, motivo: "exige papel administrativo" };
  }
  const donas = verticaisDaTela(tela);
  // Só bloqueia quando toda vertical que expõe a tela está bloqueada.
  if (donas.length > 0 && donas.every((v) => v.status === "bloqueada")) {
    const vertical = donas[0]!;
    return {
      permitido: false,
      motivo: `vertical ${vertical.nome} bloqueada por governança: ${vertical.bloqueio ?? "sem liberação"}`,
    };
  }
  return { permitido: true, motivo: "dentro do escopo da persona" };
};

/** Escopo completo de uma persona sob um papel: o que ela vê e o que está vedado. */
export const avaliarAcessoPersona = (persona: PersonaKey, papel: PapelUsuario): AcessoPersona => {
  const p = getPersona(persona);
  const acoes: AcessoAcao[] = p.acoes.map((a) => {
    const r = podeOperar(persona, papel, a.tela, a.acao);
    return { acao: a.acao, tela: a.tela, permitido: r.permitido, motivo: r.motivo };
  });
  const telasPermitidas = [...new Set(acoes.filter((a) => a.permitido).map((a) => a.tela))].sort(
    (a, b) => a.localeCompare(b),
  );
  const proprias = new Set(p.acoes.map((a) => a.tela));
  const telasNegadas: TelaNegada[] = telasDoHub()
    .filter((t) => !telasPermitidas.includes(t))
    .map((t) => {
      if (!proprias.has(t)) {
        return { tela: t, motivo: `fora do limite duro de ${p.nome}` };
      }
      const negada = acoes.find((a) => a.tela === t && !a.permitido);
      return { tela: t, motivo: negada?.motivo ?? "sem ação liberada nesta tela" };
    });
  return {
    persona,
    nome: p.nome,
    papel,
    limites: p.limites,
    acoes,
    telasPermitidas,
    telasNegadas,
  };
};

/** Verticais visíveis para a persona: as que expõem alguma tela liberada. */
export const verticaisDaPersona = (persona: PersonaKey, papel: PapelUsuario): Vertical[] => {
  const { telasPermitidas } = avaliarAcessoPersona(persona, papel);
  return verticais.filter((v) => v.telas.some((t) => telasPermitidas.includes(t)));
};

/* ───────── 3. Privacidade: agregação entre workspaces (ADR-034) ───────── */

export const K_MINIMO_WORKSPACES = 5;
export const N_MINIMO_CELULA = 5;

export const CAMPOS_PROIBIDOS_AGREGACAO = [
  "nome",
  "email",
  "telefone",
  "documento",
  "cpf",
  "cnpj",
  "endereco",
  "workspace_id",
  "workspace",
  "person_id",
  "user_id",
  "opportunity_id",
] as const;

export type PedidoAgregacao = {
  metrica: string;
  /** Quantidade de workspaces distintos que compõem o resultado. */
  workspaces: number;
  /** Campos que sairão no resultado. */
  campos: string[];
  /** Menor contagem de registros entre as células do resultado. */
  menorCelula: number;
  /** Todos os workspaces incluídos aceitaram participar do benchmark. */
  consentimentoTodos: boolean;
  /** Resultado é agregado; linha individual nunca é permitida. */
  granularidade: "agregada" | "linha";
  /** Células abaixo do mínimo foram suprimidas em vez de exibidas. */
  suprimeCelulasPequenas: boolean;
  /** Origem do dado declarada (ADR-023/ADR-027). */
  procedencia: string | null;
};

export type CriterioAceite = {
  id: string;
  titulo: string;
  ok: boolean;
  detalhe: string;
};

export type ResultadoPrivacidade = {
  aprovado: boolean;
  criterios: CriterioAceite[];
  bloqueios: string[];
};

/**
 * Validação formal de privacidade. Reprova por padrão: só passa quando todos
 * os critérios de aceite do ADR-034 são atendidos.
 */
export function validarAgregacaoCrossWorkspace(pedido: PedidoAgregacao): ResultadoPrivacidade {
  const camposSuspeitos = pedido.campos.filter((c) =>
    CAMPOS_PROIBIDOS_AGREGACAO.some((p) => c.toLowerCase().includes(p)),
  );

  const criterios: CriterioAceite[] = [
    {
      id: "P01",
      titulo: `k-anonimato de workspaces (≥ ${K_MINIMO_WORKSPACES})`,
      ok: pedido.workspaces >= K_MINIMO_WORKSPACES,
      detalhe: `${pedido.workspaces} workspace(s) no resultado`,
    },
    {
      id: "P02",
      titulo: "Consentimento explícito de todos os participantes",
      ok: pedido.consentimentoTodos,
      detalhe: pedido.consentimentoTodos
        ? "todos os workspaces aceitaram participar"
        : "há workspace sem consentimento registrado",
    },
    {
      id: "P03",
      titulo: "Granularidade agregada",
      ok: pedido.granularidade === "agregada",
      detalhe: `granularidade declarada: ${pedido.granularidade}`,
    },
    {
      id: "P04",
      titulo: "Nenhum campo identificável no resultado",
      ok: camposSuspeitos.length === 0,
      detalhe:
        camposSuspeitos.length === 0
          ? "somente campos agregados"
          : `campos proibidos: ${camposSuspeitos.join(", ")}`,
    },
    {
      id: "P05",
      titulo: `Célula mínima (≥ ${N_MINIMO_CELULA} registros)`,
      ok: pedido.menorCelula >= N_MINIMO_CELULA,
      detalhe: `menor célula com ${pedido.menorCelula} registro(s)`,
    },
    {
      id: "P06",
      titulo: "Supressão de células pequenas ativa",
      ok: pedido.suprimeCelulasPequenas,
      detalhe: pedido.suprimeCelulasPequenas
        ? "células abaixo do mínimo são suprimidas"
        : "célula pequena seria exibida",
    },
    {
      id: "P07",
      titulo: "Procedência declarada",
      ok: Boolean(pedido.procedencia && pedido.procedencia.trim().length > 0),
      detalhe: pedido.procedencia?.trim() ? pedido.procedencia : "sem origem declarada",
    },
  ];

  const bloqueios = criterios.filter((c) => !c.ok).map((c) => `${c.id} — ${c.titulo}`);
  return { aprovado: bloqueios.length === 0, criterios, bloqueios };
}

export type CelulaAgregada = {
  chave: string;
  registros: number;
  workspaces: number;
};

export type IntegridadeAgregacao = {
  /** Nenhum registro desapareceu sem estar contabilizado como suprimido. */
  semCorte: boolean;
  totalOrigem: number;
  totalPublicado: number;
  totalSuprimido: number;
  celulasPublicadas: CelulaAgregada[];
  celulasSuprimidas: CelulaAgregada[];
};

/**
 * Teste de não-corte: a soma do que é publicado com o que é suprimido precisa
 * fechar com o total de origem. Corte silencioso de dado é falha de integridade.
 */
export function verificarNaoCorte(
  celulas: CelulaAgregada[],
  totalOrigem: number,
): IntegridadeAgregacao {
  const publicadas = celulas.filter(
    (c) => c.registros >= N_MINIMO_CELULA && c.workspaces >= K_MINIMO_WORKSPACES,
  );
  const suprimidas = celulas.filter((c) => !publicadas.includes(c));
  const soma = (lista: CelulaAgregada[]) => lista.reduce((acc, c) => acc + c.registros, 0);
  const totalPublicado = soma(publicadas);
  const totalSuprimido = soma(suprimidas);

  return {
    semCorte: totalPublicado + totalSuprimido === totalOrigem,
    totalOrigem,
    totalPublicado,
    totalSuprimido,
    celulasPublicadas: publicadas,
    celulasSuprimidas: suprimidas,
  };
}

/* ─────────────── 4. Modelos essenciais de Network e Capital ─────────────── */

export type ContratoParceria = {
  id: string;
  parteA: string;
  parteB: string;
  escopoDados: Array<"nenhum" | "agregado" | "oportunidade_compartilhada">;
  comissaoPct: number;
  vigenciaInicio: string;
  vigenciaFim: string | null;
  assinadoPor: string | null;
  /** Regras de rescisão declaradas. */
  rescisao: string | null;
};

export type CompliancePartner = {
  parceiroId: string;
  cnpjValidado: boolean;
  creciValidado: boolean;
  documentosPendentes: string[];
  sancoesEncontradas: number;
  ultimaRevisao: string | null;
};

export type PosicaoLiquidez = {
  carteiraTotal: number;
  antecipado: number;
  inadimplente: number;
  /** Participação do maior sacado na carteira, em %. */
  concentracaoMaiorSacado: number;
  prazoMedioDias: number;
};

export type Veredito = {
  apto: boolean;
  motivos: string[];
  /** Alertas que não bloqueiam, mas exigem registro. */
  observacoes: string[];
};

export function validarContratoParceria(c: ContratoParceria): Veredito {
  const motivos: string[] = [];
  const observacoes: string[] = [];

  if (!c.assinadoPor) motivos.push("contrato sem responsável pela assinatura");
  if (c.parteA === c.parteB) motivos.push("partes idênticas");
  if (c.comissaoPct < 0 || c.comissaoPct > 100) motivos.push("comissão fora da faixa 0–100%");
  if (!c.rescisao) motivos.push("cláusula de rescisão não declarada");
  if (c.vigenciaFim && c.vigenciaFim <= c.vigenciaInicio)
    motivos.push("vigência final anterior ao início");
  if (c.escopoDados.length === 0) motivos.push("escopo de dados não declarado");
  if (c.escopoDados.includes("oportunidade_compartilhada"))
    observacoes.push("compartilhar oportunidade exige consentimento do cliente (ADR-034)");
  if (!c.vigenciaFim) observacoes.push("contrato sem prazo: revisar anualmente");

  return { apto: motivos.length === 0, motivos, observacoes };
}

export function validarCompliance(c: CompliancePartner): Veredito {
  const motivos: string[] = [];
  const observacoes: string[] = [];

  if (!c.cnpjValidado) motivos.push("CNPJ não validado");
  if (!c.creciValidado) motivos.push("CRECI não validado");
  if (c.documentosPendentes.length > 0)
    motivos.push(`documentos pendentes: ${c.documentosPendentes.join(", ")}`);
  if (c.sancoesEncontradas > 0) motivos.push(`${c.sancoesEncontradas} sanção(ões) encontrada(s)`);
  if (!c.ultimaRevisao) observacoes.push("sem data de revisão registrada");

  return { apto: motivos.length === 0, motivos, observacoes };
}

export type AvaliacaoLiquidez = Veredito & {
  coberturaPct: number;
  inadimplenciaPct: number;
};

export function avaliarLiquidez(p: PosicaoLiquidez): AvaliacaoLiquidez {
  const motivos: string[] = [];
  const observacoes: string[] = [];

  if (p.carteiraTotal <= 0) {
    return {
      apto: false,
      motivos: ["carteira sem valor: não há base para avaliar liquidez"],
      observacoes,
      coberturaPct: 0,
      inadimplenciaPct: 0,
    };
  }

  const coberturaPct = round1((p.antecipado / p.carteiraTotal) * 100);
  const inadimplenciaPct = round1((p.inadimplente / p.carteiraTotal) * 100);

  if (coberturaPct > 70) motivos.push("antecipação acima de 70% da carteira");
  if (inadimplenciaPct > 5) motivos.push("inadimplência acima de 5%");
  if (p.concentracaoMaiorSacado > 25) motivos.push("concentração do maior sacado acima de 25%");
  if (p.prazoMedioDias > 180) observacoes.push("prazo médio acima de 180 dias");

  return { apto: motivos.length === 0, motivos, observacoes, coberturaPct, inadimplenciaPct };
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/* ──────────────── 5. Onboarding por vertical ──────────────── */

export type PerguntaOnboarding = {
  id: string;
  pergunta: string;
  /** Evidência aceita como prova da resposta. */
  evidencia: string;
  /** Sem esta resposta a vertical não avança. */
  bloqueante: boolean;
};

export const onboardingVerticais: Record<VerticalKey, PerguntaOnboarding[]> = {
  academy: [
    {
      id: "AC1",
      pergunta: "Quais papéis usarão o produto no dia a dia?",
      evidencia: "lista de papéis em user_roles",
      bloqueante: true,
    },
    {
      id: "AC2",
      pergunta: "Qual trilha é obrigatória antes do primeiro acesso?",
      evidencia: "trilha marcada como obrigatória",
      bloqueante: true,
    },
    {
      id: "AC3",
      pergunta: "Quem acompanha a conclusão das trilhas?",
      evidencia: "responsável nomeado",
      bloqueante: false,
    },
  ],
  intelligence: [
    {
      id: "IN1",
      pergunta: "O workspace autoriza participar de benchmark agregado?",
      evidencia: "consentimento registrado com data",
      bloqueante: true,
    },
    {
      id: "IN2",
      pergunta: "Quais métricas podem ser comparadas?",
      evidencia: "lista de métricas sem campo identificável",
      bloqueante: true,
    },
    {
      id: "IN3",
      pergunta: "Quem responde pelo uso do benchmark?",
      evidencia: "responsável de dados nomeado",
      bloqueante: true,
    },
  ],
  analytics: [
    {
      id: "AN1",
      pergunta: "Quais indicadores decidem o mês?",
      evidencia: "indicadores mapeados nos read models",
      bloqueante: true,
    },
    {
      id: "AN2",
      pergunta: "Quem pode exportar dado?",
      evidencia: "papéis com permissão de exportação",
      bloqueante: true,
    },
    {
      id: "AN3",
      pergunta: "Qual a periodicidade da leitura executiva?",
      evidencia: "rotina agendada",
      bloqueante: false,
    },
  ],
  ai: [
    {
      id: "AI1",
      pergunta: "Quais personas serão habilitadas?",
      evidencia: "personas escolhidas com telas",
      bloqueante: true,
    },
    {
      id: "AI2",
      pergunta: "Quem aprova ação sugerida por IA?",
      evidencia: "aprovador nomeado",
      bloqueante: true,
    },
    {
      id: "AI3",
      pergunta: "Toda resposta deve exibir procedência?",
      evidencia: "configuração de explicabilidade ativa",
      bloqueante: true,
    },
  ],
  labs: [
    {
      id: "LB1",
      pergunta: "Qual hipótese será testada?",
      evidencia: "hipótese escrita com métrica",
      bloqueante: true,
    },
    {
      id: "LB2",
      pergunta: "Qual o prazo e o critério de encerramento?",
      evidencia: "prazo e critério registrados",
      bloqueante: true,
    },
    {
      id: "LB3",
      pergunta: "Quem registra o resultado observado?",
      evidencia: "responsável nomeado",
      bloqueante: false,
    },
  ],
  ventures: [
    {
      id: "VE1",
      pergunta: "Qual a tese do novo negócio?",
      evidencia: "tese versionada",
      bloqueante: true,
    },
    {
      id: "VE2",
      pergunta: "Qual evidência sustenta a tese?",
      evidencia: "evidências vinculadas",
      bloqueante: true,
    },
    {
      id: "VE3",
      pergunta: "Quem compõe o comitê de decisão?",
      evidencia: "comitê registrado",
      bloqueante: true,
    },
  ],
  network: [
    {
      id: "NW1",
      pergunta: "Quais parceiros entram na rede?",
      evidencia: "parceiros com CNPJ e CRECI validados",
      bloqueante: true,
    },
    {
      id: "NW2",
      pergunta: "Qual o escopo de dado compartilhado?",
      evidencia: "escopo declarado em contrato",
      bloqueante: true,
    },
    {
      id: "NW3",
      pergunta: "Como a comissão é dividida?",
      evidencia: "percentual em contrato assinado",
      bloqueante: true,
    },
    {
      id: "NW4",
      pergunta: "Como o contrato é rescindido?",
      evidencia: "cláusula de rescisão",
      bloqueante: true,
    },
  ],
  capital: [
    {
      id: "CP1",
      pergunta: "O gate H12 (LGPD) está encerrado?",
      evidencia: "gate H12 aprovado",
      bloqueante: true,
    },
    {
      id: "CP2",
      pergunta: "Qual o limite de antecipação da carteira?",
      evidencia: "política de limite aprovada",
      bloqueante: true,
    },
    {
      id: "CP3",
      pergunta: "Qual a concentração máxima por sacado?",
      evidencia: "política de concentração",
      bloqueante: true,
    },
    {
      id: "CP4",
      pergunta: "Quem audita cada operação?",
      evidencia: "trilha de auditoria definida",
      bloqueante: true,
    },
  ],
};

export type RespostaOnboarding = {
  id: string;
  /** Evidência apresentada; vazio significa sem evidência. */
  evidencia: string;
};

export type ProntidaoVertical = {
  vertical: VerticalKey;
  respondidas: number;
  total: number;
  progressoPct: number;
  pendenciasBloqueantes: PerguntaOnboarding[];
  pendencias: PerguntaOnboarding[];
  pronta: boolean;
  /** Bloqueio estrutural da vertical, independente das respostas. */
  bloqueio: string | null;
};

export function avaliarProntidao(
  vertical: VerticalKey,
  respostas: RespostaOnboarding[],
): ProntidaoVertical {
  const perguntas = onboardingVerticais[vertical];
  const comEvidencia = new Set(
    respostas.filter((r) => r.evidencia.trim().length > 0).map((r) => r.id),
  );
  const pendencias = perguntas.filter((p) => !comEvidencia.has(p.id));
  const pendenciasBloqueantes = pendencias.filter((p) => p.bloqueante);
  const respondidas = perguntas.length - pendencias.length;
  const bloqueio = getVertical(vertical).bloqueio ?? null;

  return {
    vertical,
    respondidas,
    total: perguntas.length,
    progressoPct: perguntas.length === 0 ? 0 : round1((respondidas / perguntas.length) * 100),
    pendenciasBloqueantes,
    pendencias,
    pronta: pendenciasBloqueantes.length === 0 && bloqueio === null,
    bloqueio,
  };
}
