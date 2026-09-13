/**
 * SPRINT 26 — KNOWLEDGE (bounded context novo, camada pura).
 *
 * O Knowledge não é um módulo de negócio: é a camada que ORGANIZA o
 * conhecimento já produzido pelas Sprints 18–25 (Query Layer, Read Models,
 * Evidence Engine, Market Analytics, Behavior, Predictive, Recommendation e
 * Advisor) e o torna navegável até o dado original.
 *
 * Regras invioláveis (ADR-027):
 * 1. Zero duplicação: um nó do grafo é uma REFERÊNCIA (`tipo` + `id`), nunca
 *    uma cópia da entidade de negócio.
 * 2. Zero acesso direto a tabelas de domínio: as entradas chegam pela Query
 *    Layer (`knowledge.functions.ts` → `read_*` / `list_recommendations`).
 * 3. Zero conhecimento sem proveniência: todo nó e toda relação declaram
 *    origem, base, algoritmo/versão, ADR e data.
 * 4. Nada é resumido na explicação: a árvore vai até a fonte primária.
 */

/* ------------------------------------------------------------------ *
 * GATE 01 — Ontologia
 * ------------------------------------------------------------------ */

export const TIPOS_NO = [
  "pessoa",
  "corretor",
  "equipe",
  "oportunidade",
  "empreendimento",
  "construtora",
  "bairro",
  "mercado",
  "indicador",
  "evidencia",
  "recomendacao",
  "advisor",
  "resultado",
] as const;

export type TipoNo = (typeof TIPOS_NO)[number];

export const tipoNoLabels: Record<TipoNo, string> = {
  pessoa: "Pessoa",
  corretor: "Corretor",
  equipe: "Equipe",
  oportunidade: "Oportunidade",
  empreendimento: "Empreendimento",
  construtora: "Construtora",
  bairro: "Bairro",
  mercado: "Mercado",
  indicador: "Indicador econômico",
  evidencia: "Evidência",
  recomendacao: "Recomendação",
  advisor: "Advisor",
  resultado: "Resultado",
};

/** Camada de origem do nó — separa dado interno, externo e derivado. */
export type CamadaConhecimento = "dominio" | "mercado" | "analitico" | "decisao" | "resultado";

export const camadaLabels: Record<CamadaConhecimento, string> = {
  dominio: "Domínio (dado interno)",
  mercado: "Mercado (dado externo)",
  analitico: "Analítico (derivado)",
  decisao: "Decisão",
  resultado: "Resultado observado",
};

export const camadaDoTipo: Record<TipoNo, CamadaConhecimento> = {
  pessoa: "dominio",
  corretor: "dominio",
  equipe: "dominio",
  oportunidade: "dominio",
  empreendimento: "dominio",
  construtora: "dominio",
  bairro: "mercado",
  mercado: "mercado",
  indicador: "mercado",
  evidencia: "analitico",
  recomendacao: "decisao",
  advisor: "decisao",
  resultado: "resultado",
};

export const TIPOS_RELACAO = [
  "atendida_por",
  "integra",
  "origina",
  "refere_se_a",
  "incorporado_por",
  "localizado_em",
  "compoe",
  "medido_por",
  "sustenta",
  "fundamenta",
  "apresentada_por",
  "observado_em",
  "resulta_em",
] as const;

export type TipoRelacao = (typeof TIPOS_RELACAO)[number];

export const tipoRelacaoLabels: Record<TipoRelacao, string> = {
  atendida_por: "é atendida por",
  integra: "integra",
  origina: "origina",
  refere_se_a: "refere-se a",
  incorporado_por: "é incorporado por",
  localizado_em: "está localizado em",
  compoe: "compõe",
  medido_por: "é medido por",
  sustenta: "sustenta",
  fundamenta: "fundamenta",
  apresentada_por: "é apresentada por",
  observado_em: "é observado em",
  resulta_em: "resulta em",
};

