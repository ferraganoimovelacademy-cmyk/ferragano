/**
 * FASE 1 — GATE P10: Go/No-Go Review.
 *
 * Regra pura da revisão de 30 dias: as metas do GATE P08 viram critérios
 * determinísticos e o veredito é derivado, nunca digitado. Nada de I/O.
 * Dono: Pilot Manager (#21), com veto do Release Manager (#20).
 */

export type CriterioStatus = "atingida" | "parcial" | "falha" | "sem_dado";

export const criterioStatusLabels: Record<CriterioStatus, string> = {
  atingida: "Meta atingida",
  parcial: "Perto da meta",
  falha: "Abaixo da meta",
  sem_dado: "Sem medição",
};

export type CriterioDimensao = "operacao" | "comercial" | "produto" | "satisfacao";

export const dimensaoLabels: Record<CriterioDimensao, string> = {
  operacao: "Operação",
  comercial: "Comercial",
  produto: "Produto",
  satisfacao: "Satisfação",
};

/** Números crus vindos da telemetria e do write model. `null` = não medido. */
export type GoNogoEntrada = {
  janelaDias: number;
  membrosAtivos: number;
  usuariosAtivos7d: number | null;
  oportunidadesTotal: number | null;
  oportunidadesAtualizadas: number | null;
  oportunidadesEsquecidas: number | null;
  eventosTotal: number | null;
  eventosComErro: number | null;
  oportunidadesGanhas: number | null;
  oportunidadesPerdidas: number | null;
  tempoMedioEtapaHoras: number | null;
  usosBuscaGlobal: number | null;
  usosDecisionCenter: number | null;
  eventosAutomacao: number | null;
  decisoesTotal: number | null;
  decisoesAceitas: number | null;
  feedbackTotal: number | null;
  feedbackCriticoAberto: number | null;
  academyCertificados: number | null;
};

export type CriterioResultado = {
  key: string;
  dimensao: CriterioDimensao;
  label: string;
  meta: string;
  /** Valor formatado para leitura humana. */
  valor: string;
  status: CriterioStatus;
  /** Critério bloqueante: falha aqui impede GO. */
  bloqueante: boolean;
};

function pct(parte: number | null, total: number | null): number | null {
  if (parte == null || total == null || total <= 0) return null;
  return Math.round((parte / total) * 100);
}

function statusPorPiso(valor: number | null, meta: number, tolerancia: number): CriterioStatus {
  if (valor == null) return "sem_dado";
  if (valor >= meta) return "atingida";
  if (valor >= meta - tolerancia) return "parcial";
  return "falha";
}

function statusPorTeto(valor: number | null, meta: number, tolerancia: number): CriterioStatus {
  if (valor == null) return "sem_dado";
  if (valor <= meta) return "atingida";
  if (valor <= meta + tolerancia) return "parcial";
  return "falha";
}

function formatarPct(valor: number | null): string {
  return valor == null ? "—" : `${valor}%`;
}

