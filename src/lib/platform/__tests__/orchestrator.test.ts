import { describe, expect, it } from "vitest";
import {
  CONTEXTOS,
  DEPENDENCIAS,
  analisarImpacto,
  auditoriaConhecimento,
  chaveCache,
  entradaCache,
  executiveStory,
  explainUpdate,
  grafoDependencias,
  invalidarPorEvento,
  knowledgeDiff,
  planoRecalculo,
  type EventoMudanca,
  type MudancaValor,
} from "@/lib/platform/orchestrator";

const evento = (contexto: EventoMudanca["contexto"], nome: string, em: string): EventoMudanca => ({
  evento: nome,
  contexto,
  em,
  detalhe: null,
});

describe("orchestrator — GATE 01 dependency graph", () => {
  it("o fluxo é acíclico e termina no executivo", () => {
    const g = grafoDependencias();
    expect(g.ciclos).toEqual([]);
    expect(g.ordem).toHaveLength(CONTEXTOS.length);
    expect(g.folhas).toContain("executive");
    expect(g.raizes).toContain("dominio");
    expect(g.raizes).toContain("market");
  });

  it("respeita a ordem Market → Evidence → Recommendation → Advisor → Knowledge → Executive", () => {
    const ordem = grafoDependencias().ordem;
    const pos = (c: (typeof CONTEXTOS)[number]) => ordem.indexOf(c);
    expect(pos("market")).toBeLessThan(pos("evidence"));
    expect(pos("evidence")).toBeLessThan(pos("recommendation"));
    expect(pos("recommendation")).toBeLessThan(pos("advisor"));
    expect(pos("advisor")).toBeLessThan(pos("knowledge"));
    expect(pos("knowledge")).toBeLessThan(pos("executive"));
  });

  it("detecta ciclo introduzido por dependência inválida", () => {
    const g = grafoDependencias([
      ...DEPENDENCIAS,
      { de: "executive", para: "market", algoritmo: "loop", adr: "ADR-029" },
    ]);
    expect(g.ciclos).toHaveLength(1);
    expect(g.ciclos[0]).toContain("market");
  });

  it("toda dependência declara algoritmo e ADR", () => {
    for (const d of DEPENDENCIAS) {
      expect(d.algoritmo).toBeTruthy();
      expect(d.adr).toMatch(/^ADR-\d{3}$/);
    }
  });
});

describe("orchestrator — GATE 02 impact analysis", () => {
  it("responde o que é recalculado quando o mercado muda", () => {
    const i = analisarImpacto("market");
    const afetados = i.afetados.map((a) => a.contexto);
    expect(afetados).toEqual(expect.arrayContaining(["evidence", "recommendation", "advisor", "knowledge", "executive"]));
    expect(afetados).not.toContain("behavior");
    expect(i.intactos).toContain("behavior");
  });

  it("declara profundidade, caminho e algoritmos", () => {
    const rec = analisarImpacto("market").afetados.find((a) => a.contexto === "recommendation")!;
    expect(rec.profundidade).toBe(2);
    expect(rec.caminho).toEqual(["market", "evidence", "recommendation"]);
    expect(rec.algoritmos).toContain("recommendation.ranquear");
  });

  it("folha do fluxo não afeta ninguém", () => {
    expect(analisarImpacto("executive").afetados).toEqual([]);
  });
});