/** Arestas permitidas. Qualquer relação fora daqui é violação de ontologia. */
export const ONTOLOGIA: readonly { de: TipoNo; para: TipoNo; tipo: TipoRelacao }[] = [
  { de: "pessoa", para: "corretor", tipo: "atendida_por" },
  { de: "corretor", para: "equipe", tipo: "integra" },
  { de: "pessoa", para: "oportunidade", tipo: "origina" },
  { de: "oportunidade", para: "empreendimento", tipo: "refere_se_a" },
  { de: "empreendimento", para: "construtora", tipo: "incorporado_por" },
  { de: "empreendimento", para: "bairro", tipo: "localizado_em" },
  { de: "bairro", para: "mercado", tipo: "compoe" },
  { de: "mercado", para: "indicador", tipo: "medido_por" },
  { de: "indicador", para: "evidencia", tipo: "sustenta" },
  { de: "evidencia", para: "recomendacao", tipo: "fundamenta" },
  { de: "recomendacao", para: "advisor", tipo: "apresentada_por" },
  { de: "advisor", para: "resultado", tipo: "observado_em" },
  { de: "oportunidade", para: "resultado", tipo: "resulta_em" },
  // Cadeia comportamental: evidência também nasce do dado interno.
  { de: "pessoa", para: "evidencia", tipo: "sustenta" },
  { de: "oportunidade", para: "evidencia", tipo: "sustenta" },
];

export function relacaoPermitida(de: TipoNo, para: TipoNo, tipo: TipoRelacao): boolean {
  return ONTOLOGIA.some((a) => a.de === de && a.para === para && a.tipo === tipo);
}

/* ------------------------------------------------------------------ *
 * GATE 02 / GATE 05 — Proveniência e versões
 * ------------------------------------------------------------------ */

/** Versões declaradas em toda peça de conhecimento derivado (GATE 05). */
export const VERSAO_ALGORITMO = "26.0.0";

export type BaseProveniencia =
  | "dado_interno"
  | "dado_externo"
  | "regra_negocio"
  | "evidencia_historica";

export const baseProvenienciaLabels: Record<BaseProveniencia, string> = {
  dado_interno: "Dado interno do workspace",
  dado_externo: "Dado externo auditável",
  regra_negocio: "Regra de negócio declarada",
  evidencia_historica: "Evidência histórica do workspace",
};

export type Proveniencia = {
  /** De onde o dado veio: Read Model, RPC, série externa. */
  fonte: string;
  camada: CamadaConhecimento;
  base: BaseProveniencia;
  /** Algoritmo que derivou o nó — `null` para dado bruto. */
  algoritmo: string | null;
  versaoAlgoritmo: string | null;
  /** ADR que governa a produção deste conhecimento. */
  adr: string | null;
  atualizadoEm: string | null;
};

export type NoConhecimento = {
  id: string;
  tipo: TipoNo;
  rotulo: string;
  proveniencia: Proveniencia;
  /** Métricas de apoio já calculadas por outra sprint (nunca recalculadas aqui). */
  detalhe?: string | null;
};

export type RelacaoConhecimento = {
  id: string;
  origem: string;
  destino: string;
  tipo: TipoRelacao;
  proveniencia: Proveniencia;
  atualizadoEm: string | null;
};

export type GrafoConhecimento = {
  nos: NoConhecimento[];
  relacoes: RelacaoConhecimento[];
  geradoEm: string;
};

export const relacaoId = (origem: string, tipo: TipoRelacao, destino: string) =>
  `${origem}->${tipo}->${destino}`;

export const noId = (tipo: TipoNo, id: string) => `${tipo}:${id}`;

