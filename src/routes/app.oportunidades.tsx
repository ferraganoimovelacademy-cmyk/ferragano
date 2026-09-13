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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { useTrackScreen } from "@/hooks/use-telemetry";
import { EntityTimeline } from "@/components/platform/EntityTimeline";
import { ReasonDialog } from "@/components/platform/ReasonDialog";
import {
  ATALHOS_KANBAN,
  acaoDoAtalho,
  etapaDeArquivamento,
  etapaVizinha,
  exigeMotivo,
  proximaTemperatura,
} from "@/lib/platform/kanban";
import { updateOpportunity } from "@/lib/platform/oportunidades.functions";
import {
  createProposal,
  createReservation,
  createSale,
  createTask,
  getSalesBoard,
  listProposals,
  listReservations,
  listTasks,
  listVisits,
  moveOpportunityToStage,
  registerVisitOutcome,
  scheduleVisit,
  setProposalStatus,
  setReservationStatus,
  setTaskStatus,
} from "@/lib/platform/sales.functions";
import {
  PROPOSAL_STATUS,
  corDaEtapa,
  formatDataCurta,
  proposalStatusLabels,
  reservationStatusLabels,
  slaEstado,
  taskStatusLabels,
  visitStatusLabels,
  type ProposalStatus,
  type ReservationStatus,
  type TaskStatus,
  type VisitStatus,
} from "@/lib/platform/sales";
import { formatBRL } from "@/lib/platform/comercial";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/oportunidades")({
  head: () => ({
    meta: [
      { title: "Oportunidades — Ferragano One" },
      {
        name: "description",
        content:
          "Funil comercial com etapas configuráveis, tarefas, visitas, propostas, reservas e vendas.",
      },
      { property: "og:title", content: "Oportunidades — Ferragano One" },
      {
        property: "og:description",
        content: "Sales Engine do Ferragano One: da oportunidade ao contrato.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OportunidadesPage,
});

type Selecionada = { id: string; titulo: string; personId: string | null };

type PedidoMotivo = {
  titulo: string;
  descricao: string;
  confirmLabel: string;
  onConfirm: (motivo: string) => void;
};

function OportunidadesPage() {
  useTrackScreen("sales", "abrir_oportunidade", { surface: "app.oportunidades" });
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const queryClient = useQueryClient();

  const buscarBoard = useServerFn(getSalesBoard);
  const mover = useServerFn(moveOpportunityToStage);
  const atualizar = useServerFn(updateOpportunity);

  const [pipelineId, setPipelineId] = useState<string | undefined>();
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<Selecionada | null>(null);
  const [foco, setFoco] = useState<string | null>(null);
  const [pedido, setPedido] = useState<PedidoMotivo | null>(null);

  const { data: board, isPending } = useQuery({
    queryKey: ["sales-board", workspaceId, pipelineId],
    queryFn: () => buscarBoard({ data: { workspaceId: workspaceId!, pipelineId } }),
    enabled: Boolean(workspaceId),
  });

  const mMover = useMutation({
    mutationFn: (vars: { opportunityId: string; stageId: string; motivo?: string }) =>
      mover({ data: { workspaceId: workspaceId!, ...vars } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["sales-board"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const mPrioridade = useMutation({
    mutationFn: (vars: { opportunityId: string; temperatura: "frio" | "morno" | "quente" }) =>
      atualizar({ data: { workspaceId: workspaceId!, ...vars } }),
    onSuccess: () => {
      toast.success("Prioridade elevada.");
      void queryClient.invalidateQueries({ queryKey: ["sales-board"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pedirMotivoEMover = (
    opportunityId: string,
    stageId: string,
    contexto: { titulo: string; descricao: string },
  ) => {
    setPedido({
      titulo: contexto.titulo,
      descricao: contexto.descricao,
      confirmLabel: "Registrar e mover",
      onConfirm: (motivo) => {
        mMover.mutate({ opportunityId, stageId, motivo });
        setPedido(null);
      },
    });
  };

  if (isPending) {
    return (
      <div className="flex gap-4 overflow-x-auto">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-72 w-72 shrink-0" />
        ))}
      </div>
    );
  }

  if (!board?.pipelineId) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhum funil configurado. Crie o funil padrão em Funis de venda.
        </p>
      </div>
    );
  }

  return (
    <section>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Oportunidades
          </h1>
          <p className="text-sm text-muted-foreground">
            Sales Engine · arraste o card ou use o teclado
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{ATALHOS_KANBAN}</p>
        </div>
        {board.pipelines.length > 1 && (
          <Select value={board.pipelineId} onValueChange={setPipelineId}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {board.pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </header>

      <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
        {board.etapas.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-10 text-sm text-muted-foreground">
            Nenhuma etapa configurada neste funil. Configure as etapas em Funis.
          </p>
        )}
        {board.etapas.map((etapa) => {
          const cards = board.oportunidades.filter((o) => o.stage_id === etapa.id);
          const total = cards.reduce((s, o) => s + Number(o.valor ?? 0), 0);

          return (
            <div
              key={etapa.id}
              onDragOver={(e) => {
                e.preventDefault();
                setAlvo(etapa.id);
              }}
              onDragLeave={() => setAlvo((a) => (a === etapa.id ? null : a))}
              onDrop={() => {
                if (arrastando) {
                  if (etapa.tipo === "perdido") {
                    pedirMotivoEMover(arrastando, etapa.id, {
                      titulo: "Marcar oportunidade como perdida",
                      descricao: `Destino: ${etapa.nome}`,
                    });
                  } else {
                    mMover.mutate({ opportunityId: arrastando, stageId: etapa.id });
                  }
                }
                setArrastando(null);
                setAlvo(null);
              }}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/40 transition-colors",
                alvo === etapa.id && "border-primary bg-primary-soft/40",
              )}
            >
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <span className={`h-2 w-2 rounded-full ${corDaEtapa(etapa.cor)}`} />
                <span className="flex-1 text-sm font-medium">{etapa.nome}</span>
                <span className="text-xs text-muted-foreground">{cards.length}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-1 text-[11px] text-muted-foreground">
                <span>{total > 0 ? formatBRL(total) : "—"}</span>
                <span>{etapa.sla_horas ? `SLA ${etapa.sla_horas}h` : ""}</span>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-3 pt-1">
                {cards.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">Vazio</p>
                )}
                {cards.map((opp) => {
                  const sla = slaEstado(opp.stage_entrou_em, etapa.sla_horas);
                  const abrir = () =>
                    setSelecionada({
                      id: opp.id,
                      titulo: opp.titulo || opp.pessoaNome,
                      personId: opp.person_id,
                    });
                  const selecionado = foco === opp.id;
                  return (
                    <article
                      key={opp.id}
                      draggable
                      tabIndex={0}
                      role="button"
                      aria-label={`Oportunidade de ${opp.pessoaNome} na etapa ${etapa.nome}. ${ATALHOS_KANBAN}`}
                      aria-pressed={selecionado}
                      onFocus={() => setFoco(opp.id)}
                      onDragStart={() => setArrastando(opp.id)}
                      onDragEnd={() => setArrastando(null)}
                      onKeyDown={(e) => {
                        const acao = acaoDoAtalho(e);
                        if (!acao) return;
                        e.preventDefault();

                        if (acao === "abrir") {
                          abrir();
                          return;
                        }
                        if (acao === "selecionar") {
                          setFoco((f) => (f === opp.id ? null : opp.id));
                          return;
                        }
                        if (acao === "prioridade") {
                          const proxima = proximaTemperatura(opp.temperatura);
                          if (proxima === opp.temperatura) {
                            toast.info("Já está na prioridade máxima.");
                            return;
                          }
                          mPrioridade.mutate({ opportunityId: opp.id, temperatura: proxima });
                          return;
                        }

                        const destino =
                          acao === "arquivar"
                            ? etapaDeArquivamento(board.etapas)
                            : etapaVizinha(board.etapas, etapa.id, acao === "avancar" ? 1 : -1);

                        if (!destino) {
                          toast.info(
                            acao === "arquivar"
                              ? "Este funil não tem etapa de perda."
                              : "Não há etapa nessa direção.",
                          );
                          return;
                        }
                        if (destino.id === etapa.id) return;

                        if (exigeMotivo(destino)) {
                          pedirMotivoEMover(opp.id, destino.id, {
                            titulo:
                              acao === "arquivar"
                                ? "Arquivar oportunidade"
                                : "Marcar oportunidade como perdida",
                            descricao: `${opp.pessoaNome} · ${etapa.nome} → ${destino.nome}`,
                          });
                        } else {
                          mMover.mutate({ opportunityId: opp.id, stageId: destino.id });
                        }
                      }}
                      onClick={abrir}
                      className={cn(
                        "cursor-pointer rounded-md border border-border bg-card p-3 shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        selecionado && "ring-2 ring-primary",
                      )}
                    >
                      <p className="truncate text-sm font-medium">{opp.pessoaNome}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {opp.titulo || opp.empreendimentoNome || "Sem título"}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatBRL(opp.valor ? Number(opp.valor) : null)}
                        </span>
                        {sla.estourado ? (
                          <Badge variant="destructive" className="text-[10px]">
                            SLA {sla.horas}h
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            {opp.probabilidade}%
                          </Badge>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <OportunidadePainel
        workspaceId={workspaceId!}
        selecionada={selecionada}
        onClose={() => setSelecionada(null)}
      />

      <ReasonDialog
        open={Boolean(pedido)}
        onOpenChange={(o) => !o && setPedido(null)}
        titulo={pedido?.titulo ?? ""}
        descricao={pedido?.descricao}
        label="Motivo"
        placeholder="Ex.: cliente optou por outro empreendimento"
        confirmLabel={pedido?.confirmLabel ?? "Confirmar"}
        pending={mMover.isPending}
        onConfirm={(motivo) => pedido?.onConfirm(motivo)}
      />
    </section>
  );
}

/* ================== PAINEL DE EXECUÇÃO ================== */

function OportunidadePainel({
  workspaceId,
  selecionada,
  onClose,
}: {
  workspaceId: string;
  selecionada: Selecionada | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const opportunityId = selecionada?.id;

  const fTasks = useServerFn(listTasks);
  const fVisits = useServerFn(listVisits);
  const fProposals = useServerFn(listProposals);
  const fReservations = useServerFn(listReservations);
  const fCriarTask = useServerFn(createTask);
  const fTaskStatus = useServerFn(setTaskStatus);
  const fAgendar = useServerFn(scheduleVisit);
  const fVisita = useServerFn(registerVisitOutcome);
  const fProposta = useServerFn(createProposal);
  const fPropostaStatus = useServerFn(setProposalStatus);
  const fReserva = useServerFn(createReservation);
  const fReservaStatus = useServerFn(setReservationStatus);
  const fVenda = useServerFn(createSale);

  const [tarefa, setTarefa] = useState("");
  const [visitaData, setVisitaData] = useState("");
  const [propostaValor, setPropostaValor] = useState("");
  const [reservaAte, setReservaAte] = useState("");
  const [vendaValor, setVendaValor] = useState("");
  const [cancelando, setCancelando] = useState<string | null>(null);

  const enabled = Boolean(opportunityId);
  const base = { workspaceId, opportunityId: opportunityId! };

  const tasks = useQuery({
    queryKey: ["sales-tasks", opportunityId],
    queryFn: () => fTasks({ data: base }),
    enabled,
  });
  const visits = useQuery({
    queryKey: ["sales-visits", opportunityId],
    queryFn: () => fVisits({ data: base }),
    enabled,
  });
  const proposals = useQuery({
    queryKey: ["sales-proposals", opportunityId],
    queryFn: () => fProposals({ data: base }),
    enabled,
  });
  const reservations = useQuery({
    queryKey: ["sales-reservations", opportunityId],
    queryFn: () => fReservations({ data: base }),
    enabled,
  });

  const recarregar = (chave: string) => () => {
    void queryClient.invalidateQueries({ queryKey: [chave] });
    void queryClient.invalidateQueries({ queryKey: ["sales-board"] });
  };
  const erro = (e: Error) => toast.error(e.message);

  const mTask = useMutation({
    mutationFn: () =>
      fCriarTask({
        data: {
          workspaceId,
          opportunityId,
          personId: selecionada?.personId,
          titulo: tarefa,
        },
      }),
    onSuccess: () => {
      setTarefa("");
      recarregar("sales-tasks")();
    },
    onError: erro,
  });

  const mTaskStatus = useMutation({
    mutationFn: (vars: { taskId: string; status: TaskStatus }) =>
      fTaskStatus({ data: { workspaceId, ...vars } }),
    onSuccess: recarregar("sales-tasks"),
    onError: erro,
  });

  const mVisita = useMutation({
    mutationFn: () =>
      fAgendar({
        data: {
          workspaceId,
          opportunityId: opportunityId!,
          personId: selecionada?.personId,
          agendadaPara: visitaData,
        },
      }),
    onSuccess: () => {
      setVisitaData("");
      recarregar("sales-visits")();
    },
    onError: erro,
  });

  const mVisitaStatus = useMutation({
    mutationFn: (vars: { visitId: string; status: VisitStatus }) =>
      fVisita({ data: { workspaceId, ...vars } }),
    onSuccess: recarregar("sales-visits"),
    onError: erro,
  });

  const mProposta = useMutation({
    mutationFn: () =>
      fProposta({
        data: {
          workspaceId,
          opportunityId: opportunityId!,
          personId: selecionada?.personId,
          valor: propostaValor ? Number(propostaValor) : null,
        },
      }),
    onSuccess: () => {
      setPropostaValor("");
      recarregar("sales-proposals")();
    },
    onError: erro,
  });

  const mPropostaStatus = useMutation({
    mutationFn: (vars: { proposalId: string; status: ProposalStatus }) =>
      fPropostaStatus({ data: { workspaceId, ...vars } }),
    onSuccess: recarregar("sales-proposals"),
    onError: erro,
  });

  const mReserva = useMutation({
    mutationFn: () =>
      fReserva({
        data: {
          workspaceId,
          opportunityId: opportunityId!,
          personId: selecionada?.personId,
          expiraEm: reservaAte,
        },
      }),
    onSuccess: () => {
      setReservaAte("");
      recarregar("sales-reservations")();
    },
    onError: erro,
  });

  const mReservaStatus = useMutation({
    mutationFn: (vars: { reservationId: string; status: ReservationStatus; motivo?: string }) =>
      fReservaStatus({ data: { workspaceId, ...vars } }),
    onSuccess: recarregar("sales-reservations"),
    onError: erro,
  });

  const mVenda = useMutation({
    mutationFn: () =>
      fVenda({
        data: {
          workspaceId,
          opportunityId: opportunityId!,
          personId: selecionada?.personId,
          valorFinal: vendaValor ? Number(vendaValor) : null,
        },
      }),
    onSuccess: () => {
      setVendaValor("");
      toast.success("Venda registrada.");
      recarregar("sales-reservations")();
    },
    onError: erro,
  });

  return (
    <Sheet open={Boolean(selecionada)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{selecionada?.titulo}</SheetTitle>
          <SheetDescription>Execução comercial desta oportunidade.</SheetDescription>
        </SheetHeader>

        <div className="p-4">
          <Tabs defaultValue="tarefas">
            <TabsList className="flex w-full flex-wrap">
              <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
              <TabsTrigger value="visitas">Visitas</TabsTrigger>
              <TabsTrigger value="propostas">Propostas</TabsTrigger>
              <TabsTrigger value="reservas">Reserva</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="tarefas" className="mt-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={tarefa}
                  onChange={(e) => setTarefa(e.target.value)}
                  placeholder="Nova tarefa de follow-up"
                  aria-label="Nova tarefa de follow-up"
                />
                <Button
                  onClick={() => mTask.mutate()}
                  disabled={tarefa.trim().length < 2}
                  aria-label="Adicionar tarefa"
                >
                  <Icon name="add" size={18} />
                </Button>
              </div>
              {(tasks.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma tarefa registrada.</p>
              )}
              {(tasks.data ?? []).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-md border border-border p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{t.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {taskStatusLabels[t.status as TaskStatus]}
                      {t.vence_em ? ` · vence ${formatDataCurta(t.vence_em)}` : ""}
                    </p>
                  </div>
                  {t.status !== "concluida" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => mTaskStatus.mutate({ taskId: t.id, status: "concluida" })}
                    >
                      Concluir
                    </Button>
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="visitas" className="mt-4 space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="visita-data">Agendar visita</Label>
                  <Input
                    id="visita-data"
                    type="datetime-local"
                    value={visitaData}
                    onChange={(e) => setVisitaData(e.target.value)}
                  />
                </div>
                <Button onClick={() => mVisita.mutate()} disabled={!visitaData}>
                  Agendar
                </Button>
              </div>
              {(visits.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma visita registrada.</p>
              )}
              {(visits.data ?? []).map((v) => (
                <div key={v.id} className="rounded-md border border-border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm">{formatDataCurta(v.agendada_para)}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {visitStatusLabels[v.status as VisitStatus]}
                    </Badge>
                  </div>
                  {v.status === "agendada" && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => mVisitaStatus.mutate({ visitId: v.id, status: "realizada" })}
                      >
                        Compareceu
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          mVisitaStatus.mutate({ visitId: v.id, status: "nao_compareceu" })
                        }
                      >
                        Não compareceu
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="propostas" className="mt-4 space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="proposta-valor">Nova proposta (valor)</Label>
                  <Input
                    id="proposta-valor"
                    type="number"
                    value={propostaValor}
                    onChange={(e) => setPropostaValor(e.target.value)}
                  />
                </div>
                <Button onClick={() => mProposta.mutate()}>Criar</Button>
              </div>
              {(proposals.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma proposta registrada.</p>
              )}
              {(proposals.data ?? []).map((p) => (
                <div key={p.id} className="rounded-md border border-border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm">
                      v{p.versao} · {formatBRL(p.valor ? Number(p.valor) : null)}
                    </p>
                    <Select
                      value={p.status}
                      onValueChange={(v) =>
                        mPropostaStatus.mutate({
                          proposalId: p.id,
                          status: v as ProposalStatus,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPOSAL_STATUS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {proposalStatusLabels[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="reservas" className="mt-4 space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="reserva-ate">Reservar até</Label>
                  <Input
                    id="reserva-ate"
                    type="datetime-local"
                    value={reservaAte}
                    onChange={(e) => setReservaAte(e.target.value)}
                  />
                </div>
                <Button onClick={() => mReserva.mutate()} disabled={!reservaAte}>
                  Reservar
                </Button>
              </div>
              {(reservations.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma reserva registrada.</p>
              )}
              {(reservations.data ?? []).map((r) => (
                <div key={r.id} className="rounded-md border border-border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm">
                      até {formatDataCurta(r.expira_em)}
                      {r.vencida && " · vencida"}
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {reservationStatusLabels[r.status as ReservationStatus]}
                    </Badge>
                  </div>
                  {r.status === "ativa" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => setCancelando(r.id)}
                    >
                      Cancelar reserva
                    </Button>
                  )}
                </div>
              ))}

              <div className="mt-4 rounded-md border border-dashed border-border p-3">
                <Label htmlFor="venda-valor">Fechar venda (valor final)</Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    id="venda-valor"
                    type="number"
                    value={vendaValor}
                    onChange={(e) => setVendaValor(e.target.value)}
                  />
                  <Button onClick={() => mVenda.mutate()} disabled={!vendaValor}>
                    Registrar
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="historico" className="mt-4">
              {opportunityId && (
                <EntityTimeline
                  workspaceId={workspaceId}
                  entity="opportunity"
                  entityId={opportunityId}
                  limit={40}
                  titulo=""
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        <ReasonDialog
          open={Boolean(cancelando)}
          onOpenChange={(o) => !o && setCancelando(null)}
          titulo="Cancelar reserva"
          descricao="O motivo fica registrado no histórico da oportunidade."
          placeholder="Ex.: cliente desistiu da unidade"
          confirmLabel="Cancelar reserva"
          pending={mReservaStatus.isPending}
          onConfirm={(motivo) => {
            if (!cancelando) return;
            mReservaStatus.mutate({
              reservationId: cancelando,
              status: "cancelada",
              motivo,
            });
            setCancelando(null);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
