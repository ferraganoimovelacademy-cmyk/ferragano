import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, BarBreakdown } from "@/components/platform/StatCard";
import { useSession } from "@/hooks/use-session";
import { getRelatorios } from "@/lib/platform/analytics.functions";
import {
  estagioLabels,
  formatBRL,
  origemLabels,
  propostaStatusLabels,
  temperaturaLabels,
  unidadeStatusLabels,
} from "@/lib/platform/comercial";

export const Route = createFileRoute("/app/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Ferragano OS" },
      { name: "description", content: "Indicadores de funil, portfólio e propostas do workspace." },
      { property: "og:title", content: "Relatórios — Ferragano OS" },
      { property: "og:description", content: "Indicadores consolidados do Ferragano OS." },
    ],
  }),
  component: RelatoriosPage,
});

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {titulo}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function RelatoriosPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const fetchRelatorios = useServerFn(getRelatorios);

  const { data, isPending } = useQuery({
    queryKey: ["relatorios", workspaceId],
    queryFn: () => fetchRelatorios({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  return (
    <section>
      <header className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
          <Icon name="monitoring" size={22} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Relatórios
          </h1>
          <p className="text-sm text-muted-foreground">
            Indicadores calculados no servidor sobre leads, unidades e propostas.
          </p>
        </div>
      </header>

      {isPending || !data ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Leads"
              value={data.leads.total}
              hint={`${data.leads.ultimos30} nos últimos 30 dias`}
              icon="person_add"
            />
            <StatCard
              label="Conversão"
              value={data.leads.conversao == null ? "—" : `${data.leads.conversao}%`}
              hint="Fechados ÷ leads encerrados"
              icon="trending_up"
            />
            <StatCard
              label="Leads parados"
              value={data.leads.parados}
              hint="Abertos sem contato há +7 dias"
              icon="warning"
            />
            <StatCard
              label="VGV fechado"
              value={formatBRL(data.leads.vgvFechado)}
              hint="Valor estimado dos leads fechados"
              icon="payments"
            />
            <StatCard
              label="Unidades"
              value={data.unidades.total}
              hint={`${data.empreendimentos.total} empreendimentos · ${data.empreendimentos.publicos} na vitrine`}
              icon="apartment"
            />
            <StatCard
              label="Estoque disponível"
              value={formatBRL(data.unidades.vgvDisponivel)}
              icon="inventory_2"
            />
            <StatCard label="Vendido" value={formatBRL(data.unidades.vgvVendido)} icon="sell" />
            <StatCard
              label="Propostas aceitas"
              value={formatBRL(data.propostas.valorAceito)}
              hint={`${data.propostas.total} propostas no total`}
              icon="description"
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Bloco titulo="Funil por estágio">
              <BarBreakdown data={data.leads.porEstagio} labels={estagioLabels} />
            </Bloco>
            <Bloco titulo="Leads por origem">
              <BarBreakdown data={data.leads.porOrigem} labels={origemLabels} />
            </Bloco>
            <Bloco titulo="Temperatura">
              <BarBreakdown data={data.leads.porTemperatura} labels={temperaturaLabels} />
            </Bloco>
            <Bloco titulo="Unidades por status">
              <BarBreakdown
                data={data.unidades.porStatus}
                labels={unidadeStatusLabels}
                empty="Nenhuma unidade cadastrada."
              />
            </Bloco>
            <Bloco titulo="Propostas por status">
              <BarBreakdown
                data={data.propostas.porStatus}
                labels={propostaStatusLabels}
                empty="Nenhuma proposta registrada."
              />
            </Bloco>
          </div>
        </>
      )}
    </section>
  );
}
