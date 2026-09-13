/**
 * SPRINT 27 — KNOWLEDGE ORCHESTRATOR (bounded context novo, camada pura).
 *
 * Este contexto NÃO calcula inteligência. Ele coordena os motores já
 * certificados: quem depende de quem, o que precisa ser recalculado quando um
 * dado muda, o que pode ser reaproveitado, por que um insight mudou e qual
 * evento disparou a mudança.
 *
 * Regras invioláveis (ADR-029):
 * 1. Nenhum recálculo sem evento — o orquestrador não agenda por tempo.
 * 2. Cache invalidado por evento, nunca por TTL.
 * 3. Toda mudança explicada declara evento, algoritmo e cadeia de propagação.
 * 4. Narrativa executiva usa apenas dado disponível; sem dado, declara a
 *    lacuna em vez de extrapolar (ADR-021) e nunca afirma causa (ADR-026).
 */

export const VERSAO_ORQUESTRADOR = "27.0.0";

/* ------------------------------------------------------------------ *
 * GATE 01 — Dependency Graph
 * ------------------------------------------------------------------ */

export const CONTEXTOS = [
  "dominio",
  "market",
  "behavior",
  "evidence",
  "recommendation",
  "advisor",
  "knowledge",
  "executive",
] as const;

export type Contexto = (typeof CONTEXTOS)[number];

export const contextoLabels: Record<Contexto, string> = {
  dominio: "Domínio (write model)",
  market: "Market Intelligence",
  behavior: "Behavioral Intelligence",
  evidence: "Evidence Engine",
  recommendation: "Recommendation Engine",
  advisor: "Ferragano Advisor",
  knowledge: "Knowledge Graph",
  executive: "Executive Radar",
};

export type Dependencia = {
  de: Contexto;
  para: Contexto;
  /** Motor que consome a saída de `de`. */
  algoritmo: string;
  adr: string;
};

/** Fluxo canônico: Market → Behavior → Evidence → Recommendation → Advisor → Knowledge → Executive. */
export const DEPENDENCIAS: readonly Dependencia[] = [
  { de: "dominio", para: "behavior", algoritmo: "behavior.perfilComportamental", adr: "ADR-022" },
  { de: "dominio", para: "evidence", algoritmo: "market-analytics.correlacionar", adr: "ADR-025" },
  { de: "dominio", para: "executive", algoritmo: "predictive.radarExecutivo", adr: "ADR-021" },
  { de: "market", para: "evidence", algoritmo: "market-analytics.correlacionar", adr: "ADR-025" },
  { de: "market", para: "executive", algoritmo: "market-context.interpretar", adr: "ADR-024" },
  { de: "behavior", para: "evidence", algoritmo: "evidence.forcaEvidencia", adr: "ADR-026" },
  { de: "behavior", para: "recommendation", algoritmo: "recommendation.ranquear", adr: "ADR-020" },
  { de: "evidence", para: "recommendation", algoritmo: "recommendation.ranquear", adr: "ADR-020" },
  { de: "recommendation", para: "advisor", algoritmo: "advisory.briefingExecutivo", adr: "ADR-020" },
  { de: "advisor", para: "knowledge", algoritmo: "knowledge-build.montarGrafoConhecimento", adr: "ADR-027" },
  { de: "recommendation", para: "knowledge", algoritmo: "knowledge-build.montarGrafoConhecimento", adr: "ADR-027" },
  { de: "evidence", para: "knowledge", algoritmo: "knowledge-build.montarGrafoConhecimento", adr: "ADR-027" },
  { de: "knowledge", para: "executive", algoritmo: "orchestrator.executiveStory", adr: "ADR-029" },
  { de: "advisor", para: "executive", algoritmo: "predictive.radarExecutivo", adr: "ADR-021" },
];

