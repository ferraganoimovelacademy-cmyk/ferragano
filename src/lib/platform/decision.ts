/**
 * SPRINT 08 — Decision Engine (Rules Engine puro, client-safe).
 *
 * Regra do contexto: aqui não há acesso a dados nem IA. Existem REGRAS.
 * A IA (sprints futuras) consulta este motor — nunca decide sozinha.
 *
 * Camadas implementadas:
 *  1. Recommendation Engine  -> `recomendarUnidades`
 *  2. Opportunity Score      -> `calcularOpportunityScore`
 *  3. Next Best Action       -> `proximaMelhorAcao`
 *  4. Unit Match             -> `avaliarUnidade`
 *  5. Explainability         -> toda saída carrega `motivos` / `bloqueios`
 */

export type PerfilCompra = "moradia" | "investimento" | "misto";

export const PERFIS_COMPRA = ["moradia", "investimento", "misto"] as const;

export const perfilCompraLabels: Record<PerfilCompra, string> = {
  moradia: "Moradia",
  investimento: "Investimento",
  misto: "Misto",
};

/** Teto de renda do Minha Casa Minha Vida considerado pela política comercial. */
export const MCMV_RENDA_TETO = 8000;
/** Teto de valor de imóvel aceito no programa. */
export const MCMV_VALOR_TETO = 350000;
/** Comprometimento máximo de renda com a parcela. */
export const COMPROMETIMENTO_MAX = 0.3;

export type Qualificacao = {
  renda_mensal: number | null;
  entrada_disponivel: number | null;
  usa_fgts: boolean;
  fgts_valor: number | null;
  perfil: PerfilCompra;
  bairros_desejados: string[];
  cidade: string | null;
  uf: string | null;
  dormitorios_min: number | null;
  vagas_min: number | null;
  area_min: number | null;
  preco_teto: number | null;
  prazo_meses: number | null;
  banco_preferido: string | null;
  restricao_credito: boolean;
  primeiro_imovel: boolean;
};

export type UnidadeCandidata = {
  id: string;
  identificador: string;
  status: string;
  preco: number | null;
  dormitorios: number | null;
  suites: number | null;
  vagas: number | null;
  varanda: boolean | null;
  andar: number | null;
  area_privativa: number | null;
  comissao_percentual: number | null;
  score_liquidez: number | null;
  campanha: string | null;
  empreendimentoId: string;
  empreendimentoNome: string;
  cidade: string | null;
  bairro: string | null;
  segmento: string | null;
  status_obra: string | null;
};

export type Motivo = { texto: string; peso: number };

export type UnitMatch = {
  unidade: UnidadeCandidata;
  aderencia: number;
  elegivelMcmv: boolean;
  motivos: Motivo[];
  alertas: string[];
};

export type CapacidadeFinanceira = {
  parcelaMaxima: number;
  recursosProprios: number;
  capacidadeTotal: number;
  tetoAplicado: number;
  prazoMeses: number;
  completa: boolean;
};