/** Monta o grafo validando ontologia: relação fora da ontologia é descartada. */
export function montarGrafo(
  nos: NoConhecimento[],
  relacoes: Omit<RelacaoConhecimento, "id">[],
  agora = new Date().toISOString(),
): GrafoConhecimento {
  const porId = new Map(nos.map((n) => [n.id, n]));
  const vistos = new Set<string>();
  const validas: RelacaoConhecimento[] = [];

  for (const r of relacoes) {
    const a = porId.get(r.origem);
    const b = porId.get(r.destino);
    if (!a || !b) continue; // relação órfã: reportada na integridade, fora do grafo
    if (!relacaoPermitida(a.tipo, b.tipo, r.tipo)) continue;
    const id = relacaoId(r.origem, r.tipo, r.destino);
    if (vistos.has(id)) continue; // zero duplicação
    vistos.add(id);
    validas.push({ ...r, id });
  }

  return { nos: [...porId.values()], relacoes: validas, geradoEm: agora };
}

/* ------------------------------------------------------------------ *
 * GATE 02 — Árvore de proveniência (nunca resumida)
 * ------------------------------------------------------------------ */

export type NoArvore = {
  no: NoConhecimento;
  /** Como o filho chegou até o pai. `null` na raiz. */
  via: TipoRelacao | null;
  profundidade: number;
  /** true quando o nó já apareceu no caminho (corta ciclo sem esconder). */
  ciclo: boolean;
  filhos: NoArvore[];
};

export type ArvoreProveniencia = {
  raiz: NoArvore | null;
  /** Total de nós exibidos — a árvore nunca é truncada por tamanho. */
  totalNos: number;
  profundidadeMaxima: number;
  /** Fontes primárias alcançadas (folhas). */
  fontes: string[];
  /** true quando a raiz chega a pelo menos uma fonte primária. */
  completa: boolean;
};

/**
 * Sobe do nó derivado até as fontes primárias, seguindo as relações de
 * entrada. Toda a cadeia é devolvida: o Advisor não pode resumir.
 */
export function arvoreProveniencia(grafo: GrafoConhecimento, alvo: string): ArvoreProveniencia {
  const porId = new Map(grafo.nos.map((n) => [n.id, n]));
  const entradas = new Map<string, RelacaoConhecimento[]>();
  for (const r of grafo.relacoes) {
    const lista = entradas.get(r.destino) ?? [];
    lista.push(r);
    entradas.set(r.destino, lista);
  }

  const raizNo = porId.get(alvo);
  if (!raizNo) {
    return { raiz: null, totalNos: 0, profundidadeMaxima: 0, fontes: [], completa: false };
  }

  let total = 0;
  let maxProf = 0;
  const fontes = new Set<string>();

  const construir = (no: NoConhecimento, via: TipoRelacao | null, prof: number, caminho: Set<string>): NoArvore => {
    total += 1;
    maxProf = Math.max(maxProf, prof);
    if (caminho.has(no.id)) {
      return { no, via, profundidade: prof, ciclo: true, filhos: [] };
    }
    const proximo = new Set(caminho).add(no.id);
    const filhos = (entradas.get(no.id) ?? [])
      .map((r) => {
        const pai = porId.get(r.origem);
        return pai ? construir(pai, r.tipo, prof + 1, proximo) : null;
      })
      .filter((x): x is NoArvore => x !== null);

    if (filhos.length === 0) fontes.add(no.proveniencia.fonte);
    return { no, via, profundidade: prof, ciclo: false, filhos };
  };

  const raiz = construir(raizNo, null, 0, new Set());
  const derivado = raizNo.proveniencia.camada !== "dominio" && raizNo.proveniencia.camada !== "mercado";

  return {
    raiz,
    totalNos: total,
    profundidadeMaxima: maxProf,
    fontes: [...fontes].sort(),
    // Conhecimento derivado só é válido se alcançar dado primário.
    completa: derivado ? maxProf > 0 && fontes.size > 0 : true,
  };
}

