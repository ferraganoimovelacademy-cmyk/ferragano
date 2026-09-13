import { describe, expect, it } from "vitest";
import { montarGrafo, noId, type NoConhecimento, type Proveniencia, type RelacaoConhecimento, type TipoNo } from "@/lib/platform/knowledge";
import { verificarIntegridade } from "@/lib/platform/knowledge";
import {
  SLA_FRESCOR_HORAS,
  confiancaNo,
  confiancaPorDominio,
  frescorGrafo,
  frescorNo,
  frescorPorDominio,
  knowledgeHealthPlus,
} from "@/lib/platform/knowledge-quality";

const AGORA = new Date("2026-08-01T00:00:00.000Z");
const haHoras = (h: number) => new Date(AGORA.getTime() - h * 36e5).toISOString();

const prov = (over: Partial<Proveniencia> = {}): Proveniencia => ({
  fonte: "customer_360",
  camada: "dominio",
  base: "dado_interno",
  algoritmo: null,
  versaoAlgoritmo: null,
  adr: null,
  atualizadoEm: haHoras(1),
  ...over,
});

const no = (tipo: TipoNo, id: string, over: Partial<NoConhecimento> = {}): NoConhecimento => ({
  id: noId(tipo, id),
  tipo,
  rotulo: `${tipo} ${id}`,
  proveniencia: prov(),
  ...over,
});

const derivado = (tipo: TipoNo, id: string, idadeHoras: number, fonte = "market_analytics") =>
  no(tipo, id, {
    proveniencia: prov({
      fonte,
      camada: tipo === "evidencia" ? "analitico" : "decisao",
      base: "evidencia_historica",
      algoritmo: "evidence.forcaEvidencia",
      versaoAlgoritmo: "26.1.0",
      adr: "ADR-026",
      atualizadoEm: haHoras(idadeHoras),
    }),
  });

const rel = (origem: string, tipo: RelacaoConhecimento["tipo"], destino: string) => ({
  origem,
  destino,
  tipo,
  atualizadoEm: haHoras(1),
  proveniencia: prov({ camada: "analitico", algoritmo: "x", versaoAlgoritmo: "1", adr: "ADR-027" }),
});

const grafoBase = () => {
  const nos = [
    no("pessoa", "p1", { proveniencia: prov({ atualizadoEm: haHoras(48) }) }),
    derivado("evidencia", "ev1", 24 * 47),
    derivado("recomendacao", "r1", 12),
  ];
  return montarGrafo(
    nos,
    [
      rel(noId("pessoa", "p1"), "sustenta", noId("evidencia", "ev1")),
      rel(noId("evidencia", "ev1"), "fundamenta", noId("recomendacao", "r1")),
    ],
    AGORA.toISOString(),
  );
};

describe("knowledge freshness", () => {
  it("cada domínio tem orçamento próprio de idade", () => {
    expect(SLA_FRESCOR_HORAS.mercado).toBeLessThan(SLA_FRESCOR_HORAS.relacionamento);
    expect(SLA_FRESCOR_HORAS.produto).toBeLessThan(SLA_FRESCOR_HORAS.resultado);
  });

  it("classifica verde, amarelo e vermelho pelo SLA do domínio", () => {
    expect(frescorNo(no("indicador", "i1", { proveniencia: prov({ atualizadoEm: haHoras(18) }) }), AGORA).semaforo).toBe("verde");
    expect(frescorNo(no("indicador", "i2", { proveniencia: prov({ atualizadoEm: haHoras(36) }) }), AGORA).semaforo).toBe("amarelo");
    expect(frescorNo(no("indicador", "i3", { proveniencia: prov({ atualizadoEm: haHoras(72) }) }), AGORA).semaforo).toBe("vermelho");
  });

  it("nó sem data não recebe índice zero (ADR-019)", () => {
    const f = frescorNo(no("pessoa", "px", { proveniencia: prov({ atualizadoEm: null }) }), AGORA);
    expect(f.semaforo).toBe("sem_dado");
    expect(f.indice).toBeNull();
  });

  it("evidência com 47 dias fica vermelha e mercado recente fica verde", () => {
    const g = montarGrafo(
      [derivado("evidencia", "ev1", 24 * 47), no("indicador", "i1", { proveniencia: prov({ atualizadoEm: haHoras(18) }) })],
      [],
      AGORA.toISOString(),
    );
    const dominios = frescorPorDominio(g, AGORA);
    expect(dominios.find((d) => d.dominio === "evidencia")!.semaforo).toBe("vermelho");
    expect(dominios.find((d) => d.dominio === "mercado")!.semaforo).toBe("verde");
    expect(frescorGrafo(dominios)).not.toBeNull();
  });

  it("frescor agregado é null quando nenhum nó tem data", () => {
    const g = montarGrafo([no("pessoa", "p1", { proveniencia: prov({ atualizadoEm: null }) })], [], AGORA.toISOString());
    expect(frescorGrafo(frescorPorDominio(g, AGORA))).toBeNull();
  });
});

