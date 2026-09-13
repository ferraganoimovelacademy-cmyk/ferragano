import { Icon } from "@/components/Icon";

const NUMEROS = [
  { valor: "18 anos", rotulo: "de mercado imobiliário", icon: "history" },
  { valor: "1.400+", rotulo: "clientes atendidos", icon: "groups" },
  { valor: "R$ 1,2 bi", rotulo: "em VGV negociado", icon: "payments" },
  { valor: "260+", rotulo: "unidades vendidas em lançamento", icon: "apartment" },
];

const VERTICAIS = [
  "Lançamentos residenciais",
  "Minha Casa Minha Vida",
  "Investimento patrimonial",
  "Primeiro imóvel",
];

const MOTIVOS = [
  { icon: "location_city", titulo: "Acesso aos lançamentos", texto: "Tabelas e disponibilidade real na largada de cada empreendimento." },
  { icon: "trending_up", titulo: "Análise de valorização", texto: "Leitura de região, entrega e preço antes de qualquer recomendação." },
  { icon: "home_work", titulo: "Escolha do imóvel ideal", texto: "Metragem, planta e lazer alinhados ao uso real da família." },
  { icon: "handshake", titulo: "Acompanhamento personalizado", texto: "Um responsável nomeado do primeiro contato ao repasse bancário." },
  { icon: "savings", titulo: "Estratégia patrimonial", texto: "Crédito, subsídio e parcela dimensionados para a renda do cliente." },
];

/** Barra de credibilidade: números e parcerias. Conteúdo institucional estático. */
export function CredibilidadeBar() {
  return (
    <section aria-label="Credibilidade Ferragano" className="border-y border-border bg-card">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-12 md:px-8">
        <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {NUMEROS.map((n) => (
            <div key={n.rotulo} className="min-w-0">
              <Icon name={n.icon} size={20} className="text-gold" />
              <dt className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
                {n.valor}
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">{n.rotulo}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-10 grid gap-8 border-t border-border pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center">
          <div className="rounded-2xl border border-gold/40 bg-background p-6 text-center">
            <p className="font-display text-3xl font-semibold tracking-[0.18em] text-foreground">CURY</p>
            <p className="t-caps mt-2 text-gold">Especialista em Lançamentos</p>
            <p className="mt-1 text-sm text-muted-foreground">Consultoria Ferragano</p>
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
              Uma parceria com quem transforma projetos em realidade
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Principal ecossistema imobiliário apresentado pelo Ferragano.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {VERTICAIS.map((v) => (
                <li
                  key={v}
                  className="rounded-full border border-border bg-background px-3 py-1 text-sm text-muted-foreground"
                >
                  {v}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Por que escolher um especialista Cury?
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MOTIVOS.map((m) => (
              <li key={m.titulo} className="min-w-0 rounded-xl border border-border bg-background p-5">
                <Icon name={m.icon} size={22} className="text-primary" />
                <h3 className="mt-3 font-display text-base font-semibold tracking-tight">{m.titulo}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{m.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
