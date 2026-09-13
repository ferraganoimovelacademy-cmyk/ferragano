import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/platform/StatCard";
import { useSession } from "@/hooks/use-session";
import { MediaAssetManager, type EmpMidia } from "@/components/admin/MediaAssetManager";
import { MediaImportWizard } from "@/components/admin/MediaImportWizard";
import { listBibliotecaMidia } from "@/lib/platform/media.functions";
import { pesoLegivel } from "@/lib/platform/media";

/**
 * Sprint UI 04.2 — Biblioteca de Mídia Cury.
 * Importação em lote, organização automática, SEO das imagens, Health Score
 * e sincronização da vitrine pública (capa, galeria, Open Graph, sitemap).
 */
export const Route = createFileRoute("/app/midia")({
  head: () => ({
    meta: [
      { title: "Biblioteca de Mídia Cury — Ferragano OS" },
      {
        name: "description",
        content:
          "Importação, organização e qualidade dos ativos oficiais dos empreendimentos: capa, galeria, plantas, vídeo, tour e PDF.",
      },
      { property: "og:title", content: "Biblioteca de Mídia Cury — Ferragano OS" },
      {
        property: "og:description",
        content: "Asset Intelligence: Health Score da mídia oficial por empreendimento.",
      },
    ],
  }),
  component: MidiaPage,
});

function MidiaPage() {
  const { data: sessao } = useSession();
  const workspaceId = sessao?.workspace?.id ?? null;
  const carregar = useServerFn(listBibliotecaMidia);

  const { data, isLoading } = useQuery({
    queryKey: ["biblioteca-midia", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => carregar({ data: { workspaceId: workspaceId! } }),
  });

  if (!workspaceId) {
    return <p className="text-sm text-muted-foreground">Selecione um workspace para continuar.</p>;
  }

  const empreendimentos = (data?.empreendimentos ?? []) as EmpMidia[];

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Biblioteca de Mídia Cury</h1>
          <p className="text-sm text-muted-foreground">
            Ativos oficiais por empreendimento. Trocar a capa aqui atualiza hero, cards,
            comparador, Open Graph, JSON-LD e sitemap automaticamente.
          </p>
        </div>
        <MediaImportWizard
          workspaceId={workspaceId}
          empreendimentos={empreendimentos.map((e) => ({ id: e.id, nome: e.nome, slug: e.slug }))}
        />
      </header>

      {isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Arquivos" value={String(data?.totais.arquivos ?? 0)} icon="perm_media" />
            <StatCard label="Peso total" value={pesoLegivel(data?.totais.bytes ?? 0)} icon="storage" />
            <StatCard label="Sem capa" value={String(data?.totais.semCapa ?? 0)} icon="hide_image" />
            <StatCard
              label="SEO pendente"
              value={String(data?.totais.seoPendente ?? 0)}
              icon="travel_explore"
            />
            <StatCard
              label="Health Score médio"
              value={`${data?.totais.scoreMedio ?? 0}%`}
              icon="verified"
            />
          </div>

          <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <Icon name="info" size={14} className="mt-0.5" />
            Uso de material oficial da construtora conforme política interna. Arquivos enviados
            ficam em <code className="mx-1">cury-media</code>; URLs oficiais também são aceitas e
            entram na mesma esteira de SEO e Health Score.
          </p>

          <MediaAssetManager workspaceId={workspaceId} empreendimentos={empreendimentos} />
        </>
      )}
    </div>
  );
}
