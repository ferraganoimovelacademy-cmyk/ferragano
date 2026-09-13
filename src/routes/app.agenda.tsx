import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  createCompromisso,
  listCompromissos,
  setCompromissoStatus,
} from "@/lib/platform/agenda.functions";
import { listPeople } from "@/lib/platform/pessoas.functions";
import {
  COMPROMISSO_TIPOS,
  chaveDoDia,
  estaAtrasado,
  formatDataHora,
  formatDiaLongo,
  statusLabels,
  tipoIcones,
  tipoLabels,
  type CompromissoStatus,
  type CompromissoTipo,
} from "@/lib/platform/agenda";

export const Route = createFileRoute("/app/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Ferragano OS" },
      { name: "description", content: "Visitas, follow-ups e compromissos comerciais." },
      { property: "og:title", content: "Agenda — Ferragano OS" },
      { property: "og:description", content: "Agenda comercial da plataforma Ferragano OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendaPage,
});

/** Converte valor de <input type="datetime-local"> (hora local) em ISO. */
function localParaIso(valor: string) {
  return new Date(valor).toISOString();
}

function agoraLocal(offsetHoras = 1) {
  const d = new Date(Date.now() + offsetHoras * 3600_000);
  d.setMinutes(0, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function NovoCompromissoDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const criar = useServerFn(createCompromisso);
  const buscarPessoas = useServerFn(listPeople);

  const { data: pessoas } = useQuery({
    queryKey: ["people", "agenda", workspaceId],
    queryFn: () => buscarPessoas({ data: { workspaceId } }),
    enabled: open,
  });

  const vazio = {
    titulo: "",
    descricao: "",
    tipo: "followup" as CompromissoTipo,
    inicioEm: agoraLocal(),
    personId: "",
  };
  const [form, setForm] = useState(vazio);

  const mutation = useMutation({
    mutationFn: () =>
      criar({
        data: {
          workspaceId,
          titulo: form.titulo,
          descricao: form.descricao,
          tipo: form.tipo,
          inicioEm: localParaIso(form.inicioEm),
          entity: form.personId ? "person" : null,
          entityId: form.personId || null,
        },
      }),
    onSuccess: () => {
      toast.success("Compromisso agendado.");
      setOpen(false);
      setForm(vazio);
      void queryClient.invalidateQueries({ queryKey: ["compromissos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Icon name="event_available" size={18} />
          Novo compromisso
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo compromisso</DialogTitle>
          <DialogDescription>
            Vincule a um lead para que a conclusão atualize o último contato do funil.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="Visita ao decorado"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as CompromissoTipo }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPROMISSO_TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {tipoLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inicio">Quando</Label>
              <Input
                id="inicio"
                type="datetime-local"
                value={form.inicioEm}
                onChange={(e) => setForm((f) => ({ ...f, inicioEm: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Pessoa vinculada</Label>
            <Select
              value={form.personId || "nenhum"}
              onValueChange={(v) => setForm((f) => ({ ...f, personId: v === "nenhum" ? "" : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Nenhum</SelectItem>
                {(pessoas ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              rows={3}
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={form.titulo.trim().length < 2 || !form.inicioEm || mutation.isPending}
          >
            {mutation.isPending ? "Salvando…" : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AgendaPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState<CompromissoStatus | "todos">("pendente");
  const [apenasMeus, setApenasMeus] = useState(false);

  const buscar = useServerFn(listCompromissos);
  const alterarStatus = useServerFn(setCompromissoStatus);

  const { data: compromissos, isPending } = useQuery({
    queryKey: ["compromissos", workspaceId, filtro, apenasMeus],
    queryFn: () =>
      buscar({
        data: {
          workspaceId: workspaceId!,
          status: filtro === "todos" ? undefined : filtro,
          apenasMeus,
        },
      }),
    enabled: Boolean(workspaceId),
  });

  const mutation = useMutation({
    mutationFn: (vars: { compromissoId: string; status: CompromissoStatus }) =>
      alterarStatus({ data: { workspaceId: workspaceId!, ...vars } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["compromissos"] });
      void queryClient.invalidateQueries({ queryKey: ["people"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dias = useMemo(() => {
    const mapa = new Map<string, NonNullable<typeof compromissos>>();
    for (const c of compromissos ?? []) {
      const chave = chaveDoDia(c.inicio_em);
      const lista = mapa.get(chave) ?? [];
      lista.push(c);
      mapa.set(chave, lista);
    }
    return [...mapa.entries()];
  }, [compromissos]);

  const atrasados = (compromissos ?? []).filter((c) =>
    estaAtrasado(c.inicio_em, c.status as CompromissoStatus),
  ).length;

  return (
    <section>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Domínio Comercial · {compromissos?.length ?? 0} compromissos
            {atrasados > 0 && ` · ${atrasados} atrasado${atrasados > 1 ? "s" : ""}`}
          </p>
        </div>
        {workspaceId && <NovoCompromissoDialog workspaceId={workspaceId} />}
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(["pendente", "concluido", "cancelado", "todos"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filtro === f ? "default" : "outline"}
            onClick={() => setFiltro(f)}
          >
            {f === "todos" ? "Todos" : statusLabels[f]}
          </Button>
        ))}
        <Button
          size="sm"
          variant={apenasMeus ? "default" : "outline"}
          onClick={() => setApenasMeus((v) => !v)}
        >
          <Icon name="person" size={16} />
          Só meus
        </Button>
      </div>

      <div className="mt-6 space-y-6">
        {isPending ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : dias.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <Icon name="event_busy" size={32} className="text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum compromisso neste filtro. Agende o próximo follow-up para o lead não esfriar.
            </p>
          </div>
        ) : (
          dias.map(([dia, itens]) => (
            <div key={dia}>
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {formatDiaLongo(itens[0].inicio_em)}
              </h2>
              <ul className="mt-2 space-y-2">
                {itens.map((c) => {
                  const atrasado = estaAtrasado(c.inicio_em, c.status as CompromissoStatus);
                  return (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-card p-4"
                    >
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Icon name={tipoIcones[c.tipo as CompromissoTipo]} size={18} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{c.titulo}</span>
                          <Badge variant="outline">{tipoLabels[c.tipo as CompromissoTipo]}</Badge>
                          {atrasado && <Badge variant="destructive">Atrasado</Badge>}
                          {c.status !== "pendente" && (
                            <Badge variant="secondary">
                              {statusLabels[c.status as CompromissoStatus]}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatDataHora(c.inicio_em)}
                          {c.vinculoNome && ` · ${c.vinculoNome}`}
                          {c.responsavelNome && ` · ${c.responsavelNome}`}
                        </p>
                        {c.descricao && <p className="mt-1 text-sm">{c.descricao}</p>}
                      </div>

                      {c.status === "pendente" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={mutation.isPending}
                            onClick={() =>
                              mutation.mutate({ compromissoId: c.id, status: "concluido" })
                            }
                          >
                            <Icon name="check" size={16} />
                            Concluir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={mutation.isPending}
                            onClick={() =>
                              mutation.mutate({ compromissoId: c.id, status: "cancelado" })
                            }
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
