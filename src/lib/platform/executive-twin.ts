/**
 * SPRINT 30 — EXECUTIVE DIGITAL TWIN (ADR-033)
 *
 * Bounded context `Executive Twin`. Camada de LEITURA e leitura apenas: observa
 * a organização inteira (pipeline, pessoas, execução, conhecimento, memória,
 * automação, mercado) e devolve uma representação digital do estado da empresa.
 *
 * Regras duras (ADR-033):
 * - nunca substitui decisão humana: descreve, não decide;
 * - todo número tem janela declarada e tamanho de amostra;
 * - observação (fato medido), tendência (série histórica) e simulação (cenário
 *   hipotético) são tipos distintos e nunca aparecem misturados;
 * - simulação declara hipóteses e limitações e nunca é apresentada como previsão;
 * - sem amostra suficiente o resultado é `null` — nada é estimado;
 * - correlação observada não é causa (ADR-026); nenhuma saída afirma causalidade.
 */

export const AVISO_SIMULACAO =
  "Simulação baseada em padrões históricos observados neste workspace. Não é previsão garantida nem relação de causa e efeito.";

export const AVISO_SEM_JULGAMENTO =
  "Indicador descritivo: mostra distância em relação ao próprio histórico, sem julgar se é bom ou ruim.";

export type Natureza = "observacao" | "tendencia" | "simulacao";

/** Envelope obrigatório: todo valor sai com natureza, janela e amostra. */
export type Medida = {
  chave: string;
  label: string;
  valor: number | null;
  unidade: "quantidade" | "moeda" | "percentual" | "dias";
  natureza: Natureza;
  janela: string;
  amostra: number;
  nota: string | null;
};

export type MesAgregado = {
  /** YYYY-MM */
  mes: string;
  oportunidadesCriadas: number;
  ganhas: number;
  perdidas: number;
  valorGanho: number;
  visitas: number;
  propostas: number;
  atividades: number;
  cicloMedianoDias: number | null;
  licoes: number;
  versoesConhecimento: number;
  automacoesEntregues: number;
};

export type AreaOrganizacional =
  | "comercial"
  | "marketing"
  | "operacao"
  | "inteligencia"
  | "conhecimento";

export const areaLabels: Record<AreaOrganizacional, string> = {
  comercial: "Comercial",
  marketing: "Marketing",
  operacao: "Operação",
  inteligencia: "Inteligência",
  conhecimento: "Conhecimento",
};

export type EsforcoArea = {
  area: AreaOrganizacional;
  /** Eventos registrados no período; `null` = área sem medição disponível. */
  eventos: number | null;
  fonte: string;
};

export type EntradaTwin = {
  serie: MesAgregado[];
  esforco: EsforcoArea[];
  pipeline: {
    oportunidadesAbertas: number | null;
    pipelineTotal: number | null;
    ticketMedio: number | null;
    conversaoPercentual: number | null;
    cicloMedioDias: number | null;
  };
  pessoas: { total: number | null; novas30d: number | null; clientes: number | null };
  conhecimento: {
    playbooks: number | null;
    licoes: number | null;
    versoes: number | null;
    usos: number | null;
  };
  memoria: { decisoes: number | null; decisoesAvaliadas: number | null; campanhas: number | null };
  automacao: { regrasAtivas: number | null; entregues30d: number | null; falhas30d: number | null };
  riscos: { alertasAbertos: number | null; tarefasAtrasadas: number | null };
  mercado: { indicadoresAtualizados: number | null; regioes: number | null };
  fontesIndisponiveis: string[];
};

const arred = (v: number, casas = 2) => {
  const f = 10 ** casas;
  return Math.round(v * f) / f;
};

const soma = (v: number[]) => v.reduce((s, x) => s + x, 0);
const media = (v: number[]) => (v.length === 0 ? null : arred(soma(v) / v.length));

function desvioPadrao(v: number[]): number | null {
  if (v.length < 3) return null;
  const m = soma(v) / v.length;
  const varia = soma(v.map((x) => (x - m) ** 2)) / (v.length - 1);
  return arred(Math.sqrt(varia), 3);
}

