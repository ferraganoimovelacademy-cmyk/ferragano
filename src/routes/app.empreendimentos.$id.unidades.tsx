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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/hooks/use-session";
import { useTrackScreen } from "@/hooks/use-telemetry";
import {
  UNIDADE_STATUS,
  formatBRL,
  unidadeStatusLabels,
  type UnidadeStatus,
} from "@/lib/platform/comercial";
import {
  createUnidade,
  getEmpreendimento,
  listUnidadesPaginado,
} from "@/lib/platform/empreendimentos.functions";
import {
  changeUnitPrice,
  listUnitPriceHistory,
  moveUnitInventory,
} from "@/lib/platform/property.functions";
import { variacao } from "@/lib/platform/property";

export const Route = createFileRoute("/app/empreendimentos/$id/unidades")({
  head: () => ({
    meta: [
      { title: "Unidades — Ferragano OS" },
      { name: "description", content: "Tabela de unidades do empreendimento com paginação." },
      { property: "og:title", content: "Unidades — Ferragano OS" },
      { property: "og:description", content: "Gestão de unidades por empreendimento." },
    ],
  }),
  component: UnidadesPage,
});

const TODOS = "todos";
const POR_PAGINA = 20;

/**
 * SPRINT 07 — Price History.
 * O preço nunca é sobrescrito em silêncio: toda alteração exige motivo e
 * gera registro histórico + evento de domínio.
 */
