/**
 * FASE 2 — FERRAGANO ADVISOR
 *
 * Camada pura do Advisor. A IA nunca calcula número: os sinais abaixo são
 * derivados deterministicamente dos Read Models (Sprint 10) e servem como
 * evidência fechada do prompt. O modelo só interpreta e prioriza.
 */

export type AdvisorSeveridade = "ok" | "atencao" | "critico";

export type AdvisorExecutivo = {
  oportunidadesAbertas: number;
  ganhasMes: number;
  novas30d: number;
  pipelineTotal: number;
  receitaPrevista: number;
  valorGanhoMes: number;
  tempoMedioCicloDias: number;
  conversaoPercentual: number;
  ticketMedio: number | null;
  unidadesTotal: number;
  unidadesDisponiveis: number;
  vgvDisponivel: number;
};

export type AdvisorVendedor = {
  responsavelId: string;
  responsavelNome: string;
  oportunidadesAbertas: number;
  ganhas30d: number;
  conversaoPercentual: number;
  followupPerdido: number;
  semProximaAcao: number;
  slaEstourado: number;
  tarefasAtrasadas: number;
  diasSemAtividade: number | null;
};

export type AdvisorOrigem = {
  origem: string;
  pessoas30d: number;
  oportunidades30d: number;
  ganhasTotal: number;
  perdidasTotal: number;
  valorGanho: number;
};

export type AdvisorSnapshot = {
  executivo: AdvisorExecutivo | null;
  vendedores: AdvisorVendedor[];
  origens: AdvisorOrigem[];
};

export type AdvisorSinal = {
  codigo: string;
  titulo: string;
  evidencia: string;
  severidade: AdvisorSeveridade;
  area: "vendas" | "estoque" | "marketing" | "operacao";
};

type Linha = Record<string, unknown>;
const num = (v: unknown) => (v == null ? 0 : Number(v));
const numOuNulo = (v: unknown) => (v == null ? null : Number(v));
const texto = (v: unknown, padrao: string) =>
  typeof v === "string" && v.trim() ? v : padrao;

/**
 * Mapeia as linhas dos Read Models 360 para o snapshot do Advisor.
 * Puro de propósito: o mesmo mapeamento serve o briefing (RLS do usuário)
 * e o watchdog do cron (service_role).
 */
export function montarSnapshotAdvisor(
  executivo: Linha | null | undefined,
  vendedores: readonly Linha[] = [],
  origens: readonly Linha[] = [],
): AdvisorSnapshot {
  return {
    executivo: executivo
      ? {
          oportunidadesAbertas: num(executivo["oportunidades_abertas"]),
          ganhasMes: num(executivo["ganhas_mes"]),
          novas30d: num(executivo["novas_30d"]),
          pipelineTotal: num(executivo["pipeline_total"]),
          receitaPrevista: num(executivo["receita_prevista"]),
          valorGanhoMes: num(executivo["valor_ganho_mes"]),
          tempoMedioCicloDias: num(executivo["tempo_medio_ciclo_dias"]),
          conversaoPercentual: num(executivo["conversao_percentual"]),
          ticketMedio: numOuNulo(executivo["ticket_medio"]),
          unidadesTotal: num(executivo["unidades_total"]),
          unidadesDisponiveis: num(executivo["unidades_disponiveis"]),
          vgvDisponivel: num(executivo["vgv_disponivel"]),
        }
      : null,
    vendedores: vendedores.map((r) => ({
      responsavelId: texto(r["responsavel_id"], ""),
      responsavelNome: texto(r["responsavel_nome"], "Sem responsável"),
      oportunidadesAbertas: num(r["oportunidades_abertas"]),
      ganhas30d: num(r["ganhas_30d"]),
      conversaoPercentual: num(r["conversao_percentual"]),
      followupPerdido: num(r["followup_perdido"]),
      semProximaAcao: num(r["sem_proxima_acao"]),
      slaEstourado: num(r["sla_estourado"]),
      tarefasAtrasadas: num(r["tarefas_atrasadas"]),
      diasSemAtividade: numOuNulo(r["dias_sem_atividade"]),
    })),
    origens: origens.map((r) => ({
      origem: texto(r["origem"], "outro"),
      pessoas30d: num(r["pessoas_30d"]),
      oportunidades30d: num(r["oportunidades_30d"]),
      ganhasTotal: num(r["ganhas_total"]),
      perdidasTotal: num(r["perdidas_total"]),
      valorGanho: num(r["valor_ganho"]),
    })),
  };
}

/** Limites de diagnóstico do piloto. Mudança aqui muda o Advisor todo. */
export const ADVISOR_LIMITES = {
  conversaoMinima: 15,
  cicloMaximoDias: 90,
  liquidezMinima: 0.2,
  followupCritico: 5,
  semAcaoCritico: 10,
  diasSemAtividade: 7,
  origemMinimaOportunidades: 10,
} as const;

