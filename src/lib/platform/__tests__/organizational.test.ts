import { describe, expect, it } from "vitest";
import type { Campanha, Decisao, Licao, Playbook } from "../memory";
import {
  cronicaExecutiva,
  curvaAprendizado,
  evolucaoConhecimento,
  grafoOrganizacional,
  indicadoresOrganizacionais,
  linhagemConhecimento,
  scoreInstitucional,
  vigenciaConhecimento,
  AVISO_SEM_CAUSALIDADE,
  type UsoConhecimento,
  type VersaoConhecimento,
} from "../organizational";

const AGORA = new Date("2026-06-01T00:00:00.000Z").getTime();
const diasAtras = (n: number) => new Date(AGORA - n * 86_400_000).toISOString();

function versao(over: Partial<VersaoConhecimento> = {}): VersaoConhecimento {
  return {
    id: over.id ?? "v-1",
    entidade: "playbook",
    entidadeId: "pb-1",
    tema: "lançamento",
    titulo: "Playbook de lançamento",
    versao: 1,
    mudanca: "passo de pré-venda incluído",
    motivo: "duas campanhas perderam liquidez sem pré-venda",
    evidencias: ["campanha 2025-Q4", "lição L-9"],
    aprovadoNome: "Diretoria",
    vigenteEm: diasAtras(400),
    substituidaEm: null,
    ...over,
  };
}

function decisao(over: Partial<Decisao> = {}): Decisao {
  return {
    id: "d-1",
    categoria: "comercial" as Decisao["categoria"],
    status: "avaliada" as Decisao["status"],
    titulo: "Reduzir desconto máximo",
    contexto: "margem em queda",
    motivo: "preservar margem",
    hipotese: "conversão se mantém",
    evidencias: ["propostas 2025"],
    responsavelNome: "Ana",
    participantes: [],
    prazo: null,
    aprovadoEm: null,
    executadoEm: null,
    resultado: "margem recuperada",
    resultadoValor: null,
    avaliacao: 4,
    avaliadoEm: diasAtras(100),
    revisao: "manter",
    revisadoEm: diasAtras(90),
    rollbackPlano: null,
    impacto: null,
    tema: "precificação",
    tags: [],
    criadoEm: diasAtras(200),
    ...over,
  };
}

function licao(over: Partial<Licao> = {}): Licao {
  return {
    id: "l-1",
    tipo: "acerto" as Licao["tipo"],
    titulo: "Pré-venda encurta o ciclo",
    licao: "abrir pré-venda antes do lançamento",
    evidencias: ["campanha A", "campanha B"],
    decisionId: "d-1",
    campaignId: "c-1",
    origem: "campanha",
    tema: "lançamento",
    criadoEm: diasAtras(150),
    ...over,
  };
}

function playbook(over: Partial<Playbook> = {}): Playbook {
  return {
    id: "pb-1",
    titulo: "Playbook de lançamento",
    tema: "lançamento",
    casos: 8,
    periodoInicio: null,
    periodoFim: null,
    taxaSucesso: 0.6,
    passos: [],
    limitacoes: [],
    versao: 2,
    geradoEm: diasAtras(30),
    ...over,
  };
}

function campanha(over: Partial<Campanha> = {}): Campanha {
  return {
    id: "c-1",
    status: "encerrada" as Campanha["status"],
    nome: "Lançamento Torre A",
    objetivo: "vender 40 unidades",
    estrategia: "pré-venda",
    canal: "meta",
    publico: null,
    investimento: 50_000,
    inicio: diasAtras(220),
    fim: diasAtras(160),
    leads: 800,
    oportunidades: 120,
    vendas: 30,
    receita: 9_000_000,
    motivoNascimento: "estoque parado",
    motivoMudanca: null,
    motivoEncerramento: "meta atingida",
    responsavelNome: "Bruno",
    tema: "lançamento",
    criadoEm: diasAtras(230),
    ...over,
  };
}

function uso(over: Partial<UsoConhecimento> = {}): UsoConhecimento {
  return {
    id: "u-1",
    entidade: "licao",
    entidadeId: "l-1",
    versao: null,
    contexto: "aplicado no lançamento Torre B",
    decisionId: null,
    campaignId: null,
    resultado: "ciclo 12 dias menor",
    usadoNome: "Bruno",
    usadoEm: diasAtras(20),
    ...over,
  };
}

