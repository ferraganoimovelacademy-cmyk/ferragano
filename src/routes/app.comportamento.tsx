import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSession } from "@/hooks/use-session";
import { useTrackScreen } from "@/hooks/use-telemetry";
import { moeda, numero } from "@/lib/platform/insights";
import { nivelLabels, type Previsao } from "@/lib/platform/predictive";
import {
  canalLabels,
  responsividadeLabels,
  type Engajamento,
  type PerfilComportamental,
} from "@/lib/platform/behavior";
import { getBehaviorPanel } from "@/lib/platform/behavior.functions";

export const Route = createFileRoute("/app/comportamento")({
  head: () => ({
    meta: [
      { title: "Comportamento do cliente — canal, horário e decisão" },
      {
        name: "description",
        content:
          "Perfil comportamental medido de cada cliente: canal favorito, melhor horário, tempo de resposta, velocidade de decisão, sensibilidade a preço e valor realizado.",
      },
      { property: "og:title", content: "Comportamento do cliente — Ferragano One" },
      {
        property: "og:description",
        content:
          "Como abordar cada cliente, com base em interações, propostas e vendas registradas — cada traço com amostra e confiança.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComportamentoPage,
});

const dataHora = (v: string) =>
  new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const engajamentoCor: Record<Engajamento["classe"], string> = {
  ativo: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  morno: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  esfriando: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  inativo: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

const engajamentoLabels: Record<Engajamento["classe"], string> = {
  ativo: "Ativo",
  morno: "Morno",
  esfriando: "Esfriando",
  inativo: "Inativo",
};

/** ADR-021: nenhum traço aparece sem fatores, confiança, base e horário. */
function Traco({
  titulo,
  resumo,
  previsao,
}: {
  titulo: string;
  resumo: string;
  previsao: Previsao<unknown>;
}) {
  return (
    <div className="space-y-1 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{titulo}</p>
        <Badge variant="secondary">
          {previsao.confianca}% · {nivelLabels[previsao.nivel]}
        </Badge>
      </div>
      <p className="text-sm">{resumo}</p>
      {previsao.valor == null && previsao.motivoAusencia ? (
        <p className="text-xs text-muted-foreground">{previsao.motivoAusencia}</p>
      ) : null}
      {previsao.fatores.length > 0 ? (
        <ul className="space-y-1 pt-1 text-xs text-muted-foreground">
          {previsao.fatores.map((f, i) => (
            <li key={`${f.nome}-${i}`} className="flex gap-2">
              <Icon
                name={
                  f.direcao === "positivo"
                    ? "trending_up"
                    : f.direcao === "negativo"
                      ? "trending_down"
                      : "remove"
                }
                className="mt-0.5 text-sm"
              />
              <span>
                <span className="font-medium text-foreground">{f.nome}:</span> {f.detalhe}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted-foreground">Base: {previsao.base}</p>
    </div>
  );
}

function PerfilDetalhe({ p }: { p: PerfilComportamental }) {
  return (
    <div className="space-y-4">
      {p.comoAbordar.length > 0 ? (
        <div className="rounded-md bg-muted p-3">
          <p className="text-sm font-medium">Como abordar</p>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {p.comoAbordar.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Nenhuma recomendação: não há interação, proposta ou venda registrada para medir
          comportamento desta pessoa.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <Traco
          titulo="Canal favorito"
          resumo={
            p.canal.valor
              ? `${canalLabels[p.canal.valor.canal]} — ${numero(p.canal.valor.interacoes)} interações (${numero(p.canal.valor.participacaoPct)}%)`
              : "Não medido"
          }
          previsao={p.canal}
        />
        <Traco
          titulo="Melhor horário"
          resumo={
            p.janela.valor
              ? `${p.janela.valor.hora}h (${p.janela.valor.faixa})${p.janela.valor.diaLabel ? ` · ${p.janela.valor.diaLabel}` : ""}`
              : "Não medido"
          }
          previsao={p.janela}
        />
        <Traco
          titulo="Tempo de resposta"
          resumo={
            p.resposta.valor
              ? `${numero(p.resposta.valor.horas)}h — ${responsividadeLabels[p.resposta.valor.classe]}`
              : "Não medido"
          }
          previsao={p.resposta}
        />
        <Traco
          titulo="Velocidade de decisão"
          resumo={
            p.velocidade.valor
              ? `${p.velocidade.valor.classe === "rapida" ? "Rápida" : p.velocidade.valor.classe === "media" ? "Média" : "Longa"}${
                  p.velocidade.valor.cicloFechamentoDias != null
                    ? ` · ciclo de ${numero(p.velocidade.valor.cicloFechamentoDias)} dias`
                    : ""
                }`
              : "Não medida"
          }
          previsao={p.velocidade}
        />
        <Traco
          titulo="Sensibilidade a preço"
          resumo={
            p.preco.valor
              ? `${p.preco.valor.classe === "alta" ? "Alta" : p.preco.valor.classe === "media" ? "Média" : "Baixa"}${
                  p.preco.valor.descontoMedioPct != null
                    ? ` · ${numero(p.preco.valor.descontoMedioPct)}% de desconto médio`
                    : ""
                }`
              : "Não medida"
          }
          previsao={p.preco}
        />
        <Traco
          titulo="Perfil de compra"
          resumo={
            p.perfil.valor
              ? `Declarado: ${p.perfil.valor.declarado ?? "—"} · observado: ${p.perfil.valor.observado}`
              : "Não medido"
          }
          previsao={p.perfil}
        />
        <Traco
          titulo="Objeções registradas"
          resumo={p.objecoes.valor ? p.objecoes.valor.join(" · ") : "Nenhuma"}
          previsao={p.objecoes}
        />
        <Traco
          titulo="Valor realizado"
          resumo={
            p.valor.valor
              ? `${moeda(p.valor.valor.ltv)} em ${numero(p.valor.valor.vendas)} venda(s)`
              : "Sem venda assinada"
          }
          previsao={p.valor}
        />
        <Traco
          titulo="Propensão a indicar"
          resumo={
            p.indicacao.valor
              ? `${p.indicacao.valor.classe === "alta" ? "Alta" : p.indicacao.valor.classe === "media" ? "Média" : "Baixa"} · ${numero(p.indicacao.valor.indicacoesFeitas)} indicação(ões)`
              : "Não medida"
          }
          previsao={p.indicacao}
        />
        <Traco
          titulo="Engajamento"
          resumo={
            p.engajamento.valor
              ? `${p.engajamento.valor.score}/100 · ${engajamentoLabels[p.engajamento.valor.classe]}`
              : "Não medido"
          }
          previsao={p.engajamento}
        />
      </div>
    </div>
  );
}

function ComportamentoPage() {
  useTrackScreen("observability", "behavioral_intelligence");
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const carregar = useServerFn(getBehaviorPanel);
  const [busca, setBusca] = useState("");

  const painel = useQuery({
    queryKey: ["behavior-panel", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => carregar({ data: { workspaceId: workspaceId! } }),
  });

  const perfis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = painel.data?.perfis ?? [];
    return termo ? lista.filter((p) => p.nome.toLowerCase().includes(termo)) : lista;
  }, [painel.data, busca]);

  const panorama = painel.data?.panorama;

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Comportamento do cliente</h1>
        <p className="text-sm text-muted-foreground">
          Como cada pessoa se comporta, medido a partir das interações, propostas e vendas já
          registradas. Nenhum traço é inferido por IA: sem amostra, o sistema diz que não sabe.
        </p>
      </header>

      {painel.isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : null}

      {painel.isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Não foi possível ler o comportamento das pessoas deste workspace.
          </CardContent>
        </Card>
      ) : null}

      {panorama ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pessoas com comportamento medido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight">
                  {numero(panorama.comEvidencia)} / {numero(panorama.pessoas)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Cobertura média da evidência: {numero(panorama.coberturaMedia)}%.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Canal predominante
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight">
                  {panorama.canais[0] ? canalLabels[panorama.canais[0].canal] : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {panorama.canais[0]
                    ? `${numero(panorama.canais[0].pessoas)} pessoa(s), ${numero(panorama.canais[0].participacaoPct)}% de quem tem canal medido.`
                    : "Nenhuma pessoa com amostra suficiente de interações."}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tempo médio de resposta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight">
                  {panorama.respostaMediaHoras == null
                    ? "—"
                    : `${numero(panorama.respostaMediaHoras)}h`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {panorama.respostaMediaHoras == null
                    ? "Nenhuma proposta com envio e resposta registrados."
                    : "Medido entre proposta enviada e respondida."}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Valor realizado na carteira
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight">{moeda(panorama.ltvTotal)}</p>
                <p className="text-xs text-muted-foreground">
                  {panorama.cicloMedioDias == null
                    ? "Ciclo de fechamento ainda não medido."
                    : `Ciclo médio de fechamento: ${numero(panorama.cicloMedioDias)} dias.`}
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Engajamento da carteira</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(Object.keys(panorama.engajamento) as Array<Engajamento["classe"]>).map((c) => (
                  <div key={c} className="flex items-center justify-between text-sm">
                    <Badge className={engajamentoCor[c]} variant="secondary">
                      {engajamentoLabels[c]}
                    </Badge>
                    <span>{numero(panorama.engajamento[c])} pessoa(s)</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Melhor faixa de contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {panorama.faixas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma pessoa com amostra suficiente de horário.
                  </p>
                ) : (
                  panorama.faixas.map((f) => (
                    <div key={f.faixa} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{f.faixa}</span>
                      <span>{numero(f.pessoas)} pessoa(s)</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Objeções mais registradas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {panorama.objecoesTop.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum motivo de perda registrado nas oportunidades.
                  </p>
                ) : (
                  panorama.objecoesTop.map((o) => (
                    <div key={o.motivo} className="flex items-center justify-between gap-2 text-sm">
                      <span>{o.motivo}</span>
                      <span className="text-muted-foreground">
                        {numero(o.ocorrencias)} pessoa(s)
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader className="gap-3">
              <CardTitle className="text-base">Perfil por pessoa</CardTitle>
              <div className="max-w-sm space-y-1">
                <Label htmlFor="busca-comportamento">Buscar pessoa</Label>
                <Input
                  id="busca-comportamento"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
            </CardHeader>
            <CardContent>
              {perfis.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma pessoa encontrada para este filtro.
                </p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {perfis.slice(0, 50).map((p) => (
                    <AccordionItem key={p.personId} value={p.personId}>
                      <AccordionTrigger className="text-left">
                        <span className="flex flex-1 flex-wrap items-center gap-2 pr-2">
                          <span className="font-medium">{p.nome}</span>
                          {p.engajamento.valor ? (
                            <Badge
                              className={engajamentoCor[p.engajamento.valor.classe]}
                              variant="secondary"
                            >
                              {engajamentoLabels[p.engajamento.valor.classe]} ·{" "}
                              {p.engajamento.valor.score}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Sem evidência</Badge>
                          )}
                          {p.canal.valor ? (
                            <span className="text-xs text-muted-foreground">
                              {canalLabels[p.canal.valor.canal]}
                            </span>
                          ) : null}
                          {p.valor.valor ? (
                            <span className="text-xs text-muted-foreground">
                              {moeda(p.valor.valor.ltv)}
                            </span>
                          ) : null}
                          <span className="text-xs text-muted-foreground">
                            Cobertura {numero(p.cobertura)}%
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <PerfilDetalhe p={p} />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
              {painel.data ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Perfis calculados em {dataHora(painel.data.geradoEm)}.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
