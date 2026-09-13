import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { createPerson, findPersonDuplicates, listPeople } from "@/lib/platform/pessoas.functions";
import {
  PERSON_ESTAGIOS,
  personEstagioLabels,
  type PersonEstagio,
} from "@/lib/platform/relacionamento";
import { LEAD_ORIGENS, formatBRL, origemLabels } from "@/lib/platform/comercial";

export const Route = createFileRoute("/app/pessoas/")({
  head: () => ({
    meta: [
      { title: "Pessoas — Ferragano One" },
      {
        name: "description",
        content:
          "Base única de pessoas: identidade, contatos, jornada e relacionamentos em um só cadastro.",
      },
      { property: "og:title", content: "Pessoas — Ferragano One" },
      {
        property: "og:description",
        content: "Cadastro único de pessoas com jornada e relacionamentos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PessoasPage,
});

const estagioCor: Record<PersonEstagio, string> = {
  visitante: "bg-muted text-muted-foreground",
  lead: "bg-primary/10 text-primary",
  oportunidade: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  cliente: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  proprietario: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  investidor: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  indicador: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

function NovaPessoa({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const criar = useServerFn(createPerson);
  const checar = useServerFn(findPersonDuplicates);

  const vazio = {
    nome: "",
    documento: "",
    email: "",
    telefone: "",
    origem: "outro" as (typeof LEAD_ORIGENS)[number],
    observacao: "",
  };
  const [form, setForm] = useState(vazio);
  const [duplicados, setDuplicados] = useState<
    { id: string; nome: string; motivo: string; confianca: number }[]
  >([]);

  const verificar = useMutation({
    mutationFn: () =>
      checar({
        data: {
          workspaceId,
          nome: form.nome,
          documento: form.documento,
          email: form.email,
          telefone: form.telefone,
        },
      }),
    onSuccess: (rows) =>
      setDuplicados(
        (rows ?? []).map((r) => ({
          id: r.person_id as string,
          nome: r.nome as string,
          motivo: r.motivo as string,
          confianca: Number(r.confianca ?? 0),
        })),
      ),
  });

  const salvar = useMutation({
    mutationFn: () =>
      criar({
        data: {
          workspaceId,
          nome: form.nome,
          documento: form.documento,
          origem: form.origem,
          observacao: form.observacao,
          contatos: [
            ...(form.email
              ? [{ canal: "email" as const, valor: form.email, principal: true }]
              : []),
            ...(form.telefone
              ? [{ canal: "telefone" as const, valor: form.telefone, principal: true }]
              : []),
          ],
        },
      }),
    onSuccess: () => {
      toast.success("Pessoa cadastrada.");
      setOpen(false);
      setForm(vazio);
      setDuplicados([]);
      queryClient.invalidateQueries({ queryKey: ["people"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setDuplicados([]);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Icon name="person_add" size={18} />
          Nova pessoa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova pessoa</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="p-nome">Nome</Label>
            <Input
              id="p-nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              onBlur={() => form.nome.trim().length > 2 && verificar.mutate()}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-doc">CPF / CNPJ</Label>
            <Input
              id="p-doc"
              value={form.documento}
              onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
              onBlur={() => form.documento && verificar.mutate()}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-origem">Origem</Label>
            <Select
              value={form.origem}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, origem: v as (typeof LEAD_ORIGENS)[number] }))
              }
            >
              <SelectTrigger id="p-origem">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_ORIGENS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {origemLabels[o]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-email">E-mail</Label>
            <Input
              id="p-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              onBlur={() => form.email && verificar.mutate()}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-tel">Telefone</Label>
            <Input
              id="p-tel"
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              onBlur={() => form.telefone && verificar.mutate()}
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="p-obs">Observação</Label>
            <Textarea
              id="p-obs"
              rows={3}
              value={form.observacao}
              onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
            />
          </div>
        </div>

        {duplicados.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
              <Icon name="warning" size={16} />
              Possível cadastro duplicado
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {duplicados.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3">
                  <span className="truncate">
                    {d.nome}{" "}
                    <span className="text-xs text-muted-foreground">
                      · {d.motivo} ({d.confianca}%)
                    </span>
                  </span>
                  <Link
                    to="/app/pessoas/$id"
                    params={{ id: d.id }}
                    className="shrink-0 text-xs font-medium text-primary hover:underline"
                    onClick={() => setOpen(false)}
                  >
                    Abrir
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={() => {
              if (form.nome.trim().length < 2) return toast.error("Informe o nome.");
              salvar.mutate();
            }}
            disabled={salvar.isPending}
          >
            {salvar.isPending ? "Salvando..." : "Salvar pessoa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PessoasPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const [busca, setBusca] = useState("");
  const [estagio, setEstagio] = useState<PersonEstagio | "todos">("todos");
  const fetchPeople = useServerFn(listPeople);

  const { data, isPending } = useQuery({
    queryKey: ["people", workspaceId, busca, estagio],
    queryFn: () =>
      fetchPeople({
        data: {
          workspaceId: workspaceId!,
          busca: busca || undefined,
          estagio: estagio === "todos" ? undefined : estagio,
        },
      }),
    enabled: Boolean(workspaceId),
  });

  const resumo = useMemo(() => {
    const linhas = data ?? [];
    return {
      total: linhas.length,
      abertas: linhas.reduce((s, p) => s + p.oportunidadesAbertas, 0),
      valor: linhas.reduce((s, p) => s + p.valorEmAberto, 0),
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Pessoas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Um cadastro por pessoa. Lead, cliente e investidor são estados da mesma identidade.
          </p>
        </div>
        {workspaceId && <NovaPessoa workspaceId={workspaceId} />}
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Icon
            name="search"
            size={18}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou documento"
            aria-label="Buscar pessoas por nome ou documento"
            className="pl-9"
          />
        </div>
        <Select value={estagio} onValueChange={(v) => setEstagio(v as PersonEstagio | "todos")}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os estágios</SelectItem>
            {PERSON_ESTAGIOS.map((e) => (
              <SelectItem key={e} value={e}>
                {personEstagioLabels[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase">Pessoas</p>
          <p className="mt-1 font-display text-2xl font-semibold">{resumo.total}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase">Oportunidades abertas</p>
          <p className="mt-1 font-display text-2xl font-semibold">{resumo.abertas}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase">Valor em aberto</p>
          <p className="mt-1 font-display text-2xl font-semibold">{formatBRL(resumo.valor)}</p>
        </div>
      </div>

      {isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !data?.length ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhuma pessoa cadastrada ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <caption className="sr-only">Lista de pessoas do workspace</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Jornada</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Oportunidades</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Último contato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link
                      to="/app/pessoas/$id"
                      params={{ id: p.id }}
                      className="hover:text-primary hover:underline"
                    >
                      {p.nome}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={estagioCor[p.estagio_jornada as PersonEstagio]}
                    >
                      {personEstagioLabels[p.estagio_jornada as PersonEstagio]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.email ?? p.telefone ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.oportunidadesAbertas > 0
                      ? `${p.oportunidadesAbertas} · ${formatBRL(p.valorEmAberto)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.responsavelNome ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.ultimo_contato_em
                      ? new Date(p.ultimo_contato_em).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
