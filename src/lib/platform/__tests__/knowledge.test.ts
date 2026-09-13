import { describe, expect, it } from "vitest";
import {
  ONTOLOGIA,
  TIPOS_NO,
  achatarArvore,
  arvoreProveniencia,
  knowledgeHealth,
  montarEvidenceTrace,
  montarGrafo,
  noId,
  relacaoPermitida,
  timelineConhecimento,
  verificarIntegridade,
  type NoConhecimento,
  type Proveniencia,
  type RelacaoConhecimento,
  type TipoNo,
} from "@/lib/platform/knowledge";
import { montarGrafoConhecimento, type KnowledgeEntrada } from "@/lib/platform/knowledge-build";

const AGORA = "2026-08-01T00:00:00.000Z";

const prov = (over: Partial<Proveniencia> = {}): Proveniencia => ({
  fonte: "customer_360",
  camada: "dominio",
  base: "dado_interno",
  algoritmo: null,
  versaoAlgoritmo: null,
  adr: null,
  atualizadoEm: AGORA,
  ...over,
});

const no = (tipo: TipoNo, id: string, over: Partial<NoConhecimento> = {}): NoConhecimento => ({
  id: noId(tipo, id),
  tipo,
  rotulo: `${tipo} ${id}`,
  proveniencia: prov(),
  ...over,
});

const rel = (
  origem: string,
  tipo: RelacaoConhecimento["tipo"],
  destino: string,
): Omit<RelacaoConhecimento, "id"> => ({
  origem,
  destino,
  tipo,
  atualizadoEm: AGORA,
  proveniencia: prov({ camada: "analitico", algoritmo: "teste", versaoAlgoritmo: "1", adr: "ADR-027" }),
});

const entradaCompleta = (): KnowledgeEntrada => ({
  pessoas: [{ id: "p1", nome: "Ana", responsavelId: "c1", atualizadoEm: AGORA }],
  corretores: [{ id: "c1", nome: "Bruno", atualizadoEm: AGORA }],
  empreendimentos: [{ id: "e1", nome: "Torre Sul", cidade: "Curitiba", uf: "PR", atualizadoEm: AGORA }],
  oportunidades: [
    {
      id: "o1",
      titulo: "Ana · Torre Sul",
      personId: "p1",
      responsavelId: "c1",
      empreendimentoId: "e1",
      estagio: "proposta",
      diasSemInteracao: 4,
    },
  ],
  recomendacoes: [
    {
      id: "r1",
      chave: "revisar_gatilho:x",
      tipo: "revisar_gatilho",
      mensagem: "Revisar gatilho de follow-up",
      status: "aceita",
      resultado: "melhorou",
      quadrante: "agir_agora",
      score: 82,
      confianca: 74,
      geradaEm: AGORA,
      avaliadaEm: AGORA,
      implementadaEm: AGORA,
    },
  ],
  indicadores: [{ id: "i1", codigo: "selic_meta", nome: "Selic meta", fonte: "Banco Central", atualizadoEm: AGORA }],
  regioes: [
    { id: "b1", nome: "Batel", tipo: "bairro", cidade: "Curitiba", uf: "PR", atualizadoEm: AGORA },
    { id: "cx", nome: "Curitiba", tipo: "cidade", cidade: "Curitiba", uf: "PR", atualizadoEm: AGORA },
  ],
});

describe("knowledge — GATE 01 ontologia", () => {
  it("toda aresta da ontologia é permitida e nada fora dela é aceito", () => {
    for (const a of ONTOLOGIA) expect(relacaoPermitida(a.de, a.para, a.tipo)).toBe(true);
    expect(relacaoPermitida("pessoa", "mercado", "compoe")).toBe(false);
    expect(relacaoPermitida("pessoa", "corretor", "integra")).toBe(false);
  });

  it("descarta relação fora da ontologia e relação sem nó (zero duplicação)", () => {
    const nos = [no("pessoa", "p1"), no("corretor", "c1")];
    const g = montarGrafo(
      nos,
      [
        rel(noId("pessoa", "p1"), "atendida_por", noId("corretor", "c1")),
        rel(noId("pessoa", "p1"), "atendida_por", noId("corretor", "c1")), // duplicada
        rel(noId("pessoa", "p1"), "compoe", noId("corretor", "c1")), // fora da ontologia
        rel(noId("pessoa", "p9"), "atendida_por", noId("corretor", "c1")), // órfã
      ],
      AGORA,
    );
    expect(g.relacoes).toHaveLength(1);
    expect(g.relacoes[0]!.id).toBe(`pessoa:p1->atendida_por->corretor:c1`);
  });

  it("monta o grafo a partir da Query Layer com as relações canônicas", () => {
    const g = montarGrafoConhecimento(entradaCompleta(), AGORA);
    const tipos = (t: TipoNo) => g.nos.filter((n) => n.tipo === t).length;
    expect(tipos("pessoa")).toBe(1);
    expect(tipos("evidencia")).toBe(1);
    expect(tipos("recomendacao")).toBe(1);
    expect(tipos("advisor")).toBe(1);
    expect(tipos("resultado")).toBe(1);
    const chaves = g.relacoes.map((r) => r.tipo);
    for (const t of ["atendida_por", "origina", "refere_se_a", "localizado_em", "compoe", "medido_por", "fundamenta", "apresentada_por", "observado_em"]) {
      expect(chaves).toContain(t);
    }
  });

  it("não afirma localização quando cidade/UF não coincidem", () => {
    const entrada = entradaCompleta();
    entrada.empreendimentos[0]!.cidade = "Joinville";
    const g = montarGrafoConhecimento(entrada, AGORA);
    expect(g.relacoes.some((r) => r.tipo === "localizado_em")).toBe(false);
  });
});