describe("knowledge confidence score", () => {
  it("nó com proveniência, rastro, conexão e frescor chega a 100", () => {
    const g = grafoBase();
    const c = confiancaNo(g, noId("recomendacao", "r1"), AGORA)!;
    expect(c.score).toBe(100);
    expect(c.naoAtendidos).toEqual([]);
  });

  it("declara os critérios não atendidos em vez de esconder", () => {
    const g = grafoBase();
    const c = confiancaNo(g, noId("evidencia", "ev1"), AGORA)!;
    expect(c.naoAtendidos).toContain("frescor_no_sla");
    expect(c.score).toBeLessThan(100);
    expect(c.criterios).toHaveLength(5);
  });

  it("nó órfão e sem rastro perde os pesos correspondentes", () => {
    const g = montarGrafo([derivado("recomendacao", "solta", 1)], [], AGORA.toISOString());
    const c = confiancaNo(g, noId("recomendacao", "solta"), AGORA)!;
    expect(c.naoAtendidos).toContain("conectado");
    expect(c.naoAtendidos).toContain("rastro_ate_fonte");
    expect(c.score).toBe(60);
  });

  it("nó sem qualquer base de avaliação recebe null, não zero", () => {
    const g = montarGrafo(
      [no("recomendacao", "vazia", { proveniencia: prov({ camada: "decisao", fonte: "", atualizadoEm: null }) })],
      [],
      AGORA.toISOString(),
    );
    expect(confiancaNo(g, noId("recomendacao", "vazia"), AGORA)!.score).toBeNull();
  });

  it("nó inexistente devolve null", () => {
    expect(confiancaNo(grafoBase(), "pessoa:inexistente", AGORA)).toBeNull();
  });

  it("agrega confiança por domínio e aponta o pior nó", () => {
    const dominios = confiancaPorDominio(grafoBase(), AGORA);
    const evid = dominios.find((d) => d.dominio === "evidencia")!;
    expect(evid.score).toBeLessThan(100);
    expect(evid.piorNo?.no).toBe(noId("evidencia", "ev1"));
  });
});

describe("knowledge health score com frescor e confiança", () => {
  it("acrescenta as duas dimensões sem quebrar as antigas", () => {
    const g = grafoBase();
    const s = knowledgeHealthPlus(g, verificarIntegridade(g), g.relacoes.length, AGORA);
    expect(s.integridade).toBe(100);
    expect(s.frescor).not.toBeNull();
    expect(s.confianca).not.toBeNull();
    expect(s.scoreCompleto).not.toBeNull();
    expect(s.porDominioFrescor.length).toBeGreaterThan(0);
  });

  it("domínio vencido aparece em dominiosVencidos e derruba o score completo", () => {
    const g = grafoBase();
    const s = knowledgeHealthPlus(g, verificarIntegridade(g), g.relacoes.length, AGORA);
    expect(s.dominiosVencidos).toContain("evidencia");
    expect(s.frescor!).toBeLessThan(100);
    expect(s.scoreCompleto!).toBeLessThanOrEqual(s.score!);
  });

  it("grafo vazio mantém score null", () => {
    const g = montarGrafo([], [], AGORA.toISOString());
    const s = knowledgeHealthPlus(g, verificarIntegridade(g), 0, AGORA);
    expect(s.scoreCompleto).toBeNull();
    expect(s.frescor).toBeNull();
  });
});
