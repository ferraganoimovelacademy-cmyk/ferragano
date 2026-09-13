import { Icon } from "@/components/Icon";
import { CARD_MOTION, stagger } from "@/lib/site/motion";

const DORES = [
  {
    icon: "location_on",
    titulo: "Imagine acordar aqui",
    texto:
      "Abrir a janela, ver o nascer do sol e levar seus filhos para a escola caminhando. Ter o metrô a poucos minutos e chegar mais cedo em casa todos os dias.",
  },
  {
    icon: "history",
    titulo: "Qualidade de vida",
    texto:
      "Isso não é apenas localização. É tempo. É a segurança de um teto seu e a certeza de que sua história está sendo construída no lugar certo.",
  },
  {
    icon: "sell",
    titulo: "Atendimento é venda de estoque",
    texto:
      "O mercado tradicional mostra o que precisa vender no mês. Na Ferragano, a conversa começa pelo seu objetivo, não pelo imóvel disponível.",
  },
  {
    icon: "event_busy",
    titulo: "Pós-venda desaparece",
    texto: "Assinou, acabou. Na nossa consultoria, o acompanhamento vai do diagnóstico até a entrega das chaves — e o próximo passo do seu patrimônio.",
  },
];

/** Storytelling — etapa "Problema": nomeia a dor antes de apresentar o método. */
export function ProblemaSecao() {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {DORES.map((d, i) => (
        <article
          key={d.titulo}
          className={`${CARD_MOTION} glass-pane p-6 transition-all hover:shadow-e2`}
          style={{ transitionDelay: `${stagger(i)}ms` }}
        >
          <Icon name={d.icon} size={22} aria-hidden className="text-muted-foreground" />
          <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{d.titulo}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{d.texto}</p>
        </article>
      ))}
    </div>
  );
}
