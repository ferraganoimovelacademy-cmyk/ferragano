import marca from "@/assets/ferragano-mark.png";

/**
 * Sprint UI 07 · Gate 05 — carregamento elegante entre rotas.
 * Marca + anel dourado, sem spinner genérico e sem salto de layout.
 */
export function CarregandoElegante() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-background px-4"
    >
      <span className="relative grid size-16 place-items-center">
        <span className="gold-orbit absolute inset-0 rounded-full border border-gold/25 border-t-gold" />
        <img src={marca} alt="" width={26} height={26} className="size-[26px] select-none" />
      </span>
      <p className="gold-breath font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
        Preparando a experiência
      </p>
    </div>
  );
}
