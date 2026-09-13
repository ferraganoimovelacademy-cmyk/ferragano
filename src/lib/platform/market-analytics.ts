/**
 * SPRINT 25.2 — CORRELATION ENGINE (bounded context `Market Analytics`).
 *
 * Camada pura e determinística. Mede relação temporal entre série externa
 * (contexto Market) e série interna do workspace (Read Models / transacional).
 *
 * Regras duras (ADR-025):
 * - a plataforma NUNCA afirma causa: devolve coeficiente, amostra e confiança;
 * - abaixo da amostra mínima não existe leitura: devolve "sem evidência";
 * - toda conclusão nasce com base `evidencia_historica` — histórico deste
 *   workspace, não regra de negócio e não previsão de modelo;
 * - correlação de nível é confrontada com correlação de variação: quando só a
 *   de nível sobrevive, a leitura é marcada como possível tendência comum.
 */

export type OrigemSerie = "externo" | "interno";

export type PontoMensal = {
  /** Competência no formato YYYY-MM-01. */
  referencia: string;
  valor: number;
};

export type SerieMensal = {
  chave: string;
  nome: string;
  unidade: string;
  origem: OrigemSerie;
  pontos: PontoMensal[];
};

export type ForcaCorrelacao = "sem_evidencia" | "fraca" | "moderada" | "forte";

export const forcaLabels: Record<ForcaCorrelacao, string> = {
  sem_evidencia: "Sem evidência",
  fraca: "Correlação fraca",
  moderada: "Correlação moderada",
  forte: "Correlação forte",
};

export type DirecaoCorrelacao = "positiva" | "negativa" | "indefinida";

export const direcaoCorrelacaoLabels: Record<DirecaoCorrelacao, string> = {
  positiva: "Andam juntas",
  negativa: "Andam em sentidos opostos",
  indefinida: "Sem direção medida",
};

/** Defasagens avaliadas: 0, 30, 60 e 90 dias (em competências mensais). */
export const LAGS_MESES = [0, 1, 2, 3] as const;
export type LagMeses = (typeof LAGS_MESES)[number];

/** Amostra mínima para emitir leitura: 12 competências pareadas. */
export const AMOSTRA_MINIMA = 12;

export type LeituraCorrelacao = {
  lagMeses: LagMeses;
  lagDias: number;
  /** Pearson sobre o nível das séries. */
  coeficiente: number | null;
  /** Pearson sobre a variação mês a mês (controle de tendência). */
  coeficienteVariacao: number | null;
  determinacao: number | null;
  amostra: number;
  pValor: number | null;
  confiancaPct: number | null;
  /** IC95% do coeficiente (Fisher z). null quando não há coeficiente. */
  icInferior: number | null;
  icSuperior: number | null;
  forca: ForcaCorrelacao;
  direcao: DirecaoCorrelacao;
  /** Variação % média da série interna por 1 unidade da série externa. */
  elasticidade: number | null;
  /** Nível correlaciona, variação não: pode ser tendência comum, não relação. */
  alertaTendencia: boolean;
  motivoAusencia?: string;
};

export type Correlacao = {
  chave: string;
  externo: { chave: string; nome: string; unidade: string };
  interno: { chave: string; nome: string; unidade: string };
  /** Toda leitura desta camada nasce do histórico do próprio workspace. */
  base: "evidencia_historica";
  janelaMeses: number;
  leituras: LeituraCorrelacao[];
  /** Melhor defasagem com evidência; null quando nenhuma tem. */
  melhor: LeituraCorrelacao | null;
  narrativa: string;
};

export type MarketAnalytics = {
  correlacoes: Correlacao[];
  paresAvaliados: number;
  paresComEvidencia: number;
  janelaMeses: number;
  /** Menor amostra pareada encontrada, para dimensionar a confiança global. */
  amostraMinima: number;
  geradoEm: string;
};

/* ------------------------------------------------------------------ *
 * Estatística
 * ------------------------------------------------------------------ */

const round = (v: number, casas = 2) => {
  const f = 10 ** casas;
  const r = Math.round(v * f) / f;
  return r === 0 ? 0 : r;
};

const media = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

/** Pearson. Devolve null quando não há variação em uma das séries. */
export function pearson(x: number[], y: number[]): number | null {
  const n = Math.min(x.length, y.length);
  if (n < 3) return null;
  const mx = media(x.slice(0, n));
  const my = media(y.slice(0, n));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = (x[i] as number) - mx;
    const dy = (y[i] as number) - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return round(sxy / Math.sqrt(sxx * syy), 4);
}

