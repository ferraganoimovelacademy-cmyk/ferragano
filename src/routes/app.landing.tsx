import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { slugify } from "@/lib/platform/comercial";
import { listEmpreendimentos } from "@/lib/platform/empreendimentos.functions";
import {
  createLanding,
  deleteLanding,
  listLandings,
  setLandingAtiva,
} from "@/lib/platform/landing.functions";

export const Route = createFileRoute("/app/landing")({
  head: () => ({
    meta: [
      { title: "Landing pages — Ferragano OS" },
      {
        name: "description",
        content: "Crie páginas de captação por campanha e acompanhe os leads gerados.",
      },
      { property: "og:title", content: "Landing pages — Ferragano OS" },
      { property: "og:description", content: "Páginas de captação por campanha." },
    ],
  }),
  component: LandingPagesPage,
});

const SEM_EMP = "nenhum";

function NovaLanding({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const criar = useServerFn(createLanding);
  const buscarEmps = useServerFn(listEmpreendimentos);

  const { data: emps } = useQuery({
    queryKey: ["empreendimentos", workspaceId],
    queryFn: () => buscarEmps({ data: { workspaceId } }),
  });

  const [form, setForm] = useState({
    titulo: "",
    slug: "",
    subtitulo: "",
    descricao: "",
    ctaTexto: "",
    heroUrl: "",
    campanha: "",
    empreendimentoId: SEM_EMP,
  });

  const mutation = useMutation({
    mutationFn: () =>
      criar({
        data: {
          workspaceId,
          titulo: form.titulo.trim(),
          slug: form.slug.trim(),
          subtitulo: form.subtitulo.trim(),
          descricao: form.descricao.trim(),
          ctaTexto: form.ctaTexto.trim(),
          heroUrl: form.heroUrl.trim(),
          campanha: form.campanha.trim(),
          empreendimentoId: form.empreendimentoId === SEM_EMP ? null : form.empreendimentoId,
        },
      }),
    onSuccess: () => {
      toast.success("Landing page criada. Publique quando estiver pronta.");
      setOpen(false);
      setForm((f) => ({ ...f, titulo: "", slug: "", subtitulo: "", descricao: "" }));
      void queryClient.invalidateQueries({ queryKey: ["landings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const slugPreview = slugify(form.slug || form.titulo || "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Icon name="add" size={18} />
          Nova landing page
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova landing page</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="lp-titulo">Título</Label>
            <Input
              id="lp-titulo"
              value={form.titulo}
              maxLength={140}
              placeholder="Ex.: Lançamento Vista Parque — 2 dorm. com lazer completo"
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lp-slug">Endereço da página</Label>
            <Input
              id="lp-slug"
              value={form.slug}
              maxLength={120}
              placeholder="vista-parque"
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              /lp/{slugPreview || "endereco-da-pagina"}
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lp-sub">Subtítulo</Label>
            <Input
              id="lp-sub"
              value={form.subtitulo}
              maxLength={200}
              onChange={(e) => setForm((f) => ({ ...f, subtitulo: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lp-desc">Texto de apoio</Label>
            <Textarea
              id="lp-desc"
              rows={4}
              maxLength={2000}
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="lp-cta">Texto do botão</Label>
              <Input
                id="lp-cta"
                value={form.ctaTexto}
                maxLength={60}
                placeholder="Quero falar com um especialista"
                onChange={(e) => setForm((f) => ({ ...f, ctaTexto: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lp-camp">Campanha</Label>
              <Input
                id="lp-camp"
                value={form.campanha}
                maxLength={80}
                placeholder="meta-ads-julho"
                onChange={(e) => setForm((f) => ({ ...f, campanha: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lp-hero">Imagem de destaque (URL)</Label>
            <Input
              id="lp-hero"
              value={form.heroUrl}
              maxLength={500}
              placeholder="https://..."
              onChange={(e) => setForm((f) => ({ ...f, heroUrl: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Empreendimento vinculado</Label>
            <Select
              value={form.empreendimentoId}
              onValueChange={(v) => setForm((f) => ({ ...f, empreendimentoId: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_EMP}>Nenhum (captação geral)</SelectItem>
                {(emps ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Unidades e preços só aparecem se o empreendimento estiver publicado no site.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (form.titulo.trim().length < 3) return toast.error("Informe o título.");
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Criando..." : "Criar landing page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LandingPagesPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const queryClient = useQueryClient();

  const buscar = useServerFn(listLandings);
  const publicar = useServerFn(setLandingAtiva);
  const excluir = useServerFn(deleteLanding);

  const { data: itens, isPending } = useQuery({
    queryKey: ["landings", workspaceId],
    queryFn: () => buscar({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId),
  });

  const alterar = useMutation({
    mutationFn: (v: { landingId: string; ativa: boolean }) =>
      publicar({ data: { workspaceId: workspaceId!, ...v } }),
    onSuccess: (row) => {
      toast.success(row.ativa ? "Landing page no ar." : "Landing page despublicada.");
      void queryClient.invalidateQueries({ queryKey: ["landings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: (landingId: string) => excluir({ data: { workspaceId: workspaceId!, landingId } }),
    onSuccess: () => {
      toast.success("Landing page excluída.");
      void queryClient.invalidateQueries({ queryKey: ["landings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Landing pages
          </h1>
          <p className="text-sm text-muted-foreground">
            Domínio Marketing · {itens?.length ?? 0} páginas de captação
          </p>
        </div>
        {workspaceId && <NovaLanding workspaceId={workspaceId} />}
      </header>

      {isPending ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : (itens ?? []).length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <Icon name="web" size={32} className="text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma landing page criada. Toda campanha paga precisa de uma página própria para medir
            o custo por lead.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(itens ?? []).map((lp) => (
            <article
              key={lp.id}
              className="flex flex-col rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="min-w-0 font-medium">{lp.titulo}</h2>
                <Badge
                  variant={lp.ativa ? "default" : "secondary"}
                  className="shrink-0 text-[10px]"
                >
                  {lp.ativa ? "No ar" : "Rascunho"}
                </Badge>
              </div>
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">/lp/{lp.slug}</p>
              {lp.campanha && (
                <p className="mt-2 text-xs text-muted-foreground">Campanha: {lp.campanha}</p>
              )}
              <p className="mt-3 text-sm">
                <span className="font-display text-xl font-semibold">{lp.leads}</span>{" "}
                <span className="text-muted-foreground">leads gerados</span>
              </p>

              <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`lp-${lp.id}`}
                    checked={lp.ativa}
                    onCheckedChange={(v) => alterar.mutate({ landingId: lp.id, ativa: v })}
                    disabled={alterar.isPending}
                  />
                  <Label
                    htmlFor={`lp-${lp.id}`}
                    className="text-xs font-normal text-muted-foreground"
                  >
                    Publicar
                  </Label>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`/lp/${lp.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Abrir landing page"
                  >
                    <Icon name="open_in_new" size={18} />
                  </a>
                  <button
                    type="button"
                    onClick={() => remover.mutate(lp.id)}
                    disabled={remover.isPending}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Excluir landing page"
                  >
                    <Icon name="delete" size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