export type GrafoDependencias = {
  contextos: Contexto[];
  dependencias: readonly Dependencia[];
  /** Ordem topológica de execução. */
  ordem: Contexto[];
  /** Ciclos detectados — o fluxo precisa ser acíclico. */
  ciclos: Contexto[][];
  /** Contextos sem dependência de entrada (raízes do fluxo). */
  raizes: Contexto[];
  /** Contextos sem consumidor (folhas). */
  folhas: Contexto[];
};

export function grafoDependencias(
  dependencias: readonly Dependencia[] = DEPENDENCIAS,
): GrafoDependencias {
  const entradas = new Map<Contexto, Contexto[]>();
  const saidas = new Map<Contexto, Contexto[]>();
  for (const c of CONTEXTOS) {
    entradas.set(c, []);
    saidas.set(c, []);
  }
  for (const d of dependencias) {
    entradas.get(d.para)!.push(d.de);
    saidas.get(d.de)!.push(d.para);
  }

  // Kahn: sobra de arestas indica ciclo.
  const grau = new Map<Contexto, number>(CONTEXTOS.map((c) => [c, entradas.get(c)!.length]));
  const fila = CONTEXTOS.filter((c) => grau.get(c) === 0);
  const ordem: Contexto[] = [];
  while (fila.length) {
    const atual = fila.shift()!;
    ordem.push(atual);
    for (const proximo of saidas.get(atual)!) {
      grau.set(proximo, grau.get(proximo)! - 1);
      if (grau.get(proximo) === 0) fila.push(proximo);
    }
  }

  const restantes = CONTEXTOS.filter((c) => !ordem.includes(c));
  const ciclos = restantes.length ? [restantes] : [];

  return {
    contextos: [...CONTEXTOS],
    dependencias,
    ordem,
    ciclos,
    raizes: CONTEXTOS.filter((c) => entradas.get(c)!.length === 0),
    folhas: CONTEXTOS.filter((c) => saidas.get(c)!.length === 0),
  };
}

/* ------------------------------------------------------------------ *
 * GATE 02 — Impact Analysis
 * ------------------------------------------------------------------ */

export type ImpactoContexto = {
  contexto: Contexto;
  /** Distância em saltos desde a origem da mudança. */
  profundidade: number;
  /** Como a mudança chegou até aqui. */
  caminho: Contexto[];
  algoritmos: string[];
};

export type Impacto = {
  origem: Contexto;
  afetados: ImpactoContexto[];
  /** Contextos que NÃO são afetados — reaproveitáveis (GATE 03). */
  intactos: Contexto[];
};

/** Responde: "se este dado mudar, o que será recalculado?". */
export function analisarImpacto(
  origem: Contexto,
  dependencias: readonly Dependencia[] = DEPENDENCIAS,
): Impacto {
  const saidas = new Map<Contexto, Dependencia[]>();
  for (const d of dependencias) saidas.set(d.de, [...(saidas.get(d.de) ?? []), d]);

  const melhor = new Map<Contexto, ImpactoContexto>();
  const fila: { ctx: Contexto; prof: number; caminho: Contexto[] }[] = [
    { ctx: origem, prof: 0, caminho: [origem] },
  ];

  while (fila.length) {
    const atual = fila.shift()!;
    for (const dep of saidas.get(atual.ctx) ?? []) {
      const prof = atual.prof + 1;
      const caminho = [...atual.caminho, dep.para];
      const existente = melhor.get(dep.para);
      if (existente && existente.profundidade <= prof) {
        if (!existente.algoritmos.includes(dep.algoritmo)) existente.algoritmos.push(dep.algoritmo);
        continue;
      }
      melhor.set(dep.para, {
        contexto: dep.para,
        profundidade: prof,
        caminho,
        algoritmos: [dep.algoritmo],
      });
      fila.push({ ctx: dep.para, prof, caminho });
    }
  }

  const afetados = [...melhor.values()].sort(
    (a, b) => a.profundidade - b.profundidade || a.contexto.localeCompare(b.contexto),
  );
  const afetadosSet = new Set(afetados.map((a) => a.contexto));

  return {
    origem,
    afetados,
    intactos: CONTEXTOS.filter((c) => c !== origem && !afetadosSet.has(c)),
  };
}