describe("knowledge — GATE 02 proveniência", () => {
  it("a árvore de uma recomendação vai até a fonte primária, sem resumir", () => {
    const g = montarGrafoConhecimento(entradaCompleta(), AGORA);
    const rec = g.nos.find((n) => n.tipo === "recomendacao")!;
    const arvore = arvoreProveniencia(g, rec.id);
    expect(arvore.raiz).not.toBeNull();
    expect(arvore.profundidadeMaxima).toBeGreaterThanOrEqual(1);
    expect(arvore.fontes).toContain("automation_daily_metrics");
    expect(arvore.completa).toBe(true);
    expect(achatarArvore(arvore).length).toBe(arvore.totalNos);
  });

  it("todo nó e toda relação declaram fonte e data", () => {
    const g = montarGrafoConhecimento(entradaCompleta(), AGORA);
    for (const n of g.nos) {
      expect(n.proveniencia.fonte).toBeTruthy();
      expect(n.proveniencia.atualizadoEm).toBeTruthy();
    }
    for (const r of g.relacoes) {
      expect(r.proveniencia.fonte).toBeTruthy();
      expect(r.proveniencia.adr).toBeTruthy();
    }
  });

  it("todo nó derivado declara algoritmo, versão e ADR", () => {
    const g = montarGrafoConhecimento(entradaCompleta(), AGORA);
    const derivados = g.nos.filter((n) =>
      ["analitico", "decisao", "resultado"].includes(n.proveniencia.camada),
    );
    expect(derivados.length).toBeGreaterThan(0);
    for (const n of derivados) {
      expect(n.proveniencia.algoritmo).toBeTruthy();
      expect(n.proveniencia.versaoAlgoritmo).toBeTruthy();
      expect(n.proveniencia.adr).toBeTruthy();
    }
  });

  it("interrompe ciclo sem esconder o nó", () => {
    const nos = [no("pessoa", "p1"), no("oportunidade", "o1"), no("evidencia", "ev1", { proveniencia: prov({ camada: "analitico", algoritmo: "x", versaoAlgoritmo: "1", adr: "ADR-027" }) })];
    const g = montarGrafo(
      nos,
      [
        rel(noId("pessoa", "p1"), "origina", noId("oportunidade", "o1")),
        rel(noId("oportunidade", "o1"), "sustenta", noId("evidencia", "ev1")),
        rel(noId("pessoa", "p1"), "sustenta", noId("evidencia", "ev1")),
      ],
      AGORA,
    );
    const arvore = arvoreProveniencia(g, noId("evidencia", "ev1"));
    expect(arvore.raiz).not.toBeNull();
    expect(arvore.totalNos).toBeGreaterThan(2);
  });

  it("nó inexistente devolve árvore vazia e incompleta", () => {
    const g = montarGrafoConhecimento(entradaCompleta(), AGORA);
    const arvore = arvoreProveniencia(g, "recomendacao:inexistente");
    expect(arvore.raiz).toBeNull();
    expect(arvore.completa).toBe(false);
  });
});

describe("knowledge — GATE 05 evidence trace", () => {
  it("declara os dez campos obrigatórios", () => {
    const g = montarGrafoConhecimento(entradaCompleta(), AGORA);
    const rec = g.nos.find((n) => n.tipo === "recomendacao")!;
    const trace = montarEvidenceTrace(g, rec.id, {
      criterios: ["impacto × urgência"],
      forcaEvidencia: "moderada",
      confianca: 74,
    })!;
    expect(trace.faltando).toEqual([]);
    expect(trace.versaoAlgoritmo).toBeTruthy();
    expect(trace.adr).toBeTruthy();
    expect(trace.arvore.completa).toBe(true);
  });

  it("aponta os campos faltantes em vez de inventar valores", () => {
    const g = montarGrafoConhecimento(entradaCompleta(), AGORA);
    const rec = g.nos.find((n) => n.tipo === "recomendacao")!;
    const trace = montarEvidenceTrace(g, rec.id)!;
    expect(trace.faltando).toContain("criterios");
    expect(trace.faltando).toContain("forcaEvidencia");
    expect(trace.faltando).toContain("confianca");
  });

  it("não devolve trace para nó que não é recomendação", () => {
    const g = montarGrafoConhecimento(entradaCompleta(), AGORA);
    expect(montarEvidenceTrace(g, noId("pessoa", "p1"))).toBeNull();
  });
});

