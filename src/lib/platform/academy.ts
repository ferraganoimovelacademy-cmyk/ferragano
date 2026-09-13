/**
 * FASE 1 — GATE P05: Onboarding Academy.
 * Camada pura (sem I/O): trilha de formação, checklist de primeiro acesso,
 * cálculo de progresso e regra de emissão do certificado.
 */

export type AcademyLicao = {
  key: string;
  titulo: string;
  resumo: string;
  /** Minutos estimados de estudo. */
  duracao: number;
  /** Rota do app onde a prática acontece (quando houver). */
  pratica?: string;
  obrigatoria: boolean;
};

export type AcademyModulo = {
  key: string;
  titulo: string;
  objetivo: string;
  icon: string;
  licoes: AcademyLicao[];
};

/** Trilha oficial do piloto: do primeiro acesso ao fechamento de uma venda. */
export const ACADEMY_TRILHA: AcademyModulo[] = [
  {
    key: "primeiro-acesso",
    titulo: "Primeiro acesso",
    objetivo: "Entrar, entender a navegação e configurar o essencial.",
    icon: "login",
    licoes: [
      {
        key: "primeiro-acesso.tour",
        titulo: "Tour pela plataforma",
        resumo: "Domínios, sidebar, busca global e notificações.",
        duracao: 6,
        pratica: "/app",
        obrigatoria: true,
      },
      {
        key: "primeiro-acesso.perfil",
        titulo: "Configurar seu perfil",
        resumo: "Nome, telefone e preferências de contato.",
        duracao: 4,
        pratica: "/app/configuracoes",
        obrigatoria: true,
      },
      {
        key: "primeiro-acesso.equipe",
        titulo: "Sua equipe e seu papel",
        resumo: "O que cada perfil pode ver e fazer no workspace.",
        duracao: 5,
        pratica: "/app/equipes",
        obrigatoria: false,
      },
    ],
  },
  {
    key: "pessoas",
    titulo: "Pessoas",
    objetivo: "Cadastrar e qualificar sem duplicar base.",
    icon: "contacts",
    licoes: [
      {
        key: "pessoas.cadastro",
        titulo: "Cadastro canônico",
        resumo: "Pessoa única com contatos, endereços e qualificação.",
        duracao: 8,
        pratica: "/app/pessoas",
        obrigatoria: true,
      },
      {
        key: "pessoas.qualificacao",
        titulo: "Qualificação e temperatura",
        resumo: "Perfil de compra, renda e urgência guiam a prioridade.",
        duracao: 7,
        pratica: "/app/pessoas",
        obrigatoria: true,
      },
      {
        key: "pessoas.duplicidade",
        titulo: "Evitando duplicidade",
        resumo: "Como o sistema detecta a mesma pessoa por documento e e-mail.",
        duracao: 5,
        obrigatoria: true,
      },
    ],
  },
  {
    key: "comercial",
    titulo: "Rotina comercial",
    objetivo: "Trabalhar o funil todos os dias com registro real.",
    icon: "trending_up",
    licoes: [
      {
        key: "comercial.oportunidade",
        titulo: "Abrir uma oportunidade",
        resumo: "Pessoa + empreendimento + valor previsto.",
        duracao: 8,
        pratica: "/app/oportunidades",
        obrigatoria: true,
      },
      {
        key: "comercial.kanban",
        titulo: "Mover etapa no funil",
        resumo: "Kanban por arraste ou teclado, com motivo de perda obrigatório.",
        duracao: 6,
        pratica: "/app/oportunidades",
        obrigatoria: true,
      },
      {
        key: "comercial.agenda",
        titulo: "Agenda e follow-up",
        resumo: "Compromissos, visitas e o que nunca pode ficar sem retorno.",
        duracao: 7,
        pratica: "/app/agenda",
        obrigatoria: true,
      },
      {
        key: "comercial.fechamento",
        titulo: "Proposta, reserva e venda",
        resumo: "Reserva bloqueia estoque; venda fecha o ciclo.",
        duracao: 9,
        pratica: "/app/oportunidades",
        obrigatoria: true,
      },
    ],
  },
  {
    key: "decisao",
    titulo: "Decisão assistida",
    objetivo: "Usar score e próxima melhor ação a favor da meta.",
    icon: "insights",
    licoes: [
      {
        key: "decisao.score",
        titulo: "Como o score é calculado",
        resumo: "Sinais de engajamento, aderência e recência.",
        duracao: 6,
        pratica: "/app/decisoes",
        obrigatoria: true,
      },
      {
        key: "decisao.nba",
        titulo: "Próxima melhor ação",
        resumo: "Aceitar, adiar ou recusar — e por que isso ensina o sistema.",
        duracao: 6,
        pratica: "/app/decisoes",
        obrigatoria: true,
      },
      {
        key: "decisao.feedback",
        titulo: "Feedback do piloto",
        resumo: "Como reportar bug, dificuldade e ideia sem sair da tela.",
        duracao: 3,
        obrigatoria: false,
      },
    ],
  },
];