describe("GATE 01 — evolução do conhecimento", () => {
  it("agrupa versões por conhecimento e preserva a ordem histórica", () => {
    const itens = evolucaoConhecimento([
      versao({ id: "v2", versao: 2, vigenteEm: diasAtras(100) }),
      versao({ id: "v1", versao: 1, vigenteEm: diasAtras(300), substituidaEm: diasAtras(100) }),
    ]);

    expect(itens).toHaveLength(1);
    expect(itens[0]!.versaoAtual).toBe(2);
    // A versão vigente vem primeiro; o histórico desce até a v1.
    expect(itens[0]!.versoes.map((v) => v.versao)).toEqual([2, 1]);
    expect(itens[0]!.intervaloMedianoDias).toBe(200);
  });

  it("declara lacuna quando o conhecimento tem apenas uma versão", () => {
    const [item] = evolucaoConhecimento([versao()]);
    expect(item!.intervaloMedianoDias).toBeNull();
    expect(item!.lacunas.join(" ")).toMatch(/versão/i);
  });

  it("não devolve nada quando não há versão registrada", () => {
    expect(evolucaoConhecimento([])).toEqual([]);
  });
});

describe("GATE 02 — curva de aprendizado", () => {
  it("mede completude e volume por trimestre sem estimar", () => {
    const curva = curvaAprendizado({
      decisoes: [decisao(), decisao({ id: "d-2", criadoEm: diasAtras(20), revisao: null, resultado: null })],
      licoes: [licao()],
      versoes: [versao()],
    });

    expect(curva.periodos.length).toBeGreaterThan(0);
    for (const p of curva.periodos) {
      if (p.decisoes === 0) expect(p.completudeMedia).toBeNull();
    }
  });

  it("sem série suficiente devolve tendência sem_dados em vez de zero", () => {
    const curva = curvaAprendizado({ decisoes: [], licoes: [], versoes: [] });
    expect(curva.tendenciaCompletude).toBe("sem_dados");
    expect(curva.tendenciaTempoAteLicao).toBe("sem_dados");
    expect(curva.lacunas.length).toBeGreaterThan(0);
  });
});

describe("GATE 03 — vigência do conhecimento", () => {
  it("classifica como atual o conhecimento recém-atualizado", () => {
    const item = vigenciaConhecimento(
      { entidade: "playbook", entidadeId: "pb-1", titulo: "PB", ultimaAtualizacao: diasAtras(10) },
      { agora: AGORA },
    );
    expect(item.vigencia).toBe("atual");
    expect(item.criterios.length).toBeGreaterThan(0);
  });

  it("classifica como desatualizado ao passar do SLA da entidade", () => {
    const item = vigenciaConhecimento(
      { entidade: "playbook", entidadeId: "pb-1", titulo: "PB", ultimaAtualizacao: diasAtras(400) },
      { agora: AGORA },
    );
    expect(item.vigencia).toBe("desatualizado");
  });

  it("evidência nova posterior à versão coloca o conhecimento em revisão", () => {
    const item = vigenciaConhecimento(
      { entidade: "playbook", entidadeId: "pb-1", titulo: "PB", ultimaAtualizacao: diasAtras(30) },
      { evidenciasNovasEm: [diasAtras(5)], agora: AGORA },
    );
    expect(item.vigencia).not.toBe("atual");
  });
});

describe("GATE 04 — grafo institucional", () => {
  it("liga decisão, campanha, lição e playbook pelas referências registradas", () => {
    const grafo = grafoOrganizacional({
      decisoes: [decisao()],
      campanhas: [campanha()],
      licoes: [licao()],
      playbooks: [playbook()],
      versoes: [versao()],
      usos: [uso()],
    });

    expect(grafo.nos.length).toBeGreaterThan(0);
    expect(grafo.arestas.length).toBeGreaterThan(0);
    expect(grafo.arestas.some((a) => a.de.includes("licao") || a.para.includes("licao"))).toBe(true);
  });

  it("grafo vazio não inventa nós", () => {
    const grafo = grafoOrganizacional({
      decisoes: [],
      campanhas: [],
      licoes: [],
      playbooks: [],
      versoes: [],
      usos: [],
    });
    expect(grafo.nos).toEqual([]);
    expect(grafo.arestas).toEqual([]);
  });
});