describe("orchestrator — GATE 04 cache por evento", () => {
  it("invalida o contexto de origem e todos os dependentes", () => {
    const cache = CONTEXTOS.map((c) => entradaCache(c, "w1", "2026-07-01T00:00:00.000Z"));
    const depois = invalidarPorEvento(cache, evento("market", "market.serie_atualizada:selic", "2026-07-31T00:00:00.000Z"));
    const invalidas = depois.filter((e) => !e.valida).map((e) => e.contexto);
    expect(invalidas).toEqual(expect.arrayContaining(["market", "evidence", "recommendation", "advisor", "knowledge", "executive"]));
    expect(depois.find((e) => e.contexto === "behavior")!.valida).toBe(true);
  });

  it("registra sempre o evento que invalidou, nunca expiração por tempo", () => {
    const cache = [entradaCache("evidence", "w1", "2026-01-01T00:00:00.000Z")];
    const depois = invalidarPorEvento(cache, evento("market", "market.serie_atualizada:ipca", "2026-07-31T00:00:00.000Z"));
    expect(depois[0]!.invalidadaPor).toBe("market.serie_atualizada:ipca");
    expect(depois[0]!.eventos).toHaveLength(1);
  });

  it("entrada antiga sem evento permanece válida (tempo não invalida)", () => {
    const cache = [entradaCache("behavior", "w1", "2020-01-01T00:00:00.000Z")];
    const depois = invalidarPorEvento(cache, evento("market", "market.serie_atualizada:tr", "2026-07-31T00:00:00.000Z"));
    expect(depois[0]!.valida).toBe(true);
    expect(depois[0]!.invalidadaPor).toBeNull();
  });

  it("chave de cache separa contexto, workspace e escopo", () => {
    expect(chaveCache("evidence", "w1")).toBe("evidence:w1:default");
    expect(chaveCache("evidence", "w1", "selic")).not.toBe(chaveCache("evidence", "w2", "selic"));
  });
});

describe("orchestrator — GATE 03 recalculation engine", () => {
  it("recalcula somente a cadeia alcançada e reaproveita o resto", () => {
    const cache = CONTEXTOS.map((c) => entradaCache(c, "w1", "2026-07-01T00:00:00.000Z"));
    const plano = planoRecalculo([evento("market", "market.serie_atualizada:selic", "2026-07-31T00:00:00.000Z")], cache);
    expect(plano.recalcular).toContain("evidence");
    expect(plano.reaproveitar).toContain("behavior");
    expect(plano.economia).toBeGreaterThan(0);
  });

  it("segue a ordem topológica do fluxo", () => {
    const plano = planoRecalculo([evento("dominio", "person.updated", "2026-07-31T00:00:00.000Z")]);
    const ordem = plano.tarefas.map((t) => t.contexto);
    expect(ordem.indexOf("behavior")).toBeLessThan(ordem.indexOf("recommendation"));
    expect(plano.tarefas.every((t, i) => t.ordem === i + 1)).toBe(true);
  });

  it("sem evento não há recálculo", () => {
    const plano = planoRecalculo([], CONTEXTOS.map((c) => entradaCache(c, "w1", "2026-07-01T00:00:00.000Z")));
    expect(plano.recalcular).toEqual([]);
    expect(plano.economia).toBe(100);
  });

  it("cada tarefa declara motivo, eventos e algoritmos", () => {
    const plano = planoRecalculo([evento("market", "market.serie_atualizada:selic", "2026-07-31T00:00:00.000Z")]);
    const rec = plano.tarefas.find((t) => t.contexto === "recommendation")!;
    expect(rec.motivo).toBeTruthy();
    expect(rec.eventos).toContain("market.serie_atualizada:selic");
    expect(rec.algoritmos).toContain("recommendation.ranquear");
  });
});