/** Regressão simples: inclinação de y sobre x. */
export function inclinacao(x: number[], y: number[]): number | null {
  const n = Math.min(x.length, y.length);
  if (n < 3) return null;
  const mx = media(x.slice(0, n));
  const my = media(y.slice(0, n));
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = (x[i] as number) - mx;
    sxy += dx * ((y[i] as number) - my);
    sxx += dx * dx;
  }
  if (sxx === 0) return null;
  return sxy / sxx;
}

function logGama(z: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j += 1) {
    y += 1;
    ser += (c[j] as number) / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betaContinuada(a: number, b: number, x: number): number {
  const eps = 3e-12;
  const fpmin = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

function betaIncompleta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGama(a + b) - logGama(a) - logGama(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betaContinuada(a, b, x)) / a;
  return 1 - (bt * betaContinuada(b, a, 1 - x)) / b;
}

/** p-valor bicaudal do teste t de significância de Pearson. */
export function pValorPearson(r: number, n: number): number | null {
  if (n < 3) return null;
  if (Math.abs(r) >= 1) return 0;
  const gl = n - 2;
  const t = Math.abs(r) * Math.sqrt(gl / (1 - r * r));
  const p = betaIncompleta(gl / 2, 0.5, gl / (gl + t * t));
  return round(Math.min(1, Math.max(0, p)), 6);
}

/* ------------------------------------------------------------------ *
 * Pareamento por competência e defasagem
 * ------------------------------------------------------------------ */

/**
 * Intervalo de confiança de 95% do coeficiente de Pearson pela transformação
 * z de Fisher. Correlação instável tem intervalo largo — o gestor vê isso.
 */
export function intervaloConfiancaPearson(
  r: number,
  n: number,
): { inferior: number; superior: number } | null {
  if (n < 4 || Math.abs(r) >= 1) return null;
  const z = 0.5 * Math.log((1 + r) / (1 - r));
  const erro = 1.959964 / Math.sqrt(n - 3);
  const inv = (v: number) => Math.tanh(v);
  return { inferior: round(inv(z - erro), 4), superior: round(inv(z + erro), 4) };
}

const chaveCompetencia = (referencia: string) => referencia.slice(0, 7);

/** Desloca a competência em `meses` (positivo = para frente no calendário). */
export function deslocarCompetencia(referencia: string, meses: number): string {
  const ano = Number(referencia.slice(0, 4));
  const mes = Number(referencia.slice(5, 7));
  const total = ano * 12 + (mes - 1) + meses;
  const novoAno = Math.floor(total / 12);
  const novoMes = (total % 12) + 1;
  return `${novoAno}-${String(novoMes).padStart(2, "0")}`;
}

/**
 * Pareia externo(t) com interno(t + lag): o efeito interno é observado depois
 * do movimento de mercado, nunca antes.
 */
export function parear(
  externa: SerieMensal,
  interna: SerieMensal,
  lagMeses: number,
): { referencia: string; externo: number; interno: number }[] {
  const internos = new Map<string, number>();
  for (const p of interna.pontos) internos.set(chaveCompetencia(p.referencia), p.valor);

  const pares: { referencia: string; externo: number; interno: number }[] = [];
  for (const p of externa.pontos) {
    const competencia = chaveCompetencia(p.referencia);
    const alvo = deslocarCompetencia(competencia, lagMeses);
    const interno = internos.get(alvo);
    if (interno == null || !Number.isFinite(p.valor) || !Number.isFinite(interno)) continue;
    pares.push({ referencia: competencia, externo: p.valor, interno });
  }
  return pares.sort((a, b) => (a.referencia < b.referencia ? -1 : 1));
}

const diferencas = (v: number[]) => v.slice(1).map((atual, i) => atual - (v[i] as number));

function classificar(r: number | null, p: number | null, amostra: number): ForcaCorrelacao {
  if (r == null || p == null || amostra < AMOSTRA_MINIMA) return "sem_evidencia";
  if (p > 0.05) return "sem_evidencia";
  const abs = Math.abs(r);
  if (abs < 0.3) return "fraca";
  if (abs < 0.7) return "moderada";
  return "forte";
}

/** Mede uma defasagem específica. Sem amostra, não conclui. */
export function medirLag(
  externa: SerieMensal,
  interna: SerieMensal,
  lagMeses: LagMeses,
): LeituraCorrelacao {
  const pares = parear(externa, interna, lagMeses);
  const vazio: LeituraCorrelacao = {
    lagMeses,
    lagDias: lagMeses * 30,
    coeficiente: null,
    coeficienteVariacao: null,
    determinacao: null,
    amostra: pares.length,
    pValor: null,
    confiancaPct: null,
    icInferior: null,
    icSuperior: null,
    forca: "sem_evidencia",
    direcao: "indefinida",
    elasticidade: null,
    alertaTendencia: false,
  };

  if (pares.length < AMOSTRA_MINIMA) {
    return {
      ...vazio,
      motivoAusencia: `Amostra de ${pares.length} competências pareadas: mínimo de ${AMOSTRA_MINIMA} para medir correlação.`,
    };
  }

  const x = pares.map((p) => p.externo);
  const y = pares.map((p) => p.interno);
  const r = pearson(x, y);
  const p = r == null ? null : pValorPearson(r, pares.length);
  const forca = classificar(r, p, pares.length);

  if (r == null) {
    return {
      ...vazio,
      motivoAusencia: "Uma das séries não varia na janela: correlação indefinida.",
    };
  }

  const rVariacao = pearson(diferencas(x), diferencas(y));
  const pVariacao = rVariacao == null ? null : pValorPearson(rVariacao, pares.length - 1);
  const b = inclinacao(x, y);
  const mediaInterna = media(y);
  const elasticidade = b == null || mediaInterna === 0 ? null : round((b / mediaInterna) * 100, 2);
  const ic = intervaloConfiancaPearson(r, pares.length);

  return {
    lagMeses,
    lagDias: lagMeses * 30,
    coeficiente: r,
    coeficienteVariacao: rVariacao,
    determinacao: round(r * r, 4),
    amostra: pares.length,
    pValor: p,
    confiancaPct: p == null ? null : round((1 - p) * 100, 1),
    icInferior: ic?.inferior ?? null,
    icSuperior: ic?.superior ?? null,
    forca,
    direcao: forca === "sem_evidencia" ? "indefinida" : r > 0 ? "positiva" : "negativa",
    elasticidade,
    alertaTendencia:
      forca !== "sem_evidencia" && (rVariacao == null || pVariacao == null || pVariacao > 0.05),
    ...(forca === "sem_evidencia"
      ? {
          motivoAusencia:
            p != null && p > 0.05
              ? `Coeficiente ${r} não é distinguível de ruído nesta amostra (p ${p}).`
              : "Sem evidência estatística nesta defasagem.",
        }
      : {}),
  };
}

const numeroBr = (v: number, casas = 2) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v);

