/**
 * SPRINT 28 — ENTERPRISE MEMORY (ADR-031)
 *
 * Bounded context independente. Não conhece o Advisor, não conhece o CRM:
 * recebe registros (decisões, campanhas, lições, playbooks) e devolve
 * memória organizacional auditável.
 *
 * Regras duras desta camada:
 * - nenhuma lição sem evidência registrada;
 * - nenhuma decisão sem contexto e motivo;
 * - nenhum playbook sem número mínimo de casos e limitações declaradas;
 * - Decision DNA é DESCRIÇÃO histórica, nunca regra prescritiva;
 * - o que não foi registrado vira lacuna declarada, nunca número estimado.
 */

export type MemoryCategoria = "decisao" | "campanha" | "reuniao" | "estrategia" | "mudanca";
export type DecisionStatus =
  | "registrada"
  | "aprovada"
  | "executada"
  | "avaliada"
  | "revisada"
  | "descartada";
export type LessonTipo = "acerto" | "erro" | "risco" | "oportunidade" | "boa_pratica";
export type CampaignStatus = "planejada" | "ativa" | "pausada" | "encerrada" | "cancelada";

export const categoriaLabels: Record<MemoryCategoria, string> = {
  decisao: "Decisão",
  campanha: "Campanha",
  reuniao: "Reunião",
  estrategia: "Estratégia",
  mudanca: "Mudança",
};

export const statusLabels: Record<DecisionStatus, string> = {
  registrada: "Registrada",
  aprovada: "Aprovada",
  executada: "Executada",
  avaliada: "Avaliada",
  revisada: "Revisada",
  descartada: "Descartada",
};

export const licaoLabels: Record<LessonTipo, string> = {
  acerto: "Acerto",
  erro: "Erro",
  risco: "Risco",
  oportunidade: "Oportunidade",
  boa_pratica: "Boa prática",
};