/** Regressão linear simples: devolve inclinação por período e R². */
export function regressao(valores: number[]): { slope: number; r2: number } | null {
  const n = valores.length;
  if (n < 3) return null;
  const xs = valores.map((_, i) => i);
  const mx = soma(xs) / n;
  const my = soma(valores) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i]! - mx;
    const dy = valores[i]! - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const r2 = syy === 0 ? 0 : arred((sxy * sxy) / (sxx * syy), 3);
  return { slope: arred(slope, 3), r2 };
}

/** Pearson entre duas séries de mesmo tamanho. */
export function correlacao(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 4) return null;
  const xa = a.slice(-n);
  const xb = b.slice(-n);
  const ma = soma(xa) / n;
  const mb = soma(xb) / n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i += 1) {
    const da = xa[i]! - ma;
    const db = xb[i]! - mb;
    sab += da * db;
    saa += da * da;
    sbb += db * db;
  }
  if (saa === 0 || sbb === 0) return null;
  return arred(sab / Math.sqrt(saa * sbb), 3);
}

const janelaSerie = (serie: MesAgregado[]) =>
  serie.length === 0
    ? "sem série histórica"
    : `${serie[0]!.mes} a ${serie[serie.length - 1]!.mes} (${serie.length} meses)`;

/* ------------------------------------------------------------------ *
 * GATE 01 — Organization Snapshot
 * ------------------------------------------------------------------ */

export type Snapshot = {
  janela: string;
  medidas: Medida[];
  lacunas: string[];
  fontesIndisponiveis: string[];
  geradoEm: string;
};

/** Como está a empresa neste momento — apenas fatos medidos. */
export function organizationSnapshot(entrada: EntradaTwin, agora = new Date()): Snapshot {
  const janela = "estado atual (última leitura)";
  const obs = (
    chave: string,
    label: string,
    valor: number | null,
    unidade: Medida["unidade"],
    nota: string | null = null,
  ): Medida => ({
    chave,
    label,
    valor,
    unidade,
    natureza: "observacao",
    janela,
    amostra: valor == null ? 0 : 1,
    nota,
  });

  const medidas: Medida[] = [
    obs("oportunidades_abertas", "Oportunidades abertas", entrada.pipeline.oportunidadesAbertas, "quantidade"),
    obs("pipeline_total", "Pipeline em aberto", entrada.pipeline.pipelineTotal, "moeda"),
    obs("ticket_medio", "Ticket médio", entrada.pipeline.ticketMedio, "moeda"),
    obs("conversao", "Conversão acumulada", entrada.pipeline.conversaoPercentual, "percentual"),
    obs("ciclo", "Ciclo médio de fechamento", entrada.pipeline.cicloMedioDias, "dias"),
    obs("pessoas", "Pessoas cadastradas", entrada.pessoas.total, "quantidade"),
    obs("pessoas_30d", "Pessoas novas (30 dias)", entrada.pessoas.novas30d, "quantidade", "janela de 30 dias"),
    obs("playbooks", "Playbooks", entrada.conhecimento.playbooks, "quantidade"),
    obs("licoes", "Lições registradas", entrada.conhecimento.licoes, "quantidade"),
    obs("versoes", "Versões de conhecimento", entrada.conhecimento.versoes, "quantidade"),
    obs("reusos", "Reusos de conhecimento", entrada.conhecimento.usos, "quantidade"),
    obs("decisoes", "Decisões na memória", entrada.memoria.decisoes, "quantidade"),
    obs("decisoes_avaliadas", "Decisões já avaliadas", entrada.memoria.decisoesAvaliadas, "quantidade"),
    obs("regras_ativas", "Regras de automação ativas", entrada.automacao.regrasAtivas, "quantidade"),
    obs("automacao_entregue", "Automações entregues (30 dias)", entrada.automacao.entregues30d, "quantidade", "janela de 30 dias"),
    obs("automacao_falhas", "Automações com falha (30 dias)", entrada.automacao.falhas30d, "quantidade", "janela de 30 dias"),
    obs("alertas", "Alertas de plataforma abertos", entrada.riscos.alertasAbertos, "quantidade"),
    obs("tarefas_atrasadas", "Tarefas atrasadas", entrada.riscos.tarefasAtrasadas, "quantidade"),
    obs("mercado_regioes", "Regiões monitoradas", entrada.mercado.regioes, "quantidade"),
  ];

  const lacunas: string[] = [];
  const semValor = medidas.filter((m) => m.valor == null).map((m) => m.label);
  if (semValor.length > 0) lacunas.push(`Sem medição disponível: ${semValor.join(", ")}.`);
  if (entrada.serie.length < 3)
    lacunas.push("Série histórica com menos de 3 meses: tendências e simulações ficam indisponíveis.");
  for (const e of entrada.esforco.filter((x) => x.eventos == null))
    lacunas.push(`Área ${areaLabels[e.area]} sem esforço medido (${e.fonte}).`);

  return {
    janela,
    medidas,
    lacunas,
    fontesIndisponiveis: entrada.fontesIndisponiveis,
    geradoEm: agora.toISOString(),
  };
}

