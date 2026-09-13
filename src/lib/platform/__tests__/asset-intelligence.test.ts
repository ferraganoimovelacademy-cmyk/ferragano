import { describe, expect, it } from "vitest";
import {
  AMOSTRA_CORRELACAO_MINIMA,
  correlacionarQualidadeConversao,
  estimarPipelineExposto,
  lacunasDe,
  montarAssetIntelligence,
  pontuarAtivo,
  ranquearAtivos,
  type DemandaEmpreendimento,
  type EmpreendimentoAtivos,
} from "@/lib/platform/asset-intelligence";
import type { MidiaItem } from "@/lib/platform/media";

const AGORA = "2026-08-01T12:00:00.000Z";

const item = (over: Partial<MidiaItem> = {}): MidiaItem => ({
  id: crypto.randomUUID(),
  tipo: "imagem",
  titulo: "Fachada",
  url: "https://cdn.exemplo/1.jpg",
  path: null,
  ordem: 0,
  publico: true,
  alt: "Perspectiva da fachada",
  tituloSeo: null,
  legenda: null,
  largura: 1600,
  altura: 900,
  bytes: 400_000,
  mime: "image/jpeg",
  createdAt: AGORA,
  ...over,
});

const demanda = (over: Partial<DemandaEmpreendimento> = {}): DemandaEmpreendimento => ({
  oportunidadesTotal: 40,
  oportunidadesAbertas: 20,
  oportunidadesGanhas: 8,
  visitasTotal: 30,
  visitas30d: 6,
  valorPipeline: 1_000_000,
  conversaoPercentual: 20,
  unidadesDisponiveis: 50,
  ...over,
});

const emp = (over: Partial<EmpreendimentoAtivos> = {}): EmpreendimentoAtivos => ({
  empreendimentoId: crypto.randomUUID(),
  nome: "Reserva Alto",
  slug: "reserva-alto",
  cidade: "São Paulo",
  publico: true,
  capaUrl: null,
  itens: [],
  demanda: demanda(),
  ...over,
});

describe("cobertura de mídia", () => {
  it("lista todas as lacunas quando não há nenhum ativo", () => {
    const lacunas = lacunasDe(emp());
    expect(lacunas.map((l) => l.item)).toEqual([
      "capa",
      "galeria",
      "plantas",
      "seo",
      "tour",
      "video",
      "pdf",
    ]);
  });

  it("remove a lacuna de galeria a partir de 4 imagens", () => {
    const itens = [0, 1, 2, 3].map((i) => item({ ordem: i }));
    const lacunas = lacunasDe(emp({ itens, capaUrl: itens[0]!.url }));
    expect(lacunas.map((l) => l.item)).not.toContain("galeria");
    expect(lacunas.map((l) => l.item)).not.toContain("capa");
  });
});

describe("pipeline exposto (ADR-021)", () => {
  it("devolve null com motivo quando não há demanda medida", () => {
    const p = estimarPipelineExposto(emp({ demanda: null }), AGORA);
    expect(p.valor).toBeNull();
    expect(p.motivoAusencia).toContain("property_360");
  });

  it("devolve null com motivo quando a amostra é insuficiente", () => {
    const p = estimarPipelineExposto(emp({ demanda: demanda({ oportunidadesTotal: 3 }) }), AGORA);
    expect(p.valor).toBeNull();
    expect(p.motivoAusencia).toContain("Amostra insuficiente");
    expect(p.confianca).toBeLessThan(30);
  });

  it("expõe todo o pipeline quando falta todo ativo visual", () => {
    const p = estimarPipelineExposto(emp(), AGORA);
    expect(p.valor).toBe(1_000_000);
    expect(p.fatores.some((f) => f.nome === "Lacuna visual")).toBe(true);
  });

  it("reduz a exposição conforme os ativos visuais são publicados", () => {
    const itens = [0, 1, 2, 3].map((i) => item({ ordem: i }));
    const parcial = estimarPipelineExposto(emp({ itens, capaUrl: itens[0]!.url }), AGORA);
    expect(parcial.valor).toBeLessThan(1_000_000);
    expect(parcial.valor).toBeGreaterThan(0);
  });

  it("zera a exposição com cobertura visual completa", () => {
    const itens = [
      ...[0, 1, 2, 3].map((i) => item({ ordem: i })),
      item({ tipo: "planta", ordem: 4 }),
      item({ tipo: "tour", ordem: 5, url: "https://tour.exemplo" }),
    ];
    const p = estimarPipelineExposto(emp({ itens, capaUrl: itens[0]!.url }), AGORA);
    expect(p.valor).toBe(0);
  });

  it("não usa o valor exposto para inflar a confiança", () => {
    const pequeno = estimarPipelineExposto(
      emp({ demanda: demanda({ valorPipeline: 50_000 }) }),
      AGORA,
    );
    const grande = estimarPipelineExposto(
      emp({ demanda: demanda({ valorPipeline: 9_000_000 }) }),
      AGORA,
    );
    expect(pequeno.confianca).toBe(grande.confianca);
  });
});

