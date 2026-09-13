import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  createEmpreendimento,
  listEmpreendimentos,
  setEmpreendimentoPublico,
} from "@/lib/platform/empreendimentos.functions";
import {
  EMPREENDIMENTO_SEGMENTOS,
  EMPREENDIMENTO_STATUS,
  empStatusLabels,
  formatBRL,
  segmentoLabels,
  type EmpreendimentoSegmento,
  type EmpreendimentoStatus,
} from "@/lib/platform/comercial";

export const Route = createFileRoute("/app/empreendimentos/")({
  head: () => ({
    meta: [
      { title: "Empreendimentos — Ferragano OS" },
      { name: "description", content: "Portfólio de empreendimentos, unidades e construtoras." },
      { property: "og:title", content: "Empreendimentos — Ferragano OS" },
      { property: "og:description", content: "Portfólio imobiliário da plataforma Ferragano OS." },
    ],
  }),
  component: EmpreendimentosPage,
});

function NovoEmpreendimento({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const criar = useServerFn(createEmpreendimento);
  const [form, setForm] = useState({
    nome: "",
    construtora: "",
    cidade: "",
    uf: "",
    bairro: "",
    status: "lancamento" as EmpreendimentoStatus,
    segmento: "mcmv" as EmpreendimentoSegmento,
    precoMin: "",
    precoMax: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      criar({
        data: {
          workspaceId,
          nome: form.nome,
          construtora: form.construtora,
          cidade: form.cidade,
          uf: form.uf,
          bairro: form.bairro,
          status: form.status,
          segmento: form.segmento,
          precoMin: form.precoMin ? Number(form.precoMin) : null,
          precoMax: form.precoMax ? Number(form.precoMax) : null,
        },
      }),
    onSuccess: () => {
      toast.success("Empreendimento cadastrado.");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["empreendimentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Icon name="add" size={18} />
          Novo empreendimento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo empreendimento</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="emp-nome">Nome</Label>
            <Input
              id="emp-nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="emp-construtora">Construtora</Label>
            <Input
              id="emp-construtora"
              value={form.construtora}
              onChange={(e) => setForm((f) => ({ ...f, construtora: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="emp-cidade">Cidade</Label>
              <Input
                id="emp-cidade"
                value={form.cidade}
                onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp-uf">UF</Label>
              <Input
                id="emp-uf"
                maxLength={2}
                value={form.uf}
                onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as EmpreendimentoStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPREENDIMENTO_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {empStatusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Segmento</Label>
              <Select
                value={form.segmento}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, segmento: v as EmpreendimentoSegmento }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPREENDIMENTO_SEGMENTOS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {segmentoLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="emp-min">Preço mínimo (R$)</Label>
              <Input
                id="emp-min"
                inputMode="numeric"
                value={form.precoMin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, precoMin: e.target.value.replace(/\D/g, "") }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp-max">Preço máximo (R$)</Label>
              <Input
                id="emp-max"
                inputMode="numeric"
                value={form.precoMax}
                onChange={(e) =>
                  setForm((f) => ({ ...f, precoMax: e.target.value.replace(/\D/g, "") }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={form.nome.trim().length < 2 || mutation.isPending}
          >
            {mutation.isPending ? "Salvando…" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmpreendimentosPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const buscar = useServerFn(listEmpreendimentos);
  const alterarPublicacao = useServerFn(setEmpreendimentoPublico);
  const queryClient = useQueryClient();

  const { data: itens, isPending } = useQuery({
    queryKey: ["empreendimentos", workspaceId],
    queryFn: () => buscar({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId),
  });

  const publicar = useMutation({
    mutationFn: (vars: { empreendimentoId: string; publico: boolean }) =>
      alterarPublicacao({ data: { workspaceId: workspaceId!, ...vars } }),
    onSuccess: (row) => {
      toast.success(row.publico ? "Publicado na vitrine do site." : "Removido da vitrine.");
      void queryClient.invalidateQueries({ queryKey: ["empreendimentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Empreendimentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Domínio Imobiliário · {itens?.length ?? 0} no portfólio
          </p>
        </div>
        {workspaceId && <NovoEmpreendimento workspaceId={workspaceId} />}
      </header>

      {isPending ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (itens ?? []).length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <Icon name="apartment" size={32} className="text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum empreendimento cadastrado. Sem portfólio não há simulação nem proposta.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(itens ?? []).map((emp) => (
            <article key={emp.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate font-medium">{emp.nome}</h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {[emp.construtora, emp.bairro, emp.cidade, emp.uf]
                      .filter(Boolean)
                      .join(" · ") || "Sem localização"}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {segmentoLabels[emp.segmento as EmpreendimentoSegmento]}
                </Badge>
              </div>

              <p className="mt-3 text-sm">
                {formatBRL(emp.preco_min ? Number(emp.preco_min) : null)}
                {emp.preco_max ? ` — ${formatBRL(Number(emp.preco_max))}` : ""}
              </p>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{empStatusLabels[emp.status as EmpreendimentoStatus]}</span>
                <span>
                  {emp.unidadesDisponiveis}/{emp.unidadesTotal} unidades
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <Link
                  to="/app/empreendimentos/$id/unidades"
                  params={{ id: emp.id }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Ver unidades
                  <Icon name="arrow_forward" size={14} />
                </Link>
                <Link
                  to="/app/empreendimentos/$id/property"
                  params={{ id: emp.id }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Estrutura e conhecimento
                  <Icon name="arrow_forward" size={14} />
                </Link>
              </div>

              {workspaceId && (
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <Label
                    htmlFor={`pub-${emp.id}`}
                    className="text-xs font-normal text-muted-foreground"
                  >
                    Publicar no site
                  </Label>
                  <Switch
                    id={`pub-${emp.id}`}
                    checked={Boolean(emp.publico)}
                    onCheckedChange={(v) =>
                      publicar.mutate({ empreendimentoId: emp.id, publico: v })
                    }
                    disabled={publicar.isPending}
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
