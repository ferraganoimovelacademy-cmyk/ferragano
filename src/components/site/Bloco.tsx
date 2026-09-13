import type { ReactNode } from "react";
import { useReveal } from "@/hooks/use-reveal";

/** Seção com entrada por scroll — apenas apresentação. */
export function Bloco({
  children,
  className,
  as = "section",
  delay = 0,
  id,
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
  delay?: number;
  id?: string;
}) {
  const { ref, props } = useReveal<HTMLElement>(delay);
  const Tag = as;
  return (
    <Tag ref={ref as never} id={id} {...props} className={`reveal-blur ${className ?? ""}`}>
      {children}
    </Tag>
  );
}

/** Faixa padrão de conteúdo institucional. */
export function Faixa({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <Bloco
      id={id}
      className={`mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8 md:py-24 transition-all duration-700 ease-out ${className ?? ""}`}
    >
      {children}
    </Bloco>
  );
}

export function TituloSecao({
  eyebrow,
  titulo,
  lead,
}: {
  eyebrow?: string;
  titulo: string;
  lead?: string;
}) {
  return (
    <header className="max-w-3xl">
      {eyebrow && <p className="t-caps text-gold">{eyebrow}</p>}
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
        {titulo}
      </h2>
      {lead && <p className="mt-3 text-muted-foreground md:text-lg">{lead}</p>}
    </header>
  );
}
