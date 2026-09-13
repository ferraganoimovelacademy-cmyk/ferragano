import { Icon } from "@/components/Icon";
import { img } from "@/lib/images";
import { useReveal } from "@/hooks/use-reveal";

const DEPOIMENTOS = [
  {
    nome: "Marcos Vieira",
    contexto: "Comprou no Alameda Cury",
    foto: img.testimonialMarcos,
    texto:
      "Chegaram com a simulação de crédito antes da primeira visita. Eu já sabia o que caberia no orçamento — visitei três apartamentos, não trinta.",
  },
  {
    nome: "Aline Prado",
    contexto: "Investidora, 2 unidades",
    foto: img.testimonialAline,
    texto:
      "A negociação direta com a construtora mudou o fluxo de pagamento inteiro. Foi a diferença entre fechar e desistir.",
  },
  {
    nome: "Fernanda Alves",
    contexto: "Primeira compra",
    foto: img.leadFernanda,
    texto:
      "Tive um responsável nomeado do começo à entrega das chaves. Nunca precisei explicar meu caso duas vezes.",
  },
];

export function Depoimentos() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {DEPOIMENTOS.map((d, i) => (
        <Card key={d.nome} depoimento={d} delay={i * 90} />
      ))}
    </div>
  );
}

function Card({ depoimento, delay }: { depoimento: (typeof DEPOIMENTOS)[number]; delay: number }) {
  const { ref, props } = useReveal<HTMLElement>(delay);
  return (
    <figure
      ref={ref}
      {...props}
      className="reveal panel flex h-full flex-col p-6 transition-shadow duration-300 hover:shadow-e3"
    >
      <Icon name="format_quote" size={24} className="text-gold" />
      <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        {depoimento.texto}
      </blockquote>
      <figcaption className="mt-6 flex min-w-0 items-center gap-3 border-t border-border pt-4">
        <img
          src={depoimento.foto}
          alt={`Foto de ${depoimento.nome}`}
          loading="lazy"
          className="size-10 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{depoimento.nome}</p>
          <p className="truncate text-xs text-muted-foreground">{depoimento.contexto}</p>
        </div>
      </figcaption>
    </figure>
  );
}