function narrar(
  externa: SerieMensal,
  interna: SerieMensal,
  melhor: LeituraCorrelacao | null,
  janelaMeses: number,
): string {
  if (!melhor || melhor.coeficiente == null) {
    return `Sem evidência histórica suficiente para relacionar ${externa.nome} e ${interna.nome} neste workspace.`;
  }
  const sentido = melhor.direcao === "positiva" ? "no mesmo sentido" : "em sentido oposto";
  const defasagem = melhor.lagDias === 0 ? "no mesmo mês" : `com defasagem de ${melhor.lagDias} dias`;
  const elasticidade =
    melhor.elasticidade == null
      ? ""
      : ` Cada ponto de ${externa.nome} acompanhou ${numeroBr(Math.abs(melhor.elasticidade))}% ${melhor.elasticidade > 0 ? "a mais" : "a menos"} em ${interna.nome}.`;
  const ressalva = melhor.alertaTendencia
    ? " A relação aparece no nível das séries, mas não na variação mês a mês: pode ser tendência comum."
    : "";
  return (
    `Nos últimos ${janelaMeses} meses, ${externa.nome} e ${interna.nome} se moveram ${sentido} ${defasagem} ` +
    `(coeficiente ${numeroBr(melhor.coeficiente)}, ${forcaLabels[melhor.forca].toLowerCase()}, confiança ${numeroBr(melhor.confiancaPct ?? 0, 1)}%, ` +
    `amostra ${melhor.amostra} meses).${elasticidade}${ressalva} Correlação medida no histórico deste workspace — não é causa.`
  );
}

