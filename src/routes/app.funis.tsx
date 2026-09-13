import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "@/hooks/use-session";
import {
  createPipeline,
  deleteStage,
  ensureDefaultPipeline,
  listPipelines,
  upsertStage,
} from "@/lib/platform/pipelines.functions";
import {
  STAGE_CORES,
  STAGE_TIPOS,
  corDaEtapa,
  stageTipoLabels,
  type StageCor,
  type StageTipo,
} from "@/lib/platform/sales";

export const Route = createFileRoute("/app/funis")({
  head: () => ({
    meta: [
      { title: "Funis de venda — Ferragano One" },
      {
        name: "description",
        content:
          "Configure funis, etapas, SLA, checklist e critérios de saída do processo comercial.",
      },
      { property: "og:title", content: "Funis de venda — Ferragano One" },
      {
        property: "og:description",
        content: "Stage Engine configurável por workspace no Ferragano One.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FunisPage,
});

type FormEtapa = {
  stageId?: string;
  nome: string;
  ordem: number;
  cor: StageCor;
  tipo: StageTipo;
  probabilidade: number;
  slaHoras: string;
  checklist: string;
  criteriosSaida: string;
};

const etapaVazia = (ordem: number): FormEtapa => ({
  nome: "",
  ordem,
  cor: "slate",
  tipo: "aberto",
  probabilidade: 0,
  slaHoras: "",
  checklist: "",
  criteriosSaida: "",
});

function FunisPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const queryClient = useQueryClient();

  const buscar = useServerFn(listPipelines);
  const criarFunil = useServerFn(createPipeline);
  const semear = useServerFn(ensureDefaultPipeline);
  const salvarEtapa = useServerFn(upsertStage);
  const excluirEtapa = useServerFn(deleteStage);

  const [pipelineAtivo, setPipelineAtivo] = useState<string | null>(null);
  const [novoFunil, setNovoFunil] = useState("");
  const [form, setForm] = useState<FormEtapa | null>(null);

  const { data: funis, isPending } = useQuery({
    queryKey: ["pipelines", workspaceId],
    queryFn: () => buscar({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId),
  });

  const funil = useMemo(
    () => (funis ?? []).find((f) => f.id === (pipelineAtivo ?? funis?.[0]?.id)) ?? null,
    [funis, pipelineAtivo],
  );

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    void queryClient.invalidateQueries({ queryKey: ["sales-board"] });
  };

  const mSemear = useMutation({
    mutationFn: () => semear({ data: { workspaceId: workspaceId! } }),
    onSuccess: () => {
      toast.success("Funil padrão criado.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mFunil = useMutation({
    mutationFn: () => criarFunil({ data: { workspaceId: workspaceId!, nome: novoFunil } }),
    onSuccess: () => {
      setNovoFunil("");
      toast.success("Funil criado.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mEtapa = useMutation({
    mutationFn: (f: FormEtapa) =>
      salvarEtapa({
        data: {
          workspaceId: workspaceId!,
          pipelineId: funil!.id,
          stageId: f.stageId,
          nome: f.nome,
          ordem: f.ordem,
          cor: f.cor,
          tipo: f.tipo,
          probabilidade: f.probabilidade,
          slaHoras: f.slaHoras ? Number(f.slaHoras) : null,
          checklist: f.checklist
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          criteriosSaida: f.criteriosSaida
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      setForm(null);
      toast.success("Etapa salva.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mExcluir = useMutation({
    mutationFn: (stageId: string) => excluirEtapa({ data: { workspaceId: workspaceId!, stageId } }),
    onSuccess: () => {
      toast.success("Etapa excluída.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) return <Skeleton className="h-72 w-full" />;

  return (
    <section>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Funis de venda
          </h1>
          <p className="text-sm text-muted-foreground">
            Sales Engine · cada etapa carrega SLA, checklist e critérios de saída
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-52">
            <Label htmlFor="novo-funil" className="text-xs">
              Novo funil
            </Label>
            <Input
              id="novo-funil"
              value={novoFunil}
              onChange={(e) => setNovoFunil(e.target.value)}
              placeholder="Ex.: Investidor"
            />
          </div>
          <Button
            onClick={() => mFunil.mutate()}
            disabled={novoFunil.trim().length < 2 || mFunil.isPending}
          >
            <Icon name="add" size={18} />
            Criar
          </Button>
        </div>
      </header>

      {(funis ?? []).length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum funil configurado neste workspace.</p>
          <Button className="mt-4" onClick={() => mSemear.mutate()} disabled={mSemear.isPending}>
            <Icon name="auto_awesome" size={18} />
            Criar funil padrão
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {(funis ?? []).map((f) => (
              <Button
                key={f.id}
                variant={f.id === funil?.id ? "default" : "outline"}
                size="sm"
                onClick={() => setPipelineAtivo(f.id)}
              >
                {f.nome}
                {f.padrao && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    padrão
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          <div className="mt-6 space-y-2">
            {(funil?.etapas ?? []).map((etapa) => (
              <article
                key={etapa.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <span className={`h-8 w-1.5 rounded-full ${corDaEtapa(etapa.cor)}`} />
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-medium">
                    {etapa.ordem}. {etapa.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stageTipoLabels[etapa.tipo as StageTipo]} · {etapa.probabilidade}% ·{" "}
                    {etapa.sla_horas ? `SLA ${etapa.sla_horas}h` : "sem SLA"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {etapa.checklist.length > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {etapa.checklist.length} checklist
                    </Badge>
                  )}
                  {etapa.criterios_saida.length > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {etapa.criterios_saida.length} critérios
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm({
                        stageId: etapa.id,
                        nome: etapa.nome,
                        ordem: etapa.ordem,
                        cor: etapa.cor as StageCor,
                        tipo: etapa.tipo as StageTipo,
                        probabilidade: etapa.probabilidade,
                        slaHoras: etapa.sla_horas ? String(etapa.sla_horas) : "",
                        checklist: etapa.checklist.join("\n"),
                        criteriosSaida: etapa.criterios_saida.join("\n"),
                      })
                    }
                  >
                    <Icon name="edit" size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => mExcluir.mutate(etapa.id)}
                    aria-label={`Excluir etapa ${etapa.nome}`}
                  >
                    <Icon name="delete" size={18} />
                  </Button>
                </div>
              </article>
            ))}

            <Button
              variant="outline"
              onClick={() => setForm(etapaVazia((funil?.etapas.length ?? 0) + 1))}
              disabled={!funil}
            >
              <Icon name="add" size={18} />
              Nova etapa
            </Button>
          </div>
        </>
      )}

      <Dialog open={Boolean(form)} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.stageId ? "Editar etapa" : "Nova etapa"}</DialogTitle>
            <DialogDescription>Regras da etapa ficam no dado, não no código.</DialogDescription>
          </DialogHeader>

          {form && (
            <div className="grid gap-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="etapa-nome">Nome</Label>
                  <Input
                    id="etapa-nome"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="etapa-ordem">Ordem</Label>
                  <Input
                    id="etapa-ordem"
                    type="number"
                    value={form.ordem}
                    onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v) => setForm({ ...form, tipo: v as StageTipo })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_TIPOS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {stageTipoLabels[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cor</Label>
                  <Select
                    value={form.cor}
                    onValueChange={(v) => setForm({ ...form, cor: v as StageCor })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_CORES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="etapa-prob">Probabilidade (%)</Label>
                  <Input
                    id="etapa-prob"
                    type="number"
                    value={form.probabilidade}
                    onChange={(e) => setForm({ ...form, probabilidade: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="etapa-sla">SLA (horas)</Label>
                  <Input
                    id="etapa-sla"
                    type="number"
                    value={form.slaHoras}
                    placeholder="opcional"
                    onChange={(e) => setForm({ ...form, slaHoras: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="etapa-checklist">Checklist (um por linha)</Label>
                <Textarea
                  id="etapa-checklist"
                  rows={3}
                  value={form.checklist}
                  onChange={(e) => setForm({ ...form, checklist: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="etapa-criterios">Critérios de saída (um por linha)</Label>
                <Textarea
                  id="etapa-criterios"
                  rows={3}
                  placeholder={"documentos\nrenda comprovada\nsimulação"}
                  value={form.criteriosSaida}
                  onChange={(e) => setForm({ ...form, criteriosSaida: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => form && mEtapa.mutate(form)}
              disabled={!form?.nome.trim() || mEtapa.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
