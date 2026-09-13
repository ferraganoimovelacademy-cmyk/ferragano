import { describe, expect, it } from "vitest";
import {
  HISTORICO_PIPELINES,
  LACUNA_RECURSOS,
  PIPELINES,
  assinaturaPipeline,
  custoPipelines,
  estatisticaCache,
  grafoRuntime,
  mapaCalor,
  metricasPorContexto,
  otimizarOrdem,
  perfilPipeline,
  saudeFabric,
  simularFalha,
  versionarPipeline,
  type Amostra,
  type MetricaContexto,
} from "@/lib/platform/fabric";
import {
  CONTEXTOS,
  DEPENDENCIAS,
  entradaCache,
  planoRecalculo,
  type Contexto,
  type EventoMudanca,
  type ExecucaoContexto,
} from "@/lib/platform/orchestrator";

const amostra = (contexto: Contexto, duracaoMs: number | null, ok = true, em = "2026-08-01T00:00:00.000Z"): Amostra => ({
  contexto,
  duracaoMs,
  ok,
  em,
});

const AMOSTRAS: Amostra[] = [
  amostra("dominio", 100),
  amostra("dominio", 200),
  amostra("dominio", 300),
  amostra("market", 900),
  amostra("market", 1100),
  amostra("behavior", 400),
  amostra("evidence", 2000),
  amostra("evidence", 2400, false),
  amostra("recommendation", 600),
  amostra("advisor", 500),
  amostra("knowledge", 300),
  amostra("executive", 200),
];

const metricas = () => metricasPorContexto(AMOSTRAS);

const evento = (contexto: Contexto, nome: string): EventoMudanca => ({
  evento: nome,
  contexto,
  em: "2026-08-01T00:00:00.000Z",
  detalhe: null,
});

describe("fabric — GATE 01 dependency optimizer", () => {
  it("mede execuções, mediana, p95 e falhas por contexto", () => {
    const m = metricas().find((x) => x.contexto === "dominio")!;
    expect(m.execucoes).toBe(3);
    expect(m.duracaoMedianaMs).toBe(200);
    expect(m.duracaoP95Ms).toBe(300);
    expect(m.falhas).toBe(0);
    expect(metricas().find((x) => x.contexto === "evidence")!.falhas).toBe(1);
  });

  it("contexto sem amostra fica semMedicao e nunca zero", () => {
    const m = metricasPorContexto([amostra("market", 900)]).find((x) => x.contexto === "advisor")!;
    expect(m.semMedicao).toBe(true);
    expect(m.duracaoMedianaMs).toBeNull();
    expect(m.duracaoTotalMs).toBeNull();
  });

  it("duração ausente ou inválida não entra na mediana", () => {
    const m = metricasPorContexto([amostra("market", null), amostra("market", -5), amostra("market", 800)]).find(
      (x) => x.contexto === "market",
    )!;
    expect(m.execucoes).toBe(3);
    expect(m.duracaoMedianaMs).toBe(800);
  });

  it("conta dependentes transitivos para identificar criticidade", () => {
    const m = metricas();
    expect(m.find((x) => x.contexto === "market")!.dependentes).toBeGreaterThan(0);
    expect(m.find((x) => x.contexto === "executive")!.dependentes).toBe(0);
  });

  it("caminho crítico é menor que a execução em série e gera ganho", () => {
    const o = otimizarOrdem(metricas());
    expect(o.duracaoSerialMs).toBeGreaterThan(o.duracaoCriticaMs!);
    expect(o.ganhoEstimadoMs).toBe(o.duracaoSerialMs! - o.duracaoCriticaMs!);
    expect(o.niveis.some((n) => n.contextos.length > 1)).toBe(true);
  });

  it("níveis respeitam a ordem topológica do Orchestrator", () => {
    const o = otimizarOrdem(metricas());
    const nivelDe = (c: Contexto) => o.niveis.find((n) => n.contextos.includes(c))!.nivel;
    expect(nivelDe("market")).toBeLessThan(nivelDe("evidence"));
    expect(nivelDe("evidence")).toBeLessThan(nivelDe("recommendation"));
    expect(nivelDe("executive")).toBe(Math.max(...o.niveis.map((n) => n.nivel)));
  });

  it("sem medição alguma o ganho é null e a lacuna é declarada", () => {
    const o = otimizarOrdem(metricasPorContexto([]));
    expect(o.ganhoEstimadoMs).toBeNull();
    expect(o.observacoes.join(" ")).toContain("Sem duração medida");
  });

  it("ciclo no fluxo suspende a otimização", () => {
    const o = otimizarOrdem(metricas(), [
      ...DEPENDENCIAS,
      { de: "executive", para: "market", algoritmo: "loop", adr: "ADR-029" },
    ]);
    expect(o.niveis).toEqual([]);
    expect(o.observacoes[0]).toContain("ciclo");
  });

  it("mede cache hit, miss e tempo economizado apenas com duração medida", () => {
    const cache = CONTEXTOS.map((c) => entradaCache(c, "w1", "2026-07-01T00:00:00.000Z"));
    const plano = planoRecalculo([evento("market", "market.serie_atualizada:selic")], cache);
    const e = estatisticaCache(plano, metricas());
    expect(e.hits).toBe(plano.reaproveitar.length);
    expect(e.misses).toBe(plano.recalcular.length);
    expect(e.taxaHit).toBe(Math.round((e.hits / (e.hits + e.misses)) * 100));
    expect(e.tempoEconomizadoMs).toBeGreaterThan(0);
    expect(e.recalculosEvitados).toBe(e.hits);
  });

  it("economia não quantificável é declarada, não estimada", () => {
    const cache = CONTEXTOS.map((c) => entradaCache(c, "w1", "2026-07-01T00:00:00.000Z"));
    const plano = planoRecalculo([evento("market", "market.serie_atualizada:selic")], cache);
    const e = estatisticaCache(plano, metricasPorContexto([]));
    expect(e.tempoEconomizadoMs).toBeNull();
    expect(e.semMedicao.length).toBe(e.hits);
  });

  it("plano vazio devolve taxa de hit null", () => {
    expect(estatisticaCache(planoRecalculo([]), metricas()).taxaHit).toBeNull();
  });
});

