import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { getEmpreendimento } from "@/lib/platform/empreendimentos.functions";
import {
  createPropertyKnowledge,
  createPropertyMedia,
  createRelease,
  createTower,
  deletePropertyKnowledge,
  deletePropertyMedia,
  listPropertyKnowledge,
  listPropertyMedia,
  listReleases,
  listTowers,
  setReleaseStatus,
} from "@/lib/platform/property.functions";
import {
  KNOWLEDGE_TIPOS,
  MEDIA_TIPOS,
  RELEASE_STATUS,
  knowledgeTipoIcones,
  knowledgeTipoLabels,
  mediaTipoIcones,
  mediaTipoLabels,
  releaseStatusLabels,
  type KnowledgeTipo,
  type MediaTipo,
  type ReleaseStatus,
} from "@/lib/platform/property";

export const Route = createFileRoute("/app/empreendimentos/$id/property")({
  head: () => ({
    meta: [
      { title: "Estrutura e conhecimento — Ferragano One" },
      {
        name: "description",
        content: "Fases, torres, conhecimento comercial e materiais do empreendimento.",
      },
      { property: "og:title", content: "Estrutura e conhecimento — Ferragano One" },
      {
        property: "og:description",
        content: "Property Domain: releases, torres, FAQ, scripts, objeções e materiais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PropertyPage,
});

/* ------------------------------- FASES ------------------------------- */

function Fases({ workspaceId, empId }: { workspaceId: string; empId: string }) {
  const queryClient = useQueryClient();
  const buscar = useServerFn(listReleases);
  const criar = useServerFn(createRelease);
  const alterarStatus = useServerFn(setReleaseStatus);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    ordem: "1",
    status: "planejado" as ReleaseStatus,
    lancamentoEm: "",
    entregaPrevista: "",
  });

  const { data: fases, isPending } = useQuery({
    queryKey: ["releases", workspaceId, empId],
    queryFn: () => buscar({ data: { workspaceId, empreendimentoId: empId } }),
  });

  const criarMutation = useMutation({
    mutationFn: () =>
      criar({
        data: {
          workspaceId,
          empreendimentoId: empId,
          nome: form.nome,
          ordem: Number(form.ordem) || 1,
          status: form.status,
          lancamentoEm: form.lancamentoEm,
          entregaPrevista: form.entregaPrevista,
        },
      }),
    onSuccess: () => {
      toast.success("Fase criada.");
      setOpen(false);
      setForm((f) => ({ ...f, nome: "" }));
      void queryClient.invalidateQueries({ queryKey: ["releases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: (v: { releaseId: string; status: ReleaseStatus }) =>
      alterarStatus({ data: { workspaceId, ...v } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["releases"] });
      void queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Uma construtora lança fases no mesmo empreendimento. Aqui elas convivem sem duplicar o
          projeto.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Icon name="add" size={18} />
              Nova fase
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova fase</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="fase-nome">Nome</Label>
                <Input
                  id="fase-nome"
                  placeholder="Ex.: Fase 2"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fase-ordem">Ordem</Label>
                <Input
                  id="fase-ordem"
                  inputMode="numeric"
                  value={form.ordem}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ordem: e.target.value.replace(/\D/g, "") }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as ReleaseStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELEASE_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {releaseStatusLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fase-lanc">Lançamento</Label>
                <Input
                  id="fase-lanc"
                  type="date"
                  value={form.lancamentoEm}
                  onChange={(e) => setForm((f) => ({ ...f, lancamentoEm: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fase-entrega">Entrega prevista</Label>
                <Input
                  id="fase-entrega"
                  type="date"
                  value={form.entregaPrevista}
                  onChange={(e) => setForm((f) => ({ ...f, entregaPrevista: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => criarMutation.mutate()}
                disabled={!form.nome.trim() || criarMutation.isPending}
              >
                {criarMutation.isPending ? "Salvando…" : "Criar fase"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isPending ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : !fases?.length ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma fase cadastrada.
        </p>
      ) : (
        <ul className="space-y-2">
          {fases.map((fase) => (
            <li
              key={fase.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  <span className="text-muted-foreground">{fase.ordem}.</span> {fase.nome}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fase.lancamento_em
                    ? `Lançamento ${fase.lancamento_em}`
                    : "Sem data de lançamento"}
                  {fase.entrega_prevista ? ` · Entrega ${fase.entrega_prevista}` : ""}
                </p>
              </div>
              <Select
                value={fase.status}
                onValueChange={(v) =>
                  statusMutation.mutate({ releaseId: fase.id, status: v as ReleaseStatus })
                }
              >
                <SelectTrigger className="w-[170px]" aria-label={`Status da fase ${fase.nome}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELEASE_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {releaseStatusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------- TORRES ------------------------------- */

function Torres({ workspaceId, empId }: { workspaceId: string; empId: string }) {
  const queryClient = useQueryClient();
  const buscar = useServerFn(listTowers);
  const buscarFases = useServerFn(listReleases);
  const criar = useServerFn(createTower);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", andares: "", unidadesPorAndar: "", releaseId: "" });

  const { data: torres, isPending } = useQuery({
    queryKey: ["towers", workspaceId, empId],
    queryFn: () => buscar({ data: { workspaceId, empreendimentoId: empId } }),
  });

  const { data: fases } = useQuery({
    queryKey: ["releases", workspaceId, empId],
    queryFn: () => buscarFases({ data: { workspaceId, empreendimentoId: empId } }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      criar({
        data: {
          workspaceId,
          empreendimentoId: empId,
          nome: form.nome,
          andares: form.andares ? Number(form.andares) : null,
          unidadesPorAndar: form.unidadesPorAndar ? Number(form.unidadesPorAndar) : null,
          releaseId: form.releaseId || null,
        },
      }),
    onSuccess: () => {
      toast.success("Torre criada.");
      setOpen(false);
      setForm({ nome: "", andares: "", unidadesPorAndar: "", releaseId: "" });
      void queryClient.invalidateQueries({ queryKey: ["towers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Torre → Andar → Unidade. O andar é derivado da unidade, não precisa de cadastro próprio.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Icon name="add" size={18} />
              Nova torre
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova torre</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="torre-nome">Nome</Label>
                <Input
                  id="torre-nome"
                  placeholder="Ex.: Torre A"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="torre-andares">Andares</Label>
                <Input
                  id="torre-andares"
                  inputMode="numeric"
                  value={form.andares}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, andares: e.target.value.replace(/\D/g, "") }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="torre-upa">Unid. por andar</Label>
                <Input
                  id="torre-upa"
                  inputMode="numeric"
                  value={form.unidadesPorAndar}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unidadesPorAndar: e.target.value.replace(/\D/g, "") }))
                  }
                />
              </div>
              {fases?.length ? (
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label>Fase</Label>
                  <Select
                    value={form.releaseId}
                    onValueChange={(v) => setForm((f) => ({ ...f, releaseId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sem fase" />
                    </SelectTrigger>
                    <SelectContent>
                      {fases.map((fase) => (
                        <SelectItem key={fase.id} value={fase.id}>
                          {fase.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                onClick={() => mutation.mutate()}
                disabled={!form.nome.trim() || mutation.isPending}
              >
                {mutation.isPending ? "Salvando…" : "Criar torre"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isPending ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : !torres?.length ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma torre cadastrada.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {torres.map((t) => (
            <article key={t.id} className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-medium">{t.nome}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.andares ? `${t.andares} andares` : "Andares não informados"}
                {t.unidades_por_andar ? ` · ${t.unidades_por_andar} unid./andar` : ""}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------- CONHECIMENTO ---------------------------- */

function Conhecimento({ workspaceId, empId }: { workspaceId: string; empId: string }) {
  const queryClient = useQueryClient();
  const buscar = useServerFn(listPropertyKnowledge);
  const criar = useServerFn(createPropertyKnowledge);
  const remover = useServerFn(deletePropertyKnowledge);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tipo: "faq" as KnowledgeTipo,
    titulo: "",
    corpo: "",
    publico: false,
  });

  const { data: itens, isPending } = useQuery({
    queryKey: ["property-knowledge", workspaceId, empId],
    queryFn: () => buscar({ data: { workspaceId, empreendimentoId: empId } }),
  });

  const criarMutation = useMutation({
    mutationFn: () =>
      criar({
        data: {
          workspaceId,
          empreendimentoId: empId,
          tipo: form.tipo,
          titulo: form.titulo,
          corpo: form.corpo,
          ordem: 1,
          publico: form.publico,
        },
      }),
    onSuccess: () => {
      toast.success("Conteúdo salvo.");
      setOpen(false);
      setForm((f) => ({ ...f, titulo: "", corpo: "" }));
      void queryClient.invalidateQueries({ queryKey: ["property-knowledge"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removerMutation = useMutation({
    mutationFn: (id: string) => remover({ data: { workspaceId, id } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["property-knowledge"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Base que alimenta o corretor hoje e a Ferragano IA amanhã: FAQ, scripts, diferenciais,
          objeções, concorrentes e bairro.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Icon name="add" size={18} />
              Novo conteúdo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo conteúdo</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as KnowledgeTipo }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWLEDGE_TIPOS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {knowledgeTipoLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pk-titulo">Título</Label>
                <Input
                  id="pk-titulo"
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pk-corpo">Conteúdo</Label>
                <Textarea
                  id="pk-corpo"
                  rows={6}
                  value={form.corpo}
                  onChange={(e) => setForm((f) => ({ ...f, corpo: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="pk-publico" className="text-sm font-normal">
                  Exibir no site público
                </Label>
                <Switch
                  id="pk-publico"
                  checked={form.publico}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, publico: v }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => criarMutation.mutate()}
                disabled={form.titulo.trim().length < 2 || criarMutation.isPending}
              >
                {criarMutation.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isPending ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : !itens?.length ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum conteúdo cadastrado.
        </p>
      ) : (
        <ul className="space-y-2">
          {itens.map((item) => (
            <li key={item.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <Icon
                      name={knowledgeTipoIcones[item.tipo as KnowledgeTipo]}
                      size={16}
                      className="text-muted-foreground"
                    />
                    {item.titulo}
                  </p>
                  {item.corpo ? (
                    <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                      {item.corpo}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {knowledgeTipoLabels[item.tipo as KnowledgeTipo]}
                  </Badge>
                  {item.publico ? <Badge className="text-[10px]">Público</Badge> : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${item.titulo}`}
                    onClick={() => removerMutation.mutate(item.id)}
                  >
                    <Icon name="delete" size={18} />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------ MATERIAIS ------------------------------ */

function Materiais({ workspaceId, empId }: { workspaceId: string; empId: string }) {
  const queryClient = useQueryClient();
  const buscar = useServerFn(listPropertyMedia);
  const criar = useServerFn(createPropertyMedia);
  const remover = useServerFn(deletePropertyMedia);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tipo: "imagem" as MediaTipo,
    titulo: "",
    url: "",
    publico: false,
  });

  const { data: itens, isPending } = useQuery({
    queryKey: ["property-media", workspaceId, empId],
    queryFn: () => buscar({ data: { workspaceId, empreendimentoId: empId } }),
  });

  const criarMutation = useMutation({
    mutationFn: () =>
      criar({
        data: {
          workspaceId,
          empreendimentoId: empId,
          tipo: form.tipo,
          titulo: form.titulo,
          url: form.url,
          ordem: 1,
          publico: form.publico,
        },
      }),
    onSuccess: () => {
      toast.success("Material salvo.");
      setOpen(false);
      setForm((f) => ({ ...f, titulo: "", url: "" }));
      void queryClient.invalidateQueries({ queryKey: ["property-media"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removerMutation = useMutation({
    mutationFn: (id: string) => remover({ data: { workspaceId, id } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["property-media"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Imagens, vídeos, PDFs, plantas e tour. O material fica ligado ao empreendimento, não à
          conversa.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Icon name="add" size={18} />
              Novo material
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo material</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as MediaTipo }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDIA_TIPOS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {mediaTipoLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pm-titulo">Título</Label>
                <Input
                  id="pm-titulo"
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pm-url">URL</Label>
                <Input
                  id="pm-url"
                  placeholder="https://…"
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="pm-publico" className="text-sm font-normal">
                  Exibir no site público
                </Label>
                <Switch
                  id="pm-publico"
                  checked={form.publico}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, publico: v }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => criarMutation.mutate()}
                disabled={
                  form.titulo.trim().length < 2 || !form.url.trim() || criarMutation.isPending
                }
              >
                {criarMutation.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isPending ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : !itens?.length ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum material cadastrado.
        </p>
      ) : (
        <ul className="space-y-2">
          {itens.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
            >
              <a
                href={m.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-2 text-sm hover:underline"
              >
                <Icon
                  name={mediaTipoIcones[m.tipo as MediaTipo]}
                  size={18}
                  className="text-muted-foreground"
                />
                <span className="truncate">{m.titulo}</span>
              </a>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {mediaTipoLabels[m.tipo as MediaTipo]}
                </Badge>
                {m.publico ? <Badge className="text-[10px]">Público</Badge> : null}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover ${m.titulo}`}
                  onClick={() => removerMutation.mutate(m.id)}
                >
                  <Icon name="delete" size={18} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------- PÁGINA -------------------------------- */

function PropertyPage() {
  const { id } = Route.useParams();
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const fetchEmp = useServerFn(getEmpreendimento);

  const { data: emp } = useQuery({
    queryKey: ["empreendimento", workspaceId, id],
    queryFn: () => fetchEmp({ data: { workspaceId: workspaceId!, empreendimentoId: id } }),
    enabled: Boolean(workspaceId),
  });

  if (!workspaceId) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/app/empreendimentos" className="hover:text-foreground">
          Empreendimentos
        </Link>
        <Icon name="chevron_right" size={16} />
        <span className="text-foreground">{emp?.nome ?? "Estrutura"}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Estrutura e conhecimento {emp?.nome ? `— ${emp.nome}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Property Domain · Construtora → Empreendimento → Fase → Torre → Unidade
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/app/empreendimentos/$id/unidades" params={{ id }}>
            <Icon name="grid_view" size={18} />
            Ver unidades
          </Link>
        </Button>
      </header>

      <Tabs defaultValue="fases">
        <TabsList>
          <TabsTrigger value="fases">Fases</TabsTrigger>
          <TabsTrigger value="torres">Torres</TabsTrigger>
          <TabsTrigger value="conhecimento">Conhecimento</TabsTrigger>
          <TabsTrigger value="materiais">Materiais</TabsTrigger>
        </TabsList>
        <TabsContent value="fases" className="mt-4">
          <Fases workspaceId={workspaceId} empId={id} />
        </TabsContent>
        <TabsContent value="torres" className="mt-4">
          <Torres workspaceId={workspaceId} empId={id} />
        </TabsContent>
        <TabsContent value="conhecimento" className="mt-4">
          <Conhecimento workspaceId={workspaceId} empId={id} />
        </TabsContent>
        <TabsContent value="materiais" className="mt-4">
          <Materiais workspaceId={workspaceId} empId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