export const ACADEMY_LICOES: AcademyLicao[] = ACADEMY_TRILHA.flatMap((m) => m.licoes);

export const ACADEMY_LICAO_KEYS = ACADEMY_LICOES.map((l) => l.key);

export function licaoExiste(key: string): boolean {
  return ACADEMY_LICAO_KEYS.includes(key);
}

export function acharLicao(key: string): AcademyLicao | undefined {
  return ACADEMY_LICOES.find((l) => l.key === key);
}

/** Minutos totais da trilha (usado no cabeçalho da tela). */
export function duracaoTotal(): number {
  return ACADEMY_LICOES.reduce((soma, l) => soma + l.duracao, 0);
}

export type AcademyProgressoModulo = {
  key: string;
  titulo: string;
  concluidas: number;
  total: number;
  percentual: number;
  completo: boolean;
};

export type AcademyProgresso = {
  concluidas: number;
  total: number;
  percentual: number;
  obrigatoriasPendentes: string[];
  certificado: boolean;
  modulos: AcademyProgressoModulo[];
  proximaLicao: AcademyLicao | null;
};

/** Percentual inteiro, sempre entre 0 e 100. */
function percentual(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 100);
}

/**
 * Calcula o progresso da trilha a partir das lições concluídas.
 * Chaves desconhecidas são ignoradas (trilha pode mudar sem sujar o cálculo).
 */
export function calcularProgresso(concluidasKeys: readonly string[]): AcademyProgresso {
  const feitas = new Set(concluidasKeys.filter(licaoExiste));

  const modulos = ACADEMY_TRILHA.map((modulo) => {
    const concluidas = modulo.licoes.filter((l) => feitas.has(l.key)).length;
    return {
      key: modulo.key,
      titulo: modulo.titulo,
      concluidas,
      total: modulo.licoes.length,
      percentual: percentual(concluidas, modulo.licoes.length),
      completo: concluidas === modulo.licoes.length,
    };
  });

  const obrigatoriasPendentes = ACADEMY_LICOES.filter(
    (l) => l.obrigatoria && !feitas.has(l.key),
  ).map((l) => l.key);

  const proximaLicao = ACADEMY_LICOES.find((l) => !feitas.has(l.key)) ?? null;

  return {
    concluidas: feitas.size,
    total: ACADEMY_LICOES.length,
    percentual: percentual(feitas.size, ACADEMY_LICOES.length),
    obrigatoriasPendentes,
    /** Certificado só sai com todas as lições obrigatórias concluídas. */
    certificado: obrigatoriasPendentes.length === 0,
    modulos,
    proximaLicao,
  };
}

export type AcademyCertificado = {
  nome: string;
  emitidoEm: string;
  licoes: number;
  minutos: number;
  codigo: string;
};

/** Código curto e estável por usuário, só para conferência visual. */
export function codigoCertificado(userId: string): string {
  let hash = 0;
  for (const char of userId) {
    hash = (hash * 31 + char.charCodeAt(0)) % 0xffffff;
  }
  return `FG1-${hash.toString(16).toUpperCase().padStart(6, "0")}`;
}

export function montarCertificado(
  userId: string,
  nome: string,
  concluidasKeys: readonly string[],
  emitidoEm = new Date().toISOString(),
): AcademyCertificado | null {
  const progresso = calcularProgresso(concluidasKeys);
  if (!progresso.certificado) return null;

  const minutos = ACADEMY_LICOES.filter((l) => concluidasKeys.includes(l.key)).reduce(
    (soma, l) => soma + l.duracao,
    0,
  );

  return {
    nome,
    emitidoEm,
    licoes: progresso.concluidas,
    minutos,
    codigo: codigoCertificado(userId),
  };
}