describe("fabric — GATE 02 pipeline profiler", () => {
  it("mostra o tempo consumido por etapa e o percentual", () => {
    const p = perfilPipeline("advisor", metricas())!;
    expect(p.etapas.map((e) => e.contexto)).toEqual([
      "dominio",
      "market",
      "behavior",
      "evidence",
      "recommendation",
      "advisor",
    ]);
    expect(p.totalMs).toBe(200 + 1000 + 400 + 2200 + 600 + 500);
    const soma = p.etapas.reduce((a, e) => a + (e.percentual ?? 0), 0);
    expect(Math.abs(soma - 100)).toBeLessThanOrEqual(2);
  });

  it("aponta a etapa mais lenta como gargalo", () => {
    const p = perfilPipeline("advisor", metricas())!;
    expect(p.gargalo).toBe("evidence");
    expect(p.cobertura).toBe(100);
    expect(p.lacunas).toEqual([]);
  });

  it("etapa sem medição vira lacuna e reduz cobertura", () => {
    const p = perfilPipeline("advisor", metricasPorContexto([amostra("market", 900)]))!;
    expect(p.cobertura).toBeLessThan(100);
    expect(p.lacunas[0]).toContain("sem duração medida");
    expect(p.etapas.filter((e) => e.semMedicao).length).toBe(5);
  });

  it("pipeline inexistente devolve null", () => {
    expect(perfilPipeline("inexistente", metricas())).toBeNull();
  });

  it("todo pipeline percorre apenas etapas válidas do DAG", () => {
    for (const p of PIPELINES) {
      for (const etapa of p.etapas) expect(CONTEXTOS).toContain(etapa);
    }
  });
});

describe("fabric — GATE 03 pipeline versioning", () => {
  it("assinatura é determinística e diferente entre pipelines", () => {
    expect(assinaturaPipeline("advisor")).toBe(assinaturaPipeline("advisor"));
    expect(assinaturaPipeline("advisor")).not.toBe(assinaturaPipeline("radar"));
  });

  it("histórico declarado casa com a assinatura atual (sem divergência)", () => {
    for (const p of PIPELINES) {
      const v = versionarPipeline(p.id)!;
      expect(v.divergente).toBe(false);
      expect(v.proximaVersao).toBeNull();
      expect(v.versaoAtiva).toBe("v1.0");
    }
    expect(HISTORICO_PIPELINES).toHaveLength(PIPELINES.length);
  });

  it("alterar dependência exige nova versão e mostra a aresta adicionada", () => {
    const v = versionarPipeline("recommendation", [
      ...DEPENDENCIAS,
      { de: "dominio", para: "recommendation", algoritmo: "atalho", adr: "ADR-030" },
    ])!;
    expect(v.divergente).toBe(true);
    expect(v.proximaVersao).toBe("v1.1");
    expect(v.arestasAdicionadas).toContain("dominio>recommendation");
  });

  it("remover dependência é reportado como aresta removida", () => {
    const v = versionarPipeline(
      "recommendation",
      DEPENDENCIAS.filter((d) => !(d.de === "behavior" && d.para === "recommendation")),
    )!;
    expect(v.arestasRemovidas).toContain("behavior>recommendation");
    expect(v.divergente).toBe(true);
  });

  it("pipeline sem histórico registrado começa em v1.0", () => {
    const v = versionarPipeline("advisor", DEPENDENCIAS, [])!;
    expect(v.versaoAtiva).toBe("não registrada");
    expect(v.proximaVersao).toBe("v1.0");
  });
});