/** GATE P08 → critérios avaliáveis do GATE P10. */
export function avaliarPiloto(entrada: GoNogoEntrada): CriterioResultado[] {
  const ativos = pct(entrada.usuariosAtivos7d, entrada.membrosAtivos || null);
  const atualizadas = pct(entrada.oportunidadesAtualizadas, entrada.oportunidadesTotal);
  const esquecidas = pct(entrada.oportunidadesEsquecidas, entrada.oportunidadesTotal);
  const erros = pct(entrada.eventosComErro, entrada.eventosTotal);
  const fechadas =
    entrada.oportunidadesGanhas == null || entrada.oportunidadesPerdidas == null
      ? null
      : entrada.oportunidadesGanhas + entrada.oportunidadesPerdidas;
  const conversao = pct(entrada.oportunidadesGanhas, fechadas);
  const aceitacao = pct(entrada.decisoesAceitas, entrada.decisoesTotal);
  const certificados = pct(entrada.academyCertificados, entrada.membrosAtivos || null);

  return [
    {
      key: "usuarios_ativos",
      dimensao: "operacao",
      label: "Usuários ativos na semana",
      meta: "≥ 90% dos membros",
      valor: formatarPct(ativos),
      status: statusPorPiso(ativos, 90, 10),
      bloqueante: true,
    },
    {
      key: "oportunidades_atualizadas",
      dimensao: "operacao",
      label: "Oportunidades atualizadas no período",
      meta: "≥ 80% da base",
      valor: formatarPct(atualizadas),
      status: statusPorPiso(atualizadas, 80, 15),
      bloqueante: true,
    },
    {
      key: "erros_criticos",
      dimensao: "operacao",
      label: "Ações com erro",
      meta: "≤ 5% dos eventos",
      valor: formatarPct(erros),
      status: statusPorTeto(erros, 5, 3),
      bloqueante: true,
    },
    {
      key: "tempo_etapa",
      dimensao: "comercial",
      label: "Tempo médio por etapa",
      meta: "≤ 48 h",
      valor:
        entrada.tempoMedioEtapaHoras == null
          ? "—"
          : `${entrada.tempoMedioEtapaHoras.toFixed(1)} h`,
      status: statusPorTeto(entrada.tempoMedioEtapaHoras, 48, 24),
      bloqueante: false,
    },
    {
      key: "conversao",
      dimensao: "comercial",
      label: "Conversão das oportunidades fechadas",
      meta: "≥ 20%",
      valor: formatarPct(conversao),
      status: statusPorPiso(conversao, 20, 8),
      bloqueante: false,
    },
    {
      key: "esquecidas",
      dimensao: "comercial",
      label: "Oportunidades sem toque há 14 dias",
      meta: "≤ 15% da base",
      valor: formatarPct(esquecidas),
      status: statusPorTeto(esquecidas, 15, 10),
      bloqueante: false,
    },
    {
      key: "busca_global",
      dimensao: "produto",
      label: "Uso da busca global",
      meta: "medido (> 0)",
      valor: entrada.usosBuscaGlobal == null ? "—" : `${entrada.usosBuscaGlobal} usos`,
      status: statusPorPiso(entrada.usosBuscaGlobal, 1, 0),
      bloqueante: false,
    },
    {
      key: "decision_center",
      dimensao: "produto",
      label: "Uso do Decision Center",
      meta: "medido (> 0)",
      valor: entrada.usosDecisionCenter == null ? "—" : `${entrada.usosDecisionCenter} usos`,
      status: statusPorPiso(entrada.usosDecisionCenter, 1, 0),
      bloqueante: false,
    },
    {
      key: "automacoes",
      dimensao: "produto",
      label: "Eventos de automação processados",
      meta: "medido (> 0)",
      valor: entrada.eventosAutomacao == null ? "—" : `${entrada.eventosAutomacao} eventos`,
      status: statusPorPiso(entrada.eventosAutomacao, 1, 0),
      bloqueante: false,
    },
    {
      key: "aceitacao_decisao",
      dimensao: "produto",
      label: "Recomendações aceitas",
      meta: "≥ 40% das decisões",
      valor: formatarPct(aceitacao),
      status: statusPorPiso(aceitacao, 40, 15),
      bloqueante: false,
    },
    {
      key: "feedback_critico",
      dimensao: "satisfacao",
      label: "Feedback crítico em aberto",
      meta: "0 em aberto",
      valor: entrada.feedbackCriticoAberto == null ? "—" : `${entrada.feedbackCriticoAberto}`,
      status: statusPorTeto(entrada.feedbackCriticoAberto, 0, 1),
      bloqueante: true,
    },
    {
      key: "academy",
      dimensao: "satisfacao",
      label: "Equipe certificada na Academy",
      meta: "≥ 80% dos membros",
      valor: formatarPct(certificados),
      status: statusPorPiso(certificados, 80, 20),
      bloqueante: false,
    },
  ];
}

export type Veredito = "go" | "hold" | "insuficiente";

export const veredictoLabels: Record<Veredito, string> = {
  go: "GO — liberar versão 1.1",
  hold: "HOLD — corrigir e repetir o piloto",
  insuficiente: "MEDIÇÃO INSUFICIENTE — não decidir ainda",
};

export type GoNogoResumo = {
  criterios: CriterioResultado[];
  atingidas: number;
  parciais: number;
  falhas: number;
  semDado: number;
  bloqueantesEmFalha: string[];
  cobertura: number;
  veredito: Veredito;
  justificativa: string;
};

/**
 * Veredito derivado: sem cobertura (≥ 80% dos critérios medidos) ou com
 * bloqueante em falha, não existe GO. Nenhuma meta é declarada atingida sem
 * medição — critério sem dado nunca conta como sucesso.
 */
export function resumirGoNogo(entrada: GoNogoEntrada): GoNogoResumo {
  const criterios = avaliarPiloto(entrada);
  const atingidas = criterios.filter((c) => c.status === "atingida").length;
  const parciais = criterios.filter((c) => c.status === "parcial").length;
  const falhas = criterios.filter((c) => c.status === "falha").length;
  const semDado = criterios.filter((c) => c.status === "sem_dado").length;
  const bloqueantesEmFalha = criterios
    .filter((c) => c.bloqueante && (c.status === "falha" || c.status === "sem_dado"))
    .map((c) => c.label);
  const cobertura = Math.round(((criterios.length - semDado) / criterios.length) * 100);

  let veredito: Veredito;
  let justificativa: string;

  if (cobertura < 80) {
    veredito = "insuficiente";
    justificativa = `Apenas ${cobertura}% dos critérios têm medição. A revisão exige ao menos 80%.`;
  } else if (bloqueantesEmFalha.length > 0) {
    veredito = "hold";
    justificativa = `Critério bloqueante fora da meta: ${bloqueantesEmFalha.join(", ")}.`;
  } else if (falhas > 0) {
    veredito = "hold";
    justificativa = `${falhas} critério(s) abaixo da meta. Corrigir antes de liberar a 1.1.`;
  } else {
    veredito = "go";
    justificativa = `${atingidas} de ${criterios.length} critérios atingidos, ${parciais} perto da meta e nenhum bloqueante em falha.`;
  }

  return {
    criterios,
    atingidas,
    parciais,
    falhas,
    semDado,
    bloqueantesEmFalha,
    cobertura,
    veredito,
    justificativa,
  };
}