/* ------------------------------------------------------------------ *
 * GATE 04 — Knowledge Cache (invalidado por evento, nunca por tempo)
 * ------------------------------------------------------------------ */

export type EventoMudanca = {
  /** Evento de domínio/plataforma que disparou a mudança. */
  evento: string;
  contexto: Contexto;
  em: string;
  detalhe?: string | null;
};

export type EntradaCache = {
  chave: string;
  contexto: Contexto;
  /** Versão do dado no momento do cálculo. */
  calculadoEm: string;
  /** Eventos já absorvidos por esta entrada. */
  eventos: string[];
  valida: boolean;
  /** Motivo da invalidação — sempre um evento, nunca "expirou". */
  invalidadaPor: string | null;
};

export const chaveCache = (contexto: Contexto, workspaceId: string, escopo = "default") =>
  `${contexto}:${workspaceId}:${escopo}`;

export function entradaCache(
  contexto: Contexto,
  workspaceId: string,
  calculadoEm: string,
  escopo = "default",
): EntradaCache {
  return {
    chave: chaveCache(contexto, workspaceId, escopo),
    contexto,
    calculadoEm,
    eventos: [],
    valida: true,
    invalidadaPor: null,
  };
}

/**
 * Invalida por propagação de evento: o contexto de origem e todos os
 * dependentes. Tempo não invalida nada — idade é reportada pelo Freshness.
 */
export function invalidarPorEvento(
  cache: EntradaCache[],
  evento: EventoMudanca,
  dependencias: readonly Dependencia[] = DEPENDENCIAS,
): EntradaCache[] {
  const impacto = analisarImpacto(evento.contexto, dependencias);
  const alcancados = new Set<Contexto>([evento.contexto, ...impacto.afetados.map((a) => a.contexto)]);

  return cache.map((e) => {
    if (!alcancados.has(e.contexto)) return e;
    if (!e.valida) return { ...e, eventos: [...e.eventos, evento.evento] };
    return {
      ...e,
      valida: false,
      invalidadaPor: evento.evento,
      eventos: [...e.eventos, evento.evento],
    };
  });
}

/* ------------------------------------------------------------------ *
 * GATE 03 — Recalculation Engine
 * ------------------------------------------------------------------ */

export type Tarefa = {
  contexto: Contexto;
  ordem: number;
  acao: "recalcular" | "reaproveitar";
  motivo: string;
  eventos: string[];
  algoritmos: string[];
};

export type PlanoRecalculo = {
  tarefas: Tarefa[];
  recalcular: Contexto[];
  reaproveitar: Contexto[];
  /** Percentual de contextos poupados pelo cache. */
  economia: number;
  eventos: EventoMudanca[];
};

/**
 * Recalcula somente o necessário: contextos com cache válido e fora do alcance
 * dos eventos são reaproveitados.
 */
