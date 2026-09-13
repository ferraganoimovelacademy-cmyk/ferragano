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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/hooks/use-session";
import { createCliente, listClientes } from "@/lib/platform/clientes.functions";

export const Route = createFileRoute("/app/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Ferragano OS" },
      { name: "description", content: "Base única de clientes e histórico de relacionamento." },
      { property: "og:title", content: "Clientes — Ferragano OS" },
      { property: "og:description", content: "Base de clientes da plataforma Ferragano OS." },
    ],
  }),
  component: ClientesPage,
});

function NovoCliente({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const criar = useServerFn(createCliente);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    documento: "",
    observacao: "",
  });

  const mutation = useMutation({
    mutationFn: () => criar({ data: { workspaceId, ...form } }),
    onSuccess: () => {
      toast.success("Cliente cadastrado.");
      setOpen(false);
      setForm({ nome: "", email: "", telefone: "", documento: "", observacao: "" });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Icon name="person_add" size={18} />
          Novo cliente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="cli-nome">Nome</Label>
            <Input
              id="cli-nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cli-email">E-mail</Label>
            <Input
              id="cli-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cli-tel">Telefone</Label>
            <Input
              id="cli-tel"
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="cli-doc">CPF / CNPJ</Label>
            <Input
              id="cli-doc"
              value={form.documento}
              onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="cli-obs">Observação</Label>
            <Textarea
              id="cli-obs"
              rows={3}
              value={form.observacao}
              onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (form.nome.trim().length < 2) return toast.error("Informe o nome do cliente.");
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : "Salvar cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClientesPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const [busca, setBusca] = useState("");
  const fetchClientes = useServerFn(listClientes);

  const { data, isPending } = useQuery({
    queryKey: ["clientes", workspaceId, busca],
    queryFn: () =>
      fetchClientes({ data: { workspaceId: workspaceId!, busca: busca || undefined } }),
    enabled: Boolean(workspaceId),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastro único de clientes do workspace.
          </p>
        </div>
        {workspaceId && <NovoCliente workspaceId={workspaceId} />}
      </header>

      <div className="relative max-w-md">
        <Icon
          name="search"
          size={18}
          className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone"
          className="pl-9"
        />
      </div>

      {isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !data?.length ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhum cliente cadastrado ainda.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell>{c.telefone ?? "—"}</TableCell>
                  <TableCell>{c.documento ?? "—"}</TableCell>
                  <TableCell>{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
