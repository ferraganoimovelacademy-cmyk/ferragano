import { describe, expect, it } from "vitest";
import {
  AMPLITUDE_IC_ESTAVEL,
  DRIFT_DELTA,
  detectarDrift,
  HISTORICO_ROBUSTO,
  avaliarEvidencia,
  criterioLabels,
  montarPanoramaEvidencia,
} from "@/lib/platform/evidence";
import {
  correlacionar,
  intervaloConfiancaPearson,
  medirLag,
  type SerieMensal,
} from "@/lib/platform/market-analytics";

const AGORA = new Date("2026-08-01T00:00:00.000Z");

const competencias = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const total = 2023 * 12 + i;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
  });

const serie = (
  chave: string,
  valores: number[],
  origem: "externo" | "interno" = "externo",
): SerieMensal => ({
  chave,
  nome: chave,
  unidade: origem === "externo" ? "% a.a." : "un/mês",
  origem,
  pontos: competencias(valores.length).map((referencia, i) => ({
    referencia,
    valor: valores[i] as number,
  })),
});

const VERBOS_CAUSAIS = [
  "causou",
  "causa a",
  "provocou",
  "gerou",
  "por causa",
  "devido a",
  "resultou em",
];

describe("evidence — intervalo de confiança", () => {
  it("IC95% envolve o coeficiente e estreita com a amostra", () => {
    const curto = intervaloConfiancaPearson(0.61, 12)!;
    const longo = intervaloConfiancaPearson(0.61, 60)!;
    expect(curto.inferior).toBeLessThan(0.61);
    expect(curto.superior).toBeGreaterThan(0.61);
    expect(longo.superior - longo.inferior).toBeLessThan(curto.superior - curto.inferior);
  });

  it("correlação perfeita ou amostra mínima não gera intervalo", () => {
    expect(intervaloConfiancaPearson(1, 30)).toBeNull();
    expect(intervaloConfiancaPearson(0.5, 3)).toBeNull();
  });

  it("a leitura de correlação passa a expor o intervalo", () => {
    const externa = serie("selic_meta", Array.from({ length: 24 }, (_, i) => 8 + i * 0.25));
    const interna = serie("visitas", Array.from({ length: 24 }, (_, i) => 200 - i * 3 + (i % 3)), "interno");
    const l = medirLag(externa, interna, 0);
    expect(l.icInferior).not.toBeNull();
    expect(l.icSuperior).not.toBeNull();
    expect(l.icInferior!).toBeLessThan(l.coeficiente!);
  });
});

describe("evidence — avaliação da cadeia", () => {
  const externa = serie("selic_meta", Array.from({ length: 36 }, (_, i) => 8 + i * 0.2));
  const internaForte = serie(
    "propostas",
    Array.from({ length: 36 }, (_, i) => 300 - (8 + i * 0.2) * 10 + (i % 2 ? 4 : -4)),
    "interno",
  );

  it("relação robusta atinge evidência alta com todos os critérios declarados", () => {
    const e = avaliarEvidencia(correlacionar(externa, internaForte, 36));
    expect(e.criteriosTotal).toBe(Object.keys(criterioLabels).length - 1); // informativo fora
    expect(["moderada", "alta"]).toContain(e.forca);
    expect(e.criteriosAtendidos).toBeGreaterThanOrEqual(5);
    expect(e.criterios.find((c) => c.chave === "significancia")?.detalhe).toContain("IC95%");
  });

  it("sem correlação a força é muito baixa e o motivo é declarado", () => {
    const e = avaliarEvidencia(
      correlacionar(serie("cdi", [1, 2, 3]), serie("vendas", [3, 2, 1], "interno"), 24),
    );
    expect(e.forca).toBe("muito_baixa");
    expect(e.criteriosAtendidos).toBe(0);
    expect(e.consistenciaExterna).toBe("sem_referencia");
    expect(e.motivoAusencia).toBeDefined();
    expect(e.criterios.every((c) => !c.atendido)).toBe(true);
  });

  it("histórico curto não atende o critério de robustez", () => {
    const curta = serie("selic_meta", Array.from({ length: 14 }, (_, i) => 8 + i * 0.25));
    const interna = serie("visitas", Array.from({ length: 14 }, (_, i) => 200 - i * 3), "interno");
    const e = avaliarEvidencia(correlacionar(curta, interna, 14));
    const c = e.criterios.find((x) => x.chave === "evidencia_historica")!;
    expect(c.atendido).toBe(false);
    expect(c.detalhe).toContain(`${HISTORICO_ROBUSTO} meses`);
    expect(AMPLITUDE_IC_ESTAVEL).toBe(0.5);
  });

  it("tendência comum derruba o critério de estabilidade", () => {
    const crescente = Array.from({ length: 24 }, (_, i) => 8 + i * 0.25);
    const e = avaliarEvidencia(
      correlacionar(
        serie("selic_meta", crescente),
        serie("visitas", crescente.map((v, i) => v * 2 + (i % 2 ? 9 : -9)), "interno"),
        24,
      ),
    );
    expect(e.criterios.find((c) => c.chave === "estabilidade")?.atendido).toBe(false);
  });

  it("nenhuma frase da camada usa verbo causal", () => {
    const e = avaliarEvidencia(correlacionar(externa, internaForte, 36));
    const texto = [e.narrativa, e.ressalva, ...e.criterios.map((c) => c.detalhe)]
      .join(" ")
      .toLowerCase();
    for (const verbo of VERBOS_CAUSAIS) expect(texto).not.toContain(verbo);
    expect(e.narrativa).toContain("não é causa");
    expect(e.ressalva).toContain("Nenhuma relação causal");
  });

  it("a base é sempre evidência histórica do workspace", () => {
    expect(avaliarEvidencia(correlacionar(externa, internaForte, 36)).base).toBe(
      "evidencia_historica",
    );
  });
});

