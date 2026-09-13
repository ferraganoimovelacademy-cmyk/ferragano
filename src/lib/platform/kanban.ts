import { LEAD_TEMPERATURAS, type LeadTemperatura } from "@/lib/platform/comercial";

export type KanbanStage = { id: string; nome: string; ordem: number; tipo: string };

export type KanbanAcao = "avancar" | "voltar" | "prioridade" | "arquivar" | "abrir" | "selecionar";

export type AtalhoEvento = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
};

/** Mapeia a combinação de teclas para a ação do Kanban. Ctrl ou Cmd são equivalentes. */
export function acaoDoAtalho(e: AtalhoEvento): KanbanAcao | null {
  const mod = Boolean(e.ctrlKey || e.metaKey);
  if (e.altKey) return null;
  if (mod) {
    switch (e.key) {
      case "ArrowRight":
        return "avancar";
      case "ArrowLeft":
        return "voltar";
      case "ArrowUp":
        return "prioridade";
      case "ArrowDown":
        return "arquivar";
      default:
        return null;
    }
  }
  if (e.shiftKey) return null;
  if (e.key === "Enter") return "abrir";
  if (e.key === " " || e.key === "Spacebar") return "selecionar";
  return null;
}

function ordenadas(etapas: KanbanStage[]) {
  return [...etapas].sort((a, b) => a.ordem - b.ordem);
}

/** Retorna a etapa vizinha (+1 avança, -1 volta) ou null quando não existe. */
export function etapaVizinha(
  etapas: KanbanStage[],
  stageId: string | null,
  direcao: 1 | -1,
): KanbanStage | null {
  if (!stageId) return null;
  const lista = ordenadas(etapas);
  const idx = lista.findIndex((e) => e.id === stageId);
  if (idx < 0) return null;
  return lista[idx + direcao] ?? null;
}

/** Etapa usada para arquivar (primeira do tipo perdido). */
export function etapaDeArquivamento(etapas: KanbanStage[]): KanbanStage | null {
  return ordenadas(etapas).find((e) => e.tipo === "perdido") ?? null;
}

/** Mudança para etapa de perda exige motivo registrado. */
export function exigeMotivo(etapa: KanbanStage | null): boolean {
  return etapa?.tipo === "perdido";
}

/** Escala a temperatura da oportunidade: frio → morno → quente (sem passar do topo). */
export function proximaTemperatura(atual: LeadTemperatura): LeadTemperatura {
  const idx = LEAD_TEMPERATURAS.indexOf(atual);
  if (idx < 0) return "morno";
  return LEAD_TEMPERATURAS[Math.min(idx + 1, LEAD_TEMPERATURAS.length - 1)]!;
}

/** Texto de apoio exibido ao usuário e lido por leitores de tela. */
export const ATALHOS_KANBAN =
  "Ctrl+→ avança etapa · Ctrl+← volta etapa · Ctrl+↑ eleva prioridade · Ctrl+↓ arquiva · Enter abre · Espaço seleciona";