describe("knowledge — GATE 06 timeline", () => {
  it("ordena do mais recente ao mais antigo e ignora nós sem data", () => {
    const nos = [
      no("pessoa", "p1", { proveniencia: prov({ atualizadoEm: "2026-01-01T00:00:00.000Z" }) }),
      no("corretor", "c1", { proveniencia: prov({ atualizadoEm: "2026-05-01T00:00:00.000Z" }) }),
      no("empreendimento", "e1", { proveniencia: prov({ atualizadoEm: null }) }),
    ];
    const g = montarGrafo(nos, [], AGORA);
    const linha = timelineConhecimento(g);
    expect(linha).toHaveLength(2);
    expect(linha[0]!.no).toBe(noId("corretor", "c1"));
  });
});

describe("knowledge — GATE 07 integridade", () => {
  it("aponta relacionamento órfão, origem inexistente e referência quebrada", () => {
    const nos = [no("pessoa", "p1"), no("corretor", "c1")];
    const g = montarGrafo(nos, [rel(noId("pessoa", "p1"), "atendida_por", noId("corretor", "c1"))], AGORA);
    const declaradas = [
      ...g.relacoes,
      rel(noId("pessoa", "p9"), "atendida_por", noId("corretor", "c9")), // órfã
      rel(noId("pessoa", "p9"), "atendida_por", noId("corretor", "c1")), // origem inexistente
      rel(noId("pessoa", "p1"), "atendida_por", noId("corretor", "c9")), // referência quebrada
    ];
    const i = verificarIntegridade(g, declaradas);
    expect(i.porChecagem.relacionamento_orfao).toBe(1);
    expect(i.porChecagem.origem_inexistente).toBe(1);
    expect(i.porChecagem.referencia_quebrada).toBe(1);
    expect(i.ok).toBe(false);
  });

  it("aponta proveniência inválida, evidência sem fonte, recomendação sem evidência e advisor sem recomendação", () => {
    const nos = [
      no("evidencia", "ev1", { proveniencia: prov({ camada: "analitico", fonte: "" }) }),
      no("recomendacao", "r1", {
        proveniencia: prov({ camada: "decisao", algoritmo: "x", versaoAlgoritmo: "1", adr: "ADR-027" }),
      }),
      no("advisor", "a1", {
        proveniencia: prov({ camada: "decisao", algoritmo: "x", versaoAlgoritmo: "1", adr: "ADR-020" }),
      }),
    ];
    const i = verificarIntegridade(montarGrafo(nos, [], AGORA));
    expect(i.porChecagem.evidencia_sem_fonte).toBe(1);
    expect(i.porChecagem.proveniencia_invalida).toBeGreaterThanOrEqual(1);
    expect(i.porChecagem.recomendacao_sem_evidencia).toBe(1);
    expect(i.porChecagem.advisor_sem_recomendacao).toBe(1);
  });

  it("grafo montado pela Query Layer nasce íntegro", () => {
    const g = montarGrafoConhecimento(entradaCompleta(), AGORA);
    const i = verificarIntegridade(g);
    expect(i.falhas).toEqual([]);
    expect(i.ok).toBe(true);
  });
});

describe("knowledge — GATE 08 health score", () => {
  it("mede cobertura, integridade, órfãos e tempo de atualização", () => {
    const g = montarGrafoConhecimento(entradaCompleta(), new Date(AGORA).toISOString());
    const i = verificarIntegridade(g);
    const s = knowledgeHealth(g, i, g.relacoes.length, new Date(AGORA));
    expect(s.totalNos).toBe(g.nos.length);
    expect(s.integridade).toBe(100);
    expect(s.provenienciaValida).toBe(100);
    expect(s.relacoesQuebradas).toBe(0);
    expect(s.cobertura).toBeLessThan(100); // equipe e construtora ainda sem Read Model
    expect(s.tiposAusentes).toContain("construtora");
    expect(s.tiposAusentes).toContain("equipe");
    expect(s.score).not.toBeNull();
    expect(s.tempoMedioAtualizacaoHoras).toBe(0);
    expect(s.nosAtivos).toBe(s.totalNos);
  });

  it("grafo vazio não recebe nota zero (ADR-019)", () => {
    const s = knowledgeHealth(montarGrafo([], [], AGORA), verificarIntegridade(montarGrafo([], [], AGORA)));
    expect(s.score).toBeNull();
    expect(s.tiposAusentes).toHaveLength(TIPOS_NO.length);
  });

  it("nó desconectado conta como órfão e derruba o score", () => {
    const g = montarGrafoConhecimento(entradaCompleta(), AGORA);
    const comOrfao = montarGrafo([...g.nos, no("pessoa", "solta")], g.relacoes, AGORA);
    const s = knowledgeHealth(comOrfao, verificarIntegridade(comOrfao));
    expect(s.nosOrfaos).toBeGreaterThanOrEqual(1);
  });
});
