import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import { AdvisoryPanel } from "@/components/platform/AdvisoryPanel";
import { ExplainDialog } from "@/components/knowledge/ExplainDialog";
import { useTrackScreen } from "@/hooks/use-telemetry";
import { isGestaoRole, severidadeCores, type Severidade } from "@/lib/platform/insights";
import { resumirAceite } from "@/lib/platform/advisor";
import {
  decidirAdvisorAcao,
  getAdvisorBriefing,
  listAdvisorHistorico,
} from "@/lib/platform/advisor.functions";

export const Route = createFileRoute("/app/advisor")({
  head: () => ({
    meta: [
      { title: "Ferragano Advisor — briefing da semana" },
      {
        name: "description",
        content:
          "Conselheiro da operação: lê os painéis 360 do workspace, mede os sinais de funil, estoque e follow-up e sugere as ações da semana.",
      },
      { property: "og:title", content: "Ferragano Advisor — briefing da semana" },
      {
        property: "og:description",
        content:
          "Briefing com evidência medida dos Read Models: conversão, ciclo, liquidez, follow-up e origem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdvisorPage,
});

const prioridadeLabel: Record<string, string> = {
  alta: "Prioridade alta",
  media: "Prioridade média",
  baixa: "Prioridade baixa",
};

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  aceita: "Aceita",
  descartada: "Descartada",
  concluida: "Concluída",
};

const pctLabel = (v: number | null) => (v == null ? "—" : `${v.toFixed(0)}%`);

function AdvisorPage() {
  useTrackScreen("observability", "advisor_briefing");
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const gestao = isGestaoRole(session?.roles);
  const [pergunta, setPergunta] = useState("");
  const gerar = useServerFn(getAdvisorBriefing);
  const carregarHistorico = useServerFn(listAdvisorHistorico);
  const decidir = useServerFn(decidirAdvisorAcao);
  const queryClient = useQueryClient();

  const historico = useQuery({
    queryKey: ["advisor-historico", workspaceId],
    enabled: Boolean(workspaceId) && gestao,
    queryFn: () => carregarHistorico({ data: { workspaceId: workspaceId! } }),
  });

  const mutation = useMutation({
    mutationFn: (p: string | null) => gerar({ data: { workspaceId: workspaceId!, pergunta: p } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["advisor-historico", workspaceId] });
    },
  });

  const decisao = useMutation({
    mutationFn: (v: { acaoId: string; status: "aceita" | "descartada" | "concluida" }) =>
      decidir({ data: { acaoId: v.acaoId, status: v.status, observacao: null } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["advisor-historico", workspaceId] });
    },
  });

  if (!gestao) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            O Advisor é restrito à gestão comercial.
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = mutation.data;

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ferragano Advisor</h1>
        <p className="text-sm text-muted-foreground">
          Os sinais são medidos nos Read Models 360. A IA apenas interpreta essa evidência — nenhum
          número é inventado.
        </p>
      </header>

      {workspaceId && (
        <AdvisoryPanel
          workspaceId={workspaceId}
          nome={(session?.profile?.nome as string | null | undefined) ?? null}
        />
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Briefing</CardTitle>
          {/* SPRINT 26 — GATE 04: explicabilidade completa, sem resumo. */}
          {workspaceId ? <ExplainDialog workspaceId={workspaceId} /> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="advisor-pergunta">Pergunta (opcional)</Label>
            <Input
              id="advisor-pergunta"
              value={pergunta}
              maxLength={500}
              placeholder="Ex.: onde estamos perdendo venda no funil?"
              onChange={(e) => setPergunta(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !mutation.isPending && workspaceId) {
                  mutation.mutate(pergunta.trim() ? pergunta : null);
                }
              }}
            />
          </div>
          <Button
            onClick={() => mutation.mutate(pergunta.trim() ? pergunta : null)}
            disabled={mutation.isPending || !workspaceId}
          >
            <Icon name="auto_awesome" />
            <span>{mutation.isPending ? "Analisando…" : "Gerar briefing"}</span>
          </Button>

          {mutation.isPending && (
            <div className="space-y-2" aria-live="polite">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}

          {mutation.isError && (
            <p className="text-sm text-destructive" role="alert">
              Não foi possível gerar o briefing agora.
            </p>
          )}

          {data?.erro && (
            <p className="text-sm text-muted-foreground" role="status">
              {data.erro}
            </p>
          )}

          {data?.briefing && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed">{data.briefing.resumo}</p>

              {data.briefing.recomendacoes.length > 0 && (
                <ul className="space-y-3">
                  {data.briefing.recomendacoes.map((r, i) => (
                    <li key={i} className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{r.titulo}</span>
                        <Badge variant="outline">
                          {prioridadeLabel[r.prioridade] ?? r.prioridade}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{r.acao}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Sinal: {r.sinal}</p>
                    </li>
                  ))}
                </ul>
              )}

              {data.briefing.riscos.length > 0 && (
                <div className="space-y-1">
                  <h2 className="text-sm font-medium">Riscos</h2>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {data.briefing.riscos.map((risco, i) => (
                      <li key={i}>{risco}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {data?.sinais && data.sinais.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sinais medidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.sinais.map((s) => (
              <div key={s.codigo} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.titulo}</span>
                  <Badge className={severidadeCores[s.severidade as Severidade]}>
                    {s.severidade}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{s.area}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{s.evidencia}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico e decisões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {historico.isPending && <Skeleton className="h-16 w-full" />}

          {historico.data && (
            <>
              {(() => {
                const aceite = resumirAceite(historico.data.acoes);
                return (
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Ações: <span className="text-foreground">{aceite.total}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Pendentes: <span className="text-foreground">{aceite.pendentes}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Taxa de aceite:{" "}
                      <span className="text-foreground">{pctLabel(aceite.taxaAceite)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Execução:{" "}
                      <span className="text-foreground">{pctLabel(aceite.taxaExecucao)}</span>
                    </span>
                  </div>
                );
              })()}

              {historico.data.briefings.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum briefing registrado ainda.</p>
              )}

              <ul className="space-y-4">
                {historico.data.briefings.map((b) => {
                  const acoes = historico.data.acoes.filter((a) => a.briefing_id === b.id);
                  return (
                    <li key={b.id} className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {new Date(b.created_at).toLocaleString("pt-BR")}
                        </span>
                        <Badge variant="outline">{b.prioridade}</Badge>
                      </div>
                      {b.pergunta && (
                        <p className="mt-1 text-xs text-muted-foreground">Pergunta: {b.pergunta}</p>
                      )}
                      {b.resumo && <p className="mt-2 text-sm">{b.resumo}</p>}

                      {acoes.length > 0 && (
                        <ul className="mt-3 space-y-2">
                          {acoes.map((a) => (
                            <li
                              key={a.id}
                              className="rounded-md border border-border/60 p-3 text-sm"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{a.titulo}</span>
                                <Badge variant="outline">{statusLabel[a.status] ?? a.status}</Badge>
                              </div>
                              <p className="mt-1 text-muted-foreground">{a.acao}</p>
                              {a.task_id && (
                                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                  <Icon name="task_alt" className="text-sm" />
                                  Tarefa criada na agenda do responsável
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap gap-2">
                                {a.status === "pendente" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={decisao.isPending}
                                      onClick={() =>
                                        decisao.mutate({ acaoId: a.id, status: "aceita" })
                                      }
                                    >
                                      Aceitar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={decisao.isPending}
                                      onClick={() =>
                                        decisao.mutate({ acaoId: a.id, status: "descartada" })
                                      }
                                    >
                                      Descartar
                                    </Button>
                                  </>
                                )}
                                {a.status === "aceita" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={decisao.isPending}
                                    onClick={() =>
                                      decisao.mutate({ acaoId: a.id, status: "concluida" })
                                    }
                                  >
                                    Marcar como concluída
                                  </Button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
