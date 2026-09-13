import { Icon } from "@/components/Icon";
import { whatsappLink } from "@/lib/site/contato";

/**
 * Sprint UI 06 — GATE 06 (Conversão Premium).
 * CTA contextual: cada seção da página oferece o próximo passo coerente com o
 * conteúdo que a pessoa acabou de ver. Sem pop-up e sem interromper a leitura.
 */
export type AcaoCta =
  | "visita"
  | "tabela"
  | "plantas"
  | "ferragano"
  | "simular"
  | "vip";

const ACOES: Record<AcaoCta, { rotulo: string; icone: string; mensagem: (nome: string) => string }> = {
  visita: {
    rotulo: "Agendar visita",
    icone: "event_available",
    mensagem: (n) => `Olá! Quero agendar uma visita ao ${n}. Quais horários vocês têm?`,
  },
  tabela: {
    rotulo: "Solicitar tabela atualizada",
    icone: "table_chart",
    mensagem: (n) => `Olá! Quero a tabela de preços atualizada do ${n}, com as unidades disponíveis.`,
  },
  plantas: {
    rotulo: "Receber plantas",
    icone: "architecture",
    mensagem: (n) => `Olá! Pode me enviar as plantas e o material oficial do ${n}?`,
  },
  ferragano: {
    rotulo: "Falar com o Ferragano",
    icone: "chat",
    mensagem: (n) => `Olá, Carlos! Quero sua leitura sobre o ${n} antes de decidir.`,
  },
  simular: {
    rotulo: "Simular financiamento",
    icone: "calculate",
    mensagem: (n) => `Olá! Quero simular o financiamento de uma unidade do ${n} com condições reais.`,
  },
  vip: {
    rotulo: "Entrar na lista VIP",
    icone: "star",
    mensagem: (n) =>
      `Olá! Quero entrar na lista VIP do ${n} para receber lançamento de novas unidades e condições antes do mercado.`,
  },
};

export function CtaContextual({
  nome,
  titulo,
  texto,
  acoes,
  ancoraSimulador = "#simulador",
}: {
  nome: string;
  titulo: string;
  texto: string;
  acoes: AcaoCta[];
  ancoraSimulador?: string;
}) {
  const [principal, ...secundarias] = acoes;
  if (!principal) return null;

  const render = (id: AcaoCta, i: number) => {
    const a = ACOES[id];
    const classe =
      i === 0
        ? "bg-primary text-primary-foreground"
        : "border border-border bg-background text-foreground";
    const conteudo = (
      <>
        <Icon name={a.icone} size={18} />
        {a.rotulo}
      </>
    );

    if (id === "simular") {
      return (
        <a
          key={id}
          href={ancoraSimulador}
          className={`press inline-flex h-12 items-center gap-2 rounded-md px-5 text-sm font-medium ${classe}`}
        >
          {conteudo}
        </a>
      );
    }
    return (
      <a
        key={id}
        href={whatsappLink(a.mensagem(nome))}
        target="_blank"
        rel="noopener noreferrer"
        className={`press inline-flex h-12 items-center gap-2 rounded-md px-5 text-sm font-medium ${classe}`}
      >
        {conteudo}
      </a>
    );
  };

  return (
    <aside className="mt-10 rounded-2xl border border-border bg-card p-6 md:flex md:items-center md:justify-between md:gap-8 md:p-8">
      <div className="max-w-xl">
        <h3 className="font-display text-lg font-semibold tracking-tight">{titulo}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{texto}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-3 md:mt-0 md:shrink-0">
        {[principal, ...secundarias].map(render)}
      </div>
    </aside>
  );
}