export const campanhaStatusLabels: Record<CampaignStatus, string> = {
  planejada: "Planejada",
  ativa: "Ativa",
  pausada: "Pausada",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

export type Decisao = {
  id: string;
  categoria: MemoryCategoria;
  status: DecisionStatus;
  titulo: string;
  contexto: string;
  motivo: string;
  hipotese: string | null;
  evidencias: string[];
  responsavelNome: string | null;
  participantes: string[];
  prazo: string | null;
  aprovadoEm: string | null;
  executadoEm: string | null;
  resultado: string | null;
  resultadoValor: number | null;
  avaliacao: number | null;
  avaliadoEm: string | null;
  revisao: string | null;
  revisadoEm: string | null;
  rollbackPlano: string | null;
  impacto: string | null;
  tema: string | null;
  tags: string[];
  criadoEm: string;
};

export type Campanha = {
  id: string;
  status: CampaignStatus;
  nome: string;
  objetivo: string;
  estrategia: string;
  canal: string | null;
  publico: string | null;
  investimento: number;
  inicio: string | null;
  fim: string | null;
  leads: number;
  oportunidades: number;
  vendas: number;
  receita: number;
  motivoNascimento: string | null;
  motivoMudanca: string | null;
  motivoEncerramento: string | null;
  responsavelNome: string | null;
  tema: string | null;
  criadoEm: string;
};

export type Licao = {
  id: string;
  tipo: LessonTipo;
  titulo: string;
  licao: string;
  evidencias: string[];
  decisionId: string | null;
  campaignId: string | null;
  origem: string;
  tema: string | null;
  criadoEm: string;
};

export type Playbook = {
  id: string;
  titulo: string;
  tema: string;
  casos: number;
  periodoInicio: string | null;
  periodoFim: string | null;
  taxaSucesso: number | null;
  passos: PlaybookPasso[];
  limitacoes: string[];
  versao: number;
  geradoEm: string;
};

export type PlaybookPasso = { ordem: number; passo: string; base: string };

/* ------------------------------------------------------------------ *
 * GATE 01 — Decision Memory: completude do registro
 * ------------------------------------------------------------------ */

export const ELEMENTOS_DECISAO = [
  "responsável",
  "contexto",
  "hipótese",
  "motivo",
  "evidências utilizadas",
  "resultado observado",
  "revisão posterior",
] as const;

export type Completude = {
  pontos: number;
  preenchidos: string[];
  faltando: string[];
};

const cheio = (v: string | null | undefined) => typeof v === "string" && v.trim().length > 0;

/** Completude da memória de UMA decisão: 7 elementos exigidos pela ADR-031. */
export function completudeDecisao(d: Decisao): Completude {
  const presentes: Record<(typeof ELEMENTOS_DECISAO)[number], boolean> = {
    responsável: cheio(d.responsavelNome),
    contexto: cheio(d.contexto),
    hipótese: cheio(d.hipotese),
    motivo: cheio(d.motivo),
    "evidências utilizadas": d.evidencias.length > 0,
    "resultado observado": cheio(d.resultado),
    "revisão posterior": cheio(d.revisao),
  };
  const preenchidos = ELEMENTOS_DECISAO.filter((e) => presentes[e]);
  const faltando = ELEMENTOS_DECISAO.filter((e) => !presentes[e]);
  return {
    pontos: Math.round((preenchidos.length / ELEMENTOS_DECISAO.length) * 100),
    preenchidos: [...preenchidos],
    faltando: [...faltando],
  };
}

/** Próximo passo formal do ciclo de vida da decisão. Sem pulo de etapa. */
export const PROXIMO_STATUS: Record<DecisionStatus, DecisionStatus | null> = {
  registrada: "aprovada",
  aprovada: "executada",
  executada: "avaliada",
  avaliada: "revisada",
  revisada: null,
  descartada: null,
};

/* ------------------------------------------------------------------ *
 * GATE 02 — Campaign Memory: ROI só quando houve investimento medido
 * ------------------------------------------------------------------ */

export type CampanhaMemoria = {
  campanha: Campanha;
  roiPct: number | null;
  cpl: number | null;
  conversaoPct: number | null;
  narrativa: { porQueNasceu: string | null; porQueMudou: string | null; porQueTerminou: string | null };
  lacunas: string[];
};

export function memoriaCampanha(c: Campanha): CampanhaMemoria {
  const lacunas: string[] = [];
  if (c.investimento <= 0) lacunas.push("investimento não registrado — ROI e CPL indisponíveis");
  if (c.leads <= 0) lacunas.push("nenhum lead registrado — conversão indisponível");
  if (!cheio(c.motivoNascimento)) lacunas.push("motivo de nascimento não registrado");
  if (c.status === "encerrada" && !cheio(c.motivoEncerramento))
    lacunas.push("campanha encerrada sem motivo de encerramento");

  const roiPct =
    c.investimento > 0 ? Math.round(((c.receita - c.investimento) / c.investimento) * 1000) / 10 : null;
  const cpl = c.investimento > 0 && c.leads > 0 ? Math.round((c.investimento / c.leads) * 100) / 100 : null;
  const conversaoPct = c.leads > 0 ? Math.round((c.vendas / c.leads) * 1000) / 10 : null;

  return {
    campanha: c,
    roiPct,
    cpl,
    conversaoPct,
    narrativa: {
      porQueNasceu: c.motivoNascimento,
      porQueMudou: c.motivoMudanca,
      porQueTerminou: c.motivoEncerramento,
    },
    lacunas,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 03 — Lesson Engine
 * Toda lição nasce de dado REGISTRADO. Sem dado, nenhuma lição é criada.
 * ------------------------------------------------------------------ */

export type LicaoProposta = {
  tipo: LessonTipo;
  titulo: string;
  licao: string;
  evidencias: string[];
  tema: string | null;
};

export function motorLicoes(c: Campanha, referencia?: { roiMedianoPct: number | null }): {
  licoes: LicaoProposta[];
  lacunas: string[];
} {
  const m = memoriaCampanha(c);
  const licoes: LicaoProposta[] = [];
  const tema = c.tema ?? c.canal ?? null;
  const ev = (...partes: string[]) => partes.filter(Boolean);

  if (m.roiPct != null) {
    const base = ev(
      `investimento registrado: R$ ${c.investimento.toFixed(2)}`,
      `receita registrada: R$ ${c.receita.toFixed(2)}`,
      `ROI observado: ${m.roiPct}%`,
    );
    if (m.roiPct > 0) {
      licoes.push({
        tipo: "acerto",
        titulo: `Retorno positivo em "${c.nome}"`,
        licao: `A campanha devolveu mais do que consumiu (ROI ${m.roiPct}%). Estratégia registrada: ${c.estrategia}.`,
        evidencias: base,
        tema,
      });
    } else {
      licoes.push({
        tipo: "erro",
        titulo: `Retorno negativo em "${c.nome}"`,
        licao: `A campanha consumiu mais do que devolveu (ROI ${m.roiPct}%). Objetivo declarado: ${c.objetivo}.`,
        evidencias: base,
        tema,
      });
    }
    if (referencia?.roiMedianoPct != null && m.roiPct > referencia.roiMedianoPct) {
      licoes.push({
        tipo: "boa_pratica",
        titulo: `"${c.nome}" acima da mediana histórica`,
        licao: `ROI ${m.roiPct}% contra mediana histórica de ${referencia.roiMedianoPct}% no workspace.`,
        evidencias: [...base, `mediana histórica registrada: ${referencia.roiMedianoPct}%`],
        tema,
      });
    }
  }

  if (m.conversaoPct != null && c.vendas === 0) {
    licoes.push({
      tipo: "risco",
      titulo: `"${c.nome}" gerou volume sem venda`,
      licao: `${c.leads} leads registrados e nenhuma venda registrada no período da campanha.`,
      evidencias: [`leads: ${c.leads}`, `vendas: ${c.vendas}`],
      tema,
    });
  }

  if (m.conversaoPct != null && c.vendas > 0 && c.oportunidades > 0) {
    licoes.push({
      tipo: "oportunidade",
      titulo: `Público responde em "${c.nome}"`,
      licao: `Conversão observada de ${m.conversaoPct}% (${c.vendas} vendas em ${c.leads} leads); público registrado: ${c.publico ?? "não informado"}.`,
      evidencias: [
        `leads: ${c.leads}`,
        `oportunidades: ${c.oportunidades}`,
        `vendas: ${c.vendas}`,
        `conversão: ${m.conversaoPct}%`,
      ],
      tema,
    });
  }

  const lacunas = [...m.lacunas];
  if (licoes.length === 0)
    lacunas.push("dados insuficientes para gerar lições — nenhuma lição foi inventada");

  return { licoes, lacunas };
}

export function roiMedianoHistorico(campanhas: Campanha[]): number | null {
  const rois = campanhas
    .map((c) => memoriaCampanha(c).roiPct)
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);
  if (rois.length === 0) return null;
  const meio = Math.floor(rois.length / 2);
  const mediana = rois.length % 2 === 1 ? rois[meio]! : ((rois[meio - 1]! + rois[meio]!) / 2);
  return Math.round(mediana * 10) / 10;
}

/* ------------------------------------------------------------------ *
 * GATE 04 — Corporate Timeline
 * ------------------------------------------------------------------ */

export type ItemTimeline = {
  em: string;
  tipo: "decisao" | "campanha" | "licao" | "playbook" | "marco";
  titulo: string;
  detalhe: string | null;
  refId: string;
};

export type AnoTimeline = { ano: number; total: number; itens: ItemTimeline[] };

export function timelineCorporativa(entrada: {
  decisoes: Decisao[];
  campanhas: Campanha[];
  licoes: Licao[];
  playbooks: Playbook[];
  marcos?: ItemTimeline[];
}): AnoTimeline[] {
  const itens: ItemTimeline[] = [
    ...entrada.decisoes.map((d) => ({
      em: d.criadoEm,
      tipo: "decisao" as const,
      titulo: d.titulo,
      detalhe: `${categoriaLabels[d.categoria]} · ${statusLabels[d.status]}`,
      refId: d.id,
    })),
    ...entrada.campanhas.map((c) => ({
      em: c.criadoEm,
      tipo: "campanha" as const,
      titulo: c.nome,
      detalhe: `${campanhaStatusLabels[c.status]}${c.canal ? ` · ${c.canal}` : ""}`,
      refId: c.id,
    })),
    ...entrada.licoes.map((l) => ({
      em: l.criadoEm,
      tipo: "licao" as const,
      titulo: l.titulo,
      detalhe: licaoLabels[l.tipo],
      refId: l.id,
    })),
    ...entrada.playbooks.map((p) => ({
      em: p.geradoEm,
      tipo: "playbook" as const,
      titulo: p.titulo,
      detalhe: `${p.casos} casos · v${p.versao}`,
      refId: p.id,
    })),
    ...(entrada.marcos ?? []),
  ].sort((a, b) => (a.em < b.em ? 1 : a.em > b.em ? -1 : 0));

  const porAno = new Map<number, ItemTimeline[]>();
  for (const item of itens) {
    const ano = new Date(item.em).getUTCFullYear();
    if (!Number.isFinite(ano)) continue;
    const lista = porAno.get(ano) ?? [];
    lista.push(item);
    porAno.set(ano, lista);
  }

  return [...porAno.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([ano, lista]) => ({ ano, total: lista.length, itens: lista }));
}

/* ------------------------------------------------------------------ *
 * GATE 05 — Knowledge Reuse
 * Responde "há registros comparáveis?", nunca "faça isto".
 * ------------------------------------------------------------------ */

const IRRELEVANTES = new Set([
  "de","da","do","das","dos","a","o","as","os","e","em","no","na","nos","nas","para","por","com",
  "um","uma","que","ao","aos","à","às","the","of",
]);

export function tokens(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !IRRELEVANTES.has(t));
}

export function similaridade(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const uniao = ta.size + tb.size - inter;
  return uniao === 0 ? 0 : Math.round((inter / uniao) * 100) / 100;
}

export type CasoComparavel = {
  decisao: Decisao;
  similaridade: number;
  motivosDaComparacao: string[];
  resultadoObservado: string | null;
  avaliacao: number | null;
  diferencasDeContexto: string[];
};

export type ReusoConhecimento = {
  pergunta: string;
  casos: CasoComparavel[];
  baseUtilizada: string;
  limitacoes: string[];
};

export function reusoConhecimento(
  nova: { titulo: string; contexto: string; tema?: string | null; categoria?: MemoryCategoria; tags?: string[] },
  historico: Decisao[],
  opcoes: { minimo?: number; limite?: number } = {},
): ReusoConhecimento {
  const minimo = opcoes.minimo ?? 0.2;
  const limite = opcoes.limite ?? 5;
  const tagsNovas = new Set(nova.tags ?? []);

  const casos: CasoComparavel[] = [];
  for (const d of historico) {
    const motivos: string[] = [];
    let score = similaridade(`${nova.titulo} ${nova.contexto}`, `${d.titulo} ${d.contexto}`);
    if (motivos.length === 0 && score > 0) motivos.push(`texto semelhante (${Math.round(score * 100)}%)`);
    if (nova.tema && d.tema && nova.tema === d.tema) {
      score = Math.min(1, score + 0.25);
      motivos.push(`mesmo tema (${d.tema})`);
    }
    if (nova.categoria && d.categoria === nova.categoria) {
      score = Math.min(1, score + 0.1);
      motivos.push(`mesma categoria (${categoriaLabels[d.categoria]})`);
    }
    const tagsComuns = d.tags.filter((t) => tagsNovas.has(t));
    if (tagsComuns.length > 0) {
      score = Math.min(1, score + 0.05 * tagsComuns.length);
      motivos.push(`tags em comum: ${tagsComuns.join(", ")}`);
    }
    if (score < minimo) continue;

    const diferencas: string[] = [];
    if (nova.tema && d.tema && nova.tema !== d.tema) diferencas.push(`tema diferente: ${d.tema}`);
    if (!cheio(d.resultado)) diferencas.push("caso anterior sem resultado registrado");
    if (d.avaliacao == null) diferencas.push("caso anterior sem avaliação");
    diferencas.push(`registrado em ${d.criadoEm.slice(0, 10)}`);

    casos.push({
      decisao: d,
      similaridade: Math.round(score * 100) / 100,
      motivosDaComparacao: motivos,
      resultadoObservado: d.resultado,
      avaliacao: d.avaliacao,
      diferencasDeContexto: diferencas,
    });
  }

  casos.sort((a, b) => b.similaridade - a.similaridade);
  const selecionados = casos.slice(0, limite);

  const limitacoes: string[] = [];
  if (historico.length === 0) limitacoes.push("nenhuma decisão registrada na memória ainda");
  if (selecionados.length === 0 && historico.length > 0)
    limitacoes.push("nenhum registro anterior comparável acima do limiar de similaridade");
  if (selecionados.length > 0 && selecionados.every((c) => c.resultadoObservado == null))
    limitacoes.push("casos comparáveis existem, mas nenhum tem resultado observado");
  if (selecionados.length > 0 && selecionados.length < 3)
    limitacoes.push("amostra pequena: comparação com menos de 3 casos");

  return {
    pergunta: `Há registros anteriores comparáveis a "${nova.titulo}"?`,
    casos: selecionados,
    baseUtilizada: `memory_decisions — ${historico.length} registro(s) avaliados, ${selecionados.length} comparável(is)`,
    limitacoes,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 06 — Playbook Generator
 * ------------------------------------------------------------------ */

export const MINIMO_CASOS_PLAYBOOK = 5;

export type PlaybookProposta = {
  tema: string;
  titulo: string;
  casos: number;
  periodoInicio: string | null;
  periodoFim: string | null;
  taxaSucessoPct: number | null;
  casosAvaliados: number;
  passos: PlaybookPasso[];
  limitacoes: string[];
};

export type PlaybookIndisponivel = { tema: string; motivo: string; casos: number; faltam: number };

export function gerarPlaybook(
  tema: string,
  decisoes: Decisao[],
  minimo = MINIMO_CASOS_PLAYBOOK,
): PlaybookProposta | PlaybookIndisponivel {
  const casos = decisoes.filter((d) => (d.tema ?? "") === tema && d.status !== "descartada");
  if (casos.length < minimo) {
    return {
      tema,
      motivo: `histórico insuficiente: ${casos.length} caso(s) para o mínimo de ${minimo}`,
      casos: casos.length,
      faltam: minimo - casos.length,
    };
  }

  const datas = casos.map((c) => c.criadoEm).sort();
  const avaliados = casos.filter((c) => c.avaliacao != null);
  const sucessos = avaliados.filter((c) => (c.avaliacao ?? 0) >= 4).length;
  const taxaSucessoPct =
    avaliados.length > 0 ? Math.round((sucessos / avaliados.length) * 1000) / 10 : null;

  /* Passos = padrões que APARECEM no histórico, na ordem do ciclo de vida. */
  const passos: PlaybookPasso[] = [];
  const comHipotese = casos.filter((c) => cheio(c.hipotese)).length;
  const comEvidencia = casos.filter((c) => c.evidencias.length > 0).length;
  const comAprovacao = casos.filter((c) => c.aprovadoEm != null).length;
  const comRollback = casos.filter((c) => cheio(c.rollbackPlano)).length;
  const comRevisao = casos.filter((c) => cheio(c.revisao)).length;

  const add = (passo: string, quantos: number) => {
    if (quantos === 0) return;
    passos.push({
      ordem: passos.length + 1,
      passo,
      base: `observado em ${quantos} de ${casos.length} casos registrados`,
    });
  };
  add("Registrar hipótese antes de decidir", comHipotese);
  add("Anexar evidências utilizadas na decisão", comEvidencia);
  add("Formalizar aprovação com responsável identificado", comAprovacao);
  add("Declarar plano de reversão antes de executar", comRollback);
  add("Revisar a decisão após o resultado observado", comRevisao);

  const limitacoes: string[] = [
    `período analisado: ${datas[0]!.slice(0, 10)} a ${datas[datas.length - 1]!.slice(0, 10)}`,
    `${avaliados.length} de ${casos.length} casos possuem avaliação registrada`,
  ];
  if (taxaSucessoPct == null)
    limitacoes.push("nenhum caso avaliado — taxa de sucesso indisponível");
  if (avaliados.length > 0 && avaliados.length < 3)
    limitacoes.push("taxa de sucesso calculada sobre amostra menor que 3 casos");
  limitacoes.push("descrição do histórico do workspace; não é regra prescritiva (ADR-031)");

  return {
    tema,
    titulo: `Playbook — ${tema}`,
    casos: casos.length,
    periodoInicio: datas[0] ?? null,
    periodoFim: datas[datas.length - 1] ?? null,
    taxaSucessoPct,
    casosAvaliados: avaliados.length,
    passos,
    limitacoes,
  };
}

/** Temas com massa crítica para gerar playbook. */
export function temasElegiveis(decisoes: Decisao[], minimo = MINIMO_CASOS_PLAYBOOK) {
  const contagem = new Map<string, number>();
  for (const d of decisoes) {
    if (!cheio(d.tema) || d.status === "descartada") continue;
    contagem.set(d.tema!, (contagem.get(d.tema!) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .map(([tema, casos]) => ({ tema, casos, elegivel: casos >= minimo, faltam: Math.max(0, minimo - casos) }))
    .sort((a, b) => b.casos - a.casos);
}

/* ------------------------------------------------------------------ *
 * GATE 07 — Decision DNA (descritivo, nunca prescritivo)
 * ------------------------------------------------------------------ */

export type DecisionDNA = {
  totalDecisoes: number;
  estrategiasRecorrentes: { tema: string; casos: number; participacaoPct: number }[];
  padroesAprovacao: {
    aprovadas: number;
    semAprovacaoFormal: number;
    tempoMedioAprovacaoHoras: number | null;
    amostraAprovacao: number;
  };
  tempoMedioExecucaoHoras: number | null;
  fatoresObservados: { fator: string; comFator: number; semFator: number; diferencaMedia: number | null }[];
  lacunas: string[];
};

const horas = (de: string | null, ate: string | null): number | null => {
  if (!de || !ate) return null;
  const d = new Date(de).getTime();
  const a = new Date(ate).getTime();
  if (!Number.isFinite(d) || !Number.isFinite(a) || a < d) return null;
  return (a - d) / 36e5;
};

const media = (v: number[]) => (v.length === 0 ? null : v.reduce((s, x) => s + x, 0) / v.length);

export function decisionDNA(decisoes: Decisao[]): DecisionDNA {
  const total = decisoes.length;
  const lacunas: string[] = [];

  const temas = temasElegiveis(decisoes, 1);
  const estrategiasRecorrentes = temas
    .filter((t) => t.casos > 1)
    .map((t) => ({
      tema: t.tema,
      casos: t.casos,
      participacaoPct: total === 0 ? 0 : Math.round((t.casos / total) * 1000) / 10,
    }))
    .slice(0, 8);
  if (estrategiasRecorrentes.length === 0) lacunas.push("nenhum tema aparece mais de uma vez");

  const aprovadas = decisoes.filter((d) => d.aprovadoEm != null);
  const temposAprovacao = aprovadas
    .map((d) => horas(d.criadoEm, d.aprovadoEm))
    .filter((v): v is number => v != null);
  const temposExecucao = decisoes
    .map((d) => horas(d.aprovadoEm, d.executadoEm))
    .filter((v): v is number => v != null);
  if (temposAprovacao.length === 0) lacunas.push("nenhuma aprovação datada — tempo de decisão indisponível");
  if (temposExecucao.length === 0) lacunas.push("nenhuma execução datada — tempo de execução indisponível");

  /* Fatores: comparação descritiva de avaliação média com e sem o fator. */
  const avaliadas = decisoes.filter((d) => d.avaliacao != null);
  const fatores: DecisionDNA["fatoresObservados"] = [];
  const compara = (fator: string, tem: (d: Decisao) => boolean) => {
    const com = avaliadas.filter(tem).map((d) => d.avaliacao!);
    const sem = avaliadas.filter((d) => !tem(d)).map((d) => d.avaliacao!);
    const mc = media(com);
    const msem = media(sem);
    fatores.push({
      fator,
      comFator: com.length,
      semFator: sem.length,
      diferencaMedia: mc == null || msem == null ? null : Math.round((mc - msem) * 100) / 100,
    });
  };
  compara("hipótese registrada", (d) => cheio(d.hipotese));
  compara("evidências anexadas", (d) => d.evidencias.length > 0);
  compara("plano de reversão declarado", (d) => cheio(d.rollbackPlano));
  compara("revisão posterior feita", (d) => cheio(d.revisao));
  if (avaliadas.length < 5)
    lacunas.push(`apenas ${avaliadas.length} decisão(ões) avaliada(s) — fatores são indícios, não conclusão`);

  return {
    totalDecisoes: total,
    estrategiasRecorrentes,
    padroesAprovacao: {
      aprovadas: aprovadas.length,
      semAprovacaoFormal: total - aprovadas.length,
      tempoMedioAprovacaoHoras:
        temposAprovacao.length === 0 ? null : Math.round(media(temposAprovacao)! * 10) / 10,
      amostraAprovacao: temposAprovacao.length,
    },
    tempoMedioExecucaoHoras:
      temposExecucao.length === 0 ? null : Math.round(media(temposExecucao)! * 10) / 10,
    fatoresObservados: fatores,
    lacunas,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 08 — Memory Dashboard
 * ------------------------------------------------------------------ */

export type MemoriaIndicadores = {
  patrimonioIntelectual: number;
  decisoesRegistradas: number;
  decisoesFechadas: number;
  campanhasRegistradas: number;
  licoesAprendidas: number;
  playbooksGerados: number;
  coberturaPct: number;
  completudeMediaPct: number;
  reutilizacaoPct: number;
  licoesPorTipo: Record<LessonTipo, number>;
  lacunas: string[];
};

/**
 * Patrimônio intelectual = volume registrado ponderado por qualidade.
 * Não é dinheiro: é contagem ponderada de conhecimento auditável.
 */
export function indicadoresMemoria(entrada: {
  decisoes: Decisao[];
  campanhas: Campanha[];
  licoes: Licao[];
  playbooks: Playbook[];
}): MemoriaIndicadores {
  const { decisoes, campanhas, licoes, playbooks } = entrada;
  const lacunas: string[] = [];

  const completudes = decisoes.map((d) => completudeDecisao(d).pontos);
  const completudeMediaPct = completudes.length === 0 ? 0 : Math.round(media(completudes)!);
  const fechadas = decisoes.filter((d) => d.status === "avaliada" || d.status === "revisada").length;

  /* Cobertura: proporção de decisões com resultado observado registrado. */
  const comResultado = decisoes.filter((d) => cheio(d.resultado)).length;
  const coberturaPct = decisoes.length === 0 ? 0 : Math.round((comResultado / decisoes.length) * 100);

  /* Reutilização: decisões e campanhas que já geraram lição registrada. */
  const origens = new Set<string>();
  for (const l of licoes) {
    if (l.decisionId) origens.add(l.decisionId);
    if (l.campaignId) origens.add(l.campaignId);
  }
  const universo = decisoes.length + campanhas.length;
  const reutilizacaoPct = universo === 0 ? 0 : Math.round((origens.size / universo) * 100);

  const licoesPorTipo: Record<LessonTipo, number> = {
    acerto: 0,
    erro: 0,
    risco: 0,
    oportunidade: 0,
    boa_pratica: 0,
  };
  for (const l of licoes) licoesPorTipo[l.tipo] += 1;

  const patrimonio =
    Math.round(
      (decisoes.length * (completudeMediaPct / 100) + licoes.length * 1.5 + playbooks.length * 5 + campanhas.length) *
        10,
    ) / 10;

  if (decisoes.length === 0) lacunas.push("nenhuma decisão registrada — memória vazia");
  if (licoes.length === 0 && campanhas.length > 0)
    lacunas.push("campanhas registradas sem nenhuma lição derivada");
  if (playbooks.length === 0) lacunas.push("nenhum playbook gerado — histórico ainda insuficiente");
  if (coberturaPct < 50 && decisoes.length > 0)
    lacunas.push(`cobertura de resultado em ${coberturaPct}% — metade das decisões sem resultado observado`);

  return {
    patrimonioIntelectual: patrimonio,
    decisoesRegistradas: decisoes.length,
    decisoesFechadas: fechadas,
    campanhasRegistradas: campanhas.length,
    licoesAprendidas: licoes.length,
    playbooksGerados: playbooks.length,
    coberturaPct,
    completudeMediaPct,
    reutilizacaoPct,
    licoesPorTipo,
    lacunas,
  };
}