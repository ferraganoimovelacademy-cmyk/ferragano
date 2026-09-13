import { describe, expect, it } from "vitest";
import { avaliarPiloto, resumirGoNogo, type GoNogoEntrada } from "@/lib/platform/gonogo";

const completa: GoNogoEntrada = {
  janelaDias: 30,
  membrosAtivos: 10,
  usuariosAtivos7d: 10,
  oportunidadesTotal: 100,
  oportunidadesAtualizadas: 90,
  oportunidadesEsquecidas: 5,
  eventosTotal: 1000,
  eventosComErro: 10,
  oportunidadesGanhas: 30,
  oportunidadesPerdidas: 70,
  tempoMedioEtapaHoras: 12,
  usosBuscaGlobal: 40,
  usosDecisionCenter: 25,
  eventosAutomacao: 300,
  decisoesTotal: 20,
  decisoesAceitas: 12,
  feedbackTotal: 8,
  feedbackCriticoAberto: 0,
  academyCertificados: 9,
};

describe("avaliarPiloto", () => {
  it("cobre as quatro dimensões do GATE P08", () => {
    const criterios = avaliarPiloto(completa);
    expect(new Set(criterios.map((c) => c.dimensao))).toEqual(
      new Set(["operacao", "comercial", "produto", "satisfacao"]),
    );
    expect(criterios.every((c) => c.key && c.meta)).toBe(true);
  });

  it("não declara meta atingida sem medição", () => {
    const criterios = avaliarPiloto({ ...completa, usuariosAtivos7d: null });
    const ativos = criterios.find((c) => c.key === "usuarios_ativos");
    expect(ativos?.status).toBe("sem_dado");
    expect(ativos?.valor).toBe("—");
  });

  it("classifica piso, teto e zona de atenção", () => {
    const parcial = avaliarPiloto({ ...completa, usuariosAtivos7d: 8 });
    expect(parcial.find((c) => c.key === "usuarios_ativos")?.status).toBe("parcial");

    const falha = avaliarPiloto({ ...completa, usuariosAtivos7d: 5 });
    expect(falha.find((c) => c.key === "usuarios_ativos")?.status).toBe("falha");

    const erros = avaliarPiloto({ ...completa, eventosComErro: 200 });
    expect(erros.find((c) => c.key === "erros_criticos")?.status).toBe("falha");
  });

  it("ignora divisão por zero", () => {
    const criterios = avaliarPiloto({
      ...completa,
      membrosAtivos: 0,
      oportunidadesTotal: 0,
      eventosTotal: 0,
    });
    expect(criterios.find((c) => c.key === "usuarios_ativos")?.status).toBe("sem_dado");
    expect(criterios.find((c) => c.key === "oportunidades_atualizadas")?.status).toBe("sem_dado");
  });
});

describe("resumirGoNogo", () => {
  it("libera GO quando tudo está na meta", () => {
    const resumo = resumirGoNogo(completa);
    expect(resumo.veredito).toBe("go");
    expect(resumo.falhas).toBe(0);
    expect(resumo.bloqueantesEmFalha).toEqual([]);
    expect(resumo.cobertura).toBe(100);
  });

  it("segura em HOLD quando um bloqueante falha", () => {
    const resumo = resumirGoNogo({ ...completa, feedbackCriticoAberto: 6 });
    expect(resumo.veredito).toBe("hold");
    expect(resumo.bloqueantesEmFalha.length).toBe(1);
  });

  it("segura em HOLD quando só critérios não bloqueantes falham", () => {
    const resumo = resumirGoNogo({ ...completa, tempoMedioEtapaHoras: 200 });
    expect(resumo.veredito).toBe("hold");
    expect(resumo.falhas).toBe(1);
  });

  it("não decide com cobertura abaixo de 80%", () => {
    const resumo = resumirGoNogo({
      ...completa,
      usuariosAtivos7d: null,
      oportunidadesTotal: null,
      eventosTotal: null,
      tempoMedioEtapaHoras: null,
      usosBuscaGlobal: null,
      usosDecisionCenter: null,
    });
    expect(resumo.veredito).toBe("insuficiente");
    expect(resumo.cobertura).toBeLessThan(80);
  });

  it("bloqueante sem medição também impede GO", () => {
    const resumo = resumirGoNogo({ ...completa, feedbackCriticoAberto: null });
    expect(resumo.veredito).toBe("hold");
    expect(resumo.bloqueantesEmFalha).toContain("Feedback crítico em aberto");
  });
});