/** Achata a árvore na ordem em que deve ser lida (raiz → fontes). */
export function achatarArvore(arvore: ArvoreProveniencia): NoArvore[] {
  const saida: NoArvore[] = [];
  const visitar = (n: NoArvore) => {
    saida.push(n);
    n.filhos.forEach(visitar);
  };
  if (arvore.raiz) visitar(arvore.raiz);
  return saida;
}

/* ------------------------------------------------------------------ *
 * GATE 05 — Evidence Trace
 * ------------------------------------------------------------------ */

export type EvidenceTrace = {
  recomendacaoId: string;
  origem: string;
  data: string | null;
  algoritmo: string;
  versaoAlgoritmo: string;
  adr: string;
  base: BaseProveniencia;
  fonte: string;
  criterios: string[];
  forcaEvidencia: string | null;
  confianca: number | null;
  /** Árvore completa usada para gerar a recomendação. */
  arvore: ArvoreProveniencia;
  /** Campos obrigatórios ausentes — bloqueia exibição como "explicada". */
  faltando: string[];
};

const CAMPOS_TRACE = [
  "origem",
  "data",
  "algoritmo",
  "criterios",
  "forcaEvidencia",
  "confianca",
  "base",
  "fonte",
  "versaoAlgoritmo",
  "adr",
] as const;

export function montarEvidenceTrace(
  grafo: GrafoConhecimento,
  recomendacaoId: string,
  extra: {
    criterios?: string[];
    forcaEvidencia?: string | null;
    confianca?: number | null;
  } = {},
): EvidenceTrace | null {
  const no = grafo.nos.find((n) => n.id === recomendacaoId && n.tipo === "recomendacao");
  if (!no) return null;

  const p = no.proveniencia;
  const arvore = arvoreProveniencia(grafo, recomendacaoId);
  const trace: EvidenceTrace = {
    recomendacaoId,
    origem: p.fonte,
    data: p.atualizadoEm,
    algoritmo: p.algoritmo ?? "",
    versaoAlgoritmo: p.versaoAlgoritmo ?? "",
    adr: p.adr ?? "",
    base: p.base,
    fonte: p.fonte,
    criterios: extra.criterios ?? [],
    forcaEvidencia: extra.forcaEvidencia ?? null,
    confianca: extra.confianca ?? null,
    arvore,
    faltando: [],
  };

  trace.faltando = CAMPOS_TRACE.filter((campo) => {
    const v = trace[campo] as unknown;
    if (Array.isArray(v)) return v.length === 0;
    return v == null || v === "";
  });

  return trace;
}

/* ------------------------------------------------------------------ *
 * GATE 06 — Knowledge Timeline
 * ------------------------------------------------------------------ */

export type EventoConhecimento = {
  em: string;
  no: string;
  tipo: TipoNo;
  rotulo: string;
  camada: CamadaConhecimento;
  fonte: string;
};

/**
 * Evolução do conhecimento em ordem cronológica: pessoa criada → behavior
 * atualizado → evidência recalculada → recomendação gerada → advisor →
 * resultado. Nós sem data ficam fora: timeline não inventa horário.
 */
export function timelineConhecimento(grafo: GrafoConhecimento, limite = 200): EventoConhecimento[] {
  return grafo.nos
    .filter((n) => Boolean(n.proveniencia.atualizadoEm))
    .map((n) => ({
      em: n.proveniencia.atualizadoEm as string,
      no: n.id,
      tipo: n.tipo,
      rotulo: n.rotulo,
      camada: n.proveniencia.camada,
      fonte: n.proveniencia.fonte,
    }))
    .sort((a, b) => (a.em < b.em ? 1 : a.em > b.em ? -1 : 0))
    .slice(0, limite);
}

/* ------------------------------------------------------------------ *
 * GATE 07 — Knowledge Integrity
 * ------------------------------------------------------------------ */

export const CHECAGENS = [
  "relacionamento_orfao",
  "origem_inexistente",
  "referencia_quebrada",
  "proveniencia_invalida",
  "evidencia_sem_fonte",
  "recomendacao_sem_evidencia",
  "advisor_sem_recomendacao",
] as const;

