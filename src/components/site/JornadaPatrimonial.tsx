import { Icon } from "@/components/Icon";
import { useReveal } from "@/hooks/use-reveal";

const PASSOS = [
  {
    icon: "key",
    titulo: "Compra o primeiro",
    texto: "Entrada planejada em lançamento compatível com a renda atual.",
  },
  {
    icon: "trending_up",
    titulo: "O imóvel valoriza",
    texto: "Ciclo de obra e maturação do bairro elevam o valor de mercado.",
  },
  {
    icon: "payments",
    titulo: "Passa a receber renda",
    texto: "Locação na entrega transforma o ativo em fluxo mensal.",
  },
  {
    icon: "add_home",
    titulo: "Compra o segundo",
    texto: "Equity acumulado e renda viram entrada do próximo ativo.",
  },
  {
    icon: "account_balance",
    titulo: "Constrói patrimônio",
    texto: "Dois, três, quatro ativos — decisão certa repetida no tempo.",
  },
];

/** Jornada patrimonial: a tese central do posicionamento. */
export function JornadaPatrimonial() {
  return (
    <ol className="mt-10 grid gap-4 md:grid-cols-5">
      {PASSOS.map((p, i) => (
        <Passo key={p.titulo} passo={p} indice={i} />
      ))}
    </ol>
  );
}

function Passo({ passo, indice }: { passo: (typeof PASSOS)[number]; indice: number }) {
  const { ref, props } = useReveal<HTMLLIElement>(indice * 90);
  return (
    <li
      ref={ref}
      {...props}
      className="reveal panel relative flex min-w-0 flex-col p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-e3"
    >
      <span className="t-data text-gold">0{indice + 1}</span>
      <Icon name={passo.icon} size={24} className="mt-3 text-primary" />
      <h3 className="mt-3 font-display text-base font-semibold tracking-tight">{passo.titulo}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{passo.texto}</p>
    </li>
  );
}