describe("orchestrator — GATE 05 explain update", () => {
  const mudanca: MudancaValor = {
    alvo: "recomendacao:r1",
    rotulo: "Recomendação · revisar gatilho",
    contexto: "recommendation",
    de: 82,
    para: 74,
    em: "2026-07-31T12:00:00.000Z",
  };

  it("explica a queda com gatilho, cadeia e sem verbo causal", () => {
    const e = explainUpdate(mudanca, [
      evento("market", "market.serie_atualizada:selic", "2026-07-30T00:00:00.000Z"),
      evento("behavior", "person.updated", "2026-07-20T00:00:00.000Z"),
    ]);
    expect(e.delta).toBe(-8);
    expect(e.direcao).toBe("caiu");
    expect(e.gatilho!.evento).toBe("market.serie_atualizada:selic");
    expect(e.cadeia.map((c) => c.contexto)).toEqual(["market", "evidence", "recommendation"]);
    const texto = e.narrativa.join(" ").toLowerCase();
    for (const verbo of ["causou", "gerou", "provocou", "por causa", "devido a"]) {
      expect(texto).not.toContain(verbo);
    }
    expect(texto).toContain("nenhuma relação causal");
  });

  it("declara lacuna quando nenhum evento alcança o indicador", () => {
    const e = explainUpdate(mudanca, [evento("executive", "radar.visto", "2026-07-30T00:00:00.000Z")]);
    expect(e.gatilho).toBeNull();
    expect(e.lacunas[0]).toContain("Nenhum evento");
  });

  it("valor anterior ausente não vira zero", () => {
    const e = explainUpdate({ ...mudanca, de: null }, []);
    expect(e.delta).toBeNull();
    expect(e.direcao).toBe("indefinida");
    expect(e.lacunas.join(" ")).toContain("variação não calculada");
  });
});

describe("orchestrator — GATE 06 knowledge diff", () => {
  const eventos = [evento("evidence", "evidence.recalculada", "2026-07-31T00:00:00.000Z")];

  it("compara dois momentos apontando o que mudou e o evento", () => {
    const d = knowledgeDiff(
      { em: "2026-07-30T00:00:00.000Z", itens: [
        { alvo: "a", rotulo: "A", contexto: "recommendation", valor: 82 },
        { alvo: "b", rotulo: "B", contexto: "recommendation", valor: 50 },
      ] },
      { em: "2026-07-31T00:00:00.000Z", itens: [
        { alvo: "a", rotulo: "A", contexto: "recommendation", valor: 74, algoritmo: "recommendation.ranquear" },
        { alvo: "c", rotulo: "C", contexto: "advisor", valor: 10 },
      ] },
      eventos,
    );
    expect(d.alterados).toBe(1);
    expect(d.adicionados).toBe(1);
    expect(d.removidos).toBe(1);
    const alterado = d.itens.find((i) => i.tipo === "alterado")!;
    expect(alterado.de).toBe(82);
    expect(alterado.para).toBe(74);
    expect(alterado.algoritmo).toBe("recommendation.ranquear");
    expect(alterado.evento).toBe("evidence.recalculada");
  });

  it("valor igual não entra no diff", () => {
    const item = { alvo: "a", rotulo: "A", contexto: "recommendation" as const, valor: 82 };
    const d = knowledgeDiff({ em: "x", itens: [item] }, { em: "y", itens: [item] });
    expect(d.itens).toEqual([]);
  });

  it("sem evento que alcance o contexto, o campo evento fica null", () => {
    const d = knowledgeDiff(
      { em: "x", itens: [] },
      { em: "y", itens: [{ alvo: "a", rotulo: "A", contexto: "behavior", valor: 1 }] },
      [evento("executive", "radar.visto", "2026-07-31T00:00:00.000Z")],
    );
    expect(d.itens[0]!.evento).toBeNull();
  });
});

