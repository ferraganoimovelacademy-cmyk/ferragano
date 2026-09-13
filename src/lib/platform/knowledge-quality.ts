/**
 * SPRINT 26.1 — KNOWLEDGE FRESHNESS + KNOWLEDGE CONFIDENCE (camada pura).
 *
 * Duas dimensões novas sobre o grafo da Sprint 26:
 *
 * 1. Frescor: nem todo conhecimento envelhece no mesmo ritmo. Cada domínio tem
 *    um orçamento de idade declarado como regra de negócio (ADR-028), e a idade
 *    entra no Knowledge Health Score.
 * 2. Confiança do NÓ (não da recomendação): quanto o próprio grafo sustenta
 *    aquele nó — proveniência, rastro até fonte primária, conexões e frescor.
 *
 * Regras: ausência de dado nunca vira zero (ADR-019) e nenhum critério é
 * escondido — critério não atendido é declarado.
 */

import {
  arvoreProveniencia,
  knowledgeHealth,
  type GrafoConhecimento,
  type Integridade,
  type KnowledgeHealth,
  type NoConhecimento,
  type TipoNo,
} from "@/lib/platform/knowledge";

export const VERSAO_QUALIDADE = "26.1.0";

/* ------------------------------------------------------------------ *
 * Domínios de conhecimento (agrupam os tipos da ontologia)
 * ------------------------------------------------------------------ */

export const DOMINIOS = [
  "comercial",
  "relacionamento",
  "produto",
  "mercado",
  "evidencia",
  "recomendacao",
  "advisor",
  "resultado",
] as const;

export type DominioConhecimento = (typeof DOMINIOS)[number];

export const dominioLabels: Record<DominioConhecimento, string> = {
  comercial: "Comercial",
  relacionamento: "Relacionamento",
  produto: "Produto",
  mercado: "Mercado",
  evidencia: "Evidence",
  recomendacao: "Recommendation",
  advisor: "Advisor",
  resultado: "Resultado",
};

export const dominioDoTipo: Record<TipoNo, DominioConhecimento> = {
  pessoa: "relacionamento",
  corretor: "comercial",
  equipe: "comercial",
  oportunidade: "comercial",
  empreendimento: "produto",
  construtora: "produto",
  bairro: "mercado",
  mercado: "mercado",
  indicador: "mercado",
  evidencia: "evidencia",
  recomendacao: "recomendacao",
  advisor: "advisor",
  resultado: "resultado",
};

/**
 * Orçamento de frescor por domínio, em horas (regra de negócio declarada).
 * `verde` até o limite; `amarelo` até o dobro; `vermelho` acima disso.
 */
export const SLA_FRESCOR_HORAS: Record<DominioConhecimento, number> = {
  comercial: 24,
  relacionamento: 24 * 7,
  produto: 24 * 14,
  mercado: 24,
  evidencia: 24 * 7,
  recomendacao: 24 * 3,
  advisor: 24,
  resultado: 24 * 30,
};

export type Semaforo = "verde" | "amarelo" | "vermelho" | "sem_dado";

export const semaforoLabels: Record<Semaforo, string> = {
  verde: "Em dia",
  amarelo: "Atenção",
  vermelho: "Vencido",
  sem_dado: "Sem data",
};

const horasEntre = (iso: string | null, agora: Date): number | null => {
  if (!iso) return null;
  const h = (agora.getTime() - new Date(iso).getTime()) / 36e5;
  return Number.isFinite(h) ? Math.max(0, Number(h.toFixed(1))) : null;
};

export type FrescorNo = {
  no: string;
  dominio: DominioConhecimento;
  idadeHoras: number | null;
  slaHoras: number;
  semaforo: Semaforo;
  /** 0–100; `null` quando o nó não tem data (não vale zero). */
  indice: number | null;
};

export function frescorNo(no: NoConhecimento, agora = new Date()): FrescorNo {
  const dominio = dominioDoTipo[no.tipo];
  const sla = SLA_FRESCOR_HORAS[dominio];
  const idade = horasEntre(no.proveniencia.atualizadoEm, agora);

  if (idade === null) {
    return { no: no.id, dominio, idadeHoras: null, slaHoras: sla, semaforo: "sem_dado", indice: null };
  }

  const semaforo: Semaforo = idade <= sla ? "verde" : idade <= sla * 2 ? "amarelo" : "vermelho";
  // Índice linear: 100 no SLA, 0 em 3x o SLA. Nunca negativo.
  const indice = Math.max(0, Math.min(100, Math.round(100 - ((idade - sla) / (sla * 2)) * 100)));
  return { no: no.id, dominio, idadeHoras: idade, slaHoras: sla, semaforo, indice };
}

export type FrescorDominio = {
  dominio: DominioConhecimento;
  nos: number;
  /** Idade do nó mais recente e do mais antigo (horas). */
  idadeMinimaHoras: number | null;
  idadeMaximaHoras: number | null;
  idadeMedianaHoras: number | null;
  slaHoras: number;
  semaforo: Semaforo;
  indice: number | null;
  vencidos: number;
  semData: number;
};

