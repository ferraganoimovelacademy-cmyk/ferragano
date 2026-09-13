import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { severidadeCores } from "@/lib/platform/insights";
import { priorizarRecomendacoes } from "@/lib/platform/decision-intelligence";
import {
  quadranteCores,
  quadranteLabels,
  rankearRecomendacoes,
  recommendationResultCores,
  recommendationResultLabels,
  recommendationStatusLabels,
} from "@/lib/platform/recommendation";
import {
  advisorConfidenceLabels,
  briefingExecutivo,
  decisionTimeline,
  inteligenciaSemanal,
  responderPergunta,
  type AdvisoryEntrada,
  type AdvisorConfidence,
} from "@/lib/platform/advisory";
import { getAdvisoryContext } from "@/lib/platform/advisory.functions";

/**
 * SPRINT 22 — ADVISORY. Camada de comunicação: o servidor entrega evidência
 * certificada (Read Models + Automation/Decision Intelligence + memória de
 * recomendações) e a composição executiva é lógica pura no cliente.
 */

const etapaLabels: Record<string, string> = {
  gerada: "Gerada",
  vista: "Vista",
  aceita: "Aceita",
  implementada: "Implementada",
  avaliada: "Resultado",
  arquivada: "Arquivada",
};

function Confianca({ c }: { c: AdvisorConfidence }) {
  return (
    <details className="rounded-lg border border-border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        Confiança da análise: {c.valor === null ? "sem evidência suficiente" : `${c.valor}%`} ·{" "}
        {advisorConfidenceLabels[c.nivel]}
      </summary>
      <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
        {c.motivos.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </details>
  );
}

export function AdvisoryPanel({
  workspaceId,
  nome,
}: {
  workspaceId: string;
  nome?: string | null;
}) {
  const carregar = useServerFn(getAdvisoryContext);
  const [pergunta, setPergunta] = useState("");
  const [perguntaEnviada, setPerguntaEnviada] = useState<string | null>(null);

  const contexto = useQuery({
    queryKey: ["advisory-context", workspaceId],
    queryFn: () => carregar({ data: { workspaceId } }),
  });

  const entrada = useMemo<AdvisoryEntrada | null>(() => {
    const c = contexto.data;
    if (!c) return null;
    const recomendacoes = c.inteligencia
      ? rankearRecomendacoes(priorizarRecomendacoes(c.inteligencia))
      : [];
    return {
      snapshot: c.snapshot,
      sinais: c.sinais,
      inteligencia: c.inteligencia,
      recomendacoes,
      empreendimentos: c.empreendimentos,
      memoria: c.memoria,
      qualidade: c.qualidade,
    };
  }, [contexto.data]);

  const briefing = useMemo(
    () => (entrada ? briefingExecutivo(entrada, { nome }) : null),
    [entrada, nome],
  );
  const semanal = useMemo(() => (entrada ? inteligenciaSemanal(entrada) : null), [entrada]);
  const timeline = useMemo(() => (entrada ? decisionTimeline(entrada.memoria) : null), [entrada]);
  const resposta = useMemo(
    () => (entrada && perguntaEnviada ? responderPergunta(perguntaEnviada, entrada) : null),
    [entrada, perguntaEnviada],
  );

  if (contexto.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Advisory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (contexto.isError || !briefing || !semanal || !timeline) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive" role="alert">
          Não foi possível carregar o contexto do Advisory.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* GATE 01 — Executive Briefing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Briefing executivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium">{briefing.saudacao}</p>
            <p className="text-sm text-muted-foreground">{briefing.abertura}</p>
          </div>

          {briefing.numeros.length > 0 && (
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {briefing.numeros.map((l) => (
                <div key={l.rotulo} className="rounded-lg border border-border p-3">
                  <dt className="text-xs text-muted-foreground">{l.rotulo}</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="text-lg font-semibold">{l.valor}</span>
                    {l.tom !== "ok" && (
                      <Badge className={severidadeCores[l.tom]} variant="outline">
                        {l.tom === "critico" ? "Crítico" : "Atenção"}
                      </Badge>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {briefing.atencoes.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Atenção</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {briefing.atencoes.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {briefing.proximoPasso && (
            <p className="rounded-lg bg-muted p-3 text-sm">
              <span className="font-medium">Próximo passo: </span>
              {briefing.proximoPasso}
            </p>
          )}

          <Confianca c={briefing.confianca} />
        </CardContent>
      </Card>

      {/* GATE 03 — Natural Language Query */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pergunte ao Advisor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="advisory-nlq">
              Pergunta sobre conversão, follow-up, corretores, empreendimentos, estoque, automações
              ou prioridade
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="advisory-nlq"
                value={pergunta}
                maxLength={300}
                placeholder="Ex.: quais regras estão prejudicando vendas?"
                onChange={(e) => setPergunta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setPerguntaEnviada(pergunta);
                }}
              />
              <Button type="button" onClick={() => setPerguntaEnviada(pergunta)}>
                <Icon name="search" />
                <span>Responder</span>
              </Button>
            </div>
          </div>

          {resposta && (
            <div className="space-y-2" aria-live="polite">
              <p className="text-sm leading-relaxed">{resposta.resposta}</p>
              {resposta.evidencias.length > 0 && (
                <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                  {resposta.evidencias.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              )}
              <Confianca c={resposta.confianca} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* GATE 02 — Weekly Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Inteligência da semana ({semanal.periodoDias} dias)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">{semanal.tendencia}</p>

          <div className="grid gap-4 md:grid-cols-2">
            <Bloco titulo="Gargalos" itens={semanal.gargalos} />
            <Bloco titulo="Oportunidades" itens={semanal.oportunidades} />
            <Bloco titulo="Riscos" itens={semanal.riscos} />
            <Bloco
              titulo="Automações críticas"
              itens={semanal.automacoesCriticas.map((a) => `${a.nome} — ${a.evidencia}`)}
            />
          </div>

          {semanal.empreendimentosEmAlta.length > 0 && (
            <div className="space-y-1">
              <h3 className="font-medium">Empreendimentos em alta</h3>
              <ul className="space-y-1 text-muted-foreground">
                {semanal.empreendimentosEmAlta.map((p) => (
                  <li key={p.nome}>
                    <span className="text-foreground">{p.nome}</span> — {p.evidencia}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {semanal.melhoresCorretores.length > 0 && (
            <div className="space-y-1">
              <h3 className="font-medium">Melhores corretores</h3>
              <ul className="space-y-1 text-muted-foreground">
                {semanal.melhoresCorretores.map((c) => (
                  <li key={c.nome}>
                    <span className="text-foreground">{c.nome}</span> — {c.evidencia}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GATE 04 — Decision Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Linha do tempo das decisões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            {timeline.tempoMedioImplementacaoDias === null
              ? "Nenhuma recomendação implementada ainda: não há tempo médio a informar."
              : `Tempo médio entre gerar e implementar: ${timeline.tempoMedioImplementacaoDias.toFixed(1)} dia(s). ${timeline.ciclosFechados} ciclo(s) fechado(s) com desfecho medido.`}
          </p>

          {timeline.itens.length === 0 ? (
            <p className="text-muted-foreground">
              A memória de recomendações está vazia neste workspace.
            </p>
          ) : (
            <ul className="space-y-3">
              {timeline.itens.slice(0, 10).map((item) => (
                <li key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.ruleNome ?? item.chave}</span>
                    <Badge className={recommendationResultCores[item.resultado]} variant="outline">
                      {recommendationResultLabels[item.resultado]}
                    </Badge>
                    {item.diasAteImplementacao !== null && (
                      <span className="text-xs text-muted-foreground">
                        implementada em {item.diasAteImplementacao.toFixed(1)} dia(s)
                      </span>
                    )}
                  </div>
                  {item.mensagem && <p className="mt-1 text-muted-foreground">{item.mensagem}</p>}
                  <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {item.etapas.map((e, i) => (
                      <li key={e.etapa} className="flex items-center gap-2">
                        {i > 0 && <span aria-hidden="true">→</span>}
                        <span>
                          {etapaLabels[e.etapa] ?? e.etapa}
                          {e.diasDesdeGeracao > 0 && ` (+${e.diasDesdeGeracao.toFixed(1)}d)`}
                        </span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Fila priorizada, com quadrante e status de memória */}
      {entrada && entrada.recomendacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fila priorizada</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {entrada.recomendacoes.slice(0, 5).map((rec) => {
                const memoria = entrada.memoria.find((m) => m.chave === rec.chave);
                return (
                  <li key={rec.chave} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{rec.posicao}º</span>
                      <Badge className={quadranteCores[rec.quadrante]} variant="outline">
                        {quadranteLabels[rec.quadrante]}
                      </Badge>
                      {memoria && (
                        <Badge variant="outline">
                          {recommendationStatusLabels[memoria.status]}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1">{rec.mensagem}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{rec.forecast.texto}</p>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Bloco({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <div className="space-y-1">
      <h3 className="font-medium">{titulo}</h3>
      {itens.length === 0 ? (
        <p className="text-muted-foreground">Nada medido nesta janela.</p>
      ) : (
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          {itens.map((i, idx) => (
            <li key={idx}>{i}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