/* ------------------------------------------------------------------ *
 * GATE 02 — Organizational Pulse
 * ------------------------------------------------------------------ */

export type Tendencia = "crescimento" | "desaceleracao" | "estabilidade" | "saturacao" | "indisponivel";

export const tendenciaLabels: Record<Tendencia, string> = {
  crescimento: "Crescimento",
  desaceleracao: "Desaceleração",
  estabilidade: "Estabilidade",
  saturacao: "Saturação",
  indisponivel: "Sem série suficiente",
};

export type PulsoMetrica = {
  chave: string;
  label: string;
  tendencia: Tendencia;
  variacaoPercentual: number | null;
  slopePorMes: number | null;
  r2: number | null;
  amostra: number;
  janela: string;
  explicacao: string;
};

export type Pulso = {
  janela: string;
  metricas: PulsoMetrica[];
  resumo: Tendencia;
  limitacoes: string[];
};

const METRICAS_PULSO: { chave: string; label: string; ler: (m: MesAgregado) => number }[] = [
  { chave: "oportunidades", label: "Oportunidades criadas", ler: (m) => m.oportunidadesCriadas },
  { chave: "ganhas", label: "Oportunidades ganhas", ler: (m) => m.ganhas },
  { chave: "valor_ganho", label: "Valor ganho", ler: (m) => m.valorGanho },
  { chave: "visitas", label: "Visitas registradas", ler: (m) => m.visitas },
  { chave: "propostas", label: "Propostas", ler: (m) => m.propostas },
  { chave: "atividades", label: "Interações registradas", ler: (m) => m.atividades },
];

