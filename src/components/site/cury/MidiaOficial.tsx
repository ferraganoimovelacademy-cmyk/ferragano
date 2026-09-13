import { useState } from "react";
import { AtivoSlot } from "@/components/site/cury/AtivoSlot";
import { propsImagem } from "@/lib/site/imagem";

/**
 * UI 04.1 — GATE 01/04.
 * Mídia oficial da construtora com placeholder blur, lazy load e srcset.
 * Sem material liberado, cai no `AtivoSlot` — nunca em imagem genérica.
 */
export function MidiaOficial({
  src,
  alt,
  proporcao = "aspect-[16/10]",
  sizes,
  prioridade = false,
  className = "",
  slot,
}: {
  src?: string | null;
  alt: string;
  proporcao?: string;
  sizes?: string;
  prioridade?: boolean;
  className?: string;
  slot?: { titulo: string; icone: string; nota?: string };
}) {
  const [carregada, setCarregada] = useState(false);

  if (!src) {
    return (
      <AtivoSlot
        titulo={slot?.titulo ?? alt}
        icone={slot?.icone ?? "photo_library"}
        proporcao={proporcao}
        nota={slot?.nota}
      />
    );
  }

  return (
    <div className={`${proporcao} relative w-full overflow-hidden ${className}`}>
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-gradient-to-br from-primary-soft/60 to-accent/40 transition-opacity duration-700 ${
          carregada ? "opacity-0" : "opacity-100 blur-md"
        }`}
      />
      <img
        {...propsImagem(src, { sizes, prioridade })}
        alt={alt}
        onLoad={() => setCarregada(true)}
        className={`size-full object-cover transition-[opacity,transform] duration-700 ${
          carregada ? "scale-100 opacity-100" : "scale-[1.03] opacity-0"
        }`}
      />
    </div>
  );
}