const pct = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;

export function derivarSinais(s: AdvisorSnapshot): AdvisorSinal[] {
  const sinais: AdvisorSinal[] = [];
  const e = s.executivo;

  if (e) {
    sinais.push({
      codigo: "conversao",
      titulo: "Conversão do funil",
      evidencia: `${pct(e.conversaoPercentual)} de conversão, ${e.ganhasMes} venda(s) no mês e ${e.novas30d} oportunidade(s) nova(s) em 30 dias.`,
      severidade:
        e.conversaoPercentual >= ADVISOR_LIMITES.conversaoMinima
          ? "ok"
          : e.conversaoPercentual >= ADVISOR_LIMITES.conversaoMinima / 2
            ? "atencao"
            : "critico",
      area: "vendas",
    });

    sinais.push({
      codigo: "ciclo",
      titulo: "Ciclo médio de venda",
      evidencia: `${Math.round(e.tempoMedioCicloDias)} dias entre criação e ganho.`,
      severidade:
        e.tempoMedioCicloDias <= ADVISOR_LIMITES.cicloMaximoDias
          ? "ok"
          : e.tempoMedioCicloDias <= ADVISOR_LIMITES.cicloMaximoDias * 1.5
            ? "atencao"
            : "critico",
      area: "vendas",
    });

    const liquidez = e.unidadesTotal > 0 ? 1 - e.unidadesDisponiveis / e.unidadesTotal : 0;
    sinais.push({
      codigo: "liquidez",
      titulo: "Liquidez do estoque",
      evidencia: `${e.unidadesDisponiveis} de ${e.unidadesTotal} unidades disponíveis (${pct(liquidez * 100)} do estoque já negociado).`,
      severidade:
        e.unidadesTotal === 0
          ? "atencao"
          : liquidez >= ADVISOR_LIMITES.liquidezMinima
            ? "ok"
            : "atencao",
      area: "estoque",
    });

    if (e.pipelineTotal > 0) {
      const cobertura = e.receitaPrevista / e.pipelineTotal;
      sinais.push({
        codigo: "forecast",
        titulo: "Qualidade do forecast",
        evidencia: `Pipeline aberto de ${e.pipelineTotal.toFixed(0)} com receita ponderada de ${e.receitaPrevista.toFixed(0)} (${pct(cobertura * 100)}).`,
        severidade: cobertura >= 0.3 ? "ok" : "atencao",
        area: "vendas",
      });
    }
  }

  const followup = s.vendedores.reduce((a, v) => a + v.followupPerdido, 0);
  const semAcao = s.vendedores.reduce((a, v) => a + v.semProximaAcao, 0);
  const sla = s.vendedores.reduce((a, v) => a + v.slaEstourado, 0);

  if (s.vendedores.length > 0) {
    sinais.push({
      codigo: "followup",
      titulo: "Follow-up perdido",
      evidencia: `${followup} oportunidade(s) com follow-up vencido, ${semAcao} sem próxima ação e ${sla} com SLA estourado.`,
      severidade:
        followup === 0 && semAcao === 0 && sla === 0
          ? "ok"
          : followup >= ADVISOR_LIMITES.followupCritico || semAcao >= ADVISOR_LIMITES.semAcaoCritico
            ? "critico"
            : "atencao",
      area: "operacao",
    });

    const inativos = s.vendedores.filter(
      (v) => (v.diasSemAtividade ?? 999) >= ADVISOR_LIMITES.diasSemAtividade,
    );
    if (inativos.length > 0) {
      sinais.push({
        codigo: "inatividade",
        titulo: "Corretores sem atividade",
        evidencia: `${inativos.length} corretor(es) sem registrar atividade há ${ADVISOR_LIMITES.diasSemAtividade} dias ou mais: ${inativos
          .slice(0, 5)
          .map((v) => v.responsavelNome)
          .join(", ")}.`,
        severidade: inativos.length >= 3 ? "critico" : "atencao",
        area: "operacao",
      });
    }
  }

  const origensMaduras = s.origens.filter(
    (o) => o.ganhasTotal + o.perdidasTotal >= ADVISOR_LIMITES.origemMinimaOportunidades,
  );
  if (origensMaduras.length > 0) {
    const ranking = [...origensMaduras].sort(
      (a, b) =>
        b.ganhasTotal / (b.ganhasTotal + b.perdidasTotal) -
        a.ganhasTotal / (a.ganhasTotal + a.perdidasTotal),
    );
    const melhor = ranking[0]!;
    const pior = ranking[ranking.length - 1]!;
    sinais.push({
      codigo: "origem",
      titulo: "Produtividade por origem",
      evidencia: `Melhor origem: ${melhor.origem} (${melhor.ganhasTotal} ganhas / ${melhor.perdidasTotal} perdidas). Pior: ${pior.origem} (${pior.ganhasTotal} ganhas / ${pior.perdidasTotal} perdidas).`,
      severidade: melhor.origem === pior.origem ? "ok" : "atencao",
      area: "marketing",
    });
  }

  return sinais;
}