describe("fabric — GATE 04 cost engine", () => {
  it("reporta tempo, chamadas e participação por entregável", () => {
    const c = custoPipelines(metricas());
    expect(c.itens).toHaveLength(PIPELINES.length);
    const advisor = c.itens.find((i) => i.pipeline === "advisor")!;
    expect(advisor.tempoMs).toBeGreaterThan(0);
    expect(advisor.chamadas).toBeGreaterThan(0);
    expect(advisor.participacao).not.toBeNull();
    expect(c.maisCaro).toBe("advisor");
  });

  it("declara que CPU e memória não são observáveis, em vez de estimar", () => {
    const c = custoPipelines(metricas());
    expect(c.lacunas).toContain(LACUNA_RECURSOS);
    expect(JSON.stringify(c.itens)).not.toContain("cpu");
  });

  it("sem medição, tempo é null e a participação não é inventada", () => {
    const c = custoPipelines(metricasPorContexto([]));
    expect(c.tempoTotalMs).toBeNull();
    expect(c.itens.every((i) => i.tempoMs === null && i.participacao === null)).toBe(true);
    expect(c.maisCaro).toBeNull();
  });

  it("falhas das etapas são somadas no custo do entregável", () => {
    expect(custoPipelines(metricas()).itens.find((i) => i.pipeline === "advisor")!.falhas).toBe(1);
  });
});

describe("fabric — GATE 05 heat map", () => {
  it("a etapa mais lenta recebe 10 blocos e as demais são proporcionais", () => {
    const { faixas, referenciaMs } = mapaCalor(metricas());
    expect(referenciaMs).toBe(2200);
    expect(faixas[0]!.contexto).toBe("evidence");
    expect(faixas[0]!.blocos).toBe(10);
    expect(faixas[0]!.barra).toHaveLength(10);
    const market = faixas.find((f) => f.contexto === "market")!;
    expect(market.blocos).toBe(5);
  });

  it("gargalo exige lentidão e dependentes", () => {
    const { gargalos } = mapaCalor(metricas());
    expect(gargalos).toContain("evidence");
    expect(gargalos).not.toContain("executive");
  });

  it("sem medição não desenha barra nem inventa intensidade", () => {
    const { faixas, referenciaMs } = mapaCalor(metricasPorContexto([]));
    expect(referenciaMs).toBeNull();
    expect(faixas.every((f) => f.blocos === 0 && f.barra === "" && f.semMedicao)).toBe(true);
  });
});

describe("fabric — GATE 06 pipeline simulator", () => {
  it("responde o que para de funcionar sem o Market", () => {
    const s = simularFalha("market");
    expect(s.indisponiveis.map((i) => i.contexto)).toEqual(
      expect.arrayContaining(["evidence", "recommendation", "advisor", "knowledge", "executive"]),
    );
    expect(s.pipelinesAfetados.map((p) => p.pipeline)).toEqual(
      expect.arrayContaining(["advisor", "radar", "recommendation"]),
    );
    expect(s.severidade).toBe("critico");
  });

  it("falha do Behavior preserva as etapas anteriores do pipeline", () => {
    const s = simularFalha("behavior");
    const advisor = s.pipelinesAfetados.find((p) => p.pipeline === "advisor")!;
    expect(advisor.etapaFaltante).toBe("behavior");
    expect(advisor.etapasPreservadas).toEqual(["dominio", "market"]);
    expect(s.operacionais).toContain("market");
  });

  it("desligar a folha do fluxo tem impacto restrito", () => {
    const s = simularFalha("executive");
    expect(s.indisponiveis).toEqual([]);
    expect(s.severidade).not.toBe("critico");
  });

  it("resumo declara quantos entregáveis param", () => {
    expect(simularFalha("dominio").resumo).toContain("entregáveis");
  });
});

