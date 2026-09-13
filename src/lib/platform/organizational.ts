/**
 * SPRINT 29 — ORGANIZATIONAL INTELLIGENCE (ADR-032)
 *
 * Bounded context de LEITURA. Consome Enterprise Memory, Knowledge, Fabric e
 * Advisor; nunca escreve neles. Persiste apenas o que ninguém mais guarda:
 * como o conhecimento evoluiu (versões) e onde foi reutilizado (usos).
 *
 * Regras duras:
 * - conhecimento é versionado; versão anterior permanece auditável;
 * - toda evolução tem o que mudou, por que mudou, evidência, aprovador e vigência;
 * - vigência (decay) usa critérios objetivos — idade, versão superada, evidência
 *   nova — nunca inferência;
 * - a crônica executiva descreve sequência de fatos e nega relação causal;
 * - memória não é conhecimento consolidado: sem versão aprovada, é só memória.
 */

import type { Campanha, Decisao, Licao, Playbook } from "./memory";

export type OrgEntidade = "playbook" | "licao" | "decisao" | "processo";

export const entidadeLabels: Record<OrgEntidade, string> = {
  playbook: "Playbook",
  licao: "Lição",
  decisao: "Decisão",
  processo: "Processo",
};

export type VersaoConhecimento = {
  id: string;
  entidade: OrgEntidade;
  entidadeId: string;
  tema: string;
  titulo: string;
  versao: number;
  mudanca: string;
  motivo: string;
  evidencias: string[];
  aprovadoNome: string | null;
  vigenteEm: string;
  substituidaEm: string | null;
};

export type UsoConhecimento = {
  id: string;
  entidade: OrgEntidade;
  entidadeId: string;
  versao: number | null;
  contexto: string;
  decisionId: string | null;
  campaignId: string | null;
  resultado: string | null;
  usadoNome: string | null;
  usadoEm: string;
};

const DIA_MS = 86_400_000;

function dias(de: string, ate: string | number = Date.now()): number | null {
  const a = new Date(de).getTime();
  const b = typeof ate === "number" ? ate : new Date(ate).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round(((b - a) / DIA_MS) * 10) / 10;
}

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const ord = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ord.length / 2);
  const v = ord.length % 2 === 1 ? ord[meio]! : (ord[meio - 1]! + ord[meio]!) / 2;
  return Math.round(v * 10) / 10;
}

function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return Math.round((valores.reduce((s, v) => s + v, 0) / valores.length) * 10) / 10;
}

/* ------------------------------------------------------------------ *
 * GATE 01 — Knowledge Evolution
 * ------------------------------------------------------------------ */

export type EvolucaoItem = {
  entidade: OrgEntidade;
  entidadeId: string;
  titulo: string;
  tema: string;
  versaoAtual: number;
  versoes: VersaoConhecimento[];
  primeiraVigencia: string;
  ultimaVigencia: string;
  intervaloMedianoDias: number | null;
  lacunas: string[];
};

