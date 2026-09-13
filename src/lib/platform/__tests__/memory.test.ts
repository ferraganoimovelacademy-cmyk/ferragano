import { describe, expect, it } from "vitest";
import {
  ELEMENTOS_DECISAO,
  MINIMO_CASOS_PLAYBOOK,
  completudeDecisao,
  decisionDNA,
  gerarPlaybook,
  indicadoresMemoria,
  memoriaCampanha,
  motorLicoes,
  reusoConhecimento,
  roiMedianoHistorico,
  similaridade,
  temasElegiveis,
  timelineCorporativa,
  type Campanha,
  type Decisao,
  type Licao,
} from "@/lib/platform/memory";

const decisao = (over: Partial<Decisao> = {}): Decisao => ({
  id: over.id ?? "d1",
  categoria: "decisao",
  status: "registrada",
  titulo: "Reduzir preço da torre B",
  contexto: "Estoque parado há 90 dias na torre B com liquidez abaixo da média.",
  motivo: "Acelerar giro do estoque antes do lançamento seguinte.",
  hipotese: null,
  evidencias: [],
  responsavelNome: null,
  participantes: [],
  prazo: null,
  aprovadoEm: null,
  executadoEm: null,
  resultado: null,
  resultadoValor: null,
  avaliacao: null,
  avaliadoEm: null,
  revisao: null,
  revisadoEm: null,
  rollbackPlano: null,
  impacto: null,
  tema: null,
  tags: [],
  criadoEm: "2026-03-01T12:00:00.000Z",
  ...over,
});

const campanha = (over: Partial<Campanha> = {}): Campanha => ({
  id: over.id ?? "c1",
  status: "encerrada",
  nome: "Lançamento Vista Sul",
  objetivo: "Gerar 200 leads qualificados",
  estrategia: "Mídia paga + plantão de vendas",
  canal: "meta",
  publico: "investidores 35-55",
  investimento: 10000,
  inicio: "2026-01-01",
  fim: "2026-02-01",
  leads: 100,
  oportunidades: 40,
  vendas: 5,
  receita: 25000,
  motivoNascimento: "Abertura de vendas da torre A",
  motivoMudanca: null,
  motivoEncerramento: "Fim do estoque promocional",
  responsavelNome: "Ana",
  tema: "lancamento",
  criadoEm: "2026-01-01T00:00:00.000Z",
  ...over,
});

const licao = (over: Partial<Licao> = {}): Licao => ({
  id: over.id ?? "l1",
  tipo: "acerto",
  titulo: "Retorno positivo",
  licao: "ROI acima de zero",
  evidencias: ["ROI observado: 150%"],
  decisionId: null,
  campaignId: "c1",
  origem: "lesson_engine",
  tema: "lancamento",
  criadoEm: "2026-02-01T00:00:00.000Z",
  ...over,
});

describe("GATE 01 — Decision Memory", () => {
  it("mede completude sobre os 7 elementos exigidos", () => {
    const c = completudeDecisao(decisao());
    expect(ELEMENTOS_DECISAO).toHaveLength(7);
    expect(c.preenchidos).toEqual(["contexto", "motivo"]);
    expect(c.pontos).toBe(29);
    expect(c.faltando).toContain("evidências utilizadas");
  });

  it("chega a 100% quando todo o ciclo foi registrado", () => {
    const c = completudeDecisao(
      decisao({
        hipotese: "O giro sobe 20%",
        evidencias: ["unit_price_history", "liquidez 90d"],
        responsavelNome: "Ana",
        resultado: "Giro subiu 12%",
        revisao: "Manter tabela nova",
      }),
    );
    expect(c.pontos).toBe(100);
    expect(c.faltando).toEqual([]);
  });
});