function PrecoUnidade({
  workspaceId,
  unidadeId,
  identificador,
  precoAtual,
}: {
  workspaceId: string;
  unidadeId: string;
  identificador: string;
  precoAtual: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [preco, setPreco] = useState(precoAtual ? String(Math.round(precoAtual)) : "");
  const [motivo, setMotivo] = useState("");
  const queryClient = useQueryClient();
  const alterar = useServerFn(changeUnitPrice);
  const buscarHistorico = useServerFn(listUnitPriceHistory);

  const { data: historico } = useQuery({
    queryKey: ["unit-price-history", workspaceId, unidadeId],
    queryFn: () => buscarHistorico({ data: { workspaceId, unidadeId } }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () => alterar({ data: { workspaceId, unidadeId, preco: Number(preco), motivo } }),
    onSuccess: (r) => {
      toast.success(
        r.inalterado ? "Preço mantido." : "Preço atualizado e registrado no histórico.",
      );
      setMotivo("");
      void queryClient.invalidateQueries({ queryKey: ["unidades"] });
      void queryClient.invalidateQueries({ queryKey: ["unit-price-history"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const previsao = preco ? variacao(precoAtual, Number(preco)) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-right text-sm hover:underline"
          aria-label={`Alterar preço da unidade ${identificador}`}
        >
          {formatBRL(precoAtual)}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preço — unidade {identificador}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="preco-novo">Novo preço (R$)</Label>
            <Input
              id="preco-novo"
              inputMode="numeric"
              value={preco}
              onChange={(e) => setPreco(e.target.value.replace(/\D/g, ""))}
            />
            {previsao !== null && (
              <p className="text-xs text-muted-foreground">
                Variação de {previsao > 0 ? "+" : ""}
                {previsao}% sobre {formatBRL(precoAtual)}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="preco-motivo">Motivo</Label>
            <Input
              id="preco-motivo"
              placeholder="Ex.: reajuste de tabela"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Histórico
            </p>
            {!historico?.length ? (
              <p className="mt-2 text-sm text-muted-foreground">Nenhuma alteração registrada.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {historico.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{formatBRL(Number(h.preco))}</span>
                    <span className="text-xs text-muted-foreground">
                      {h.variacao_percentual !== null
                        ? `${Number(h.variacao_percentual) > 0 ? "+" : ""}${h.variacao_percentual}% · `
                        : ""}
                      {new Date(h.created_at).toLocaleDateString("pt-BR")}
                      {h.motivo ? ` · ${h.motivo}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!preco || mutation.isPending}>
            {mutation.isPending ? "Salvando…" : "Alterar preço"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function statusVariant(status: UnidadeStatus) {
  if (status === "disponivel") return "default" as const;
  if (status === "reservada") return "gold" as const;
  return "secondary" as const;
}

function NovaUnidade({
  workspaceId,
  empreendimentoId,
}: {
  workspaceId: string;
  empreendimentoId: string;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const criar = useServerFn(createUnidade);
  const [form, setForm] = useState({
    identificador: "",
    tipologia: "",
    dormitorios: "",
    vagas: "",
    areaPrivativa: "",
    andar: "",
    preco: "",
    status: "disponivel" as UnidadeStatus,
  });

  const mutation = useMutation({
    mutationFn: () =>
      criar({
        data: {
          workspaceId,
          empreendimentoId,
          identificador: form.identificador,
          tipologia: form.tipologia,
          dormitorios: form.dormitorios ? Number(form.dormitorios) : null,
          vagas: form.vagas ? Number(form.vagas) : null,
          areaPrivativa: form.areaPrivativa ? Number(form.areaPrivativa) : null,
          andar: form.andar ? Number(form.andar) : null,
          preco: form.preco ? Number(form.preco) : null,
          status: form.status,
        },
      }),
    onSuccess: () => {
      toast.success("Unidade cadastrada.");
      setOpen(false);
      setForm((f) => ({ ...f, identificador: "", preco: "" }));
      queryClient.invalidateQueries({ queryKey: ["unidades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Icon name="add" size={18} />
          Nova unidade
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova unidade</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="un-id">Identificador</Label>
            <Input
              id="un-id"
              placeholder="Ex.: 1204"
              value={form.identificador}
              onChange={(e) => setForm((f) => ({ ...f, identificador: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="un-tip">Tipologia</Label>
            <Input
              id="un-tip"
              placeholder="Ex.: 2 dorm. com suíte"
              value={form.tipologia}
              onChange={(e) => setForm((f) => ({ ...f, tipologia: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="un-dorm">Dormitórios</Label>
            <Input
              id="un-dorm"
              inputMode="numeric"
              value={form.dormitorios}
              onChange={(e) => setForm((f) => ({ ...f, dormitorios: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="un-vagas">Vagas</Label>
            <Input
              id="un-vagas"
              inputMode="numeric"
              value={form.vagas}
              onChange={(e) => setForm((f) => ({ ...f, vagas: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="un-area">Área privativa (m²)</Label>
            <Input
              id="un-area"
              inputMode="decimal"
              value={form.areaPrivativa}
              onChange={(e) => setForm((f) => ({ ...f, areaPrivativa: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="un-andar">Andar</Label>
            <Input
              id="un-andar"
              inputMode="numeric"
              value={form.andar}
              onChange={(e) => setForm((f) => ({ ...f, andar: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="un-preco">Preço (R$)</Label>
            <Input
              id="un-preco"
              inputMode="numeric"
              value={form.preco}
              onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as UnidadeStatus }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIDADE_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {unidadeStatusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!form.identificador.trim()) return toast.error("Informe o identificador.");
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : "Salvar unidade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UnidadesPage() {
  useTrackScreen("property", "abrir_unidade", { surface: "app.empreendimentos.unidades" });
  const { id } = Route.useParams();
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const queryClient = useQueryClient();

  const fetchEmp = useServerFn(getEmpreendimento);
  const fetchUnidades = useServerFn(listUnidadesPaginado);
  const alterarStatus = useServerFn(moveUnitInventory);

  const [pagina, setPagina] = useState(1);
  const [status, setStatus] = useState(TODOS);
  const [busca, setBusca] = useState("");

  const { data: emp } = useQuery({
    queryKey: ["empreendimento", workspaceId, id],
    queryFn: () => fetchEmp({ data: { workspaceId: workspaceId!, empreendimentoId: id } }),
    enabled: Boolean(workspaceId),
  });

  const { data, isPending } = useQuery({
    queryKey: ["unidades", workspaceId, id, pagina, status, busca],
    queryFn: () =>
      fetchUnidades({
        data: {
          workspaceId: workspaceId!,
          empreendimentoId: id,
          pagina,
          porPagina: POR_PAGINA,
          status: status === TODOS ? undefined : (status as UnidadeStatus),
          busca: busca || undefined,
        },
      }),
    enabled: Boolean(workspaceId),
  });

  const mutation = useMutation({
    mutationFn: (v: { unidadeId: string; status: UnidadeStatus }) =>
      alterarStatus({ data: { workspaceId: workspaceId!, ...v } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["unidades"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/app/empreendimentos" className="hover:text-foreground">
          Empreendimentos
        </Link>
        <Icon name="chevron_right" size={16} />
        <span className="text-foreground">{emp?.nome ?? "Unidades"}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Unidades {emp?.nome ? `— ${emp.nome}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} unidades cadastradas neste empreendimento.
          </p>
        </div>
        {workspaceId && <NovaUnidade workspaceId={workspaceId} empreendimentoId={id} />}
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Icon
            name="search"
            size={18}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por identificador ou tipologia"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPagina(1);
          }}
        >
          <SelectTrigger className="w-[200px]" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os status</SelectItem>
            {UNIDADE_STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {unidadeStatusLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : !data?.rows.length ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhuma unidade encontrada.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Tipologia</TableHead>
                  <TableHead className="text-right">Andar</TableHead>
                  <TableHead className="text-right">Área</TableHead>
                  <TableHead className="text-right">Dorm.</TableHead>
                  <TableHead className="text-right">Vagas</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[160px]">Alterar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.identificador}</TableCell>
                    <TableCell>{u.tipologia ?? "—"}</TableCell>
                    <TableCell className="text-right">{u.andar ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {u.area_privativa ? `${Number(u.area_privativa)} m²` : "—"}
                    </TableCell>
                    <TableCell className="text-right">{u.dormitorios ?? "—"}</TableCell>
                    <TableCell className="text-right">{u.vagas ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <PrecoUnidade
                        workspaceId={workspaceId!}
                        unidadeId={u.id}
                        identificador={u.identificador}
                        precoAtual={u.preco ? Number(u.preco) : null}
                      />
                    </TableCell>

                    <TableCell>
                      <Badge variant={statusVariant(u.status as UnidadeStatus)}>
                        {unidadeStatusLabels[u.status as UnidadeStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.status}
                        onValueChange={(v) =>
                          mutation.mutate({ unidadeId: u.id, status: v as UnidadeStatus })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIDADE_STATUS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {unidadeStatusLabels[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Página {pagina} de {totalPaginas} · {total} unidades
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                <Icon name="chevron_left" size={18} />
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              >
                Próxima
                <Icon name="chevron_right" size={18} />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
