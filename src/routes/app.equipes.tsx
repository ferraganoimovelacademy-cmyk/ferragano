import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimelinePanel } from "@/components/platform/TimelinePanel";
import { useSession } from "@/hooks/use-session";
import { isAdminRole } from "@/lib/platform/roles";
import { deleteEquipe, listEquipes, upsertEquipe } from "@/lib/platform/equipes.functions";
import { listUsuarios } from "@/lib/platform/usuarios.functions";

export const Route = createFileRoute("/app/equipes")({
  head: () => ({
    meta: [
      { title: "Equipes — Ferragano One" },
      {
        name: "description",
        content: "Estrutura de equipes comerciais, gerentes e hierarquia da imobiliária.",
      },
      { property: "og:title", content: "Equipes — Ferragano One" },
      {
        property: "og:description",
        content: "Organização de equipes e gerentes no Ferragano One.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EquipesPage,
});

type FormState = {
  id?: string;
  nome: string;
  descricao: string;
  cor: string;
  gerente_id: string;
  parent_id: string;
};

const vazio: FormState = {
  nome: "",
  descricao: "",
  cor: "#1F6F78",
  gerente_id: "",
  parent_id: "",
};

function EquipesPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const admin = isAdminRole(session?.roles);
  const queryClient = useQueryClient();

  const carregar = useServerFn(listEquipes);
  const carregarUsuarios = useServerFn(listUsuarios);
  const salvar = useServerFn(upsertEquipe);
  const remover = useServerFn(deleteEquipe);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(vazio);

  const { data, isPending } = useQuery({
    queryKey: ["equipes", workspaceId],
    queryFn: () => carregar({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId),
  });

  const { data: pessoas } = useQuery({
    queryKey: ["usuarios", workspaceId],
    queryFn: () => carregarUsuarios({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      salvar({
        data: {
          id: form.id,
          workspaceId: workspaceId!,
          nome: form.nome,
          descricao: form.descricao || null,
          cor: form.cor,
          gerente_id: form.gerente_id || null,
          parent_id: form.parent_id || null,
          ativa: true,
        },
      }),
    onSuccess: () => {
      toast.success("Equipe salva.");
      setOpen(false);
      setForm(vazio);
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exclusao = useMutation({
    mutationFn: (id: string) => remover({ data: { workspaceId: workspaceId!, id } }),
    onSuccess: () => {
      toast.success("Equipe removida.");
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const equipes = data?.equipes ?? [];
  const raizes = equipes.filter((e) => !e.parent_id);

  function abrir(equipe?: (typeof equipes)[number]) {
    setForm(
      equipe
        ? {
            id: equipe.id,
            nome: equipe.nome,
            descricao: equipe.descricao ?? "",
            cor: equipe.cor,
            gerente_id: equipe.gerente_id ?? "",
            parent_id: equipe.parent_id ?? "",
          }
        : vazio,
    );
    setOpen(true);
  }

  function renderEquipe(equipe: (typeof equipes)[number], nivel = 0) {
    const filhas = equipes.filter((e) => e.parent_id === equipe.id);
    return (
      <div key={equipe.id}>
        <div
          className="border-border flex flex-wrap items-center gap-3 rounded-md border p-3"
          style={{ marginLeft: nivel * 20 }}
        >
          <span
            className="h-8 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: equipe.cor }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{equipe.nome}</p>
            <p className="text-muted-foreground truncate text-xs">
              {equipe.gerente?.nome ?? equipe.gerente?.email ?? "Sem gerente"}
              {equipe.descricao ? ` · ${equipe.descricao}` : ""}
            </p>
          </div>
          <Badge variant="secondary">{equipe.membros} membros</Badge>
          {admin && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => abrir(equipe)}
                aria-label="Editar equipe"
              >
                <Icon name="edit" size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => exclusao.mutate(equipe.id)}
                aria-label="Remover equipe"
              >
                <Icon name="delete" size={18} />
              </Button>
            </div>
          )}
        </div>
        <div className="mt-2 space-y-2">{filhas.map((f) => renderEquipe(f, nivel + 1))}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Equipes</h1>
          <p className="text-muted-foreground text-sm">
            Hierarquia comercial: cada equipe tem um gerente e pode ter equipes subordinadas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {workspaceId && (
            <TimelinePanel
              workspaceId={workspaceId}
              entity="equipes"
              titulo="Histórico de equipes"
            />
          )}
          {admin && (
            <Button onClick={() => abrir()}>
              <Icon name="group_add" size={18} />
              Nova equipe
            </Button>
          )}
        </div>
      </header>

      {isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : equipes.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-md border border-dashed p-10 text-center text-sm">
          Nenhuma equipe cadastrada ainda.
        </div>
      ) : (
        <div className="space-y-2">{raizes.map((e) => renderEquipe(e))}</div>
      )}

      {data && data.semEquipe > 0 && (
        <p className="text-muted-foreground text-sm">
          {data.semEquipe} usuário(s) ainda sem equipe — atribua em Usuários.
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar equipe" : "Nova equipe"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="eq-nome">Nome</Label>
              <Input
                id="eq-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="eq-desc">Descrição</Label>
              <Textarea
                id="eq-desc"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="eq-cor">Cor</Label>
              <Input
                id="eq-cor"
                type="color"
                className="h-10 w-20 p-1"
                value={form.cor}
                onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Gerente</Label>
              <Select
                value={form.gerente_id || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, gerente_id: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem gerente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem gerente</SelectItem>
                  {(pessoas?.usuarios ?? []).map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.profile?.nome ?? u.profile?.email ?? u.user_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Equipe superior</Label>
              <Select
                value={form.parent_id || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, parent_id: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {equipes
                    .filter((e) => e.id !== form.id)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || form.nome.trim().length < 2}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