export function planoRecalculo(
  eventos: EventoMudanca[],
  cache: EntradaCache[] = [],
  dependencias: readonly Dependencia[] = DEPENDENCIAS,
): PlanoRecalculo {
  const grafo = grafoDependencias(dependencias);
  const alvo = new Map<Contexto, { eventos: Set<string>; algoritmos: Set<string> }>();

  const registrar = (ctx: Contexto, evento: string, algoritmo?: string) => {
    const atual = alvo.get(ctx) ?? { eventos: new Set<string>(), algoritmos: new Set<string>() };
    atual.eventos.add(evento);
    if (algoritmo) atual.algoritmos.add(algoritmo);
    alvo.set(ctx, atual);
  };

  for (const ev of eventos) {
    registrar(ev.contexto, ev.evento);
    for (const af of analisarImpacto(ev.contexto, dependencias).afetados) {
      af.algoritmos.forEach((a) => registrar(af.contexto, ev.evento, a));
    }
  }

  const validos = new Set(cache.filter((e) => e.valida).map((e) => e.contexto));

  const tarefas: Tarefa[] = grafo.ordem
    .filter((ctx) => alvo.has(ctx) || validos.has(ctx))
    .map((ctx, i) => {
      const alcancado = alvo.get(ctx);
      if (!alcancado) {
        return {
          contexto: ctx,
          ordem: i + 1,
          acao: "reaproveitar" as const,
          motivo: "Nenhum evento alcançou este contexto; resultado em cache continua válido.",
          eventos: [],
          algoritmos: [],
        };
      }
      return {
        contexto: ctx,
        ordem: i + 1,
        acao: "recalcular" as const,
        motivo:
          ctx === eventos.find((e) => e.contexto === ctx)?.contexto
            ? "Contexto de origem do evento."
            : "Depende de contexto alterado.",
        eventos: [...alcancado.eventos].sort(),
        algoritmos: [...alcancado.algoritmos].sort(),
      };
    })
    .map((t, i) => ({ ...t, ordem: i + 1 }));

  const recalcular = tarefas.filter((t) => t.acao === "recalcular").map((t) => t.contexto);
  const reaproveitar = tarefas.filter((t) => t.acao === "reaproveitar").map((t) => t.contexto);

  return {
    tarefas,
    recalcular,
    reaproveitar,
    economia:
      tarefas.length === 0 ? 0 : Math.round((reaproveitar.length / tarefas.length) * 100),
    eventos,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 05 — Explain Update
 * ------------------------------------------------------------------ */

export type MudancaValor = {
  alvo: string;
  rotulo: string;
  contexto: Contexto;
  de: number | null;
  para: number | null;
  em: string;
};

export type ExplainUpdate = {
  mudanca: MudancaValor;
  delta: number | null;
  direcao: "subiu" | "caiu" | "estavel" | "indefinida";
  /** Cadeia de propagação, do gatilho até o valor observado. */
  cadeia: { contexto: Contexto; algoritmo: string; adr: string; evento: string | null }[];
  gatilho: EventoMudanca | null;
  /** Frases sem verbo causal (ADR-026). */
  narrativa: string[];
  /** Lacunas declaradas em vez de preenchidas. */
  lacunas: string[];
};

/** Explica por que um número mudou, sem afirmar causa. */
export function explainUpdate(
  mudanca: MudancaValor,
  eventos: EventoMudanca[],
  dependencias: readonly Dependencia[] = DEPENDENCIAS,
): ExplainUpdate {
  const delta =
    mudanca.de === null || mudanca.para === null ? null : Number((mudanca.para - mudanca.de).toFixed(2));
  const direcao =
    delta === null ? "indefinida" : delta > 0 ? "subiu" : delta < 0 ? "caiu" : "estavel";

  // Gatilho = evento mais recente em contexto que alcança o alvo.
  const candidatos = eventos.filter((ev) => {
    if (ev.contexto === mudanca.contexto) return true;
    return analisarImpacto(ev.contexto, dependencias).afetados.some(
      (a) => a.contexto === mudanca.contexto,
    );
  });
  const gatilho =
    candidatos.length === 0
      ? null
      : candidatos.reduce((maisRecente, ev) => (ev.em > maisRecente.em ? ev : maisRecente));

  const cadeia: ExplainUpdate["cadeia"] = [];
  if (gatilho) {
    const impacto = analisarImpacto(gatilho.contexto, dependencias);
    const rota =
      gatilho.contexto === mudanca.contexto
        ? [gatilho.contexto]
        : (impacto.afetados.find((a) => a.contexto === mudanca.contexto)?.caminho ?? [gatilho.contexto]);
    for (let i = 0; i < rota.length; i += 1) {
      const ctx = rota[i]!;
      const dep = dependencias.find((d) => d.de === rota[i - 1] && d.para === ctx);
      cadeia.push({
        contexto: ctx,
        algoritmo: dep?.algoritmo ?? "—",
        adr: dep?.adr ?? "ADR-029",
        evento: i === 0 ? gatilho.evento : null,
      });
    }
  }

  const lacunas: string[] = [];
  if (!gatilho) lacunas.push("Nenhum evento registrado alcança este indicador no período.");
  if (delta === null) lacunas.push("Valor anterior ou atual ausente — variação não calculada.");

  const narrativa: string[] = [];
  if (delta !== null) {
    narrativa.push(
      `${mudanca.rotulo}: ${mudanca.de} → ${mudanca.para} (${delta > 0 ? "+" : ""}${delta}).`,
    );
  } else {
    narrativa.push(`${mudanca.rotulo}: variação não calculada.`);
  }
  if (gatilho) {
    narrativa.push(`Evento registrado antes da mudança: ${gatilho.evento}${gatilho.detalhe ? ` (${gatilho.detalhe})` : ""}.`);
    narrativa.push(
      `Propagação: ${cadeia.map((c) => contextoLabels[c.contexto]).join(" → ")}.`,
    );
    narrativa.push("A mudança coincidiu com esse recálculo. Nenhuma relação causal foi estabelecida.");
  }

  return { mudanca, delta, direcao, cadeia, gatilho, narrativa, lacunas };
}

/* ------------------------------------------------------------------ *
 * GATE 06 — Knowledge Diff
 * ------------------------------------------------------------------ */

export type ItemDiff = {
  alvo: string;
  rotulo: string;
  contexto: Contexto;
  tipo: "adicionado" | "removido" | "alterado";
  de: number | null;
  para: number | null;
  /** Algoritmo que produziu o novo valor. */
  algoritmo: string | null;
  evento: string | null;
  em: string | null;
};

export type SnapshotItem = {
  alvo: string;
  rotulo: string;
  contexto: Contexto;
  valor: number | null;
  algoritmo?: string | null;
  em?: string | null;
};

export type KnowledgeDiff = {
  de: string;
  para: string;
  itens: ItemDiff[];
  adicionados: number;
  removidos: number;
  alterados: number;
  eventos: EventoMudanca[];
};

/** Compara dois momentos do conhecimento: o que mudou, por que e via qual evento. */
export function knowledgeDiff(
  antes: { em: string; itens: SnapshotItem[] },
  depois: { em: string; itens: SnapshotItem[] },
  eventos: EventoMudanca[] = [],
): KnowledgeDiff {
  const mapaAntes = new Map(antes.itens.map((i) => [i.alvo, i]));
  const mapaDepois = new Map(depois.itens.map((i) => [i.alvo, i]));
  const itens: ItemDiff[] = [];

  const eventoDe = (contexto: Contexto): string | null => {
    const candidatos = eventos.filter(
      (ev) =>
        ev.contexto === contexto ||
        analisarImpacto(ev.contexto).afetados.some((a) => a.contexto === contexto),
    );
    if (candidatos.length === 0) return null;
    return candidatos.reduce((m, ev) => (ev.em > m.em ? ev : m)).evento;
  };

  for (const item of depois.itens) {
    const anterior = mapaAntes.get(item.alvo);
    if (!anterior) {
      itens.push({
        alvo: item.alvo,
        rotulo: item.rotulo,
        contexto: item.contexto,
        tipo: "adicionado",
        de: null,
        para: item.valor,
        algoritmo: item.algoritmo ?? null,
        evento: eventoDe(item.contexto),
        em: item.em ?? depois.em,
      });
      continue;
    }
    if (anterior.valor !== item.valor) {
      itens.push({
        alvo: item.alvo,
        rotulo: item.rotulo,
        contexto: item.contexto,
        tipo: "alterado",
        de: anterior.valor,
        para: item.valor,
        algoritmo: item.algoritmo ?? null,
        evento: eventoDe(item.contexto),
        em: item.em ?? depois.em,
      });
    }
  }

  for (const item of antes.itens) {
    if (!mapaDepois.has(item.alvo)) {
      itens.push({
        alvo: item.alvo,
        rotulo: item.rotulo,
        contexto: item.contexto,
        tipo: "removido",
        de: item.valor,
        para: null,
        algoritmo: item.algoritmo ?? null,
        evento: eventoDe(item.contexto),
        em: antes.em,
      });
    }
  }

  return {
    de: antes.em,
    para: depois.em,
    itens: itens.sort((a, b) => a.contexto.localeCompare(b.contexto) || a.rotulo.localeCompare(b.rotulo)),
    adicionados: itens.filter((i) => i.tipo === "adicionado").length,
    removidos: itens.filter((i) => i.tipo === "removido").length,
    alterados: itens.filter((i) => i.tipo === "alterado").length,
    eventos,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 07 — Knowledge Audit
 * ------------------------------------------------------------------ */

export type ExecucaoContexto = {
  contexto: Contexto;
  em: string | null;
  ok: boolean;
  duracaoMs: number | null;
  detalhe?: string | null;
};

export type LinhaAuditoria = {
  ordem: number;
  contexto: Contexto;
  rotulo: string;
  situacao: "atualizado" | "reaproveitado" | "falhou" | "pendente";
  em: string | null;
  duracaoMs: number | null;
  algoritmos: string[];
  eventos: string[];
};

export type Auditoria = {
  geradaEm: string;
  linhas: LinhaAuditoria[];
  atualizados: number;
  pendentes: number;
  falhas: number;
  /** true quando toda a cadeia planejada foi concluída sem falha. */
  cadeiaCompleta: boolean;
};

/** Relatório da propagação: Knowledge → Evidence → Advisor → Radar → Forecast. */
export function auditoriaConhecimento(
  plano: PlanoRecalculo,
  execucoes: ExecucaoContexto[],
  geradaEm = new Date().toISOString(),
): Auditoria {
  const porContexto = new Map(execucoes.map((e) => [e.contexto, e]));

  const linhas: LinhaAuditoria[] = plano.tarefas.map((t, i) => {
    const exec = porContexto.get(t.contexto);
    const situacao: LinhaAuditoria["situacao"] =
      t.acao === "reaproveitar"
        ? "reaproveitado"
        : !exec
          ? "pendente"
          : exec.ok
            ? "atualizado"
            : "falhou";
    return {
      ordem: i + 1,
      contexto: t.contexto,
      rotulo: contextoLabels[t.contexto],
      situacao,
      em: exec?.em ?? null,
      duracaoMs: exec?.duracaoMs ?? null,
      algoritmos: t.algoritmos,
      eventos: t.eventos,
    };
  });

  return {
    geradaEm,
    linhas,
    atualizados: linhas.filter((l) => l.situacao === "atualizado").length,
    pendentes: linhas.filter((l) => l.situacao === "pendente").length,
    falhas: linhas.filter((l) => l.situacao === "falhou").length,
    cadeiaCompleta: linhas.every((l) => l.situacao === "atualizado" || l.situacao === "reaproveitado"),
  };
}

/* ------------------------------------------------------------------ *
 * GATE 08 — Executive Story
 * ------------------------------------------------------------------ */

export type InsumosHistoria = {
  periodoSemanas: number;
  /** Variações já calculadas por outros motores — nunca recalculadas aqui. */
  mudancas: MudancaValor[];
  eventos: EventoMudanca[];
  /** Recomendações implementadas no período (contagem observada). */
  recomendacoesImplementadas: number;
  /** Confiança média do conhecimento (Sprint 26.1). */
  confiancaConhecimento: number | null;
  frescorConhecimento: number | null;
};

export type ExecutiveStory = {
  periodoSemanas: number;
  paragrafos: string[];
  /** Cada afirmação aponta os alvos que a sustentam. */
  evidencias: { afirmacao: string; alvos: string[] }[];
  lacunas: string[];
  /** true quando há dado suficiente para narrar. */
  narravel: boolean;
  aviso: string;
};

const AVISO_STORY =
  "Narrativa construída apenas com variações e eventos registrados no período. " +
  "Movimentos coincidentes não implicam relação causal.";

/** Conta a história do período usando somente dado observado. */
export function executiveStory(insumos: InsumosHistoria): ExecutiveStory {
  const comDelta = insumos.mudancas.filter((m) => m.de !== null && m.para !== null);
  const lacunas: string[] = [];
  const evidencias: ExecutiveStory["evidencias"] = [];

  if (insumos.mudancas.length === 0) lacunas.push("Nenhuma variação registrada no período.");
  if (comDelta.length < insumos.mudancas.length) {
    lacunas.push("Indicadores sem valor anterior ficaram fora da narrativa.");
  }
  if (insumos.eventos.length === 0) lacunas.push("Nenhum evento de recálculo registrado no período.");
  if (insumos.confiancaConhecimento === null) lacunas.push("Confiança do conhecimento indisponível.");

  if (comDelta.length === 0) {
    return {
      periodoSemanas: insumos.periodoSemanas,
      paragrafos: [
        `Nas últimas ${insumos.periodoSemanas} semanas não há variações suficientes para narrar o período.`,
      ],
      evidencias: [],
      lacunas,
      narravel: false,
      aviso: AVISO_STORY,
    };
  }

  const delta = (m: MudancaValor) => (m.para as number) - (m.de as number);
  const quedas = comDelta.filter((m) => delta(m) < 0).sort((a, b) => delta(a) - delta(b));
  const altas = comDelta.filter((m) => delta(m) > 0).sort((a, b) => delta(b) - delta(a));

  const paragrafos: string[] = [];
  const fmt = (m: MudancaValor) => `${m.rotulo} (${m.de} → ${m.para})`;

  if (quedas.length) {
    const alvos = quedas.slice(0, 3);
    const frase =
      `Nas últimas ${insumos.periodoSemanas} semanas, a redução em ` +
      `${alvos.map(fmt).join(", ")} coincidiu com o período observado.`;
    paragrafos.push(frase);
    evidencias.push({ afirmacao: frase, alvos: alvos.map((m) => m.alvo) });
  }

  if (altas.length) {
    const alvos = altas.slice(0, 3);
    const frase = `No mesmo período, ${alvos.map(fmt).join(", ")} apresentaram elevação.`;
    paragrafos.push(frase);
    evidencias.push({ afirmacao: frase, alvos: alvos.map((m) => m.alvo) });
  }

  if (insumos.recomendacoesImplementadas > 0) {
    const frase =
      `${insumos.recomendacoesImplementadas} recomendação(ões) foram implementadas no período, ` +
      "e os indicadores acima refletem a medição posterior a essas decisões.";
    paragrafos.push(frase);
    evidencias.push({ afirmacao: frase, alvos: ["recommendation_history"] });
  }

  if (insumos.eventos.length) {
    const ctxs = [...new Set(insumos.eventos.map((e) => contextoLabels[e.contexto]))];
    const frase =
      `Os recálculos do período foram disparados por ${insumos.eventos.length} evento(s) ` +
      `nos contextos: ${ctxs.join(", ")}.`;
    paragrafos.push(frase);
    evidencias.push({ afirmacao: frase, alvos: insumos.eventos.map((e) => e.evento) });
  }

  if (insumos.confiancaConhecimento !== null || insumos.frescorConhecimento !== null) {
    const partes = [
      insumos.confiancaConhecimento !== null
        ? `confiança do conhecimento em ${insumos.confiancaConhecimento}%`
        : null,
      insumos.frescorConhecimento !== null ? `frescor em ${insumos.frescorConhecimento}%` : null,
    ].filter(Boolean);
    const frase = `Leitura sustentada com ${partes.join(" e ")}.`;
    paragrafos.push(frase);
    evidencias.push({ afirmacao: frase, alvos: ["knowledge_health"] });
  }

  return {
    periodoSemanas: insumos.periodoSemanas,
    paragrafos,
    evidencias,
    lacunas,
    narravel: true,
    aviso: AVISO_STORY,
  };
}