/** Tendência por métrica, sempre com janela declarada e R² da reta. */
export function pulsoOrganizacional(serie: MesAgregado[], meses = 12): Pulso {
  const usada = serie.slice(-meses);
  const janela = janelaSerie(usada);
  const limitacoes: string[] = [];
  if (usada.length < 3) limitacoes.push("Menos de 3 meses de série: nenhuma tendência é calculada.");
  if (usada.length < 6)
    limitacoes.push("Série curta (menos de 6 meses): tendências têm baixa estabilidade.");

  const metricas = METRICAS_PULSO.map<PulsoMetrica>((def) => {
    const valores = usada.map(def.ler);
    const reg = regressao(valores);
    const primeiraMetade = valores.slice(0, Math.floor(valores.length / 2));
    const segundaMetade = valores.slice(Math.ceil(valores.length / 2));
    const mA = media(primeiraMetade);
    const mB = media(segundaMetade);
    const variacao = mA != null && mB != null && mA !== 0 ? arred(((mB - mA) / mA) * 100, 1) : null;

    let tendencia: Tendencia = "indisponivel";
    if (reg != null && variacao != null) {
      if (variacao > 5) tendencia = "crescimento";
      else if (variacao < -5) tendencia = "desaceleracao";
      else tendencia = "estabilidade";
    }

    return {
      chave: def.chave,
      label: def.label,
      tendencia,
      variacaoPercentual: variacao,
      slopePorMes: reg?.slope ?? null,
      r2: reg?.r2 ?? null,
      amostra: valores.length,
      janela,
      explicacao:
        reg == null
          ? "Série insuficiente para calcular tendência."
          : `Comparação entre a primeira e a segunda metade da janela (${valores.length} meses), com inclinação de ${reg.slope} por mês e R² ${reg.r2}.`,
    };
  });

  // Saturação: volume de entrada cresce e conversão em ganho não acompanha.
  const oport = metricas.find((m) => m.chave === "oportunidades");
  const ganhas = metricas.find((m) => m.chave === "ganhas");
  if (
    oport?.tendencia === "crescimento" &&
    ganhas != null &&
    (ganhas.tendencia === "estabilidade" || ganhas.tendencia === "desaceleracao")
  ) {
    ganhas.tendencia = "saturacao";
    ganhas.explicacao += " Entrada cresceu sem crescimento proporcional de ganhos na mesma janela.";
  }

  const contagem = new Map<Tendencia, number>();
  for (const m of metricas) contagem.set(m.tendencia, (contagem.get(m.tendencia) ?? 0) + 1);
  let resumo: Tendencia = "indisponivel";
  let maior = 0;
  for (const [t, c] of contagem) {
    if (t === "indisponivel") continue;
    if (c > maior) {
      maior = c;
      resumo = t;
    }
  }

  return { janela, metricas, resumo, limitacoes };
}

/* ------------------------------------------------------------------ *
 * GATE 03 — Scenario Comparison
 * ------------------------------------------------------------------ */

export type ComparacaoLinha = {
  chave: string;
  label: string
  de: number | null;
  para: number | null;
  variacaoPercentual: number | null;
};

export type Comparacao = {
  mesA: string;
  mesB: string;
  disponivel: boolean;
  linhas: ComparacaoLinha[];
  limitacoes: string[];
};

const LINHAS_COMPARACAO: { chave: string; label: string; ler: (m: MesAgregado) => number | null }[] = [
  { chave: "oportunidades", label: "Oportunidades criadas", ler: (m) => m.oportunidadesCriadas },
  { chave: "ganhas", label: "Oportunidades ganhas", ler: (m) => m.ganhas },
  { chave: "conversao", label: "Conversão do mês (%)", ler: (m) => (m.oportunidadesCriadas === 0 ? null : arred((m.ganhas / m.oportunidadesCriadas) * 100, 1)) },
  { chave: "valor_ganho", label: "Valor ganho", ler: (m) => m.valorGanho },
  { chave: "ciclo", label: "Ciclo mediano (dias)", ler: (m) => m.cicloMedianoDias },
  { chave: "visitas", label: "Visitas", ler: (m) => m.visitas },
  { chave: "propostas", label: "Propostas", ler: (m) => m.propostas },
  { chave: "atividades", label: "Interações", ler: (m) => m.atividades },
  { chave: "licoes", label: "Lições registradas", ler: (m) => m.licoes },
  { chave: "versoes", label: "Versões de conhecimento", ler: (m) => m.versoesConhecimento },
  { chave: "automacoes", label: "Automações entregues", ler: (m) => m.automacoesEntregues },
];

/** Compara dois momentos declarados. Não interpreta a diferença. */
export function compararCenarios(serie: MesAgregado[], mesA: string, mesB: string): Comparacao {
  const a = serie.find((m) => m.mes === mesA) ?? null;
  const b = serie.find((m) => m.mes === mesB) ?? null;
  const limitacoes: string[] = [];
  if (a == null) limitacoes.push(`Mês ${mesA} sem dados agregados.`);
  if (b == null) limitacoes.push(`Mês ${mesB} sem dados agregados.`);
  limitacoes.push("Comparação entre dois meses isolados; não representa tendência.");

  const linhas = LINHAS_COMPARACAO.map<ComparacaoLinha>((def) => {
    const de = a ? def.ler(a) : null;
    const para = b ? def.ler(b) : null;
    return {
      chave: def.chave,
      label: def.label,
      de,
      para,
      variacaoPercentual: de != null && para != null && de !== 0 ? arred(((para - de) / de) * 100, 1) : null,
    };
  });

  return { mesA, mesB, disponivel: a != null && b != null, linhas, limitacoes };
}

