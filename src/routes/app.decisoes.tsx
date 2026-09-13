import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/use-session";
import { useTrackScreen } from "@/hooks/use-telemetry";
import { isAdminRole } from "@/lib/platform/roles";
import {
  isGestaoRole,
  moeda,
  numero,
  origemLabels,
  percentual,
  severidadeCores,
  type Severidade,
} from "@/lib/platform/insights";
import {
  getCustomer360,
  getExecutive360,
  getMarketing360,
  getProperty360,
  getSales360,
} from "@/lib/platform/insights.functions";

export const Route = createFileRoute("/app/decisoes")({
  head: () => ({
    meta: [
      { title: "Decision Center — Ferragano One" },
      {
        name: "description",
        content:
          "Painéis 360 de cliente, imóvel, vendas, executivo e marketing lidos do Read Model para apoiar decisão comercial.",
      },
      { property: "og:title", content: "Decision Center — Ferragano One" },
      {
        property: "og:description",
        content: "Read Models 360 do Ferragano One: gargalos, SLA, liquidez, forecast e origem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DecisoesPage,
});

const dataHora = (v: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

function Metrica({ label, valor, detalhe }: { label: string; valor: string; detalhe?: string }) {
  return (
    <div className="border-border rounded-md border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-display text-xl font-semibold tracking-tight">{valor}</p>
      {detalhe && <p className="text-muted-foreground text-xs">{detalhe}</p>}
    </div>
  );
}

function Alerta({ nivel, texto }: { nivel: Severidade; texto: string }) {
  return <Badge className={severidadeCores[nivel]}>{texto}</Badge>;
}

function DecisoesPage() {
  useTrackScreen("observability", "decision_center", { surface: "app.decisoes" });
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const admin = isAdminRole(session?.roles);
  const gestao = isGestaoRole(session?.roles);
  const [aba, setAba] = useState("clientes");

  const clientesFn = useServerFn(getCustomer360);
  const imoveisFn = useServerFn(getProperty360);
  const vendasFn = useServerFn(getSales360);
  const executivoFn = useServerFn(getExecutive360);
  const marketingFn = useServerFn(getMarketing360);

  const clientes = useQuery({
    queryKey: ["customer-360", workspaceId],
    queryFn: () => clientesFn({ data: { workspaceId: workspaceId!, personId: null, limite: 50 } }),
    enabled: Boolean(workspaceId),
  });

  const imoveis = useQuery({
    queryKey: ["property-360", workspaceId],
    queryFn: () => imoveisFn({ data: { workspaceId: workspaceId!, empreendimentoId: null } }),
    enabled: Boolean(workspaceId),
  });

  const vendas = useQuery({
    queryKey: ["sales-360", workspaceId],
    queryFn: () => vendasFn({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId) && gestao,
  });

  const executivo = useQuery({
    queryKey: ["executive-360", workspaceId],
    queryFn: () => executivoFn({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId) && admin,
  });

  const marketing = useQuery({
    queryKey: ["marketing-360", workspaceId],
    queryFn: () => marketingFn({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId) && admin,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Decision Center</h1>
        <p className="text-muted-foreground text-sm">
          Painéis 360 calculados a partir dos eventos do sistema, recalculados a cada 10 minutos.
          Nenhuma tela aqui consulta tabelas operacionais.
        </p>
      </header>

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="clientes">Cliente 360</TabsTrigger>
          <TabsTrigger value="imoveis">Imóvel 360</TabsTrigger>
          {gestao && <TabsTrigger value="vendas">Vendas 360</TabsTrigger>}
          {admin && <TabsTrigger value="executivo">Executivo 360</TabsTrigger>}
          {admin && <TabsTrigger value="marketing">Marketing 360</TabsTrigger>}
        </TabsList>

        {/* ------------------------------ CLIENTE ------------------------------ */}
        <TabsContent value="clientes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pessoas por prioridade de decisão</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {clientes.isPending ? (
                <Skeleton className="h-64 w-full" />
              ) : (clientes.data ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma pessoa no painel ainda. Os dados aparecem no próximo recálculo.
                </p>
              ) : (
                <table className="w-full min-w-[900px] text-sm">
                  <caption className="sr-only">Pessoas por prioridade de decisão</caption>
                  <thead>
                    <tr className="border-border border-b">
                      <th className="p-2 text-left font-medium">Pessoa</th>
                      <th className="p-2 text-left font-medium">Score</th>
                      <th className="p-2 text-left font-medium">Jornada</th>
                      <th className="p-2 text-right font-medium">Pipeline</th>
                      <th className="p-2 text-left font-medium">Oport.</th>
                      <th className="p-2 text-left font-medium">Sinais</th>
                      <th className="p-2 text-left font-medium">Último contato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(clientes.data ?? []).map((c) => (
                      <tr key={c.personId} className="border-border border-b last:border-0">
                        <td className="p-2">
                          <span className="font-medium">{c.nome}</span>
                          {c.origem && (
                            <span className="text-muted-foreground block text-xs">
                              {origemLabels[c.origem] ?? c.origem}
                            </span>
                          )}
                        </td>
                        <td className="p-2 font-mono">{c.score}</td>
                        <td className="p-2 text-xs capitalize">{c.estagioJornada ?? "—"}</td>
                        <td className="p-2 text-right">{moeda(c.valorPipeline)}</td>
                        <td className="p-2 text-xs">
                          {c.oportunidadesAbertas} abertas · {c.oportunidadesGanhas} ganhas
                        </td>
                        <td className="space-x-1 p-2">
                          {!c.temQualificacao && (
                            <Alerta nivel="atencao" texto="sem qualificação" />
                          )}
                          {c.tarefasAtrasadas > 0 && (
                            <Alerta
                              nivel="critico"
                              texto={`${c.tarefasAtrasadas} tarefa(s) atrasada(s)`}
                            />
                          )}
                          {c.diasSemContato != null && c.diasSemContato >= 15 && (
                            <Alerta nivel="critico" texto={`${c.diasSemContato}d sem contato`} />
                          )}
                          {c.restricaoCredito && <Alerta nivel="atencao" texto="restrição" />}
                        </td>
                        <td className="text-muted-foreground p-2 text-xs">
                          {dataHora(c.ultimaInteracaoEm)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------ IMÓVEL ------------------------------ */}
        <TabsContent value="imoveis" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Liquidez e velocidade por empreendimento</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {imoveis.isPending ? (
                <Skeleton className="h-64 w-full" />
              ) : (imoveis.data ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum empreendimento no painel.</p>
              ) : (
                <table className="w-full min-w-[960px] text-sm">
                  <caption className="sr-only">Liquidez e velocidade por empreendimento</caption>
                  <thead>
                    <tr className="border-border border-b">
                      <th className="p-2 text-left font-medium">Empreendimento</th>
                      <th className="p-2 text-left font-medium">Estoque</th>
                      <th className="p-2 text-right font-medium">Preço médio</th>
                      <th className="p-2 text-left font-medium">Velocidade</th>
                      <th className="p-2 text-left font-medium">Cobertura</th>
                      <th className="p-2 text-left font-medium">Conversão</th>
                      <th className="p-2 text-left font-medium">Perfil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(imoveis.data ?? []).map((p) => (
                      <tr key={p.empreendimentoId} className="border-border border-b last:border-0">
                        <td className="p-2">
                          <span className="font-medium">{p.nome}</span>
                          <span className="text-muted-foreground block text-xs">
                            {[p.cidade, p.uf].filter(Boolean).join("/") || "—"} ·{" "}
                            {p.segmento ?? "—"}
                          </span>
                        </td>
                        <td className="p-2 text-xs">
                          {p.unidadesDisponiveis}/{p.unidadesTotal} disponíveis
                          <span className="text-muted-foreground block">
                            {p.unidadesReservadas} reservadas · {p.unidadesVendidas} vendidas
                          </span>
                        </td>
                        <td className="p-2 text-right">{moeda(p.precoMedio)}</td>
                        <td className="p-2 text-xs">
                          {numero(p.velocidadeMensal)} un./mês
                          <span className="text-muted-foreground block">
                            {p.estoqueMeses != null
                              ? `${numero(p.estoqueMeses)} meses de estoque`
                              : "sem venda em 90d"}
                          </span>
                        </td>
                        <td className="p-2 text-xs">
                          {p.visitas30d} visitas 30d · {p.oportunidadesAbertas} oport.
                        </td>
                        <td className="p-2">
                          <Alerta
                            nivel={
                              p.conversaoPercentual >= 20
                                ? "ok"
                                : p.conversaoPercentual >= 8
                                  ? "atencao"
                                  : "critico"
                            }
                            texto={percentual(p.conversaoPercentual)}
                          />
                        </td>
                        <td className="p-2 text-xs capitalize">{p.perfilPredominante ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------ VENDAS ------------------------------ */}
        {gestao && (
          <TabsContent value="vendas" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gargalos por corretor</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {vendas.isPending ? (
                  <Skeleton className="h-64 w-full" />
                ) : vendas.isError ? (
                  <p className="text-muted-foreground text-sm">{(vendas.error as Error).message}</p>
                ) : (vendas.data ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma carteira no painel.</p>
                ) : (
                  <table className="w-full min-w-[980px] text-sm">
                    <caption className="sr-only">Gargalos por corretor</caption>
                    <thead>
                      <tr className="border-border border-b">
                        <th className="p-2 text-left font-medium">Responsável</th>
                        <th className="p-2 text-right font-medium">Pipeline</th>
                        <th className="p-2 text-right font-medium">Ponderado</th>
                        <th className="p-2 text-left font-medium">Conversão</th>
                        <th className="p-2 text-left font-medium">Tempo médio</th>
                        <th className="p-2 text-left font-medium">Gargalos</th>
                        <th className="p-2 text-left font-medium">Atividade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(vendas.data ?? []).map((v) => (
                        <tr key={v.responsavelId} className="border-border border-b last:border-0">
                          <td className="p-2 font-medium">{v.responsavelNome}</td>
                          <td className="p-2 text-right">{moeda(v.valorPipeline)}</td>
                          <td className="p-2 text-right">{moeda(v.valorPonderado)}</td>
                          <td className="p-2 text-xs">
                            {percentual(v.conversaoPercentual)}
                            <span className="text-muted-foreground block">
                              {v.ganhas30d} ganhas / {v.perdidas30d} perdidas em 30d
                            </span>
                          </td>
                          <td className="p-2 text-xs">
                            {v.tempoMedioGanhoDias != null
                              ? `${numero(v.tempoMedioGanhoDias)}d até ganho`
                              : "—"}
                            <span className="text-muted-foreground block">
                              {v.tempoMedioEtapaDias != null
                                ? `${numero(v.tempoMedioEtapaDias)}d na etapa atual`
                                : "—"}
                            </span>
                          </td>
                          <td className="space-x-1 space-y-1 p-2">
                            {v.slaEstourado > 0 && (
                              <Alerta nivel="critico" texto={`${v.slaEstourado} SLA`} />
                            )}
                            {v.followupPerdido > 0 && (
                              <Alerta
                                nivel="critico"
                                texto={`${v.followupPerdido} follow-up vencido`}
                              />
                            )}
                            {v.semProximaAcao > 0 && (
                              <Alerta
                                nivel="atencao"
                                texto={`${v.semProximaAcao} sem próxima ação`}
                              />
                            )}
                            {v.tarefasAtrasadas > 0 && (
                              <Alerta
                                nivel="atencao"
                                texto={`${v.tarefasAtrasadas} tarefas atrasadas`}
                              />
                            )}
                            {v.slaEstourado +
                              v.followupPerdido +
                              v.semProximaAcao +
                              v.tarefasAtrasadas ===
                              0 && <Alerta nivel="ok" texto="em dia" />}
                          </td>
                          <td className="p-2 text-xs">
                            {v.diasSemAtividade == null ? (
                              <Alerta nivel="critico" texto="sem atividade registrada" />
                            ) : v.diasSemAtividade >= 7 ? (
                              <Alerta nivel="critico" texto={`${v.diasSemAtividade}d parado`} />
                            ) : (
                              <span className="text-muted-foreground">
                                {v.atividades7d} ações em 7d
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ----------------------------- EXECUTIVO ----------------------------- */}
        {admin && (
          <TabsContent value="executivo" className="mt-4 space-y-4">
            {executivo.isPending ? (
              <Skeleton className="h-64 w-full" />
            ) : !executivo.data ? (
              <p className="text-muted-foreground text-sm">Painel executivo sem dados ainda.</p>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Forecast e realizado</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Metrica
                      label="Pipeline aberto"
                      valor={moeda(executivo.data.pipelineTotal)}
                      detalhe={`${executivo.data.oportunidadesAbertas} oportunidades`}
                    />
                    <Metrica
                      label="Receita prevista (ponderada)"
                      valor={moeda(executivo.data.receitaPrevista)}
                      detalhe="valor × probabilidade"
                    />
                    <Metrica
                      label="Realizado no mês"
                      valor={moeda(executivo.data.receitaRealizadaMes)}
                      detalhe={`${executivo.data.ganhasMes} fechamentos`}
                    />
                    <Metrica
                      label="Em assinatura"
                      valor={moeda(executivo.data.receitaEmAssinatura)}
                      detalhe={`${executivo.data.vendasAssinadas} vendas assinadas`}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Eficiência e estoque</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Metrica
                      label="Conversão geral"
                      valor={percentual(executivo.data.conversaoPercentual)}
                      detalhe={`${executivo.data.ganhasTotal} ganhas / ${executivo.data.perdidasTotal} perdidas`}
                    />
                    <Metrica
                      label="Ticket médio"
                      valor={moeda(executivo.data.ticketMedio)}
                      detalhe={`ciclo médio ${numero(executivo.data.tempoMedioCicloDias)} dias`}
                    />
                    <Metrica
                      label="VGV disponível"
                      valor={moeda(executivo.data.vgvDisponivel)}
                      detalhe={`${executivo.data.unidadesDisponiveis}/${executivo.data.unidadesTotal} unidades`}
                    />
                    <Metrica
                      label="Base de pessoas"
                      valor={numero(executivo.data.pessoasTotal)}
                      detalhe={`${executivo.data.pessoas30d} novas em 30d · ${executivo.data.clientesTotal} clientes`}
                    />
                  </CardContent>
                </Card>

                <p className="text-muted-foreground flex items-start gap-2 text-xs">
                  <Icon name="info" className="text-base" />
                  CAC e ROI dependem de investimento por canal, que ainda não é registrado. Entram
                  no painel quando o módulo financeiro/marketing passar a lançar custo de mídia.
                </p>
              </>
            )}
          </TabsContent>
        )}

        {/* ----------------------------- MARKETING ----------------------------- */}
        {admin && (
          <TabsContent value="marketing" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Origem e conversão</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {marketing.isPending ? (
                  <Skeleton className="h-64 w-full" />
                ) : (marketing.data ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma origem registrada ainda.</p>
                ) : (
                  <table className="w-full min-w-[880px] text-sm">
                    <caption className="sr-only">Conversão por origem de marketing</caption>
                    <thead>
                      <tr className="border-border border-b">
                        <th className="p-2 text-left font-medium">Origem</th>
                        <th className="p-2 text-left font-medium">Pessoas</th>
                        <th className="p-2 text-left font-medium">Oportunidades</th>
                        <th className="p-2 text-left font-medium">Conversão</th>
                        <th className="p-2 text-right font-medium">Ganho</th>
                        <th className="p-2 text-right font-medium">Ticket</th>
                        <th className="p-2 text-left font-medium">Ciclo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(marketing.data ?? []).map((m) => (
                        <tr key={m.origem} className="border-border border-b last:border-0">
                          <td className="p-2 font-medium">{origemLabels[m.origem] ?? m.origem}</td>
                          <td className="p-2 text-xs">
                            {numero(m.pessoasTotal)}
                            <span className="text-muted-foreground block">
                              {m.pessoas30d} em 30d
                            </span>
                          </td>
                          <td className="p-2 text-xs">
                            {numero(m.oportunidadesTotal)}
                            <span className="text-muted-foreground block">
                              {m.oportunidadesAbertas} abertas · {m.ganhasTotal} ganhas
                            </span>
                          </td>
                          <td className="p-2">
                            <Alerta
                              nivel={
                                m.conversaoPercentual >= 20
                                  ? "ok"
                                  : m.conversaoPercentual >= 8
                                    ? "atencao"
                                    : "critico"
                              }
                              texto={percentual(m.conversaoPercentual)}
                            />
                          </td>
                          <td className="p-2 text-right">{moeda(m.valorGanho)}</td>
                          <td className="p-2 text-right">{moeda(m.ticketMedio)}</td>
                          <td className="p-2 text-xs">
                            {m.tempoMedioConversaoDias > 0
                              ? `${numero(m.tempoMedioConversaoDias)}d`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