export type ChaveChecagem = (typeof CHECAGENS)[number];

export const checagemLabels: Record<ChaveChecagem, string> = {
  relacionamento_orfao: "Relacionamento órfão",
  origem_inexistente: "Origem inexistente",
  referencia_quebrada: "Referência quebrada",
  proveniencia_invalida: "Proveniência inválida",
  evidencia_sem_fonte: "Evidência sem fonte",
  recomendacao_sem_evidencia: "Recomendação sem evidência",
  advisor_sem_recomendacao: "Advisor sem recomendação",
};

export type Falha = { chave: ChaveChecagem; alvo: string; detalhe: string };

export type Integridade = {
  falhas: Falha[];
  porChecagem: Record<ChaveChecagem, number>;
  /** true quando nenhuma checagem falhou. */
  ok: boolean;
};

export function verificarIntegridade(
  grafo: GrafoConhecimento,
  relacoesBrutas: Omit<RelacaoConhecimento, "id">[] = grafo.relacoes,
): Integridade {
  const porId = new Map(grafo.nos.map((n) => [n.id, n]));
  const falhas: Falha[] = [];

  for (const r of relacoesBrutas) {
    const temOrigem = porId.has(r.origem);
    const temDestino = porId.has(r.destino);
    if (!temOrigem && !temDestino) {
      falhas.push({
        chave: "relacionamento_orfao",
        alvo: relacaoId(r.origem, r.tipo, r.destino),
        detalhe: "Nem a origem nem o destino existem no grafo.",
      });
      continue;
    }
    if (!temOrigem) {
      falhas.push({
        chave: "origem_inexistente",
        alvo: relacaoId(r.origem, r.tipo, r.destino),
        detalhe: `Origem ${r.origem} não existe no grafo.`,
      });
      continue;
    }
    if (!temDestino) {
      falhas.push({
        chave: "referencia_quebrada",
        alvo: relacaoId(r.origem, r.tipo, r.destino),
        detalhe: `Destino ${r.destino} não existe no grafo.`,
      });
    }
  }

  const derivado = (n: NoConhecimento) =>
    n.proveniencia.camada === "analitico" ||
    n.proveniencia.camada === "decisao" ||
    n.proveniencia.camada === "resultado";

  for (const n of grafo.nos) {
    const p = n.proveniencia;
    const semFonte = !p.fonte;
    const semData = !p.atualizadoEm;
    const semAlgoritmo = derivado(n) && (!p.algoritmo || !p.versaoAlgoritmo || !p.adr);
    if (semFonte || semData || semAlgoritmo) {
      falhas.push({
        chave: "proveniencia_invalida",
        alvo: n.id,
        detalhe: [
          semFonte ? "sem fonte" : null,
          semData ? "sem data de atualização" : null,
          semAlgoritmo ? "sem algoritmo/versão/ADR" : null,
        ]
          .filter(Boolean)
          .join(", "),
      });
    }
    if (n.tipo === "evidencia" && semFonte) {
      falhas.push({ chave: "evidencia_sem_fonte", alvo: n.id, detalhe: "Evidência sem fonte declarada." });
    }
  }

  const entradasPorTipo = (destino: string, tipos: TipoNo[]) =>
    grafo.relacoes.some((r) => {
      if (r.destino !== destino) return false;
      const origem = porId.get(r.origem);
      return Boolean(origem && tipos.includes(origem.tipo));
    });

  for (const n of grafo.nos) {
    if (n.tipo === "recomendacao" && !entradasPorTipo(n.id, ["evidencia"])) {
      falhas.push({
        chave: "recomendacao_sem_evidencia",
        alvo: n.id,
        detalhe: "Recomendação sem evidência que a fundamente.",
      });
    }
    if (n.tipo === "advisor" && !entradasPorTipo(n.id, ["recomendacao"])) {
      falhas.push({
        chave: "advisor_sem_recomendacao",
        alvo: n.id,
        detalhe: "Resposta do Advisor sem recomendação de origem.",
      });
    }
  }

  const porChecagem = Object.fromEntries(CHECAGENS.map((c) => [c, 0])) as Record<ChaveChecagem, number>;
  for (const f of falhas) porChecagem[f.chave] += 1;

  return { falhas, porChecagem, ok: falhas.length === 0 };
}