describe("GATE 02 — Campaign Memory", () => {
  it("calcula ROI, CPL e conversão a partir do registrado", () => {
    const m = memoriaCampanha(campanha());
    expect(m.roiPct).toBe(150);
    expect(m.cpl).toBe(100);
    expect(m.conversaoPct).toBe(5);
    expect(m.lacunas).toEqual([]);
  });

  it("declara lacuna em vez de estimar quando não há investimento", () => {
    const m = memoriaCampanha(campanha({ investimento: 0 }));
    expect(m.roiPct).toBeNull();
    expect(m.cpl).toBeNull();
    expect(m.lacunas.join(" ")).toContain("investimento não registrado");
  });

  it("aponta encerramento sem motivo", () => {
    const m = memoriaCampanha(campanha({ motivoEncerramento: null }));
    expect(m.lacunas.join(" ")).toContain("sem motivo de encerramento");
  });
});

describe("GATE 03 — Lesson Engine", () => {
  it("gera lições com evidência para campanha lucrativa", () => {
    const { licoes } = motorLicoes(campanha());
    expect(licoes.some((l) => l.tipo === "acerto")).toBe(true);
    expect(licoes.every((l) => l.evidencias.length > 0)).toBe(true);
  });

  it("marca erro quando o ROI é negativo", () => {
    const { licoes } = motorLicoes(campanha({ receita: 2000 }));
    expect(licoes.some((l) => l.tipo === "erro")).toBe(true);
  });

  it("marca risco quando houve volume e nenhuma venda", () => {
    const { licoes } = motorLicoes(campanha({ vendas: 0, receita: 0 }));
    expect(licoes.some((l) => l.tipo === "risco")).toBe(true);
  });

  it("não inventa lição sem dado registrado", () => {
    const { licoes, lacunas } = motorLicoes(
      campanha({ investimento: 0, leads: 0, vendas: 0, receita: 0, oportunidades: 0 }),
    );
    expect(licoes).toEqual([]);
    expect(lacunas.join(" ")).toContain("dados insuficientes");
  });

  it("compara com a mediana histórica quando existe", () => {
    const mediana = roiMedianoHistorico([campanha({ id: "a" }), campanha({ id: "b", receita: 5000 })]);
    expect(mediana).toBe(50);
    const { licoes } = motorLicoes(campanha(), { roiMedianoPct: mediana });
    expect(licoes.some((l) => l.tipo === "boa_pratica")).toBe(true);
  });

  it("mediana é nula sem nenhuma campanha com investimento", () => {
    expect(roiMedianoHistorico([campanha({ investimento: 0 })])).toBeNull();
  });
});

describe("GATE 04 — Corporate Timeline", () => {
  it("agrupa por ano em ordem decrescente", () => {
    const linha = timelineCorporativa({
      decisoes: [decisao(), decisao({ id: "d2", criadoEm: "2025-06-01T00:00:00.000Z" })],
      campanhas: [campanha()],
      licoes: [licao()],
      playbooks: [],
    });
    expect(linha.map((a) => a.ano)).toEqual([2026, 2025]);
    expect(linha[0]!.total).toBe(3);
    expect(linha[0]!.itens[0]!.em >= linha[0]!.itens[1]!.em).toBe(true);
  });
});

describe("GATE 05 — Knowledge Reuse", () => {
  it("encontra caso comparável e declara diferenças de contexto", () => {
    const r = reusoConhecimento(
      { titulo: "Reduzir preço da torre C", contexto: "Estoque parado com liquidez baixa", tema: "precificacao" },
      [decisao({ tema: "precificacao", resultado: "Giro subiu 12%", avaliacao: 4 })],
    );
    expect(r.casos).toHaveLength(1);
    expect(r.casos[0]!.resultadoObservado).toBe("Giro subiu 12%");
    expect(r.casos[0]!.motivosDaComparacao.join(" ")).toContain("mesmo tema");
    expect(r.limitacoes.join(" ")).toContain("amostra pequena");
    expect(r.baseUtilizada).toContain("memory_decisions");
  });

  it("não devolve caso quando não há memória", () => {
    const r = reusoConhecimento({ titulo: "Contratar 3 corretores", contexto: "Equipe reduzida" }, []);
    expect(r.casos).toEqual([]);
    expect(r.limitacoes.join(" ")).toContain("nenhuma decisão registrada");
  });

  it("similaridade ignora palavras irrelevantes", () => {
    expect(similaridade("preço da torre", "preço de torre")).toBe(1);
    expect(similaridade("contratação de equipe", "reforma da fachada")).toBe(0);
  });
});