/** Histórico completo de cada conhecimento: v1 → v2 → v3, com justificativa. */
export function evolucaoConhecimento(versoes: VersaoConhecimento[]): EvolucaoItem[] {
  const grupos = new Map<string, VersaoConhecimento[]>();
  for (const v of versoes) {
    const chave = `${v.entidade}:${v.entidadeId}`;
    const lista = grupos.get(chave) ?? [];
    lista.push(v);
    grupos.set(chave, lista);
  }

  const itens: EvolucaoItem[] = [];
  for (const lista of grupos.values()) {
    const ordenadas = [...lista].sort((a, b) => a.versao - b.versao);
    const ultima = ordenadas[ordenadas.length - 1]!;
    const intervalos: number[] = [];
    for (let i = 1; i < ordenadas.length; i += 1) {
      const d = dias(ordenadas[i - 1]!.vigenteEm, ordenadas[i]!.vigenteEm);
      if (d != null) intervalos.push(d);
    }

    const lacunas: string[] = [];
    const semAprovador = ordenadas.filter((v) => !v.aprovadoNome).length;
    if (semAprovador > 0) lacunas.push(`${semAprovador} versão(ões) sem nome do aprovador registrado`);
    if (ordenadas.length === 1) lacunas.push("conhecimento nunca revisado — só existe a versão inicial");
    for (let i = 0; i < ordenadas.length; i += 1) {
      if (ordenadas[i]!.versao !== i + 1) {
        lacunas.push("sequência de versões com lacuna — parte do histórico não foi registrada");
        break;
      }
    }

    itens.push({
      entidade: ultima.entidade,
      entidadeId: ultima.entidadeId,
      titulo: ultima.titulo,
      tema: ultima.tema,
      versaoAtual: ultima.versao,
      versoes: [...ordenadas].reverse(),
      primeiraVigencia: ordenadas[0]!.vigenteEm,
      ultimaVigencia: ultima.vigenteEm,
      intervaloMedianoDias: mediana(intervalos),
      lacunas,
    });
  }

  return itens.sort((a, b) => (a.ultimaVigencia < b.ultimaVigencia ? 1 : -1));
}

/* ------------------------------------------------------------------ *
 * GATE 02 — Organizational Learning Curve
 * ------------------------------------------------------------------ */

export type PeriodoAprendizado = {
  periodo: string;
  decisoes: number;
  decisoesAvaliadas: number;
  completudeMedia: number | null;
  licoes: number;
  versoes: number;
  tempoAteLicaoDias: number | null;
};

export type CurvaAprendizado = {
  periodos: PeriodoAprendizado[];
  tendenciaCompletude: "melhorando" | "estavel" | "piorando" | "sem_dados";
  tendenciaTempoAteLicao: "acelerando" | "estavel" | "desacelerando" | "sem_dados";
  lacunas: string[];
  base: string;
};

