/**
 * Sprint UI 03 — Motion System.
 * Fonte única de duração, easing e presets de animação do site público.
 * Nenhum componente define curva ou duração própria: importa daqui.
 */
export const MOTION = {
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  duration: { rapido: 200, padrao: 300, lento: 600, cinema: 900 },
  /** Atraso entre itens de uma mesma lista (efeito cascata). */
  stagger: 60,
  /** Atraso máximo — evita cascata longa em listas grandes. */
  staggerMax: 360,
} as const;

/** Atraso de entrada de um item em cascata, em ms. */
export function stagger(index: number): number {
  return Math.min(index * MOTION.stagger, MOTION.staggerMax);
}

/** Classe padrão de card interativo do site. */
export const CARD_MOTION =
  "hover-lift rounded-xl border border-border bg-card hover:border-primary/60";
