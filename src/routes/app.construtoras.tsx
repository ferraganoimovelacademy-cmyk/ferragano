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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSession } from "@/hooks/use-session";
import { createDeveloper, listDevelopers } from "@/lib/platform/property.functions";

export const Route = createFileRoute("/app/construtoras")({
  head: () => ({
    meta: [
      { title: "Construtoras — Ferragano One" },
      {
        name: "description",
        content: "Cadastro de construtoras e incorporadoras do portfólio imobiliário.",
      },
      { property: "og:title", content: "Construtoras — Ferragano One" },
      {
        property: "og:description",
        content: "Developer Layer do Property Domain: construtoras e seus empreendimentos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConstrutorasPage,
});

function NovaConstrutora({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const criar = useServerFn(createDeveloper);
  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    site: "",
    contatoNome: "",
    contatoEmail: "",
    contatoTelefone: "",
  });

  const mutation = useMutation({
    mutationFn: () => criar({ data: { workspaceId, ...form } }),
    onSuccess: () => {
      toast.success("Construtora cadastrada.");
      setOpen(false);
      setForm({
        nome: "",
        cnpj: "",
        site: "",
        contatoNome: "",
        contatoEmail: "",
        contatoTelefone: "",
      });
      void queryClient.invalidateQueries({ queryKey: ["developers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Icon name="add" size={18} />
          Nova construtora
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova construtora</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="dev-nome">Nome</Label>
            <Input
              id="dev-nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dev-cnpj">CNPJ</Label>
            <Input
              id="dev-cnpj"
              value={form.cnpj}
              onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dev-site">Site</Label>
            <Input
              id="dev-site"
              value={form.site}
              onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="dev-contato">Contato</Label>
            <Input
              id="dev-contato"
              value={form.contatoNome}
              onChange={(e) => setForm((f) => ({ ...f, contatoNome: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dev-email">E-mail</Label>
            <Input
              id="dev-email"
              type="email"
              value={form.contatoEmail}
              onChange={(e) => setForm((f) => ({ ...f, contatoEmail: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dev-tel">Telefone</Label>
            <Input
              id="dev-tel"
              value={form.contatoTelefone}
              onChange={(e) => setForm((f) => ({ ...f, contatoTelefone: e.target.value }))}
            />
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

function ConstrutorasPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const buscar = useServerFn(listDevelopers);

  const { data: itens, isPending } = useQuery({
    queryKey: ["developers", workspaceId],
    queryFn: () => buscar({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId),
  });

  return (
    <section>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Construtoras
          </h1>
          <p className="text-sm text-muted-foreground">
            Property Domain · {itens?.length ?? 0} cadastradas
          </p>
        </div>
        {workspaceId && <NovaConstrutora workspaceId={workspaceId} />}
      </header>

      {isPending ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !itens?.length ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <Icon name="corporate_fare" size={32} className="text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma construtora cadastrada. Ela é o topo da hierarquia: Construtora → Empreendimento
            → Fase → Torre → Unidade.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {itens.map((dev) => (
            <article key={dev.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="truncate font-medium">{dev.nome}</h2>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {dev.projetos} projeto{dev.projetos === 1 ? "" : "s"}
                </Badge>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {[dev.cnpj, dev.site].filter(Boolean).join(" · ") || "Sem dados cadastrais"}
              </p>
              {(dev.contato_nome || dev.contato_email || dev.contato_telefone) && (
                <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  {[dev.contato_nome, dev.contato_email, dev.contato_telefone]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
