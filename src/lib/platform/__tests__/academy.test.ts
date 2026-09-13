import { describe, expect, it } from "vitest";
import {
  ACADEMY_LICOES,
  ACADEMY_LICAO_KEYS,
  ACADEMY_TRILHA,
  acharLicao,
  calcularProgresso,
  codigoCertificado,
  duracaoTotal,
  licaoExiste,
  montarCertificado,
} from "../academy";

const OBRIGATORIAS = ACADEMY_LICOES.filter((l) => l.obrigatoria).map((l) => l.key);

describe("trilha da Academy", () => {
  it("não tem chave de lição duplicada", () => {
    expect(new Set(ACADEMY_LICAO_KEYS).size).toBe(ACADEMY_LICAO_KEYS.length);
  });

  it("tem todos os módulos com pelo menos uma lição obrigatória", () => {
    for (const modulo of ACADEMY_TRILHA) {
      expect(modulo.licoes.some((l) => l.obrigatoria)).toBe(true);
    }
  });

  it("soma a duração de todas as lições", () => {
    expect(duracaoTotal()).toBe(ACADEMY_LICOES.reduce((s, l) => s + l.duracao, 0));
  });

  it("resolve e valida chaves", () => {
    expect(licaoExiste(ACADEMY_LICAO_KEYS[0]!)).toBe(true);
    expect(licaoExiste("inexistente")).toBe(false);
    expect(acharLicao("inexistente")).toBeUndefined();
  });
});

describe("calcularProgresso", () => {
  it("começa em zero", () => {
    const p = calcularProgresso([]);
    expect(p.concluidas).toBe(0);
    expect(p.percentual).toBe(0);
    expect(p.certificado).toBe(false);
    expect(p.proximaLicao?.key).toBe(ACADEMY_LICAO_KEYS[0]);
  });

  it("ignora chaves desconhecidas e duplicadas", () => {
    const key = ACADEMY_LICAO_KEYS[0]!;
    const p = calcularProgresso([key, key, "lixo.qualquer"]);
    expect(p.concluidas).toBe(1);
  });

  it("libera o certificado só com as obrigatórias concluídas", () => {
    expect(calcularProgresso(OBRIGATORIAS.slice(0, -1)).certificado).toBe(false);
    const p = calcularProgresso(OBRIGATORIAS);
    expect(p.certificado).toBe(true);
    expect(p.obrigatoriasPendentes).toEqual([]);
  });

  it("fecha em 100% com a trilha inteira", () => {
    const p = calcularProgresso(ACADEMY_LICAO_KEYS);
    expect(p.percentual).toBe(100);
    expect(p.proximaLicao).toBeNull();
    expect(p.modulos.every((m) => m.completo)).toBe(true);
  });
});

describe("certificado", () => {
  it("não emite sem obrigatórias", () => {
    expect(montarCertificado("user-1", "Ana", [])).toBeNull();
  });

  it("emite com código estável e minutos das lições feitas", () => {
    const cert = montarCertificado("user-1", "Ana", OBRIGATORIAS, "2026-07-31T12:00:00.000Z");
    expect(cert).not.toBeNull();
    expect(cert!.codigo).toBe(codigoCertificado("user-1"));
    expect(cert!.licoes).toBe(OBRIGATORIAS.length);
    expect(cert!.minutos).toBe(
      ACADEMY_LICOES.filter((l) => l.obrigatoria).reduce((s, l) => s + l.duracao, 0),
    );
    expect(cert!.emitidoEm).toBe("2026-07-31T12:00:00.000Z");
  });

  it("gera códigos diferentes para usuários diferentes", () => {
    expect(codigoCertificado("user-1")).not.toBe(codigoCertificado("user-2"));
  });
});