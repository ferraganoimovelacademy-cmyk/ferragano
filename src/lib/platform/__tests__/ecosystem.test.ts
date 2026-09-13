import { describe, expect, it } from "vitest";
import {
  K_MINIMO_WORKSPACES,
  N_MINIMO_CELULA,
  avaliarAcessoPersona,
  avaliarLiquidez,
  avaliarProntidao,
  getPersona,
  mapaTelaPersonas,
  onboardingVerticais,
  personas,
  validarAgregacaoCrossWorkspace,
  validarCompliance,
  validarContratoParceria,
  verificarNaoCorte,
  verticais,
  verticaisDaPersona,
  verticaisPorCamada,
  podeOperar,
  type CelulaAgregada,
  type PedidoAgregacao,
  type VerticalKey,
} from "../ecosystem";

const pedidoOk = (over: Partial<PedidoAgregacao> = {}): PedidoAgregacao => ({
  metrica: "ciclo_medio_dias",
  workspaces: 8,
  campos: ["regiao", "ciclo_medio_dias", "amostra"],
  menorCelula: 12,
  consentimentoTodos: true,
  granularidade: "agregada",
  suprimeCelulasPequenas: true,
  procedencia: "read model sales_360 agregado",
  ...over,
});

describe("verticais", () => {
  it("cataloga as oito verticais", () => {
    expect(verticais).toHaveLength(8);
  });

  it("toda vertical bloqueada declara o motivo", () => {
    for (const v of verticais.filter((x) => x.status === "bloqueada")) {
      expect(v.bloqueio && v.bloqueio.length > 10).toBe(true);
    }
  });

  it("Intelligence e Capital permanecem bloqueadas até LGPD/privacidade", () => {
    const chaves = verticais.filter((v) => v.status === "bloqueada").map((v) => v.key);
    expect(chaves).toEqual(expect.arrayContaining(["intelligence", "capital"]));
  });

  it("agrupa por camada sem perder vertical", () => {
    const total = verticaisPorCamada().reduce((acc, c) => acc + c.itens.length, 0);
    expect(total).toBe(verticais.length);
  });

  it("toda vertical tem próximos passos", () => {
    for (const v of verticais) expect(v.proximosPassos.length).toBeGreaterThan(0);
  });
});

describe("personas da Ferragano AI", () => {
  it("define as quatro personas faltantes", () => {
    expect(personas.map((p) => p.key)).toEqual([
      "knowledge",
      "advisor",
      "recommendation",
      "memory",
    ]);
  });

  it("toda ação aponta para uma tela e uma saída", () => {
    for (const p of personas) {
      expect(p.acoes.length).toBeGreaterThan(0);
      for (const a of p.acoes) {
        expect(a.tela.startsWith("/")).toBe(true);
        expect(a.saida.length).toBeGreaterThan(5);
        expect(a.entrada.length).toBeGreaterThan(0);
      }
    }
  });

  it("toda persona declara limites", () => {
    for (const p of personas) expect(p.limites.length).toBeGreaterThan(0);
  });

  it("mapeia tela para personas", () => {
    const mapa = mapaTelaPersonas();
    const advisor = mapa.find((m) => m.tela === "/app/advisor");
    expect(advisor?.itens.every((i) => i.persona === "advisor")).toBe(true);
    const memoria = mapa.find((m) => m.tela === "/app/institucional");
    expect(memoria?.itens.map((i) => i.persona)).toEqual(
      expect.arrayContaining(["knowledge", "memory"]),
    );
  });

  it("falha ao buscar persona inexistente", () => {
    // @ts-expect-error entrada inválida proposital
    expect(() => getPersona("vendas")).toThrow();
  });
});