export function classificarPrioridade(sinais: AdvisorSinal[]): AdvisorSeveridade {
  if (sinais.some((s) => s.severidade === "critico")) return "critico";
  if (sinais.some((s) => s.severidade === "atencao")) return "atencao";
  return "ok";
}

export type AdvisorAcaoStatus = "pendente" | "aceita" | "descartada" | "concluida";

/** Prazo padrão da tarefa gerada quando a gestão aceita uma recomendação. */
export const ADVISOR_PRAZO_DIAS = 7;

export type AdvisorTarefa = {
  titulo: string;
  descricao: string;
  prioridade: "alta" | "media" | "baixa";
  venceEm: string;
};

/**
 * SPRINT 16 — ponte Advisor → Execução.
 * Converte uma recomendação aceita em tarefa executável, sem inventar conteúdo:
 * o texto da tarefa é o próprio conselho e o sinal que o sustenta.
 */
export function montarTarefaDaAcao(
  acao: { titulo: string; acao: string; sinal?: string | null; prioridade: string },
  agora: Date = new Date(),
): AdvisorTarefa {
  const vence = new Date(agora.getTime() + ADVISOR_PRAZO_DIAS * 24 * 60 * 60 * 1000);
  const descricao = acao.sinal?.trim()
    ? `${acao.acao}\n\nSinal: ${acao.sinal.trim()}`
    : acao.acao;

  return {
    titulo: `Advisor: ${acao.titulo}`,
    descricao,
    prioridade:
      acao.prioridade === "alta" ? "alta" : acao.prioridade === "media" ? "media" : "baixa",
    venceEm: vence.toISOString(),
  };
}

export type AdvisorAceite = {
  total: number;
  pendentes: number;
  aceitas: number;
  descartadas: number;
  concluidas: number;
  /** % das ações já decididas que foram aceitas ou concluídas. null quando nada foi decidido. */
  taxaAceite: number | null;
  /** % das ações aceitas que já foram concluídas. null quando nada foi aceito. */
  taxaExecucao: number | null;
};

/**
 * Fecha o loop de Decision Accuracy: mede quanto do conselho do Advisor
 * a gestão aceitou e quanto virou execução.
 */
export function resumirAceite(acoes: { status: string }[]): AdvisorAceite {
  const conta = (s: AdvisorAcaoStatus) => acoes.filter((a) => a.status === s).length;
  const pendentes = conta("pendente");
  const aceitas = conta("aceita");
  const descartadas = conta("descartada");
  const concluidas = conta("concluida");
  const decididas = aceitas + descartadas + concluidas;
  const aceitasTotal = aceitas + concluidas;

  return {
    total: acoes.length,
    pendentes,
    aceitas,
    descartadas,
    concluidas,
    taxaAceite: decididas > 0 ? (aceitasTotal / decididas) * 100 : null,
    taxaExecucao: aceitasTotal > 0 ? (concluidas / aceitasTotal) * 100 : null,
  };
}

export const ADVISOR_SYSTEM_PROMPT = [
  "Você é o Ferragano Advisor, conselheiro de operação imobiliária de alto padrão.",
  "Escreva em português do Brasil, direto, sem floreio e sem jargão de consultoria.",
  "Use APENAS os sinais fornecidos como evidência: não invente números, nomes, metas ou datas.",
  "Cada recomendação precisa citar o sinal que a sustenta e propor uma ação executável esta semana.",
  "Se a evidência for insuficiente para uma área, diga isso em vez de especular.",
].join(" ");

export function montarPromptAdvisor(sinais: AdvisorSinal[], pergunta?: string | null): string {
  const evidencias = sinais.length
    ? sinais
        .map(
          (s) => `- [${s.severidade.toUpperCase()} · ${s.area}] ${s.titulo}: ${s.evidencia}`,
        )
        .join("\n")
    : "- Nenhum sinal disponível: o workspace ainda não tem dados suficientes.";

  return [
    "Sinais medidos do workspace (fonte: Read Models 360):",
    evidencias,
    "",
    pergunta?.trim()
      ? `Pergunta do gestor: ${pergunta.trim()}`
      : "Tarefa: produza o briefing da semana para o gestor comercial.",
    "",
    "Devolva um resumo de até 3 frases, no máximo 4 recomendações priorizadas e até 3 riscos.",
  ].join("\n");
}