const mediana = (v: number[]): number | null => {
  if (v.length === 0) return null;
  const o = [...v].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  const val = o.length % 2 ? o[m]! : (o[m - 1]! + o[m]!) / 2;
  return Number(val.toFixed(1));
};

/** GATE — Knowledge Freshness: idade do conhecimento por domínio. */
export function frescorPorDominio(grafo: GrafoConhecimento, agora = new Date()): FrescorDominio[] {
  const porDominio = new Map<DominioConhecimento, FrescorNo[]>();
  for (const no of grafo.nos) {
    const f = frescorNo(no, agora);
    porDominio.set(f.dominio, [...(porDominio.get(f.dominio) ?? []), f]);
  }

  return DOMINIOS.filter((d) => porDominio.has(d)).map((dominio) => {
    const lista = porDominio.get(dominio)!;
    const idades = lista.map((f) => f.idadeHoras).filter((x): x is number => x !== null);
    const indices = lista.map((f) => f.indice).filter((x): x is number => x !== null);
    const vencidos = lista.filter((f) => f.semaforo === "vermelho").length;
    const semData = lista.filter((f) => f.semaforo === "sem_dado").length;
    const sla = SLA_FRESCOR_HORAS[dominio];
    const med = mediana(idades);

    const semaforo: Semaforo =
      med === null ? "sem_dado" : med <= sla ? "verde" : med <= sla * 2 ? "amarelo" : "vermelho";

    return {
      dominio,
      nos: lista.length,
      idadeMinimaHoras: idades.length ? Math.min(...idades) : null,
      idadeMaximaHoras: idades.length ? Math.max(...idades) : null,
      idadeMedianaHoras: med,
      slaHoras: sla,
      semaforo,
      indice: indices.length
        ? Math.round(indices.reduce((a, b) => a + b, 0) / indices.length)
        : null,
      vencidos,
      semData,
    };
  });
}

/** Frescor agregado do grafo (média dos domínios com data). */
export function frescorGrafo(dominios: FrescorDominio[]): number | null {
  const v = dominios.map((d) => d.indice).filter((x): x is number => x !== null);
  return v.length === 0 ? null : Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}

/* ------------------------------------------------------------------ *
 * Knowledge Confidence Score (por nó, não por recomendação)
 * ------------------------------------------------------------------ */

export const CRITERIOS_CONFIANCA = [
  "proveniencia_completa",
  "rastro_ate_fonte",
  "conectado",
  "base_observada",
  "frescor_no_sla",
] as const;

export type CriterioConfianca = (typeof CRITERIOS_CONFIANCA)[number];

export const criterioConfiancaLabels: Record<CriterioConfianca, string> = {
  proveniencia_completa: "Proveniência completa (fonte, data, algoritmo, ADR)",
  rastro_ate_fonte: "Rastro até fonte primária",
  conectado: "Conectado ao grafo",
  base_observada: "Base observada (dado interno ou externo)",
  frescor_no_sla: "Frescor dentro do orçamento do domínio",
};

const PESOS: Record<CriterioConfianca, number> = {
  proveniencia_completa: 30,
  rastro_ate_fonte: 25,
  conectado: 15,
  base_observada: 10,
  frescor_no_sla: 20,
};

export type ConfiancaNo = {
  no: string;
  tipo: TipoNo;
  rotulo: string;
  dominio: DominioConhecimento;
  /** 0–100; `null` quando não há base para avaliar (nó sem data e sem rastro). */
  score: number | null;
  criterios: { chave: CriterioConfianca; ok: boolean; peso: number; detalhe: string }[];
  naoAtendidos: CriterioConfianca[];
};

