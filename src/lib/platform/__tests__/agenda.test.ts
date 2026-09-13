import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMPROMISSO_TIPOS,
  COMPROMISSO_STATUS,
  tipoLabels,
  tipoIcones,
  statusLabels,
  formatDataHora,
  formatDiaLongo,
  chaveDoDia,
  estaAtrasado,
} from "../agenda";

describe("agenda: completude de labels/ícones", () => {
  it("todo tipo de compromisso tem label e ícone", () => {
    for (const v of COMPROMISSO_TIPOS) {
      expect(tipoLabels[v]).toBeTruthy();
      expect(tipoIcones[v]).toBeTruthy();
    }
  });
  it("todo status de compromisso tem label", () => {
    for (const v of COMPROMISSO_STATUS) expect(statusLabels[v]).toBeTruthy();
  });
});

describe("formatadores de data (timezone UTC fixo no ambiente de teste)", () => {
  it("formatDataHora formata dia/mês hora:minuto", () => {
    expect(formatDataHora("2024-03-05T14:30:00Z")).toBe("05/03, 14:30");
  });
  it("formatDiaLongo formata dia da semana por extenso", () => {
    // 2024-03-05 é uma terça-feira
    const out = formatDiaLongo("2024-03-05T14:30:00Z");
    expect(out.toLowerCase()).toContain("terça-feira");
    expect(out).toContain("05 de março");
  });
  it("chaveDoDia agrupa por ano-mês-dia local", () => {
    expect(chaveDoDia("2024-03-05T14:30:00Z")).toBe("2024-03-05");
  });
});

describe("estaAtrasado", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-10T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("pendente com horário no passado está atrasado", () => {
    expect(estaAtrasado("2024-06-10T11:00:00Z", "pendente")).toBe(true);
  });
  it("pendente com horário no futuro não está atrasado", () => {
    expect(estaAtrasado("2024-06-10T13:00:00Z", "pendente")).toBe(false);
  });
  it("concluído ou cancelado nunca está atrasado, mesmo no passado", () => {
    expect(estaAtrasado("2024-06-01T00:00:00Z", "concluido")).toBe(false);
    expect(estaAtrasado("2024-06-01T00:00:00Z", "cancelado")).toBe(false);
  });
});
