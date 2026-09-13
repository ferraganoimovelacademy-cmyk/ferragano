import marca from "@/assets/ferragano-mark.png";

/**
 * Identidade Ferragano — marca única aplicada em header, rodapé e loaders.
 * `tom="claro"` para uso sobre hero escuro.
 */
export function LogoFerragano({
  tom = "escuro",
  tamanho = 34,
  comSelo = true,
}: {
  tom?: "escuro" | "claro";
  tamanho?: number;
  comSelo?: boolean;
}) {
  return (
    <span className="flex items-center gap-2">
      <img
        src={marca}
        alt="Carlos Ferragano — Liderança, Negócios, Resultados"
        width={tamanho}
        height={tamanho}
        loading="eager"
        className="shrink-0 select-none"
        style={{ width: tamanho, height: tamanho }}
      />
      <span
        className={`font-display text-lg font-semibold tracking-tight ${
          tom === "claro" ? "text-inverse-on-surface" : "text-foreground"
        }`}
      >
        Ferragano
      </span>
      {comSelo && (
        <span className="rounded-full bg-gold/15 px-3 py-0.5 text-[10px] font-bold tracking-[0.2em] text-gold uppercase border border-gold/30">
          One
        </span>
      )}
    </span>
  );
}