describe("evidence — panorama", () => {
  it("ordena por sustentação e conta as forças", () => {
    const externa = serie("selic_meta", Array.from({ length: 36 }, (_, i) => 8 + i * 0.2));
    const forte = serie(
      "propostas",
      Array.from({ length: 36 }, (_, i) => 300 - (8 + i * 0.2) * 10),
      "interno",
    );
    const curta = serie("vendas", [1, 2, 3], "interno");

    const p = montarPanoramaEvidencia(
      [correlacionar(externa, forte, 36), correlacionar(externa, curta, 36)],
      36,
      AGORA,
    );
    expect(p.total).toBe(2);
    expect(p.evidencias[0]?.interno.chave).toBe("propostas");
    expect(p.evidencias[1]?.forca).toBe("muito_baixa");
    expect(p.geradoEm).toBe(AGORA.toISOString());
  });

  it("sem correlações não quebra", () => {
    const p = montarPanoramaEvidencia([], 24, AGORA);
    expect(p.total).toBe(0);
    expect(p.comEvidenciaAlta).toBe(0);
  });
});

describe("evidence — consistência externa (informativa)", () => {
  const externa = serie("selic_meta", Array.from({ length: 36 }, (_, i) => 8 + i * 0.2));
  const interna = serie(
    "propostas",
    Array.from({ length: 36 }, (_, i) => 300 - (8 + i * 0.2) * 10 + (i % 2 ? 4 : -4)),
    "interno",
  );
  const correlacao = correlacionar(externa, interna, 36);

  it("confirma quando o mercado aponta o mesmo sentido, sem alterar a força", () => {
    const semRef = avaliarEvidencia(correlacao);
    const comRef = avaliarEvidencia(correlacao, {
      fonte: "Secovi-SP",
      direcao: correlacao.melhor!.direcao,
      coeficiente: -0.55,
      amostra: 30,
    });
    expect(comRef.consistenciaExterna).toBe("confirmada");
    expect(comRef.forca).toBe(semRef.forca);
    expect(comRef.criteriosAtendidos).toBe(semRef.criteriosAtendidos);
    expect(comRef.criteriosTotal).toBe(semRef.criteriosTotal);
  });

  it("não confirmada também não altera a força e é marcada como informativa", () => {
    const e = avaliarEvidencia(correlacao, { fonte: "Secovi-SP", direcao: "positiva" });
    expect(e.consistenciaExterna).toBe("nao_confirmada");
    const c = e.criterios.find((x) => x.chave === "consistencia_externa")!;
    expect(c.informativo).toBe(true);
    expect(c.detalhe).toContain("não altera a força");
    expect(e.forca).toBe(avaliarEvidencia(correlacao).forca);
  });

  it("o panorama conta as consistências confirmadas", () => {
    const p = montarPanoramaEvidencia([correlacao], 36, AGORA, {
      [correlacao.chave]: { fonte: "Secovi-SP", direcao: correlacao.melhor!.direcao },
    });
    expect(p.consistenciaConfirmada).toBe(1);
  });
});

describe("evidence — drift detection", () => {
  const estavelExterna = serie("selic_meta", Array.from({ length: 30 }, (_, i) => 8 + i * 0.2));
  const estavelInterna = serie(
    "visitas",
    Array.from({ length: 30 }, (_, i) => 300 - (8 + i * 0.2) * 10),
    "interno",
  );

  it("padrão que se mantém nas duas janelas é estável", () => {
    const d = detectarDrift(estavelExterna, estavelInterna, 0, 12);
    expect(d.estado).toBe("estavel");
    expect(d.variacaoCoeficiente!).toBeLessThanOrEqual(DRIFT_DELTA);
  });

  it("relação que deixa de aparecer na janela recente é drift", () => {
    const ruido = [3, -1, 4, -1, 5, -9, 2, 6, -5, 3, 5, -8, 9, 7, -2];
    const interna: SerieMensal = {
      ...estavelInterna,
      pontos: estavelInterna.pontos.map((p, i) =>
        i >= 15 ? { ...p, valor: 150 + (ruido[i - 15] ?? 0) * 7 } : p,
      ),
    };
    const d = detectarDrift(estavelExterna, interna, 0, 15);
    expect(d.estado).toBe("em_drift");
    expect(d.recente.coeficiente).toBeNull();
    expect(d.detalhe).toContain("não aparece nos últimos");
  });

  it("sem histórico nas duas janelas o drift é indeterminado", () => {
    const d = detectarDrift(serie("cdi", [1, 2, 3, 4]), serie("vendas", [4, 3, 2, 1], "interno"), 0, 2);
    expect(d.estado).toBe("indefinido");
    expect(d.detalhe).toContain("Amostra insuficiente");
  });

  it("nenhuma frase do drift usa verbo causal", () => {
    const texto = detectarDrift(estavelExterna, estavelInterna, 0, 12).detalhe.toLowerCase();
    for (const verbo of VERBOS_CAUSAIS) expect(texto).not.toContain(verbo);
  });
});