describe("privacidade — agregação entre workspaces", () => {
  it("aprova pedido que atende todos os critérios", () => {
    const r = validarAgregacaoCrossWorkspace(pedidoOk());
    expect(r.aprovado).toBe(true);
    expect(r.bloqueios).toEqual([]);
    expect(r.criterios).toHaveLength(7);
  });

  it("reprova abaixo do k mínimo de workspaces", () => {
    const r = validarAgregacaoCrossWorkspace(pedidoOk({ workspaces: K_MINIMO_WORKSPACES - 1 }));
    expect(r.aprovado).toBe(false);
    expect(r.bloqueios.join(" ")).toContain("P01");
  });

  it("reprova sem consentimento de todos", () => {
    expect(
      validarAgregacaoCrossWorkspace(pedidoOk({ consentimentoTodos: false })).bloqueios.join(" "),
    ).toContain("P02");
  });

  it("reprova granularidade por linha", () => {
    expect(
      validarAgregacaoCrossWorkspace(pedidoOk({ granularidade: "linha" })).bloqueios.join(" "),
    ).toContain("P03");
  });

  it("reprova campo identificável, inclusive workspace_id", () => {
    const r = validarAgregacaoCrossWorkspace(
      pedidoOk({ campos: ["workspace_id", "ciclo_medio_dias"] }),
    );
    expect(r.aprovado).toBe(false);
    expect(r.criterios.find((c) => c.id === "P04")?.detalhe).toContain("workspace_id");
  });

  it("reprova célula menor que o mínimo e supressão desligada", () => {
    const r = validarAgregacaoCrossWorkspace(
      pedidoOk({ menorCelula: 2, suprimeCelulasPequenas: false }),
    );
    expect(r.bloqueios.join(" ")).toContain("P05");
    expect(r.bloqueios.join(" ")).toContain("P06");
  });

  it("reprova sem procedência declarada", () => {
    expect(
      validarAgregacaoCrossWorkspace(pedidoOk({ procedencia: "   " })).bloqueios.join(" "),
    ).toContain("P07");
  });
});

describe("não-corte de dados", () => {
  const celulas: CelulaAgregada[] = [
    { chave: "centro", registros: 40, workspaces: 9 },
    { chave: "sul", registros: 12, workspaces: 6 },
    { chave: "vila-rara", registros: 3, workspaces: 2 },
  ];

  it("fecha publicado + suprimido com o total de origem", () => {
    const r = verificarNaoCorte(celulas, 55);
    expect(r.semCorte).toBe(true);
    expect(r.totalPublicado).toBe(52);
    expect(r.totalSuprimido).toBe(3);
  });

  it("acusa corte quando a soma não fecha", () => {
    expect(verificarNaoCorte(celulas, 60).semCorte).toBe(false);
  });

  it("suprime célula pequena e célula com poucos workspaces", () => {
    const r = verificarNaoCorte(
      [
        { chave: "a", registros: N_MINIMO_CELULA - 1, workspaces: 20 },
        { chave: "b", registros: 100, workspaces: K_MINIMO_WORKSPACES - 1 },
      ],
      104,
    );
    expect(r.celulasPublicadas).toHaveLength(0);
    expect(r.celulasSuprimidas).toHaveLength(2);
    expect(r.semCorte).toBe(true);
  });
});

describe("Network — contrato e compliance", () => {
  const contrato = {
    id: "c-1",
    parteA: "Imobiliária A",
    parteB: "Incorporadora B",
    escopoDados: ["agregado"] as Array<"nenhum" | "agregado" | "oportunidade_compartilhada">,
    comissaoPct: 4,
    vigenciaInicio: "2026-01-01",
    vigenciaFim: "2027-01-01",
    assinadoPor: "Diretoria",
    rescisao: "aviso prévio de 30 dias",
  };

  it("aprova contrato completo", () => {
    expect(validarContratoParceria(contrato).apto).toBe(true);
  });

  it("reprova sem assinatura, sem rescisão e sem escopo", () => {
    const r = validarContratoParceria({
      ...contrato,
      assinadoPor: null,
      rescisao: null,
      escopoDados: [],
    });
    expect(r.apto).toBe(false);
    expect(r.motivos).toHaveLength(3);
  });

  it("reprova vigência invertida e comissão fora da faixa", () => {
    const r = validarContratoParceria({ ...contrato, vigenciaFim: "2025-01-01", comissaoPct: 140 });
    expect(r.motivos.join(" ")).toContain("vigência");
    expect(r.motivos.join(" ")).toContain("comissão");
  });

  it("exige consentimento ao compartilhar oportunidade", () => {
    const r = validarContratoParceria({
      ...contrato,
      escopoDados: ["oportunidade_compartilhada"],
    });
    expect(r.apto).toBe(true);
    expect(r.observacoes.join(" ")).toContain("consentimento");
  });

  it("reprova compliance com pendências ou sanção", () => {
    const r = validarCompliance({
      parceiroId: "p-1",
      cnpjValidado: true,
      creciValidado: false,
      documentosPendentes: ["contrato social"],
      sancoesEncontradas: 1,
      ultimaRevisao: null,
    });
    expect(r.apto).toBe(false);
    expect(r.motivos).toHaveLength(3);
    expect(r.observacoes).toHaveLength(1);
  });
});