describe("orchestrator — GATE 07 knowledge audit", () => {
  it("relata a propagação contexto a contexto", () => {
    const plano = planoRecalculo([evento("market", "market.serie_atualizada:selic", "2026-07-31T00:00:00.000Z")]);
    const a = auditoriaConhecimento(plano, [
      { contexto: "market", em: "2026-07-31T01:00:00.000Z", ok: true, duracaoMs: 900 },
      { contexto: "evidence", em: "2026-07-31T01:05:00.000Z", ok: true, duracaoMs: 1200 },
    ], "2026-07-31T02:00:00.000Z");
    expect(a.atualizados).toBe(2);
    expect(a.pendentes).toBeGreaterThan(0);
    expect(a.cadeiaCompleta).toBe(false);
    expect(a.linhas[0]!.rotulo).toBeTruthy();
  });

  it("falha de execução é declarada, não omitida", () => {
    const plano = planoRecalculo([evento("advisor", "advisor.briefing", "2026-07-31T00:00:00.000Z")]);
    const a = auditoriaConhecimento(plano, [
      { contexto: "knowledge", em: "2026-07-31T01:00:00.000Z", ok: false, duracaoMs: 100, detalhe: "timeout" },
    ]);
    expect(a.falhas).toBe(1);
    expect(a.cadeiaCompleta).toBe(false);
  });

  it("cadeia completa quando tudo foi atualizado ou reaproveitado", () => {
    const cache = CONTEXTOS.map((c) => entradaCache(c, "w1", "2026-07-01T00:00:00.000Z"));
    const plano = planoRecalculo([], cache);
    expect(auditoriaConhecimento(plano, []).cadeiaCompleta).toBe(true);
  });
});

describe("orchestrator — GATE 08 executive story", () => {
  const mudancas: MudancaValor[] = [
    { alvo: "atividade", rotulo: "Atividade comercial", contexto: "dominio", de: 120, para: 90, em: "2026-07-31T00:00:00.000Z" },
    { alvo: "engajamento", rotulo: "Engajamento", contexto: "behavior", de: 70, para: 55, em: "2026-07-31T00:00:00.000Z" },
    { alvo: "score", rotulo: "Opportunity Score médio", contexto: "recommendation", de: 60, para: 68, em: "2026-07-31T00:00:00.000Z" },
  ];

  it("narra o período usando somente dado observado e sem afirmar causa", () => {
    const h = executiveStory({
      periodoSemanas: 4,
      mudancas,
      eventos: [evento("market", "market.serie_atualizada:selic", "2026-07-30T00:00:00.000Z")],
      recomendacoesImplementadas: 3,
      confiancaConhecimento: 88,
      frescorConhecimento: 91,
    });
    expect(h.narravel).toBe(true);
    const texto = h.paragrafos.join(" ").toLowerCase();
    expect(texto).toContain("coincidiu");
    for (const verbo of ["causou", "gerou", "provocou", "por causa de"]) {
      expect(texto).not.toContain(verbo);
    }
    expect(texto).toContain("4 semanas");
    expect(h.evidencias.every((e) => e.alvos.length > 0)).toBe(true);
    expect(h.lacunas).toEqual([]);
  });

  it("sem variação não narra e declara a lacuna", () => {
    const h = executiveStory({
      periodoSemanas: 4,
      mudancas: [],
      eventos: [],
      recomendacoesImplementadas: 0,
      confiancaConhecimento: null,
      frescorConhecimento: null,
    });
    expect(h.narravel).toBe(false);
    expect(h.lacunas.length).toBeGreaterThanOrEqual(3);
    expect(h.paragrafos[0]).toContain("não há variações suficientes");
  });

  it("indicador sem valor anterior fica fora e é declarado", () => {
    const h = executiveStory({
      periodoSemanas: 2,
      mudancas: [...mudancas, { alvo: "novo", rotulo: "Novo", contexto: "advisor", de: null, para: 10, em: "x" }],
      eventos: [evento("behavior", "person.updated", "2026-07-30T00:00:00.000Z")],
      recomendacoesImplementadas: 0,
      confiancaConhecimento: 70,
      frescorConhecimento: null,
    });
    expect(h.lacunas.join(" ")).toContain("sem valor anterior");
    expect(h.paragrafos.join(" ")).not.toContain("Novo (");
  });

  it("sempre inclui o aviso de não causalidade", () => {
    const h = executiveStory({
      periodoSemanas: 1,
      mudancas,
      eventos: [],
      recomendacoesImplementadas: 0,
      confiancaConhecimento: null,
      frescorConhecimento: null,
    });
    expect(h.aviso).toContain("não implicam relação causal");
  });
});