/* ------------------------------------------------------------------ *
 * GATE 04 — Organizational Balance
 * ------------------------------------------------------------------ */

export type BalancoArea = {
  area: AreaOrganizacional;
  eventos: number | null;
  participacaoPercentual: number | null;
  situacao: "concentracao" | "equilibrio" | "lacuna" | "sem_medicao";
  fonte: string;
};

export type Balanco = {
  janela: string;
  areas: BalancoArea[];
  totalEventos: number;
  areasSemMedicao: AreaOrganizacional[];
  nota: string;
};

/** Distribuição de esforço registrado entre áreas. Descritivo, sem meta ideal. */
export function balancoOrganizacional(esforco: EsforcoArea[], janela = "últimos 90 dias"): Balanco {
  const medidos = esforco.filter((e) => e.eventos != null);
  const total = soma(medidos.map((e) => e.eventos!));
  const esperado = medidos.length > 0 ? 100 / medidos.length : null;

  const areas = esforco.map<BalancoArea>((e) => {
    if (e.eventos == null)
      return { area: e.area, eventos: null, participacaoPercentual: null, situacao: "sem_medicao", fonte: e.fonte };
    const part = total === 0 ? 0 : arred((e.eventos / total) * 100, 1);
    let situacao: BalancoArea["situacao"] = "equilibrio";
    if (esperado != null) {
      if (part > esperado * 1.5) situacao = "concentracao";
      else if (part < esperado * 0.5) situacao = "lacuna";
    }
    return { area: e.area, eventos: e.eventos, participacaoPercentual: part, situacao, fonte: e.fonte };
  });

  return {
    janela,
    areas,
    totalEventos: total,
    areasSemMedicao: areas.filter((a) => a.situacao === "sem_medicao").map((a) => a.area),
    nota: "Participação calculada apenas sobre áreas com eventos medidos. Concentração e lacuna são desvios em relação à média das áreas medidas, não a um alvo ideal.",
  };
}

/* ------------------------------------------------------------------ *
 * GATE 05 — Strategic Drift
 * ------------------------------------------------------------------ */

export type DesvioMetrica = {
  chave: string;
  label: string;
  ultimoValor: number | null;
  mediaHistorica: number | null;
  desvioPadrao: number | null;
  zScore: number | null;
  classificacao: "dentro_do_padrao" | "acima_do_padrao" | "abaixo_do_padrao" | "indisponivel";
  amostra: number;
};

export type DesvioEstrategico = {
  janela: string;
  mesAvaliado: string | null;
  metricas: DesvioMetrica[];
  desviosRelevantes: number;
  aviso: string;
};