/** Mede todas as defasagens de um par e escolhe a de maior evidência. */
export function correlacionar(
  externa: SerieMensal,
  interna: SerieMensal,
  janelaMeses: number,
): Correlacao {
  const leituras = LAGS_MESES.map((lag) => medirLag(externa, interna, lag));
  const comEvidencia = leituras.filter((l) => l.forca !== "sem_evidencia" && l.coeficiente != null);
  const melhor =
    comEvidencia.length === 0
      ? null
      : comEvidencia.reduce((a, b) =>
          Math.abs(b.coeficiente as number) > Math.abs(a.coeficiente as number) ? b : a,
        );

  return {
    chave: `${externa.chave}__${interna.chave}`,
    externo: { chave: externa.chave, nome: externa.nome, unidade: externa.unidade },
    interno: { chave: interna.chave, nome: interna.nome, unidade: interna.unidade },
    base: "evidencia_historica",
    janelaMeses,
    leituras,
    melhor,
    narrativa: narrar(externa, interna, melhor, janelaMeses),
  };
}

export function montarMarketAnalytics(
  externas: SerieMensal[],
  internas: SerieMensal[],
  janelaMeses: number,
  agora = new Date(),
): MarketAnalytics {
  const correlacoes: Correlacao[] = [];
  for (const externa of externas) {
    for (const interna of internas) correlacoes.push(correlacionar(externa, interna, janelaMeses));
  }

  // Ordem de leitura: quem tem evidência primeiro, do coeficiente mais forte.
  correlacoes.sort((a, b) => {
    const ra = a.melhor ? Math.abs(a.melhor.coeficiente as number) : -1;
    const rb = b.melhor ? Math.abs(b.melhor.coeficiente as number) : -1;
    return rb - ra;
  });

  const amostras = correlacoes.flatMap((c) => c.leituras.map((l) => l.amostra));

  return {
    correlacoes,
    paresAvaliados: correlacoes.length,
    paresComEvidencia: correlacoes.filter((c) => c.melhor !== null).length,
    janelaMeses,
    amostraMinima: amostras.length ? Math.min(...amostras) : 0,
    geradoEm: agora.toISOString(),
  };
}

/* ------------------------------------------------------------------ *
 * Construção de série mensal a partir de dados brutos
 * ------------------------------------------------------------------ */

const competenciaDe = (iso: string) => `${iso.slice(0, 7)}-01`;

/** Série mensal por contagem de eventos (visitas, propostas, reservas…). */
export function serieDeContagem(
  chave: string,
  nome: string,
  unidade: string,
  datas: string[],
): SerieMensal {
  const contagem = new Map<string, number>();
  for (const d of datas) {
    if (!d) continue;
    const c = competenciaDe(d);
    contagem.set(c, (contagem.get(c) ?? 0) + 1);
  }
  return {
    chave,
    nome,
    unidade,
    origem: "interno",
    pontos: [...contagem.entries()]
      .map(([referencia, valor]) => ({ referencia, valor }))
      .sort((a, b) => (a.referencia < b.referencia ? -1 : 1)),
  };
}

/** Série mensal por média dos valores observados no mês (ticket, preço, dias). */
export function serieDeMedia(
  chave: string,
  nome: string,
  unidade: string,
  observacoes: { data: string; valor: number | null }[],
  origem: OrigemSerie = "interno",
): SerieMensal {
  const acumulado = new Map<string, { soma: number; n: number }>();
  for (const o of observacoes) {
    if (!o.data || o.valor == null || !Number.isFinite(o.valor)) continue;
    const c = competenciaDe(o.data);
    const atual = acumulado.get(c) ?? { soma: 0, n: 0 };
    acumulado.set(c, { soma: atual.soma + o.valor, n: atual.n + 1 });
  }
  return {
    chave,
    nome,
    unidade,
    origem,
    pontos: [...acumulado.entries()]
      .map(([referencia, { soma, n }]) => ({ referencia, valor: round(soma / n, 4) }))
      .sort((a, b) => (a.referencia < b.referencia ? -1 : 1)),
  };
}

/** Mantém apenas as últimas `meses` competências da série. */
export function recortarJanela(serie: SerieMensal, meses: number): SerieMensal {
  return { ...serie, pontos: serie.pontos.slice(-meses) };
}
