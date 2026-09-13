import { describe, expect, it } from "vitest";
import {
  avaliarProntidaoPiloto,
  resumirProntidao,
  type PilotSnapshot,
} from "@/lib/platform/pilot";

const base: PilotSnapshot = {
  funis: 0,
  funilPadrao: false,
  etapas: 0,
  membrosAtivos: 0,
  papeis: {},
  empreendimentos: 0,
  empreendimentosPublicos: 0,
  unidades: 0,
  unidadesComPreco: 0,
  importacoes: { pessoas: 0, oportunidades: 0, visitas: 0, reservas: 0 },
  flags: {},
  academyMembrosConcluiram: 0,
};

const pronto: PilotSnapshot = {
  funis: 1,
  funilPadrao: true,
  etapas: 6,
  membrosAtivos: 15,
  papeis: { proprietario: 1, gerente: 2, corretor: 10, suporte: 1, financeiro: 1 },
  empreendimentos: 1,
  empreendimentosPublicos: 1,
  unidades: 40,
  unidadesComPreco: 40,
  importacoes: { pessoas: 1, oportunidades: 1, visitas: 0, reservas: 0 },
  flags: { crm: true, ia: false, portal_cliente: false },
  academyMembrosConcluiram: 15,
};

const achar = (s: PilotSnapshot, chave: string) =>
  avaliarProntidaoPiloto(s).find((c) => c.chave === chave)!;

describe("avaliarProntidaoPiloto", () => {
  it("workspace vazio não libera nada", () => {
    const checks = avaliarProntidaoPiloto(base);
    expect(checks.every((c) => c.status !== "pronto" || c.gate === "P09")).toBe(true);
    expect(resumirProntidao(checks).liberado).toBe(false);
  });

  it("workspace completo fica liberado", () => {
    const resumo = resumirProntidao(avaliarProntidaoPiloto(pronto));
    expect(resumo.bloqueantesAbertos).toBe(0);
    expect(resumo.liberado).toBe(true);
    expect(resumo.percentual).toBe(100);
  });

  it("funil sem padrão fica parcial", () => {
    expect(achar({ ...pronto, funilPadrao: false }, "funil_padrao").status).toBe("parcial");
  });

  it("funil com menos de três etapas fica pendente", () => {
    expect(achar({ ...pronto, etapas: 2 }, "funil_padrao").status).toBe("pendente");
  });

  it("equipe incompleta é parcial e bloqueante quando corretor falta", () => {
    const check = achar({ ...pronto, papeis: { ...pronto.papeis, corretor: 4 } }, "papel_corretor");
    expect(check.status).toBe("parcial");
    expect(check.bloqueante).toBe(true);
  });

  it("unidade sem preço bloqueia o estoque", () => {
    const s = { ...pronto, unidadesComPreco: 39 };
    expect(achar(s, "estoque").status).toBe("parcial");
    expect(resumirProntidao(avaliarProntidaoPiloto(s)).liberado).toBe(false);
  });

  it("flag do piloto fora do combinado fica pendente sem bloquear", () => {
    const check = achar({ ...pronto, flags: { ...pronto.flags, ia: true } }, "flag_ia");
    expect(check.status).toBe("pendente");
    expect(check.bloqueante).toBe(false);
  });

  it("flag sem registro no banco aparece como pendente", () => {
    expect(achar({ ...pronto, flags: {} }, "flag_crm").medido).toBe("sem registro");
  });

  it("migração conta as importações auditadas", () => {
    expect(achar({ ...pronto, importacoes: { pessoas: 2, oportunidades: 1, visitas: 1, reservas: 1 } }, "migracao").medido).toContain("5");
  });

  it("onboarding parcial não bloqueia", () => {
    const check = achar({ ...pronto, academyMembrosConcluiram: 8 }, "academy_concluida");
    expect(check.status).toBe("parcial");
    expect(check.bloqueante).toBe(false);
  });
});