describe("GATE 06 — Playbook Generator", () => {
  const casos = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      decisao({
        id: `d${i}`,
        tema: "lancamento",
        hipotese: "sobe o giro",
        evidencias: ["histórico"],
        avaliacao: i < 4 ? 5 : 2,
        criadoEm: `2026-0${(i % 9) + 1}-01T00:00:00.000Z`,
      }),
    );

  it("recusa gerar sem massa crítica", () => {
    const r = gerarPlaybook("lancamento", casos(2));
    expect("passos" in r).toBe(false);
    if (!("passos" in r)) expect(r.faltam).toBe(MINIMO_CASOS_PLAYBOOK - 2);
  });

  it("gera playbook com casos, período, taxa e limitações", () => {
    const r = gerarPlaybook("lancamento", casos(6));
    expect("passos" in r).toBe(true);
    if ("passos" in r) {
      expect(r.casos).toBe(6);
      expect(r.taxaSucessoPct).toBeCloseTo(66.7, 1);
      expect(r.passos.every((p) => p.base.includes("de 6 casos"))).toBe(true);
      expect(r.limitacoes.join(" ")).toContain("não é regra prescritiva");
    }
  });

  it("lista temas elegíveis e o que falta", () => {
    const temas = temasElegiveis([...casos(3), decisao({ id: "x", tema: "reforma" })]);
    expect(temas[0]).toMatchObject({ tema: "lancamento", casos: 3, elegivel: false, faltam: 2 });
  });
});

describe("GATE 07 — Decision DNA", () => {
  it("descreve tempos e fatores sem prescrever", () => {
    const dna = decisionDNA([
      decisao({
        id: "a",
        tema: "lancamento",
        criadoEm: "2026-03-01T00:00:00.000Z",
        aprovadoEm: "2026-03-02T00:00:00.000Z",
        executadoEm: "2026-03-04T00:00:00.000Z",
        hipotese: "sobe",
        avaliacao: 5,
      }),
      decisao({ id: "b", tema: "lancamento", avaliacao: 2 }),
    ]);
    expect(dna.totalDecisoes).toBe(2);
    expect(dna.estrategiasRecorrentes[0]).toMatchObject({ tema: "lancamento", casos: 2 });
    expect(dna.padroesAprovacao.tempoMedioAprovacaoHoras).toBe(24);
    expect(dna.tempoMedioExecucaoHoras).toBe(48);
    const fator = dna.fatoresObservados.find((f) => f.fator === "hipótese registrada");
    expect(fator?.diferencaMedia).toBe(3);
    expect(dna.lacunas.join(" ")).toContain("indícios");
  });

  it("declara lacuna sem datas de aprovação", () => {
    const dna = decisionDNA([decisao()]);
    expect(dna.padroesAprovacao.tempoMedioAprovacaoHoras).toBeNull();
    expect(dna.lacunas.join(" ")).toContain("tempo de decisão indisponível");
  });
});

describe("GATE 08 — Memory Dashboard", () => {
  it("consolida patrimônio, cobertura e reuso", () => {
    const ind = indicadoresMemoria({
      decisoes: [decisao({ resultado: "ok", status: "avaliada" }), decisao({ id: "d2" })],
      campanhas: [campanha()],
      licoes: [licao()],
      playbooks: [],
    });
    expect(ind.decisoesRegistradas).toBe(2);
    expect(ind.decisoesFechadas).toBe(1);
    expect(ind.coberturaPct).toBe(50);
    expect(ind.reutilizacaoPct).toBe(33);
    expect(ind.licoesPorTipo.acerto).toBe(1);
    expect(ind.patrimonioIntelectual).toBeGreaterThan(0);
    expect(ind.lacunas.join(" ")).toContain("nenhum playbook gerado");
  });

  it("memória vazia não inventa número", () => {
    const ind = indicadoresMemoria({ decisoes: [], campanhas: [], licoes: [], playbooks: [] });
    expect(ind.patrimonioIntelectual).toBe(0);
    expect(ind.coberturaPct).toBe(0);
    expect(ind.completudeMediaPct).toBe(0);
    expect(ind.lacunas.join(" ")).toContain("memória vazia");
  });
});