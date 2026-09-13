import { describe, expect, it } from "vitest";
import {
  acaoDoAtalho,
  etapaDeArquivamento,
  etapaVizinha,
  exigeMotivo,
  proximaTemperatura,
  type KanbanStage,
} from "@/lib/platform/kanban";

const etapas: KanbanStage[] = [
  { id: "a", nome: "Novo", ordem: 1, tipo: "aberto" },
  { id: "b", nome: "Proposta", ordem: 2, tipo: "aberto" },
  { id: "c", nome: "Contrato", ordem: 3, tipo: "ganho" },
  { id: "d", nome: "Perdido", ordem: 4, tipo: "perdido" },
];

describe("acaoDoAtalho", () => {
  it("mapeia as setas com Ctrl", () => {
    expect(acaoDoAtalho({ key: "ArrowRight", ctrlKey: true })).toBe("avancar");
    expect(acaoDoAtalho({ key: "ArrowLeft", ctrlKey: true })).toBe("voltar");
    expect(acaoDoAtalho({ key: "ArrowUp", ctrlKey: true })).toBe("prioridade");
    expect(acaoDoAtalho({ key: "ArrowDown", ctrlKey: true })).toBe("arquivar");
  });

  it("aceita Cmd no macOS", () => {
    expect(acaoDoAtalho({ key: "ArrowRight", metaKey: true })).toBe("avancar");
  });

  it("mapeia Enter e Espaço sem modificador", () => {
    expect(acaoDoAtalho({ key: "Enter" })).toBe("abrir");
    expect(acaoDoAtalho({ key: " " })).toBe("selecionar");
  });

  it("ignora combinações não suportadas", () => {
    expect(acaoDoAtalho({ key: "ArrowRight" })).toBeNull();
    expect(acaoDoAtalho({ key: "Enter", shiftKey: true })).toBeNull();
    expect(acaoDoAtalho({ key: "ArrowRight", ctrlKey: true, altKey: true })).toBeNull();
    expect(acaoDoAtalho({ key: "k", ctrlKey: true })).toBeNull();
  });
});

describe("etapaVizinha", () => {
  it("avança e volta respeitando a ordem", () => {
    expect(etapaVizinha(etapas, "a", 1)?.id).toBe("b");
    expect(etapaVizinha(etapas, "b", -1)?.id).toBe("a");
  });

  it("não passa dos limites", () => {
    expect(etapaVizinha(etapas, "d", 1)).toBeNull();
    expect(etapaVizinha(etapas, "a", -1)).toBeNull();
  });

  it("retorna null sem etapa atual ou id desconhecido", () => {
    expect(etapaVizinha(etapas, null, 1)).toBeNull();
    expect(etapaVizinha(etapas, "zzz", 1)).toBeNull();
  });
});

describe("arquivamento e motivo", () => {
  it("usa a primeira etapa perdida para arquivar", () => {
    expect(etapaDeArquivamento(etapas)?.id).toBe("d");
    expect(etapaDeArquivamento(etapas.slice(0, 3))).toBeNull();
  });

  it("exige motivo apenas na perda", () => {
    expect(exigeMotivo(etapas[3]!)).toBe(true);
    expect(exigeMotivo(etapas[2]!)).toBe(false);
    expect(exigeMotivo(null)).toBe(false);
  });
});

describe("proximaTemperatura", () => {
  it("escala sem passar de quente", () => {
    expect(proximaTemperatura("frio")).toBe("morno");
    expect(proximaTemperatura("morno")).toBe("quente");
    expect(proximaTemperatura("quente")).toBe("quente");
  });
});