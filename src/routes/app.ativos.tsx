import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StatCard } from "@/components/platform/StatCard";
import { useSession } from "@/hooks/use-session";
import { useTrackScreen } from "@/hooks/use-telemetry";
import { moeda, numero } from "@/lib/platform/insights";
import { nivelLabels, type Previsao } from "@/lib/platform/predictive";
import { forcaLabels } from "@/lib/platform/market-analytics";
import { getAssetIntelligence } from "@/lib/platform/asset-intelligence.functions";
import type { EmpreendimentoDiagnostico } from "@/lib/platform/asset-intelligence";

/**
 * ASSET INTELLIGENCE — mídia faltante, pipeline exposto por lacuna visual e
 * ranking dos ativos que sustentam a experiência pública.
 * Somente leitura: a correção é feita na Biblioteca de mídia.
 */
export const Route = createFileRoute("/app/ativos")({
  head: () => ({
    meta: [
      { title: "Asset Intelligence — qualidade visual e impacto" },
      {
        name: "description",
        content:
          "Empreendimentos com mídia faltante, pipeline exposto por lacuna visual e ranking dos ativos que mais sustentam a vitrine pública.",
      },
      { property: "og:title", content: "Asset Intelligence — qualidade visual e impacto" },
      {
        property: "og:description",
        content:
          "Diagnóstico de cobertura de mídia, impacto explicável e correlação entre qualidade visual e conversão medida.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AtivosPage,
});

const dataHora = (v: string) =>
  new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function Explicacao({ previsao }: { previsao: Previsao<unknown> }) {
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      <p>
        Confiança <span className="font-medium text-foreground">{previsao.confianca}%</span> (
        {nivelLabels[previsao.nivel]})
      </p>
      <ul className="space-y-1">
        {previsao.fatores.map((f) => (
          <li key={f.nome} className="flex gap-2">
            <Icon
              name={
                f.direcao === "positivo"
                  ? "trending_up"
                  : f.direcao === "negativo"
                    ? "trending_down"
                    : "remove"
              }
              size={14}
              className="mt-0.5 shrink-0"
            />
            <span>
              <span className="font-medium text-foreground">{f.nome}:</span> {f.detalhe}
            </span>
          </li>
        ))}
      </ul>
      <p>Base: {previsao.base}</p>
    </div>
  );
}

function LinhaEmpreendimento({ emp }: { emp: EmpreendimentoDiagnostico }) {
  return (
    <AccordionItem value={emp.empreendimentoId}>
      <AccordionTrigger className="text-left">
        <span className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pr-2">
          <span className="min-w-0">
            <span className="block truncate font-medium">{emp.nome}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {emp.cidade ?? "—"} · {emp.arquivos} arquivo(s) ·{" "}
              {emp.lacunas.length ? `${emp.lacunas.length} lacuna(s)` : "cobertura completa"}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {emp.pipelineExposto.valor != null && (
              <Badge variant="secondary">{moeda(emp.pipelineExposto.valor)} expostos</Badge>
            )}
            <Badge variant={emp.score >= 70 ? "default" : "outline"}>{emp.score}%</Badge>
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-4">
        {emp.lacunas.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {emp.lacunas.map((l) => (
              <li
                key={l.item}
                className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <Icon
                  name={l.visual ? "image_not_supported" : "info"}
                  size={16}
                  className="mt-0.5 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0">
                  <span className="block font-medium">{l.rotulo}</span>
                  <span className="block text-xs text-muted-foreground">{l.acao}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Todos os ativos requeridos estão publicados.
          </p>
        )}

        {emp.pipelineExposto.valor == null && emp.pipelineExposto.motivoAusencia ? (
          <p className="text-xs text-muted-foreground">{emp.pipelineExposto.motivoAusencia}</p>
        ) : null}
        <Explicacao previsao={emp.pipelineExposto} />

        <Link
          to="/app/midia"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Icon name="perm_media" size={16} />
          Corrigir na Biblioteca de mídia
        </Link>
      </AccordionContent>
    </AccordionItem>
  );
}

function AtivosPage() {
  const { data: sessao } = useSession();
  const workspaceId = sessao?.workspace?.id ?? null;
  const carregar = useServerFn(getAssetIntelligence);
  useTrackScreen("property", "asset_intelligence");

  const { data, isLoading } = useQuery({
    queryKey: ["asset-intelligence", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => carregar({ data: { workspaceId: workspaceId! } }),
  });

  if (!workspaceId) {
    return <p className="text-sm text-muted-foreground">Selecione um workspace para continuar.</p>;
  }

  if (isLoading || !data) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Asset Intelligence</h1>
        <p className="text-sm text-muted-foreground">
          Onde falta mídia, quanto pipeline é apresentado sem os ativos que o comprador consulta e
          quais ativos mais sustentam a vitrine. Calculado em {dataHora(data.calculadoEm)}.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Pipeline exposto"
          value={moeda(data.totais.pipelineExposto)}
          icon="warning"
        />
        <StatCard label="Sem capa" value={String(data.totais.semCapa)} icon="hide_image" />
        <StatCard label="Sem galeria" value={String(data.totais.semGaleria)} icon="collections" />
        <StatCard label="SEO pendente" value={String(data.totais.seoPendente)} icon="travel_explore" />
        <StatCard label="Health Score médio" value={`${data.totais.scoreMedio}%`} icon="verified" />
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Icon name="info" size={14} className="mt-0.5 shrink-0" />
        Pipeline exposto é medição, não projeção: é a parcela do pipeline aberto apresentada sem
        capa, galeria, plantas ou tour. {data.totais.comEvidencia} de{" "}
        {data.totais.empreendimentos} empreendimentos têm demanda medida suficiente para o cálculo.
      </p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Qualidade visual × conversão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{forcaLabels[data.qualidade.forca]}</Badge>
            {data.qualidade.r != null && (
              <span className="text-muted-foreground">
                r = {data.qualidade.r.toFixed(2)} · n = {data.qualidade.amostra}
              </span>
            )}
          </p>
          <p>{data.qualidade.leitura}</p>
          <p className="text-xs text-muted-foreground">{data.qualidade.ressalva}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Prioridade de correção</CardTitle>
        </CardHeader>
        <CardContent>
          {data.empreendimentos.length ? (
            <Accordion type="single" collapsible>
              {data.empreendimentos.map((emp) => (
                <LinhaEmpreendimento key={emp.empreendimentoId} emp={emp} />
              ))}
            </Accordion>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum empreendimento cadastrado neste workspace.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ativos que mais contribuem</CardTitle>
        </CardHeader>
        <CardContent>
          {data.ativos.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Ativo</th>
                    <th className="py-2 pr-3 font-medium">Empreendimento</th>
                    <th className="py-2 pr-3 font-medium">Tipo</th>
                    <th className="py-2 pr-3 font-medium">Contribuição</th>
                    <th className="py-2 font-medium">Por quê</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ativos.map((a) => (
                    <tr key={a.id} className="border-t border-border align-top">
                      <td className="py-2 pr-3">
                        <span className="flex items-center gap-2">
                          {a.ehCapa && <Badge variant="secondary">Capa</Badge>}
                          <span className="max-w-[220px] truncate">
                            {a.titulo ?? `Ativo ${a.posicao + 1}`}
                          </span>
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{a.empreendimento}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{a.tipo}</td>
                      <td className="py-2 pr-3 font-medium">{numero(a.contribuicao)}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {a.fatores
                          .filter((f) => f.peso !== 0)
                          .map((f) => `${f.nome}: ${f.detalhe}`)
                          .join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum ativo importado ainda. Comece pela Biblioteca de mídia — sem ativos não há
              contribuição a medir.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