/** A organização está se afastando dos próprios padrões históricos? Só evidência. */
export function desvioEstrategico(serie: MesAgregado[], meses = 12): DesvioEstrategico {
  const usada = serie.slice(-meses);
  const ultimo = usada[usada.length - 1] ?? null;
  const historico = usada.slice(0, -1);

  const metricas = METRICAS_PULSO.map<DesvioMetrica>((def) => {
    const valores = historico.map(def.ler);
    const m = media(valores);
    const sd = desvioPadrao(valores);
    const atual = ultimo ? def.ler(ultimo) : null;
    let z: number | null = null;
    if (atual != null && m != null && sd != null && sd > 0) z = arred((atual - m) / sd, 2);
    let classificacao: DesvioMetrica["classificacao"] = "indisponivel";
    if (z != null) {
      if (z > 1.5) classificacao = "acima_do_padrao";
      else if (z < -1.5) classificacao = "abaixo_do_padrao";
      else classificacao = "dentro_do_padrao";
    }
    return {
      chave: def.chave,
      label: def.label,
      ultimoValor: atual,
      mediaHistorica: m,
      desvioPadrao: sd,
      zScore: z,
      classificacao,
      amostra: valores.length,
    };
  });

  return {
    janela: janelaSerie(usada),
    mesAvaliado: ultimo?.mes ?? null,
    metricas,
    desviosRelevantes: metricas.filter((m) => m.classificacao === "acima_do_padrao" || m.classificacao === "abaixo_do_padrao").length,
    aviso: AVISO_SEM_JULGAMENTO,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 06 — Executive Simulation
 * ------------------------------------------------------------------ */

export type VariavelSimulavel = "visitas" | "propostas" | "atividades" | "oportunidades";

export const variavelLabels: Record<VariavelSimulavel, string> = {
  visitas: "Visitas registradas",
  propostas: "Propostas",
  atividades: "Interações registradas",
  oportunidades: "Oportunidades criadas",
};

const LEITOR_VARIAVEL: Record<VariavelSimulavel, (m: MesAgregado) => number> = {
  visitas: (m) => m.visitas,
  propostas: (m) => m.propostas,
  atividades: (m) => m.atividades,
  oportunidades: (m) => m.oportunidadesCriadas,
};

export type EfeitoSimulado = {
  chave: string;
  label: string;
  correlacaoHistorica: number | null;
  elasticidadeObservada: number | null;
  valorAtual: number | null;
  valorHipotetico: number | null;
  variacaoPercentual: number | null;
  confiavel: boolean;
  motivo: string;
};

export type Simulacao = {
  natureza: "simulacao";
  variavel: VariavelSimulavel;
  deltaPercentual: number;
  janela: string;
  amostra: number;
  disponivel: boolean;
  efeitos: EfeitoSimulado[];
  hipoteses: string[];
  limitacoes: string[];
  aviso: string;
};

/**
 * Cenário hipotético: se a variável X variar D%, quais indicadores historicamente
 * variaram junto? Usa elasticidade observada (regressão sobre a própria série).
 */
export function simulacaoExecutiva(
  serie: MesAgregado[],
  variavel: VariavelSimulavel,
  deltaPercentual: number,
  meses = 12,
): Simulacao {
  const usada = serie.slice(-meses);
  const base = usada.map(LEITOR_VARIAVEL[variavel]);
  const mediaBase = media(base);
  const disponivel = usada.length >= 6 && mediaBase != null && mediaBase > 0;

  const todosAlvos: { chave: string; label: string; ler: (m: MesAgregado) => number }[] = [
    { chave: "ganhas", label: "Oportunidades ganhas", ler: (m) => m.ganhas },
    { chave: "valor_ganho", label: "Valor ganho", ler: (m) => m.valorGanho },
    { chave: "propostas", label: "Propostas", ler: (m) => m.propostas },
    { chave: "atividades", label: "Interações registradas", ler: (m) => m.atividades },
  ];
  const alvos = todosAlvos.filter((a) => a.chave !== variavel);

  const efeitos = alvos.map<EfeitoSimulado>((alvo) => {
    const y = usada.map(alvo.ler);
    const r = correlacao(base, y);
    const mediaY = media(y);
    let elasticidade: number | null = null;
    if (r != null && mediaBase != null && mediaY != null && mediaBase > 0 && mediaY > 0) {
      const sdX = desvioPadrao(base);
      const sdY = desvioPadrao(y);
      if (sdX != null && sdY != null && sdX > 0) {
        const slope = r * (sdY / sdX);
        elasticidade = arred((slope * mediaBase) / mediaY, 3);
      }
    }
    const confiavel = disponivel && r != null && Math.abs(r) >= 0.5 && elasticidade != null;
    const variacao = confiavel ? arred(elasticidade! * deltaPercentual, 1) : null;
    const hipotetico = confiavel && mediaY != null ? arred(mediaY * (1 + variacao! / 100), 2) : null;
    return {
      chave: alvo.chave,
      label: alvo.label,
      correlacaoHistorica: r,
      elasticidadeObservada: elasticidade,
      valorAtual: mediaY,
      valorHipotetico: hipotetico,
      variacaoPercentual: variacao,
      confiavel,
      motivo: !disponivel
        ? "Série com menos de 6 meses ou variável sem volume: cenário não calculado."
        : r == null
          ? "Sem correlação calculável na janela."
          : Math.abs(r) < 0.5
            ? `Correlação histórica fraca (r = ${r}): associação insuficiente para projetar cenário.`
            : `Associação histórica observada (r = ${r}) na janela declarada.`,
    };
  });

  return {
    natureza: "simulacao",
    variavel,
    deltaPercentual,
    janela: janelaSerie(usada),
    amostra: usada.length,
    disponivel,
    efeitos,
    hipoteses: [
      `A variação de ${deltaPercentual}% em "${variavelLabels[variavel]}" acontece isoladamente, mantendo o restante da operação como está.`,
      "As relações observadas nos últimos meses continuam válidas no período simulado.",
      "O registro de dados segue o mesmo padrão de preenchimento da janela histórica.",
    ],
    limitacoes: [
      "Cenário calculado sobre associação estatística, não sobre relação de causa e efeito (ADR-026).",
      "Sazonalidade, mudanças de equipe, preço e mercado não estão isolados.",
      "Indicadores com correlação histórica fraca são apresentados sem cenário.",
    ],
    aviso: AVISO_SIMULACAO,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 07 — Executive Narrative
 * ------------------------------------------------------------------ */

export type ParagrafoNarrativa = {
  titulo: string;
  natureza: Natureza;
  texto: string;
  fontes: string[];
};

export type Narrativa = {
  janela: string;
  paragrafos: ParagrafoNarrativa[];
  pendencias: string[];
  geradoEm: string;
};

const fmt = (v: number | null, sufixo = "") => (v == null ? "sem medição" : `${v}${sufixo}`);

/** Relatório executivo em texto, montado sobre fatos já medidos. Sem causalidade. */
export function narrativaExecutiva(
  entrada: EntradaTwin,
  args: { snapshot: Snapshot; pulso: Pulso; balanco: Balanco; desvio: DesvioEstrategico },
  agora = new Date(),
): Narrativa {
  const { snapshot, pulso, balanco, desvio } = args;
  const paragrafos: ParagrafoNarrativa[] = [];

  const m = (chave: string) => snapshot.medidas.find((x) => x.chave === chave)?.valor ?? null;

  paragrafos.push({
    titulo: "Estado atual",
    natureza: "observacao",
    texto: `A operação registra ${fmt(m("oportunidades_abertas"))} oportunidade(s) em aberto, com pipeline de ${fmt(m("pipeline_total"))} e ticket médio de ${fmt(m("ticket_medio"))}. A conversão acumulada é de ${fmt(m("conversao"), "%")} e o ciclo médio de fechamento, ${fmt(m("ciclo"), " dias")}. A base tem ${fmt(m("pessoas"))} pessoa(s), com ${fmt(m("pessoas_30d"))} entrada(s) nos últimos 30 dias.`,
    fontes: ["executive_360", "opportunities", "people"],
  });

  paragrafos.push({
    titulo: "Tendência da janela",
    natureza: "tendencia",
    texto:
      pulso.resumo === "indisponivel"
        ? `Não há série histórica suficiente para descrever tendência (${pulso.janela}).`
        : `Na janela ${pulso.janela}, o comportamento predominante é ${tendenciaLabels[pulso.resumo].toLowerCase()}. ${pulso.metricas
            .filter((x) => x.tendencia !== "indisponivel")
            .map((x) => `${x.label}: ${tendenciaLabels[x.tendencia].toLowerCase()} (${fmt(x.variacaoPercentual, "%")})`)
            .join("; ")}.`,
    fontes: ["série mensal agregada"],
  });

  paragrafos.push({
    titulo: "Distribuição de esforço",
    natureza: "observacao",
    texto: `Na janela ${balanco.janela}, foram registrados ${balanco.totalEventos} evento(s) nas áreas medidas. ${balanco.areas
      .filter((a) => a.participacaoPercentual != null)
      .map((a) => `${areaLabels[a.area]}: ${a.participacaoPercentual}%`)
      .join("; ")}.${balanco.areasSemMedicao.length > 0 ? ` Áreas sem esforço medido: ${balanco.areasSemMedicao.map((a) => areaLabels[a]).join(", ")}.` : ""}`,
    fontes: ["activities", "automation", "memory", "org_knowledge_*"],
  });

  const relevantes = desvio.metricas.filter((x) => x.classificacao === "acima_do_padrao" || x.classificacao === "abaixo_do_padrao");
  paragrafos.push({
    titulo: "Distância do próprio histórico",
    natureza: "tendencia",
    texto:
      desvio.mesAvaliado == null
        ? "Sem mês fechado para comparar com o histórico."
        : relevantes.length === 0
          ? `Em ${desvio.mesAvaliado}, nenhuma métrica se afastou mais de 1,5 desvio-padrão da média histórica da janela.`
          : `Em ${desvio.mesAvaliado}, ${relevantes
              .map((x) => `${x.label} ficou ${x.classificacao === "acima_do_padrao" ? "acima" : "abaixo"} do padrão (z = ${x.zScore})`)
              .join("; ")}. ${AVISO_SEM_JULGAMENTO}`,
    fontes: ["série mensal agregada"],
  });

  paragrafos.push({
    titulo: "Conhecimento e memória",
    natureza: "observacao",
    texto: `A empresa mantém ${fmt(m("playbooks"))} playbook(s), ${fmt(m("licoes"))} lição(ões) e ${fmt(m("versoes"))} versão(ões) de conhecimento, com ${fmt(m("reusos"))} reuso(s) registrado(s). A memória corporativa guarda ${fmt(m("decisoes"))} decisão(ões), das quais ${fmt(m("decisoes_avaliadas"))} já foram avaliadas.`,
    fontes: ["memory_*", "org_knowledge_versions", "org_knowledge_usage"],
  });

  paragrafos.push({
    titulo: "Execução e risco",
    natureza: "observacao",
    texto: `Há ${fmt(m("regras_ativas"))} regra(s) de automação ativa(s), com ${fmt(m("automacao_entregue"))} entrega(s) e ${fmt(m("automacao_falhas"))} falha(s) nos últimos 30 dias. Estão abertos ${fmt(m("alertas"))} alerta(s) de plataforma e ${fmt(m("tarefas_atrasadas"))} tarefa(s) atrasada(s).`,
    fontes: ["automation_rules", "outbox_events", "platform_alerts", "tasks"],
  });

  const pendencias = [...snapshot.lacunas, ...pulso.limitacoes];
  if (entrada.fontesIndisponiveis.length > 0)
    pendencias.push(`Fontes indisponíveis nesta leitura: ${entrada.fontesIndisponiveis.join(", ")}.`);

  return { janela: pulso.janela, paragrafos, pendencias, geradoEm: agora.toISOString() };
}

/* ------------------------------------------------------------------ *
 * Twin completo (GATES 01–07)
 * ------------------------------------------------------------------ */

export type ExecutiveTwin = {
  snapshot: Snapshot;
  pulso: Pulso;
  balanco: Balanco;
  desvio: DesvioEstrategico;
  narrativa: Narrativa;
  meses: string[];
  comparacaoPadrao: Comparacao | null;
  geradoEm: string;
};

export function montarTwin(entrada: EntradaTwin, agora = new Date()): ExecutiveTwin {
  const snapshot = organizationSnapshot(entrada, agora);
  const pulso = pulsoOrganizacional(entrada.serie);
  const balanco = balancoOrganizacional(entrada.esforco);
  const desvio = desvioEstrategico(entrada.serie);
  const narrativa = narrativaExecutiva(entrada, { snapshot, pulso, balanco, desvio }, agora);
  const meses = entrada.serie.map((m) => m.mes);
  const comparacaoPadrao =
    meses.length >= 2 ? compararCenarios(entrada.serie, meses[0]!, meses[meses.length - 1]!) : null;

  return { snapshot, pulso, balanco, desvio, narrativa, meses, comparacaoPadrao, geradoEm: agora.toISOString() };
}
