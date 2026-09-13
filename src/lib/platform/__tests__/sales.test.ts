import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  STAGE_TIPOS,
  TASK_STATUS,
  TASK_PRIORIDADES,
  VISIT_STATUS,
  PROPOSAL_STATUS,
  RESERVATION_STATUS,
  SALE_STATUS,
  SALES_EVENTS,
  STAGE_CORES,
  stageTipoLabels,
  taskStatusLabels,
  taskPrioridadeLabels,
  visitStatusLabels,
  proposalStatusLabels,
  reservationStatusLabels,
  saleStatusLabels,
  salesEventLabels,
  stageCorClasses,
  corDaEtapa,
  slaEstado,
  formatDataCurta,
} from "../sales";

describe("sales: completude de labels/enums", () => {
  it("todo tipo de etapa tem label", () => {
    for (const v of STAGE_TIPOS) expect(stageTipoLabels[v]).toBeTruthy();
  });
  it("todo status de tarefa tem label", () => {
    for (const v of TASK_STATUS) expect(taskStatusLabels[v]).toBeTruthy();
  });
  it("toda prioridade de tarefa tem label", () => {
    for (const v of TASK_PRIORIDADES) expect(taskPrioridadeLabels[v]).toBeTruthy();
  });
  it("todo status de visita tem label", () => {
    for (const v of VISIT_STATUS) expect(visitStatusLabels[v]).toBeTruthy();
  });
  it("todo status de proposta tem label", () => {
    for (const v of PROPOSAL_STATUS) expect(proposalStatusLabels[v]).toBeTruthy();
  });
  it("todo status de reserva tem label", () => {
    for (const v of RESERVATION_STATUS) expect(reservationStatusLabels[v]).toBeTruthy();
  });
  it("todo status de venda tem label", () => {
    for (const v of SALE_STATUS) expect(saleStatusLabels[v]).toBeTruthy();
  });
  it("todo evento de domínio de vendas tem label", () => {
    for (const v of SALES_EVENTS) expect(salesEventLabels[v]).toBeTruthy();
  });
  it("toda cor de etapa tem classe tailwind", () => {
    for (const v of STAGE_CORES) expect(stageCorClasses[v]).toMatch(/^bg-/);
  });
});

describe("corDaEtapa", () => {
  it("retorna a classe correta para cor válida", () => {
    expect(corDaEtapa("amber")).toBe("bg-amber-500");
  });
  it("cai no slate para null/undefined", () => {
    expect(corDaEtapa(null)).toBe("bg-slate-500");
    expect(corDaEtapa(undefined)).toBe("bg-slate-500");
  });
  it("cai no slate para cor desconhecida", () => {
    expect(corDaEtapa("cor-inexistente")).toBe("bg-slate-500");
  });
});

describe("slaEstado", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-10T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sem SLA definido (null/undefined/0) nunca estoura", () => {
    expect(slaEstado("2024-06-01T00:00:00Z", null)).toEqual({ estourado: false, horas: 0 });
    expect(slaEstado("2024-06-01T00:00:00Z", undefined)).toEqual({ estourado: false, horas: 0 });
    expect(slaEstado("2024-06-01T00:00:00Z", 0)).toEqual({ estourado: false, horas: 0 });
  });

  it("calcula horas decorridas corretamente", () => {
    // entrou 10h antes de "agora"
    const entrouEm = "2024-06-10T02:00:00Z";
    const r = slaEstado(entrouEm, 24);
    expect(r.horas).toBe(10);
    expect(r.estourado).toBe(false);
  });

  it("estoura quando horas > sla (estritamente maior)", () => {
    const entrouEm = "2024-06-09T12:00:00Z"; // 24h antes
    expect(slaEstado(entrouEm, 24)).toEqual({ estourado: false, horas: 24 });
    expect(slaEstado(entrouEm, 23)).toEqual({ estourado: true, horas: 24 });
  });
});

describe("formatDataCurta", () => {
  it("retorna travessão para valor ausente", () => {
    expect(formatDataCurta(null)).toBe("—");
    expect(formatDataCurta(undefined)).toBe("—");
  });
  it("formata dia/mês em pt-BR", () => {
    expect(formatDataCurta("2024-03-05T12:00:00Z")).toBe("05/03");
  });
});