describe("Capital — liquidez", () => {
  it("calcula cobertura e inadimplência", () => {
    const r = avaliarLiquidez({
      carteiraTotal: 1_000_000,
      antecipado: 400_000,
      inadimplente: 20_000,
      concentracaoMaiorSacado: 12,
      prazoMedioDias: 120,
    });
    expect(r.coberturaPct).toBe(40);
    expect(r.inadimplenciaPct).toBe(2);
    expect(r.apto).toBe(true);
  });

  it("reprova excesso de antecipação, inadimplência e concentração", () => {
    const r = avaliarLiquidez({
      carteiraTotal: 1_000_000,
      antecipado: 800_000,
      inadimplente: 90_000,
      concentracaoMaiorSacado: 40,
      prazoMedioDias: 200,
    });
    expect(r.apto).toBe(false);
    expect(r.motivos).toHaveLength(3);
    expect(r.observacoes.join(" ")).toContain("prazo médio");
  });

  it("não avalia carteira sem valor", () => {
    const r = avaliarLiquidez({
      carteiraTotal: 0,
      antecipado: 0,
      inadimplente: 0,
      concentracaoMaiorSacado: 0,
      prazoMedioDias: 0,
    });
    expect(r.apto).toBe(false);
    expect(r.coberturaPct).toBe(0);
  });
});

describe("onboarding por vertical", () => {
  const chaves = Object.keys(onboardingVerticais) as VerticalKey[];

  it("cobre as oito verticais com perguntas bloqueantes", () => {
    expect(chaves).toHaveLength(8);
    for (const k of chaves) {
      expect(onboardingVerticais[k].length).toBeGreaterThan(2);
      expect(onboardingVerticais[k].some((p) => p.bloqueante)).toBe(true);
      for (const p of onboardingVerticais[k]) expect(p.evidencia.length).toBeGreaterThan(4);
    }
  });

  it("sem resposta, nada está pronto", () => {
    const r = avaliarProntidao("academy", []);
    expect(r.progressoPct).toBe(0);
    expect(r.pronta).toBe(false);
    expect(r.pendenciasBloqueantes.length).toBeGreaterThan(0);
  });

  it("evidência vazia não conta como resposta", () => {
    const r = avaliarProntidao("academy", [{ id: "AC1", evidencia: "   " }]);
    expect(r.respondidas).toBe(0);
  });

  it("fica pronta quando as bloqueantes têm evidência", () => {
    const r = avaliarProntidao("academy", [
      { id: "AC1", evidencia: "papéis mapeados" },
      { id: "AC2", evidencia: "trilha obrigatória definida" },
    ]);
    expect(r.pronta).toBe(true);
    expect(r.pendencias).toHaveLength(1);
  });

  it("vertical bloqueada não fica pronta mesmo com tudo respondido", () => {
    const respostas = onboardingVerticais.capital.map((p) => ({ id: p.id, evidencia: "ok" }));
    const r = avaliarProntidao("capital", respostas);
    expect(r.progressoPct).toBe(100);
    expect(r.pronta).toBe(false);
    expect(r.bloqueio).toContain("H12");
  });
});

describe("controle de acesso por persona", () => {
  it("libera ação dentro do mapa da persona para admin", () => {
    const r = podeOperar("memory", "admin", "/app/memoria", "Registrar decisão com contexto e responsável");
    expect(r.permitido).toBe(true);
  });

  it("nega ação que exige papel administrativo para membro", () => {
    const r = podeOperar("memory", "membro", "/app/memoria", "Registrar decisão com contexto e responsável");
    expect(r.permitido).toBe(false);
    expect(r.motivo).toContain("administrativo");
  });

  it("nega por limite duro ação de outra persona", () => {
    const r = podeOperar("knowledge", "admin", "/app/memoria", "Registrar decisão com contexto e responsável");
    expect(r.permitido).toBe(false);
    expect(r.motivo).toContain("limite duro");
  });

  it("curador membro mantém apenas a ação sem exigência de admin", () => {
    const a = avaliarAcessoPersona("knowledge", "membro");
    expect(a.telasPermitidas).toEqual(["/app/knowledge"]);
    expect(a.acoes.filter((x) => x.permitido)).toHaveLength(1);
  });

  it("declara motivo para toda tela vedada", () => {
    for (const p of personas) {
      const a = avaliarAcessoPersona(p.key, "admin");
      for (const t of a.telasNegadas) expect(t.motivo.length).toBeGreaterThan(0);
      expect(a.telasNegadas.every((t) => !a.telasPermitidas.includes(t.tela))).toBe(true);
    }
  });

  it("verticais da persona derivam das telas liberadas", () => {
    const vs = verticaisDaPersona("advisor", "admin").map((v) => v.key);
    expect(vs).toContain("ai");
    expect(vs).not.toContain("capital");
    expect(verticaisDaPersona("advisor", "membro")).toHaveLength(0);
  });
});
