import { describe, expect, it } from "vitest";
import {
  TELEMETRY_CATALOG,
  actionLabel,
  categoriaDaAcao,
  coberturaDoCatalogo,
  featureSaudavel,
  metricDaAcao,
  notaDeAlertas,
  precisaoDaRecomendacao,
  separarPorCategoria,
  taxaDeAbandono,
  taxaDeAdesao,
  type DecisionAccuracy,
  type FeatureUsage,
  type PlatformAlert,
} from "@/lib/platform/telemetry";

const feature = (over: Partial<FeatureUsage> = {}): FeatureUsage => ({
  domain: "sales",
  action: "mover_etapa",
  usos: 10,
  usuarios: 3,
  sessoes: 4,
  erros: 0,
  taxaErro: 0,
  duracaoMediaMs: 120,
  ultimoUso: null,
  ...over,
});

const alerta = (over: Partial<PlatformAlert> = {}): PlatformAlert => ({
  id: "a",
  chave: "budget.query.sales_360",
  severidade: "atencao",
  titulo: "Sales 360 acima do orçamento",
  detalhe: null,
  metrica: "query.sales_360",
  valor: 400,
  limite: 250,
  status: "aberto",
  createdAt: new Date().toISOString(),
  ...over,
});

describe("catálogo de telemetria", () => {
  it("não tem chave duplicada", () => {
    const chaves = TELEMETRY_CATALOG.map((a) => `${a.domain}.${a.action}`);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("cobre a jornada exigida no Gate 01", () => {
    for (const chave of [
      "people.criar_pessoa",
      "people.merge",
      "people.deduplicacao",
      "sales.mover_etapa",
      "sales.vender",
      "property.alterar_preco",
      "platform.login",
      "platform.worker",
      "automation.retry",
    ]) {
      const [domain, action] = chave.split(".");
      expect(actionLabel(domain!, action!)).not.toBe(chave);
    }
  });

  it("separa métrica operacional de métrica de negócio", () => {
    expect(categoriaDaAcao("sales", "vender")).toBe("negocio");
    expect(categoriaDaAcao("platform", "worker")).toBe("operacional");
    expect(categoriaDaAcao("desconhecido", "x")).toBe("operacional");
  });

  it("liga a ação ao orçamento de performance quando existe", () => {
    expect(metricDaAcao("people", "customer_360")).toBe("query.customer_360");
    expect(metricDaAcao("platform", "busca_global")).toBe("search.global");
    expect(metricDaAcao("people", "criar_pessoa")).toBeUndefined();
  });

  it("separa features por categoria", () => {
    const grupos = separarPorCategoria([
      feature(),
      feature({ domain: "platform", action: "busca_global" }),
    ]);
    expect(grupos.negocio).toHaveLength(1);
    expect(grupos.operacional).toHaveLength(1);
  });
});

describe("adoção", () => {
  it("mede cobertura e aponta o que não tem coleta", () => {
    const cob = coberturaDoCatalogo([feature()]);
    expect(cob.total).toBe(TELEMETRY_CATALOG.length);
    expect(cob.instrumentadas).toBe(1);
    expect(cob.percentual).toBeGreaterThan(0);
    expect(cob.semDados.length).toBe(cob.total - 1);
  });

  it("não presume cobertura sem dado", () => {
    expect(coberturaDoCatalogo([]).percentual).toBe(0);
  });

  it("abandono cresce com erro", () => {
    expect(taxaDeAbandono(feature())).toBe(0);
    expect(taxaDeAbandono(feature({ usos: 10, erros: 4 }))).toBe(40);
    expect(taxaDeAbandono(feature({ sessoes: 0 }))).toBe(0);
  });

  it("marca feature insalubre acima de 5% de erro", () => {
    expect(featureSaudavel(feature({ taxaErro: 2 }))).toBe(true);
    expect(featureSaudavel(feature({ taxaErro: 12 }))).toBe(false);
  });
});

describe("precisão da decisão", () => {
  const base: DecisionAccuracy = {
    janelaHoras: 720,
    total: 10,
    aceitas: 6,
    ignoradas: 3,
    rejeitadas: 1,
    pendentes: 0,
    aceitasComGanho: 4,
    aceitasComPerda: 1,
    ignoradasComGanho: 1,
    ignoradasComPerda: 2,
    porTipo: [],
    geradoEm: new Date().toISOString(),
  };

  it("adesão considera só o que foi decidido", () => {
    expect(taxaDeAdesao(base)).toBe(60);
    expect(taxaDeAdesao({ aceitas: 0, ignoradas: 0, rejeitadas: 0 })).toBe(0);
  });

  it("acerto = aceitou e ganhou, ou ignorou e perdeu", () => {
    expect(precisaoDaRecomendacao(base)).toBe(75);
  });

  it("sem desfecho não inventa precisão", () => {
    expect(
      precisaoDaRecomendacao({
        ...base,
        aceitasComGanho: 0,
        aceitasComPerda: 0,
        ignoradasComGanho: 0,
        ignoradasComPerda: 0,
      }),
    ).toBeNull();
  });
});

describe("nota de alertas", () => {
  it("100 sem alerta aberto", () => {
    expect(notaDeAlertas([])).toBe(100);
    expect(notaDeAlertas([alerta({ status: "resolvido" })])).toBe(100);
  });

  it("crítico pesa mais que atenção", () => {
    expect(notaDeAlertas([alerta({ severidade: "atencao" })])).toBe(90);
    expect(notaDeAlertas([alerta({ severidade: "critico" })])).toBe(75);
  });

  it("nunca fica negativa", () => {
    const muitos = Array.from({ length: 10 }, (_, i) =>
      alerta({ id: `a${i}`, severidade: "critico" }),
    );
    expect(notaDeAlertas(muitos)).toBe(0);
  });
});