describe("ranking de ativos", () => {
  it("premia a capa e pune alt ausente", () => {
    const capa = item();
    const base = emp({ itens: [capa], capaUrl: capa.url });
    const comAlt = pontuarAtivo(base, capa, 0);
    const semAlt = pontuarAtivo(base, { ...capa, alt: null }, 0);
    expect(comAlt.ehCapa).toBe(true);
    expect(comAlt.contribuicao).toBeGreaterThan(semAlt.contribuicao);
    expect(semAlt.fatores.some((f) => f.direcao === "negativo")).toBe(true);
  });

  it("pune ativo não publicado e resolução baixa", () => {
    const base = emp();
    const ruim = pontuarAtivo(base, item({ publico: false, largura: 640 }), 3);
    const bom = pontuarAtivo(base, item(), 0);
    expect(ruim.contribuicao).toBeLessThan(bom.contribuicao);
  });

  it("ordena por contribuição e respeita o limite", () => {
    const capa = item();
    const lista = [emp({ itens: [capa, item({ ordem: 1, alt: null })], capaUrl: capa.url })];
    const ranking = ranquearAtivos(lista, 1);
    expect(ranking).toHaveLength(1);
    expect(ranking[0]!.ehCapa).toBe(true);
  });
});

describe("qualidade visual × conversão (ADR-025)", () => {
  it("recusa leitura sem amostra mínima", () => {
    const leitura = correlacionarQualidadeConversao([emp()]);
    expect(leitura.r).toBeNull();
    expect(leitura.forca).toBe("sem_evidencia");
    expect(leitura.leitura).toContain("Amostra insuficiente");
  });

  it("mede relação positiva e mantém a ressalva de causalidade", () => {
    const lista = Array.from({ length: AMOSTRA_CORRELACAO_MINIMA + 2 }, (_, i) => {
      const itens = Array.from({ length: i }, (_, k) => item({ ordem: k }));
      return emp({
        itens,
        capaUrl: itens[0]?.url ?? null,
        demanda: demanda({ conversaoPercentual: 5 + i * 3 }),
      });
    });
    const leitura = correlacionarQualidadeConversao(lista);
    expect(leitura.amostra).toBe(AMOSTRA_CORRELACAO_MINIMA + 2);
    expect(leitura.direcao).toBe("positiva");
    expect(leitura.ressalva).toContain("Correlação não é causalidade");
  });
});

describe("agregação", () => {
  it("prioriza quem tem exposição medida e soma apenas evidência", () => {
    const semDemanda = emp({ nome: "Sem demanda", demanda: null });
    const comDemanda = emp({ nome: "Com demanda" });
    const painel = montarAssetIntelligence([semDemanda, comDemanda], AGORA);
    expect(painel.empreendimentos[0]!.nome).toBe("Com demanda");
    expect(painel.totais.pipelineExposto).toBe(1_000_000);
    expect(painel.totais.comEvidencia).toBe(1);
    expect(painel.totais.semCapa).toBe(2);
  });
});