describe("GATE 05 — score institucional", () => {
  it("sem dado algum devolve score nulo com lacunas declaradas", () => {
    const score = scoreInstitucional({ decisoes: [], licoes: [], playbooks: [], versoes: [], usos: [], agora: AGORA });
    expect(score.score).toBeNull();
    expect(score.lacunas.length).toBeGreaterThan(0);
    expect(score.dimensoes.every((d) => d.valor === null)).toBe(true);
  });

  it("com dados devolve score em 0..100 e base por dimensão", () => {
    const score = scoreInstitucional({
      decisoes: [decisao()],
      licoes: [licao()],
      playbooks: [playbook()],
      versoes: [versao({ id: "v2", versao: 2, vigenteEm: diasAtras(20) }), versao()],
      usos: [uso()],
      agora: AGORA,
    });
    expect(score.score).not.toBeNull();
    expect(score.score!).toBeGreaterThanOrEqual(0);
    expect(score.score!).toBeLessThanOrEqual(100);
    expect(score.dimensoes.every((d) => d.base.length > 0)).toBe(true);
  });
});

describe("GATE 06 — crônica executiva", () => {
  it("descreve fatos registrados e nega relação causal", () => {
    const cronica = cronicaExecutiva({
      decisoes: [decisao()],
      licoes: [licao()],
      versoes: [versao()],
      usos: [uso()],
    });
    expect(cronica.aviso).toBe(AVISO_SEM_CAUSALIDADE);
    expect(cronica.capitulos.length).toBeGreaterThan(0);
    const texto = cronica.capitulos.flatMap((c) => c.fatos).join(" ").toLowerCase();
    expect(texto).not.toMatch(/porque|causou|por causa/);
  });

  it("sem fatos não escreve capítulo", () => {
    const cronica = cronicaExecutiva({ decisoes: [], licoes: [], versoes: [], usos: [] });
    expect(cronica.capitulos).toEqual([]);
    expect(cronica.lacunas.length).toBeGreaterThan(0);
  });
});

describe("GATE 07 — linhagem do conhecimento", () => {
  it("rastreia lição até decisão, campanha, playbook e reusos", () => {
    const linhagem = linhagemConhecimento("l-1", {
      licoes: [licao()],
      decisoes: [decisao()],
      campanhas: [campanha()],
      playbooks: [playbook()],
      usos: [uso()],
    });

    expect(linhagem).not.toBeNull();
    expect(linhagem!.decisaoOrigem?.id).toBe("d-1");
    expect(linhagem!.campanhaOrigem?.id).toBe("c-1");
    expect(linhagem!.playbooksQueIncorporaram.map((p) => p.id)).toContain("pb-1");
    expect(linhagem!.usosPosteriores).toHaveLength(1);
  });

  it("declara lacunas em vez de presumir elos ausentes", () => {
    const linhagem = linhagemConhecimento("l-1", {
      licoes: [licao({ decisionId: null, campaignId: null, tema: null })],
      decisoes: [],
      campanhas: [],
      playbooks: [],
      usos: [],
    });
    expect(linhagem!.decisaoOrigem).toBeNull();
    expect(linhagem!.playbooksQueIncorporaram).toEqual([]);
    expect(linhagem!.lacunas.length).toBeGreaterThanOrEqual(2);
  });

  it("lição inexistente devolve null", () => {
    expect(
      linhagemConhecimento("nao-existe", { licoes: [], decisoes: [], campanhas: [], playbooks: [], usos: [] }),
    ).toBeNull();
  });
});

describe("GATE 08 — indicadores organizacionais", () => {
  it("conta patrimônio a partir do que está registrado", () => {
    const ind = indicadoresOrganizacionais({
      decisoes: [decisao()],
      licoes: [licao()],
      playbooks: [playbook()],
      versoes: [versao({ id: "v2", versao: 2, vigenteEm: diasAtras(20) }), versao()],
      usos: [uso()],
      agora: AGORA,
    });

    expect(ind.evolucoesRegistradas).toBe(2);
    expect(ind.licoesReutilizadas).toBe(1);
    expect(ind.playbooksVigentes + ind.playbooksDesatualizados).toBeLessThanOrEqual(1);
    expect(ind.atualizacaoMedianaDias).not.toBeNull();
  });

  it("sem versões declara lacuna e não estima velocidade", () => {
    const ind = indicadoresOrganizacionais({
      decisoes: [],
      licoes: [],
      playbooks: [],
      versoes: [],
      usos: [],
      agora: AGORA,
    });
    expect(ind.atualizacaoMedianaDias).toBeNull();
    expect(ind.coberturaInstitucionalPct).toBeNull();
    expect(ind.lacunas.length).toBeGreaterThanOrEqual(2);
  });
});