export function confiancaNo(
  grafo: GrafoConhecimento,
  noAlvo: string,
  agora = new Date(),
): ConfiancaNo | null {
  const no = grafo.nos.find((n) => n.id === noAlvo);
  if (!no) return null;

  const p = no.proveniencia;
  const derivado = p.camada === "analitico" || p.camada === "decisao" || p.camada === "resultado";
  const arvore = arvoreProveniencia(grafo, no.id);
  const conectado = grafo.relacoes.some((r) => r.origem === no.id || r.destino === no.id);
  const f = frescorNo(no, agora);

  const provOk = Boolean(p.fonte && p.atualizadoEm && (!derivado || (p.algoritmo && p.versaoAlgoritmo && p.adr)));

  const criterios: ConfiancaNo["criterios"] = [
    {
      chave: "proveniencia_completa",
      ok: provOk,
      peso: PESOS.proveniencia_completa,
      detalhe: provOk
        ? `Fonte ${p.fonte}${p.algoritmo ? ` · ${p.algoritmo} v${p.versaoAlgoritmo}` : ""}`
        : "Falta fonte, data ou algoritmo/versão/ADR.",
    },
    {
      chave: "rastro_ate_fonte",
      ok: arvore.completa,
      peso: PESOS.rastro_ate_fonte,
      detalhe: arvore.completa
        ? `Cadeia com ${arvore.totalNos} nós até ${arvore.fontes.join(", ")}`
        : "Cadeia não alcança dado primário.",
    },
    {
      chave: "conectado",
      ok: conectado,
      peso: PESOS.conectado,
      detalhe: conectado ? "Possui relações no grafo." : "Nó órfão.",
    },
    {
      chave: "base_observada",
      ok: p.base === "dado_interno" || p.base === "dado_externo" || p.base === "evidencia_historica",
      peso: PESOS.base_observada,
      detalhe: `Base declarada: ${p.base}.`,
    },
    {
      chave: "frescor_no_sla",
      ok: f.semaforo === "verde",
      peso: PESOS.frescor_no_sla,
      detalhe:
        f.idadeHoras === null
          ? "Sem data de atualização."
          : `${f.idadeHoras} h de idade · orçamento ${f.slaHoras} h.`,
    },
  ];

  const semBase = f.semaforo === "sem_dado" && !arvore.completa && !provOk;
  const score = semBase
    ? null
    : criterios.reduce((soma, c) => soma + (c.ok ? c.peso : 0), 0);

  return {
    no: no.id,
    tipo: no.tipo,
    rotulo: no.rotulo,
    dominio: dominioDoTipo[no.tipo],
    score,
    criterios,
    naoAtendidos: criterios.filter((c) => !c.ok).map((c) => c.chave),
  };
}

export type ConfiancaDominio = {
  dominio: DominioConhecimento;
  nos: number;
  avaliados: number;
  /** Média dos nós avaliados; `null` quando nenhum nó tem base de avaliação. */
  score: number | null;
  piorNo: { no: string; rotulo: string; score: number } | null;
};

export function confiancaPorDominio(
  grafo: GrafoConhecimento,
  agora = new Date(),
): ConfiancaDominio[] {
  const mapa = new Map<DominioConhecimento, ConfiancaNo[]>();
  for (const no of grafo.nos) {
    const c = confiancaNo(grafo, no.id, agora);
    if (!c) continue;
    mapa.set(c.dominio, [...(mapa.get(c.dominio) ?? []), c]);
  }

  return DOMINIOS.filter((d) => mapa.has(d)).map((dominio) => {
    const lista = mapa.get(dominio)!;
    const avaliados = lista.filter((c) => c.score !== null);
    const pior = avaliados.reduce<ConfiancaNo | null>(
      (menor, c) => (menor === null || c.score! < menor.score! ? c : menor),
      null,
    );
    return {
      dominio,
      nos: lista.length,
      avaliados: avaliados.length,
      score: avaliados.length
        ? Math.round(avaliados.reduce((a, c) => a + c.score!, 0) / avaliados.length)
        : null,
      piorNo: pior ? { no: pior.no, rotulo: pior.rotulo, score: pior.score! } : null,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Knowledge Health Score com frescor e confiança
 * ------------------------------------------------------------------ */

export type KnowledgeHealthPlus = KnowledgeHealth & {
  frescor: number | null;
  confianca: number | null;
  porDominioFrescor: FrescorDominio[];
  porDominioConfianca: ConfiancaDominio[];
  dominiosVencidos: DominioConhecimento[];
  /** Score final com as duas dimensões novas; `null` sem nós (ADR-019). */
  scoreCompleto: number | null;
};

export function knowledgeHealthPlus(
  grafo: GrafoConhecimento,
  integridade: Integridade,
  relacoesDeclaradas = grafo.relacoes.length,
  agora = new Date(),
): KnowledgeHealthPlus {
  const base = knowledgeHealth(grafo, integridade, relacoesDeclaradas, agora);
  const porDominioFrescor = frescorPorDominio(grafo, agora);
  const porDominioConfianca = confiancaPorDominio(grafo, agora);
  const frescor = frescorGrafo(porDominioFrescor);
  const confs = porDominioConfianca.map((d) => d.score).filter((x): x is number => x !== null);
  const confianca = confs.length ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length) : null;

  // Dimensões ausentes não penalizam: o peso é redistribuído.
  const dimensoes: { valor: number; peso: number }[] = [{ valor: base.score ?? 0, peso: 0.6 }];
  if (frescor !== null) dimensoes.push({ valor: frescor, peso: 0.2 });
  if (confianca !== null) dimensoes.push({ valor: confianca, peso: 0.2 });
  const pesoTotal = dimensoes.reduce((a, d) => a + d.peso, 0);

  return {
    ...base,
    frescor,
    confianca,
    porDominioFrescor,
    porDominioConfianca,
    dominiosVencidos: porDominioFrescor.filter((d) => d.semaforo === "vermelho").map((d) => d.dominio),
    scoreCompleto:
      base.score === null
        ? null
        : Math.round(dimensoes.reduce((a, d) => a + d.valor * d.peso, 0) / pesoTotal),
  };
}