/* ------------------------------------------------------------------ *
 * GATE 08 — Knowledge Health Score
 * ------------------------------------------------------------------ */

export type KnowledgeHealth = {
  /** Tipos da ontologia presentes no grafo (%). */
  cobertura: number;
  /** Relações válidas sobre relações declaradas (%). */
  integridade: number;
  relacoesQuebradas: number;
  /** Nós com proveniência válida (%). */
  provenienciaValida: number;
  nosOrfaos: number;
  nosAtivos: number;
  totalNos: number;
  /** Horas desde a última atualização, média dos nós datados. */
  tempoMedioAtualizacaoHoras: number | null;
  /** 0–100. Sem nós, é `null` — ausência de dado não é nota zero (ADR-019). */
  score: number | null;
  tiposAusentes: TipoNo[];
};

const ATIVO_HORAS = 24 * 30;

export function knowledgeHealth(
  grafo: GrafoConhecimento,
  integridade: Integridade,
  relacoesDeclaradas = grafo.relacoes.length,
  agora = new Date(),
): KnowledgeHealth {
  const total = grafo.nos.length;
  const presentes = new Set(grafo.nos.map((n) => n.tipo));
  const tiposAusentes = TIPOS_NO.filter((t) => !presentes.has(t));
  const cobertura = Math.round((presentes.size / TIPOS_NO.length) * 100);

  const quebradas =
    integridade.porChecagem.relacionamento_orfao +
    integridade.porChecagem.origem_inexistente +
    integridade.porChecagem.referencia_quebrada;

  const integridadePct =
    relacoesDeclaradas === 0
      ? 100
      : Math.max(0, Math.round(((relacoesDeclaradas - quebradas) / relacoesDeclaradas) * 100));

  const comFalhaProv = new Set(
    integridade.falhas.filter((f) => f.chave === "proveniencia_invalida").map((f) => f.alvo),
  );
  const provenienciaValida = total === 0 ? 100 : Math.round(((total - comFalhaProv.size) / total) * 100);

  const conectados = new Set<string>();
  for (const r of grafo.relacoes) {
    conectados.add(r.origem);
    conectados.add(r.destino);
  }
  const nosOrfaos = grafo.nos.filter((n) => !conectados.has(n.id)).length;

  const datados = grafo.nos
    .map((n) => n.proveniencia.atualizadoEm)
    .filter((d): d is string => Boolean(d))
    .map((d) => (agora.getTime() - new Date(d).getTime()) / 36e5)
    .filter((h) => Number.isFinite(h) && h >= 0);

  const tempoMedio =
    datados.length === 0 ? null : Number((datados.reduce((a, b) => a + b, 0) / datados.length).toFixed(1));

  const nosAtivos = datados.filter((h) => h <= ATIVO_HORAS).length;

  const score =
    total === 0
      ? null
      : Math.round(
          cobertura * 0.25 +
            integridadePct * 0.3 +
            provenienciaValida * 0.3 +
            Math.max(0, 100 - (nosOrfaos / total) * 100) * 0.15,
        );

  return {
    cobertura,
    integridade: integridadePct,
    relacoesQuebradas: quebradas,
    provenienciaValida,
    nosOrfaos,
    nosAtivos,
    totalNos: total,
    tempoMedioAtualizacaoHoras: tempoMedio,
    score,
    tiposAusentes,
  };
}