const normalizar = (v: string | null | undefined) =>
  (v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/**
 * Capacidade de compra estimada: entrada + FGTS + (parcela máxima × prazo).
 * Determinístico e explicável — nada de caixa-preta.
 */
export function calcularCapacidade(q: Qualificacao): CapacidadeFinanceira {
  const prazoMeses = q.prazo_meses && q.prazo_meses > 0 ? q.prazo_meses : 360;
  const parcelaMaxima = (q.renda_mensal ?? 0) * COMPROMETIMENTO_MAX;
  const recursosProprios = (q.entrada_disponivel ?? 0) + (q.usa_fgts ? (q.fgts_valor ?? 0) : 0);
  const capacidadeTotal = recursosProprios + parcelaMaxima * prazoMeses;
  const tetoAplicado =
    q.preco_teto && q.preco_teto > 0 ? Math.min(q.preco_teto, capacidadeTotal || q.preco_teto) : capacidadeTotal;

  return {
    parcelaMaxima,
    recursosProprios,
    capacidadeTotal,
    tetoAplicado,
    prazoMeses,
    completa: Boolean(q.renda_mensal || q.preco_teto),
  };
}

export function elegivelMcmv(q: Qualificacao, preco: number | null): boolean {
  if (q.restricao_credito) return false;
  if (!q.primeiro_imovel) return false;
  if ((q.renda_mensal ?? Infinity) > MCMV_RENDA_TETO) return false;
  if (preco != null && preco > MCMV_VALOR_TETO) return false;
  return true;
}

/**
 * Regras duras — o que NUNCA pode ser recomendado.
 * Retorna a lista de bloqueios; vazia significa unidade elegível.
 */
export function bloqueiosDaUnidade(
  q: Qualificacao,
  u: UnidadeCandidata,
  cap: CapacidadeFinanceira,
): string[] {
  const bloqueios: string[] = [];

  if (u.status !== "disponivel") bloqueios.push("Unidade indisponível no estoque");
  if (u.preco == null) bloqueios.push("Unidade sem preço definido");
  if (u.preco != null && cap.tetoAplicado > 0 && u.preco > cap.tetoAplicado)
    bloqueios.push("Acima da capacidade financeira estimada");
  if (q.dormitorios_min && (u.dormitorios ?? 0) < q.dormitorios_min)
    bloqueios.push(`Menos de ${q.dormitorios_min} dormitório(s)`);
  if (q.vagas_min && (u.vagas ?? 0) < q.vagas_min) bloqueios.push(`Menos de ${q.vagas_min} vaga(s)`);
  if (q.area_min && (u.area_privativa ?? 0) < q.area_min)
    bloqueios.push(`Área menor que ${q.area_min} m²`);

  return bloqueios;
}

/** Camada 4 — Unit Match: índice de aderência 0-100 com explicação. */
export function avaliarUnidade(
  q: Qualificacao,
  u: UnidadeCandidata,
  cap: CapacidadeFinanceira,
): UnitMatch {
  const motivos: Motivo[] = [];
  const alertas: string[] = [];
  let score = 40;

  // Orçamento (até 30)
  if (u.preco != null && cap.tetoAplicado > 0) {
    const folga = (cap.tetoAplicado - u.preco) / cap.tetoAplicado;
    if (folga >= 0.25) {
      score += 30;
      motivos.push({ texto: "Bem dentro do orçamento estimado", peso: 30 });
    } else if (folga >= 0.05) {
      score += 22;
      motivos.push({ texto: "Dentro do orçamento estimado", peso: 22 });
    } else if (folga >= 0) {
      score += 12;
      motivos.push({ texto: "No limite do orçamento estimado", peso: 12 });
      alertas.push("Margem financeira apertada — confirmar entrada.");
    }
  }

  // Dormitórios e vagas (até 20)
  if (q.dormitorios_min && (u.dormitorios ?? 0) >= q.dormitorios_min) {
    score += 12;
    motivos.push({ texto: `Atende ${u.dormitorios} dormitório(s) desejado(s)`, peso: 12 });
  }
  if (q.vagas_min && (u.vagas ?? 0) >= q.vagas_min) {
    score += 8;
    motivos.push({ texto: `Possui ${u.vagas} vaga(s)`, peso: 8 });
  }

  // Localização (até 15)
  const bairros = q.bairros_desejados.map(normalizar).filter(Boolean);
  if (bairros.length && bairros.includes(normalizar(u.bairro))) {
    score += 15;
    motivos.push({ texto: `No bairro desejado (${u.bairro})`, peso: 15 });
  } else if (q.cidade && normalizar(q.cidade) === normalizar(u.cidade)) {
    score += 7;
    motivos.push({ texto: `Na cidade desejada (${u.cidade})`, peso: 7 });
  } else if (bairros.length) {
    alertas.push("Fora dos bairros informados pelo cliente.");
  }

  // Perfil (até 15)
  if (q.perfil === "investimento" || q.perfil === "misto") {
    const liquidez = u.score_liquidez ?? 50;
    if (liquidez >= 70) {
      score += 12;
      motivos.push({ texto: "Alta liquidez para revenda", peso: 12 });
    } else if (liquidez >= 50) {
      score += 6;
      motivos.push({ texto: "Liquidez média", peso: 6 });
    }
    if ((u.comissao_percentual ?? 0) >= 5) {
      score += 3;
      motivos.push({ texto: "Comissão acima da média nesta campanha", peso: 3 });
    }
  } else {
    if (u.varanda) {
      score += 5;
      motivos.push({ texto: "Possui varanda", peso: 5 });
    }
    if ((u.suites ?? 0) >= 1) {
      score += 5;
      motivos.push({ texto: `${u.suites} suíte(s)`, peso: 5 });
    }
    if ((u.andar ?? 0) >= 4) {
      score += 3;
      motivos.push({ texto: "Andar alto", peso: 3 });
    }
  }

  // Programa habitacional e campanha (até 10)
  const mcmv = elegivelMcmv(q, u.preco);
  if (mcmv) {
    score += 7;
    motivos.push({ texto: "Elegível ao Minha Casa Minha Vida", peso: 7 });
  }
  if (u.campanha) {
    score += 3;
    motivos.push({ texto: `Em campanha: ${u.campanha}`, peso: 3 });
  }

  if (q.restricao_credito) alertas.push("Cliente com restrição de crédito declarada.");
  if (!cap.completa) alertas.push("Qualificação financeira incompleta — score parcial.");

  return {
    unidade: u,
    aderencia: Math.max(0, Math.min(100, Math.round(score))),
    elegivelMcmv: mcmv,
    motivos: motivos.sort((a, b) => b.peso - a.peso),
    alertas,
  };
}

/** Camada 1 — lista ranqueada, já sem o que as regras duras proíbem. */
export function recomendarUnidades(
  q: Qualificacao,
  unidades: UnidadeCandidata[],
  limite = 12,
): { recomendadas: UnitMatch[]; descartadas: { unidade: UnidadeCandidata; bloqueios: string[] }[] } {
  const cap = calcularCapacidade(q);
  const recomendadas: UnitMatch[] = [];
  const descartadas: { unidade: UnidadeCandidata; bloqueios: string[] }[] = [];

  for (const u of unidades) {
    const bloqueios = bloqueiosDaUnidade(q, u, cap);
    if (bloqueios.length) {
      descartadas.push({ unidade: u, bloqueios });
      continue;
    }
    recomendadas.push(avaliarUnidade(q, u, cap));
  }

  recomendadas.sort((a, b) => b.aderencia - a.aderencia);
  return { recomendadas: recomendadas.slice(0, limite), descartadas: descartadas.slice(0, 20) };
}

/* ------------------------------------------------------------------ */
/* Camada 2 — Opportunity Score                                        */
/* ------------------------------------------------------------------ */

export type SinaisOportunidade = {
  interacoes30d: number;
  diasSemInteracao: number | null;
  visitasRealizadas: number;
  propostasEnviadas: number;
  propostaAceita: boolean;
  respostaCliente: boolean;
  documentosEntregues: number;
  qualificacaoCompleta: boolean;
  estagio: string;
};

export type ScoreCalculado = { score: number; fatores: Motivo[] };

export function calcularOpportunityScore(s: SinaisOportunidade): ScoreCalculado {
  const fatores: Motivo[] = [];
  let score = 20;

  const freq = Math.min(s.interacoes30d, 6) * 3;
  if (freq > 0) {
    score += freq;
    fatores.push({ texto: `${s.interacoes30d} interação(ões) nos últimos 30 dias`, peso: freq });
  }

  if (s.diasSemInteracao != null) {
    if (s.diasSemInteracao <= 3) {
      score += 10;
      fatores.push({ texto: "Contato recente (até 3 dias)", peso: 10 });
    } else if (s.diasSemInteracao > 14) {
      const perda = s.diasSemInteracao > 30 ? -25 : -12;
      score += perda;
      fatores.push({ texto: `${s.diasSemInteracao} dias sem interação`, peso: perda });
    }
  } else {
    score -= 10;
    fatores.push({ texto: "Nenhuma interação registrada", peso: -10 });
  }

  if (s.visitasRealizadas > 0) {
    const p = Math.min(s.visitasRealizadas, 3) * 8;
    score += p;
    fatores.push({ texto: `${s.visitasRealizadas} visita(s) realizada(s)`, peso: p });
  }

  if (s.propostasEnviadas > 0) {
    score += 15;
    fatores.push({ texto: "Proposta enviada", peso: 15 });
  }
  if (s.propostaAceita) {
    score += 15;
    fatores.push({ texto: "Proposta aceita", peso: 15 });
  }
  if (s.respostaCliente) {
    score += 8;
    fatores.push({ texto: "Cliente respondeu ao último contato", peso: 8 });
  }
  if (s.documentosEntregues > 0) {
    const p = Math.min(s.documentosEntregues, 3) * 5;
    score += p;
    fatores.push({ texto: `${s.documentosEntregues} documento(s) entregue(s)`, peso: p });
  }
  if (s.qualificacaoCompleta) {
    score += 7;
    fatores.push({ texto: "Qualificação financeira preenchida", peso: 7 });
  } else {
    score -= 5;
    fatores.push({ texto: "Sem qualificação financeira", peso: -5 });
  }

  if (s.estagio === "perdido") score = Math.min(score, 10);
  if (s.estagio === "fechado") score = 100;

  return { score: Math.max(0, Math.min(100, Math.round(score))), fatores: fatores.sort((a, b) => b.peso - a.peso) };
}

export function temperaturaPorScore(score: number): "frio" | "morno" | "quente" {
  if (score >= 70) return "quente";
  if (score >= 40) return "morno";
  return "frio";
}

/* ------------------------------------------------------------------ */
/* Camada 3 — Next Best Action                                         */
/* ------------------------------------------------------------------ */

export type AcaoRecomendada = {
  acao:
    | "ligar"
    | "reengajar"
    | "agendar_visita"
    | "solicitar_documentos"
    | "apresentar_unidades"
    | "enviar_proposta"
    | "cobrar_resposta"
    | "fechar_contrato"
    | "qualificar";
  titulo: string;
  motivo: string;
  prioridade: "baixa" | "media" | "alta" | "urgente";
  icone: string;
};

const ACOES: Record<AcaoRecomendada["acao"], { titulo: string; icone: string }> = {
  ligar: { titulo: "Ligar para o cliente", icone: "call" },
  reengajar: { titulo: "Reengajar o cliente", icone: "restart_alt" },
  agendar_visita: { titulo: "Agendar visita", icone: "event" },
  solicitar_documentos: { titulo: "Solicitar documentação", icone: "description" },
  apresentar_unidades: { titulo: "Apresentar unidades recomendadas", icone: "apartment" },
  enviar_proposta: { titulo: "Enviar proposta", icone: "request_quote" },
  cobrar_resposta: { titulo: "Cobrar retorno da proposta", icone: "mark_email_unread" },
  fechar_contrato: { titulo: "Encaminhar contrato", icone: "handshake" },
  qualificar: { titulo: "Qualificar o cliente", icone: "fact_check" },
};

const montar = (
  acao: AcaoRecomendada["acao"],
  motivo: string,
  prioridade: AcaoRecomendada["prioridade"],
): AcaoRecomendada => ({ acao, motivo, prioridade, ...ACOES[acao] });

/**
 * Regras ordenadas por urgência de negócio. A primeira que casar vence,
 * mas devolvemos até 3 para o corretor ter alternativa.
 */
export function proximaMelhorAcao(
  s: SinaisOportunidade,
  contexto: { temQualificacao: boolean; unidadesRecomendadas: number; estagioTipo?: string },
): AcaoRecomendada[] {
  const acoes: AcaoRecomendada[] = [];

  if (s.estagio === "perdido")
    return [montar("reengajar", "Oportunidade perdida — vale uma tentativa de reengajamento.", "baixa")];
  if (s.estagio === "fechado")
    return [montar("fechar_contrato", "Negócio ganho — acompanhe a assinatura e o pós-venda.", "media")];

  if (s.diasSemInteracao != null && s.diasSemInteracao > 14)
    acoes.push(
      montar("reengajar", `${s.diasSemInteracao} dias sem qualquer interação registrada.`, "urgente"),
    );

  if (!contexto.temQualificacao)
    acoes.push(
      montar("qualificar", "Sem renda, entrada e preferências não há recomendação confiável.", "alta"),
    );

  if (s.propostasEnviadas > 0 && !s.propostaAceita && !s.respostaCliente)
    acoes.push(montar("cobrar_resposta", "Proposta enviada e ainda sem retorno do cliente.", "alta"));

  if (s.propostaAceita && s.documentosEntregues === 0)
    acoes.push(
      montar("solicitar_documentos", "Proposta aceita, mas a documentação ainda não chegou.", "urgente"),
    );

  if (s.visitasRealizadas > 0 && s.propostasEnviadas === 0)
    acoes.push(montar("enviar_proposta", "Cliente já visitou e não recebeu proposta.", "alta"));

  if (contexto.temQualificacao && s.visitasRealizadas === 0 && contexto.unidadesRecomendadas > 0)
    acoes.push(
      montar(
        "agendar_visita",
        `${contexto.unidadesRecomendadas} unidade(s) aderente(s) e nenhuma visita realizada.`,
        "alta",
      ),
    );

  if (contexto.unidadesRecomendadas > 0 && s.interacoes30d === 0)
    acoes.push(montar("apresentar_unidades", "Há unidades aderentes ainda não apresentadas.", "media"));

  if (!acoes.length)
    acoes.push(montar("ligar", "Manter cadência de contato para não esfriar a oportunidade.", "media"));

  return acoes.slice(0, 3);
}

export const prioridadeCores: Record<AcaoRecomendada["prioridade"], string> = {
  baixa: "text-muted-foreground",
  media: "text-sky-600 dark:text-sky-400",
  alta: "text-amber-600 dark:text-amber-400",
  urgente: "text-rose-600 dark:text-rose-400",
};

export function aderenciaLabel(score: number): { label: string; classe: string } {
  if (score >= 80) return { label: "Aderência alta", classe: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 60) return { label: "Aderência média", classe: "text-amber-600 dark:text-amber-400" };
  return { label: "Aderência baixa", classe: "text-muted-foreground" };
}