describe("fabric — GATE 07 runtime knowledge graph", () => {
  const cache = () => CONTEXTOS.map((c) => entradaCache(c, "w1", "2026-07-01T00:00:00.000Z"));
  const exec = (contexto: Contexto, ok: boolean, em = "2026-08-01T01:00:00.000Z"): ExecucaoContexto => ({
    contexto,
    em,
    ok,
    duracaoMs: 500,
    detalhe: null,
  });

  it("distingue recalculado, aguardando, reaproveitado e falhou", () => {
    const plano = planoRecalculo([evento("market", "market.serie_atualizada:selic")], cache());
    const g = grafoRuntime(plano, [exec("market", true), exec("evidence", false)]);
    const estado = (c: Contexto) => g.nos.find((n) => n.contexto === c)!.estado;
    expect(estado("market")).toBe("recalculado");
    expect(estado("evidence")).toBe("falhou");
    expect(estado("recommendation")).toBe("aguardando");
    expect(estado("behavior")).toBe("reaproveitado");
  });

  it("cadeia não está viva quando há falha ou pendência", () => {
    const plano = planoRecalculo([evento("market", "market.serie_atualizada:selic")], cache());
    expect(grafoRuntime(plano, [exec("market", true)]).vivo).toBe(false);
  });

  it("sem evento, tudo reaproveitado e o grafo está vivo", () => {
    const g = grafoRuntime(planoRecalculo([], cache()), []);
    expect(g.vivo).toBe(true);
    expect(g.reaproveitados).toBe(CONTEXTOS.length);
    expect(g.aguardando).toBe(0);
  });

  it("cada nó declara de quem depende e quem alimenta", () => {
    const g = grafoRuntime(planoRecalculo([]), []);
    const evidence = g.nos.find((n) => n.contexto === "evidence")!;
    expect(evidence.dependeDe).toEqual(expect.arrayContaining(["market", "behavior", "dominio"]));
    expect(evidence.dependentes).toEqual(expect.arrayContaining(["recommendation", "knowledge"]));
  });

  it("usa a execução mais recente quando há várias", () => {
    const plano = planoRecalculo([evento("market", "market.serie_atualizada:selic")], cache());
    const g = grafoRuntime(plano, [
      exec("market", false, "2026-08-01T00:00:00.000Z"),
      exec("market", true, "2026-08-01T05:00:00.000Z"),
    ]);
    expect(g.nos.find((n) => n.contexto === "market")!.estado).toBe("recalculado");
  });
});

describe("fabric — GATE 08 executive fabric dashboard", () => {
  const montar = (m: MetricaContexto[]) => {
    const cache = CONTEXTOS.map((c) => entradaCache(c, "w1", "2026-07-01T00:00:00.000Z"));
    const plano = planoRecalculo([evento("market", "market.serie_atualizada:selic")], cache);
    const estat = estatisticaCache(plano, m);
    const perfis = PIPELINES.map((p) => perfilPipeline(p.id, m)!);
    const versoes = PIPELINES.map((p) => versionarPipeline(p.id)!);
    const runtime = grafoRuntime(plano, []);
    return saudeFabric({ metricas: m, plano, cache: estat, perfis, versoes, runtime });
  };

  it("consolida eficiência, reutilização, gargalos e versões", () => {
    const s = montar(metricas());
    expect(s.eficiencia).toBe(Math.round((11 / 12) * 100));
    expect(s.taxaHit).not.toBeNull();
    expect(s.tempoEconomizadoMs).not.toBeNull();
    expect(s.gargalos).toContain("evidence");
    expect(s.versoesAtivas).toBe(PIPELINES.length);
    expect(s.versoesDivergentes).toEqual([]);
    expect(s.score).not.toBeNull();
  });

  it("sempre declara que CPU e memória não são medidas", () => {
    expect(montar(metricas()).lacunas).toContain(LACUNA_RECURSOS);
  });

  it("sem execuções, eficiência é null e as lacunas explicam o porquê", () => {
    const s = montar(metricasPorContexto([]));
    expect(s.eficiencia).toBeNull();
    expect(s.tempoMedioPipelineMs).toBeNull();
    expect(s.lacunas.join(" ")).toContain("Nenhuma execução observada");
    expect(s.lacunas.join(" ")).toContain("Nenhum pipeline com tempo medido");
  });

  it("pipeline com etapa sem medição não conta como saudável", () => {
    const s = montar(metricasPorContexto([amostra("market", 900)]));
    expect(s.pipelinesSaudaveis).toBe(0);
    expect(s.pipelinesTotal).toBe(PIPELINES.length);
  });
});