function trimestre(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-T${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

function completude(d: Decisao): number {
  const campos = [
    Boolean(d.responsavelNome?.trim()),
    Boolean(d.contexto?.trim()),
    Boolean(d.hipotese?.trim()),
    Boolean(d.motivo?.trim()),
    d.evidencias.length > 0,
    Boolean(d.resultado?.trim()),
    Boolean(d.revisao?.trim()),
  ];
  return Math.round((campos.filter(Boolean).length / campos.length) * 100);
}

/**
 * A empresa está aprendendo mais rápido? Mede completude das decisões, volume de
 * lições e o intervalo entre a decisão e a lição incorporada, por trimestre.
 */
export function curvaAprendizado(entrada: {
  decisoes: Decisao[];
  licoes: Licao[];
  versoes: VersaoConhecimento[];
}): CurvaAprendizado {
  const mapa = new Map<string, { comp: number[]; dec: number; aval: number; lic: number; ver: number; lag: number[] }>();
  const bucket = (p: string) => {
    const atual = mapa.get(p) ?? { comp: [], dec: 0, aval: 0, lic: 0, ver: 0, lag: [] };
    mapa.set(p, atual);
    return atual;
  };

  for (const d of entrada.decisoes) {
    const p = trimestre(d.criadoEm);
    if (!p) continue;
    const b = bucket(p);
    b.dec += 1;
    b.comp.push(completude(d));
    if (d.status === "avaliada" || d.status === "revisada") b.aval += 1;
  }

  const porDecisao = new Map(entrada.decisoes.map((d) => [d.id, d]));
  for (const l of entrada.licoes) {
    const p = trimestre(l.criadoEm);
    if (!p) continue;
    const b = bucket(p);
    b.lic += 1;
    const origem = l.decisionId ? porDecisao.get(l.decisionId) : undefined;
    if (origem) {
      const lag = dias(origem.criadoEm, l.criadoEm);
      if (lag != null && lag >= 0) b.lag.push(lag);
    }
  }

  for (const v of entrada.versoes) {
    const p = trimestre(v.vigenteEm);
    if (!p) continue;
    bucket(p).ver += 1;
  }

  const periodos = [...mapa.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([periodo, b]) => ({
      periodo,
      decisoes: b.dec,
      decisoesAvaliadas: b.aval,
      completudeMedia: media(b.comp),
      licoes: b.lic,
      versoes: b.ver,
      tempoAteLicaoDias: mediana(b.lag),
    }));

  const comComp = periodos.filter((p) => p.completudeMedia != null);
  const comLag = periodos.filter((p) => p.tempoAteLicaoDias != null);

  const delta = (a: number, b: number) => Math.round((b - a) * 10) / 10;
  let tendenciaCompletude: CurvaAprendizado["tendenciaCompletude"] = "sem_dados";
  if (comComp.length >= 2) {
    const d = delta(comComp[0]!.completudeMedia!, comComp[comComp.length - 1]!.completudeMedia!);
    tendenciaCompletude = d > 5 ? "melhorando" : d < -5 ? "piorando" : "estavel";
  }

  let tendenciaTempoAteLicao: CurvaAprendizado["tendenciaTempoAteLicao"] = "sem_dados";
  if (comLag.length >= 2) {
    const d = delta(comLag[0]!.tempoAteLicaoDias!, comLag[comLag.length - 1]!.tempoAteLicaoDias!);
    tendenciaTempoAteLicao = d < -1 ? "acelerando" : d > 1 ? "desacelerando" : "estavel";
  }

  const lacunas: string[] = [];
  if (periodos.length < 2) lacunas.push("menos de dois trimestres registrados — não há série para comparar");
  if (comLag.length === 0)
    lacunas.push("nenhuma lição vinculada a decisão — tempo entre problema e lição indisponível");

  return {
    periodos,
    tendenciaCompletude,
    tendenciaTempoAteLicao,
    lacunas,
    base: `${entrada.decisoes.length} decisões, ${entrada.licoes.length} lições e ${entrada.versoes.length} versões registradas`,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 03 — Knowledge Decay (vigência)
 * ------------------------------------------------------------------ */

export type Vigencia = "atual" | "em_revisao" | "desatualizado";

export const vigenciaLabels: Record<Vigencia, string> = {
  atual: "Atual",
  em_revisao: "Em revisão",
  desatualizado: "Potencialmente desatualizado",
};

/** Idade máxima (dias) sem revisão antes de exigir atenção, por entidade. */
export const SLA_VIGENCIA_DIAS: Record<OrgEntidade, { revisao: number; desatualizado: number }> = {
  playbook: { revisao: 180, desatualizado: 365 },
  licao: { revisao: 270, desatualizado: 540 },
  decisao: { revisao: 365, desatualizado: 730 },
  processo: { revisao: 180, desatualizado: 365 },
};

export type ItemVigencia = {
  entidade: OrgEntidade;
  entidadeId: string;
  titulo: string;
  vigencia: Vigencia;
  idadeDias: number | null;
  criterios: string[];
};

/**
 * Vigência por critério objetivo: idade desde a última versão, versão superada e
 * evidência nova posterior à vigência. Nada é inferido.
 */
export function vigenciaConhecimento(
  item: { entidade: OrgEntidade; entidadeId: string; titulo: string; ultimaAtualizacao: string; versaoAtual?: number },
  contexto: {
    versoes?: VersaoConhecimento[];
    evidenciasNovasEm?: string[];
    agora?: number;
  } = {},
): ItemVigencia {
  const agora = contexto.agora ?? Date.now();
  const idadeDias = dias(item.ultimaAtualizacao, agora);
  const sla = SLA_VIGENCIA_DIAS[item.entidade];
  const criterios: string[] = [];
  let nivel: Vigencia = "atual";

  if (idadeDias == null) {
    criterios.push("data da última atualização não registrada");
    return { ...item, vigencia: "em_revisao", idadeDias: null, criterios };
  }

  criterios.push(`${idadeDias} dias desde a última versão registrada (limite de revisão: ${sla.revisao})`);
  if (idadeDias >= sla.desatualizado) nivel = "desatualizado";
  else if (idadeDias >= sla.revisao) nivel = "em_revisao";

  const doItem = (contexto.versoes ?? []).filter(
    (v) => v.entidade === item.entidade && v.entidadeId === item.entidadeId,
  );
  const maiorVersao = doItem.reduce((max, v) => Math.max(max, v.versao), 0);
  if (item.versaoAtual != null && maiorVersao > item.versaoAtual) {
    criterios.push(`existe versão v${maiorVersao} registrada acima da v${item.versaoAtual} em uso`);
    nivel = "desatualizado";
  }

  const novas = (contexto.evidenciasNovasEm ?? []).filter((em) => {
    const t = new Date(em).getTime();
    return Number.isFinite(t) && t > new Date(item.ultimaAtualizacao).getTime();
  });
  if (novas.length > 0) {
    criterios.push(`${novas.length} evidência(s) registrada(s) depois da última versão`);
    if (nivel === "atual") nivel = "em_revisao";
  }

  return { ...item, vigencia: nivel, idadeDias, criterios };
}

/* ------------------------------------------------------------------ *
 * GATE 04 — Organizational Graph
 * ------------------------------------------------------------------ */

export type NoOrg = {
  id: string;
  tipo: "decisao" | "campanha" | "playbook" | "licao" | "pessoa" | "aprovacao" | "versao";
  rotulo: string;
  detalhe: string | null;
};

export type ArestaOrg = { de: string; para: string; relacao: string };

export type GrafoOrganizacional = {
  nos: NoOrg[];
  arestas: ArestaOrg[];
  totais: Record<NoOrg["tipo"], number>;
  orfaos: string[];
};

export function grafoOrganizacional(entrada: {
  decisoes: Decisao[];
  campanhas: Campanha[];
  licoes: Licao[];
  playbooks: Playbook[];
  versoes: VersaoConhecimento[];
  usos: UsoConhecimento[];
}): GrafoOrganizacional {
  const nos: NoOrg[] = [];
  const arestas: ArestaOrg[] = [];
  const pessoas = new Map<string, string>();

  const pessoa = (nome: string | null): string | null => {
    const limpo = nome?.trim();
    if (!limpo) return null;
    const id = `pessoa:${limpo.toLowerCase()}`;
    if (!pessoas.has(id)) {
      pessoas.set(id, limpo);
      nos.push({ id, tipo: "pessoa", rotulo: limpo, detalhe: null });
    }
    return id;
  };

  for (const d of entrada.decisoes) {
    nos.push({ id: `decisao:${d.id}`, tipo: "decisao", rotulo: d.titulo, detalhe: d.status });
    const p = pessoa(d.responsavelNome);
    if (p) arestas.push({ de: p, para: `decisao:${d.id}`, relacao: "responsável por" });
    if (d.aprovadoEm) {
      const idAp = `aprovacao:${d.id}`;
      nos.push({ id: idAp, tipo: "aprovacao", rotulo: `Aprovação de "${d.titulo}"`, detalhe: d.aprovadoEm });
      arestas.push({ de: idAp, para: `decisao:${d.id}`, relacao: "aprovou" });
    }
  }

  for (const c of entrada.campanhas) {
    nos.push({ id: `campanha:${c.id}`, tipo: "campanha", rotulo: c.nome, detalhe: c.status });
    const p = pessoa(c.responsavelNome);
    if (p) arestas.push({ de: p, para: `campanha:${c.id}`, relacao: "responsável por" });
  }

  for (const l of entrada.licoes) {
    nos.push({ id: `licao:${l.id}`, tipo: "licao", rotulo: l.titulo, detalhe: l.tipo });
    if (l.decisionId) arestas.push({ de: `decisao:${l.decisionId}`, para: `licao:${l.id}`, relacao: "originou" });
    if (l.campaignId) arestas.push({ de: `campanha:${l.campaignId}`, para: `licao:${l.id}`, relacao: "originou" });
  }

  for (const p of entrada.playbooks) {
    nos.push({ id: `playbook:${p.id}`, tipo: "playbook", rotulo: p.titulo, detalhe: `v${p.versao} · ${p.casos} casos` });
  }

  for (const v of entrada.versoes) {
    const idV = `versao:${v.id}`;
    nos.push({ id: idV, tipo: "versao", rotulo: `${v.titulo} v${v.versao}`, detalhe: v.motivo });
    arestas.push({ de: idV, para: `${v.entidade}:${v.entidadeId}`, relacao: "versionou" });
    const p = pessoa(v.aprovadoNome);
    if (p) arestas.push({ de: p, para: idV, relacao: "aprovou" });
  }

  for (const u of entrada.usos) {
    if (u.decisionId)
      arestas.push({ de: `${u.entidade}:${u.entidadeId}`, para: `decisao:${u.decisionId}`, relacao: "reutilizado em" });
    if (u.campaignId)
      arestas.push({ de: `${u.entidade}:${u.entidadeId}`, para: `campanha:${u.campaignId}`, relacao: "reutilizado em" });
  }

  const existentes = new Set(nos.map((n) => n.id));
  const conectados = new Set<string>();
  for (const a of arestas) {
    if (existentes.has(a.de)) conectados.add(a.de);
    if (existentes.has(a.para)) conectados.add(a.para);
  }

  const totais = nos.reduce(
    (acc, n) => ({ ...acc, [n.tipo]: (acc[n.tipo] ?? 0) + 1 }),
    { decisao: 0, campanha: 0, playbook: 0, licao: 0, pessoa: 0, aprovacao: 0, versao: 0 } as Record<NoOrg["tipo"], number>,
  );

  return {
    nos,
    arestas: arestas.filter((a) => existentes.has(a.de) && existentes.has(a.para)),
    totais,
    orfaos: nos.filter((n) => !conectados.has(n.id)).map((n) => n.id),
  };
}

/* ------------------------------------------------------------------ *
 * GATE 05 — Institutional Knowledge Score
 * ------------------------------------------------------------------ */

export type DimensaoInstitucional = {
  chave: "reutilizacao" | "velocidade" | "cobertura" | "atualizacao" | "consistencia";
  nome: string;
  valor: number | null;
  peso: number;
  base: string;
};

export type ScoreInstitucional = {
  score: number | null;
  dimensoes: DimensaoInstitucional[];
  lacunas: string[];
};

const pct = (parte: number, total: number) => (total <= 0 ? null : Math.round((parte / total) * 100));

export function scoreInstitucional(entrada: {
  decisoes: Decisao[];
  licoes: Licao[];
  playbooks: Playbook[];
  versoes: VersaoConhecimento[];
  usos: UsoConhecimento[];
  agora?: number;
}): ScoreInstitucional {
  const agora = entrada.agora ?? Date.now();
  const lacunas: string[] = [];

  const licoesUsadas = new Set(
    entrada.usos.filter((u) => u.entidade === "licao").map((u) => u.entidadeId),
  );
  const reutilizacao = pct(licoesUsadas.size, entrada.licoes.length);
  if (entrada.licoes.length === 0) lacunas.push("nenhuma lição registrada — reutilização indisponível");

  const curva = curvaAprendizado({ decisoes: entrada.decisoes, licoes: entrada.licoes, versoes: entrada.versoes });
  const lags = curva.periodos.map((p) => p.tempoAteLicaoDias).filter((v): v is number => v != null);
  const lagMediano = mediana(lags);
  // 0 dia = 100; 90 dias ou mais = 0. Linear, sem suavização estatística.
  const velocidade = lagMediano == null ? null : Math.max(0, Math.round(100 - (lagMediano / 90) * 100));
  if (lagMediano == null) lacunas.push("nenhuma lição vinculada a decisão — velocidade de aprendizado indisponível");

  const temasComPlaybook = new Set(entrada.playbooks.map((p) => p.tema));
  const temasRegistrados = new Set(
    [...entrada.decisoes.map((d) => d.tema), ...entrada.licoes.map((l) => l.tema)].filter(
      (t): t is string => Boolean(t),
    ),
  );
  const cobertura = pct([...temasComPlaybook].filter((t) => temasRegistrados.has(t)).length, temasRegistrados.size);
  if (temasRegistrados.size === 0) lacunas.push("nenhum tema registrado — cobertura de playbooks indisponível");

  const vigencias = entrada.playbooks.map((p) =>
    vigenciaConhecimento(
      {
        entidade: "playbook",
        entidadeId: p.id,
        titulo: p.titulo,
        ultimaAtualizacao: p.geradoEm,
        versaoAtual: p.versao,
      },
      { versoes: entrada.versoes, agora },
    ),
  );
  const atualizacao = pct(vigencias.filter((v) => v.vigencia === "atual").length, vigencias.length);
  if (vigencias.length === 0) lacunas.push("nenhum playbook registrado — taxa de atualização indisponível");

  const avaliadas = entrada.decisoes.filter((d) => d.status === "avaliada" || d.status === "revisada");
  const consistencia = pct(
    avaliadas.filter((d) => Boolean(d.resultado?.trim())).length,
    entrada.decisoes.filter((d) => d.status !== "registrada" && d.status !== "descartada").length,
  );
  if (avaliadas.length === 0) lacunas.push("nenhuma decisão avaliada — consistência memória × execução indisponível");

  const dimensoes: DimensaoInstitucional[] = [
    {
      chave: "reutilizacao",
      nome: "Reutilização do conhecimento",
      valor: reutilizacao,
      peso: 0.25,
      base: `${licoesUsadas.size} de ${entrada.licoes.length} lições com uso registrado`,
    },
    {
      chave: "velocidade",
      nome: "Velocidade de aprendizado",
      valor: velocidade,
      peso: 0.2,
      base: lagMediano == null ? "sem série" : `mediana de ${lagMediano} dias entre decisão e lição`,
    },
    {
      chave: "cobertura",
      nome: "Cobertura dos playbooks",
      valor: cobertura,
      peso: 0.2,
      base: `${temasComPlaybook.size} tema(s) com playbook de ${temasRegistrados.size} registrado(s)`,
    },
    {
      chave: "atualizacao",
      nome: "Taxa de atualização",
      valor: atualizacao,
      peso: 0.2,
      base: `${vigencias.filter((v) => v.vigencia === "atual").length} de ${vigencias.length} playbooks vigentes`,
    },
    {
      chave: "consistencia",
      nome: "Consistência memória × execução",
      valor: consistencia,
      peso: 0.15,
      base: `${avaliadas.length} decisão(ões) avaliada(s) com resultado observado`,
    },
  ];

  const medidas = dimensoes.filter((d) => d.valor != null);
  const pesoTotal = medidas.reduce((s, d) => s + d.peso, 0);
  const score =
    medidas.length === 0 || pesoTotal === 0
      ? null
      : Math.round(medidas.reduce((s, d) => s + d.valor! * d.peso, 0) / pesoTotal);

  return { score, dimensoes, lacunas };
}

/* ------------------------------------------------------------------ *
 * GATE 06 — Executive Chronicle
 * ------------------------------------------------------------------ */

export const AVISO_SEM_CAUSALIDADE =
  "A plataforma registra esta sequência de eventos; ela não estabelece relação causal.";

export type CapituloCronica = { periodo: string; fatos: string[] };

export type CronicaExecutiva = {
  capitulos: CapituloCronica[];
  aviso: string;
  base: string;
  lacunas: string[];
};

function mesRotulo(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const nomes = [
    "janeiro","fevereiro","março","abril","maio","junho",
    "julho","agosto","setembro","outubro","novembro","dezembro",
  ];
  return `${nomes[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

/** Cronologia de fatos REGISTRADOS. Descreve sequência, nunca causa. */
export function cronicaExecutiva(entrada: {
  decisoes: Decisao[];
  licoes: Licao[];
  versoes: VersaoConhecimento[];
  usos: UsoConhecimento[];
}): CronicaExecutiva {
  const mapa = new Map<string, { ordem: string; dec: number; lic: number; ver: VersaoConhecimento[]; usos: number }>();
  const bucket = (iso: string) => {
    const rotulo = mesRotulo(iso);
    if (!rotulo) return null;
    const ordem = iso.slice(0, 7);
    const atual = mapa.get(rotulo) ?? { ordem, dec: 0, lic: 0, ver: [], usos: 0 };
    mapa.set(rotulo, atual);
    return atual;
  };

  for (const d of entrada.decisoes) {
    const b = bucket(d.criadoEm);
    if (b) b.dec += 1;
  }
  for (const l of entrada.licoes) {
    const b = bucket(l.criadoEm);
    if (b) b.lic += 1;
  }
  for (const v of entrada.versoes) bucket(v.vigenteEm)?.ver.push(v);
  for (const u of entrada.usos) {
    const b = bucket(u.usadoEm);
    if (b) b.usos += 1;
  }

  const capitulos = [...mapa.entries()]
    .sort((a, b) => (a[1].ordem < b[1].ordem ? 1 : -1))
    .map(([periodo, b]) => {
      const fatos: string[] = [];
      if (b.dec > 0) fatos.push(`${b.dec} decisão(ões) registrada(s).`);
      if (b.ver.length > 0) {
        const temas = [...new Set(b.ver.map((v) => v.tema))];
        fatos.push(
          `${b.ver.length} revisão(ões) de conhecimento registrada(s) em ${temas.length} tema(s): ${temas.join(", ")}.`,
        );
      }
      if (b.lic > 0) fatos.push(`${b.lic} lição(ões) incorporada(s) com evidência registrada.`);
      if (b.usos > 0) fatos.push(`${b.usos} reutilização(ões) de conhecimento registrada(s) no período.`);
      return { periodo, fatos };
    })
    .filter((c) => c.fatos.length > 0);

  const lacunas: string[] = [];
  if (capitulos.length === 0) lacunas.push("nenhum fato registrado no período — a crônica não é preenchida por estimativa");

  return {
    capitulos,
    aviso: AVISO_SEM_CAUSALIDADE,
    base: `${entrada.decisoes.length} decisões, ${entrada.licoes.length} lições, ${entrada.versoes.length} versões e ${entrada.usos.length} usos registrados`,
    lacunas,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 07 — Knowledge Lineage
 * ------------------------------------------------------------------ */

export type Linhagem = {
  licao: { id: string; titulo: string; tipo: string };
  decisaoOrigem: { id: string; titulo: string; status: string } | null;
  campanhaOrigem: { id: string; nome: string; status: string } | null;
  playbooksQueIncorporaram: { id: string; titulo: string; versao: number }[];
  usosPosteriores: UsoConhecimento[];
  lacunas: string[];
};

/** Decisão → campanha → playbook → resultados posteriores. Só o que está ligado. */
export function linhagemConhecimento(
  licaoId: string,
  entrada: {
    licoes: Licao[];
    decisoes: Decisao[];
    campanhas: Campanha[];
    playbooks: Playbook[];
    usos: UsoConhecimento[];
  },
): Linhagem | null {
  const licao = entrada.licoes.find((l) => l.id === licaoId);
  if (!licao) return null;

  const decisao = licao.decisionId ? entrada.decisoes.find((d) => d.id === licao.decisionId) : undefined;
  const campanha = licao.campaignId ? entrada.campanhas.find((c) => c.id === licao.campaignId) : undefined;
  const playbooks = licao.tema ? entrada.playbooks.filter((p) => p.tema === licao.tema) : [];
  const usos = entrada.usos
    .filter(
      (u) =>
        (u.entidade === "licao" && u.entidadeId === licao.id) ||
        (u.entidade === "playbook" && playbooks.some((p) => p.id === u.entidadeId)),
    )
    .sort((a, b) => (a.usadoEm < b.usadoEm ? 1 : -1));

  const lacunas: string[] = [];
  if (!decisao && !campanha) lacunas.push("lição sem decisão ou campanha de origem localizada");
  if (!licao.tema) lacunas.push("lição sem tema — não é possível ligar a playbooks");
  if (playbooks.length === 0 && licao.tema) lacunas.push(`nenhum playbook registrado no tema "${licao.tema}"`);
  if (usos.length === 0) lacunas.push("nenhum reuso posterior registrado");

  return {
    licao: { id: licao.id, titulo: licao.titulo, tipo: licao.tipo },
    decisaoOrigem: decisao ? { id: decisao.id, titulo: decisao.titulo, status: decisao.status } : null,
    campanhaOrigem: campanha ? { id: campanha.id, nome: campanha.nome, status: campanha.status } : null,
    playbooksQueIncorporaram: playbooks.map((p) => ({ id: p.id, titulo: p.titulo, versao: p.versao })),
    usosPosteriores: usos,
    lacunas,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 08 — Organizational Dashboard
 * ------------------------------------------------------------------ */

export type IndicadoresOrganizacionais = {
  patrimonioAtivo: number;
  playbooksVigentes: number;
  playbooksDesatualizados: number;
  licoesReutilizadas: number;
  atualizacaoMedianaDias: number | null;
  coberturaInstitucionalPct: number | null;
  evolucoesRegistradas: number;
  lacunas: string[];
};

export function indicadoresOrganizacionais(entrada: {
  decisoes: Decisao[];
  licoes: Licao[];
  playbooks: Playbook[];
  versoes: VersaoConhecimento[];
  usos: UsoConhecimento[];
  agora?: number;
}): IndicadoresOrganizacionais {
  const agora = entrada.agora ?? Date.now();
  const vigencias = entrada.playbooks.map((p) =>
    vigenciaConhecimento(
      { entidade: "playbook", entidadeId: p.id, titulo: p.titulo, ultimaAtualizacao: p.geradoEm, versaoAtual: p.versao },
      { versoes: entrada.versoes, agora },
    ),
  );

  const evolucoes = evolucaoConhecimento(entrada.versoes);
  const intervalos = evolucoes
    .map((e) => e.intervaloMedianoDias)
    .filter((v): v is number => v != null);

  const score = scoreInstitucional({ ...entrada, agora });
  const cobertura = score.dimensoes.find((d) => d.chave === "cobertura")?.valor ?? null;

  const licoesUsadas = new Set(entrada.usos.filter((u) => u.entidade === "licao").map((u) => u.entidadeId));

  const lacunas: string[] = [];
  if (entrada.versoes.length === 0)
    lacunas.push("nenhuma versão de conhecimento registrada — evolução institucional indisponível");
  if (intervalos.length === 0) lacunas.push("nenhum conhecimento com duas versões — velocidade de atualização indisponível");

  return {
    patrimonioAtivo:
      vigencias.filter((v) => v.vigencia !== "desatualizado").length + licoesUsadas.size + evolucoes.length,
    playbooksVigentes: vigencias.filter((v) => v.vigencia === "atual").length,
    playbooksDesatualizados: vigencias.filter((v) => v.vigencia === "desatualizado").length,
    licoesReutilizadas: licoesUsadas.size,
    atualizacaoMedianaDias: mediana(intervalos),
    coberturaInstitucionalPct: cobertura,
    evolucoesRegistradas: entrada.versoes.length,
    lacunas,
  };
}