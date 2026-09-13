import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { isAdminRole } from "@/lib/platform/roles";
import {
  acaoLabels,
  acoesSemProvedor,
  canalLabels,
  outboxStatusCores,
  outboxStatusLabels,
  type AutomationAcao,
  type AutomationCanal,
  type OutboxStatus,
} from "@/lib/platform/automation";
import {
  ensureDefaultAutomationRules,
  listAutomationRules,
  listOutboxQueue,
  retryOutboxEvent,
  toggleAutomationRule,
} from "@/lib/platform/automation.functions";

export const Route = createFileRoute("/app/automacoes")({
  head: () => ({
    meta: [
      { title: "Automações — Ferragano One" },
      {
        name: "description",
        content:
          "Regras de automação por evento e fila do Outbox: execução idempotente, retry com espera crescente e histórico de falhas.",
      },
      { property: "og:title", content: "Automações — Ferragano One" },
      {
        property: "og:description",
        content: "Automation Engine do Ferragano One: evento, outbox, worker e executor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AutomacoesPage,
});

const FILTROS: { valor: OutboxStatus | "todos"; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "pendente", label: "Pendente" },
  { valor: "processando", label: "Processando" },
  { valor: "entregue", label: "Entregue" },
  { valor: "falhou", label: "Falhou" },
  { valor: "descartado", label: "Descartado" },
];

const dataHora = (v: string) =>
  new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function AutomacoesPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const admin = isAdminRole(session?.roles);
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState<OutboxStatus | "todos">("todos");

  const carregarRegras = useServerFn(listAutomationRules);
  const carregarFila = useServerFn(listOutboxQueue);
  const alternar = useServerFn(toggleAutomationRule);
  const reprocessar = useServerFn(retryOutboxEvent);
  const semear = useServerFn(ensureDefaultAutomationRules);

  const regras = useQuery({
    queryKey: ["automation-rules", workspaceId],
    queryFn: () => carregarRegras({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId),
  });

  const fila = useQuery({
    queryKey: ["outbox-queue", workspaceId, filtro],
    queryFn: () =>
      carregarFila({
        data: {
          workspaceId: workspaceId!,
          status: filtro === "todos" ? null : filtro,
          limite: 100,
        },
      }),
    enabled: Boolean(workspaceId) && admin,
    refetchInterval: 30_000,
  });

  const mutToggle = useMutation({
    mutationFn: (v: { ruleId: string; ativa: boolean }) => alternar({ data: v }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const mutSeed = useMutation({
    mutationFn: () => semear({ data: { workspaceId: workspaceId! } }),
    onSuccess: () => {
      toast.success("Regras padrão criadas.");
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutRetry = useMutation({
    mutationFn: (outboxId: string) => reprocessar({ data: { outboxId } }),
    onSuccess: () => {
      toast.success("Evento reenfileirado. O worker executa no próximo ciclo.");
      queryClient.invalidateQueries({ queryKey: ["outbox-queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (regras.isPending) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Automações</h1>
        <p className="text-muted-foreground text-sm">
          Evento → Outbox → Worker → Executor. Cada ação roda uma única vez; falhas voltam para a
          fila com espera crescente.
        </p>
      </header>

      {!admin && (
        <p className="border-border text-muted-foreground rounded-md border border-dashed p-3 text-sm">
          Visualização apenas. Só proprietário e administrador alteram regras ou reprocessam a fila.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regras por evento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(regras.data ?? []).length === 0 && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                Nenhuma regra configurada. Comece pelo conjunto padrão (follow-up de proposta,
                reserva expirando, oportunidade sem ação).
              </p>
              {admin && (
                <Button size="sm" disabled={mutSeed.isPending} onClick={() => mutSeed.mutate()}>
                  <Icon name="playlist_add" className="mr-1 text-base" />
                  Criar regras padrão
                </Button>
              )}
            </div>
          )}
          {(regras.data ?? []).map((regra) => {
            const semProvedor = acoesSemProvedor.includes(regra.acao as AutomationAcao);
            return (
              <div
                key={regra.id}
                className="border-border flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{regra.nome}</span>
                    <Badge variant="secondary" className="font-mono text-[11px]">
                      {regra.eventType}
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">
                      {acaoLabels[regra.acao as AutomationAcao] ?? regra.acao}
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">
                      {canalLabels[regra.canal as AutomationCanal] ?? regra.canal}
                    </Badge>
                    {regra.delaySegundos > 0 && (
                      <Badge variant="outline" className="text-[11px]">
                        atraso {Math.round(regra.delaySegundos / 3600)}h
                      </Badge>
                    )}
                    {semProvedor && (
                      <Badge className="bg-amber-500/15 text-[11px] text-amber-600 dark:text-amber-400">
                        provedor não conectado
                      </Badge>
                    )}
                  </div>
                  {regra.descricao && (
                    <p className="text-muted-foreground text-xs">{regra.descricao}</p>
                  )}
                </div>
                <Switch
                  checked={regra.ativa}
                  disabled={!admin || mutToggle.isPending}
                  onCheckedChange={(v) => mutToggle.mutate({ ruleId: regra.id, ativa: v })}
                  aria-label={`Ativar regra ${regra.nome}`}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {admin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Fila do Outbox</CardTitle>
            <Select value={filtro} onValueChange={(v) => setFiltro(v as OutboxStatus | "todos")}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTROS.map((f) => (
                  <SelectItem key={f.valor} value={f.valor}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {fila.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : (fila.data ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Fila vazia. Eventos aparecem aqui assim que uma regra ativa for disparada.
              </p>
            ) : (
              <table className="w-full min-w-[820px] text-sm">
                <caption className="sr-only">Fila de eventos do Outbox</caption>
                <thead>
                  <tr className="border-border border-b">
                    <th className="p-2 text-left font-medium">Evento</th>
                    <th className="p-2 text-left font-medium">Canal</th>
                    <th className="p-2 text-left font-medium">Status</th>
                    <th className="p-2 text-left font-medium">Tentativas</th>
                    <th className="p-2 text-left font-medium">Próxima janela</th>
                    <th className="p-2 text-left font-medium">Último erro</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {(fila.data ?? []).map((linha) => (
                    <tr key={linha.id} className="border-border border-b last:border-0">
                      <td className="p-2 font-mono text-xs">{linha.eventType}</td>
                      <td className="p-2">
                        {canalLabels[linha.canal as AutomationCanal] ?? linha.canal}
                      </td>
                      <td className="p-2">
                        <Badge className={outboxStatusCores[linha.status]}>
                          {outboxStatusLabels[linha.status]}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {linha.tentativas}/{linha.maxTentativas}
                      </td>
                      <td className="text-muted-foreground p-2 text-xs">
                        {linha.processadoEm
                          ? dataHora(linha.processadoEm)
                          : dataHora(linha.disponivelEm)}
                      </td>
                      <td className="text-muted-foreground max-w-[240px] truncate p-2 text-xs">
                        {linha.ultimoErro ?? "—"}
                      </td>
                      <td className="p-2 text-right">
                        {linha.status !== "entregue" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={mutRetry.isPending}
                            onClick={() => mutRetry.mutate(linha.id)}
                          >
                            <Icon name="refresh" className="mr-1 text-base" />
                            Reprocessar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
