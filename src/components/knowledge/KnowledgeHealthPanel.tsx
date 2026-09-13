import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { checagemLabels, tipoNoLabels, verificarIntegridade } from "@/lib/platform/knowledge";
import {
  dominioLabels,
  knowledgeHealthPlus,
  semaforoLabels,
  type Semaforo,
} from "@/lib/platform/knowledge-quality";
import { getKnowledgeGraph } from "@/lib/platform/knowledge.functions";

/** SPRINT 26 — GATE 08: Knowledge Health Score no Platform Center. */
export function KnowledgeHealthPanel({ workspaceId }: { workspaceId: string | undefined }) {
  const carregar = useServerFn(getKnowledgeGraph);

  const consulta = useQuery({
    queryKey: ["knowledge", "graph", workspaceId, 150],
    queryFn: () => carregar({ data: { workspaceId: workspaceId!, limite: 150 } }),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  });

  const calculado = useMemo(() => {
    const grafo = consulta.data?.grafo;
    if (!grafo) return null;
    const integridade = verificarIntegridade(grafo);
    return { grafo, integridade, saude: knowledgeHealthPlus(grafo, integridade) };
  }, [consulta.data]);

  if (consulta.isLoading) return <Skeleton className="h-64 w-full" />;
  if (consulta.isError || !calculado) {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-6 text-sm">
          Não foi possível ler o grafo de conhecimento.
        </CardContent>
      </Card>
    );
  }

  const { saude, integridade } = calculado;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-base">Knowledge Health Score</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {saude.scoreCompleto == null ? "sem dados" : `${saude.scoreCompleto}/100`}
          </Badge>
          <Link to="/app/knowledge" className="text-xs underline">
            Abrir Knowledge Explorer
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metrica rotulo="Cobertura do grafo" valor={`${saude.cobertura}%`} />
          <Metrica rotulo="Integridade" valor={`${saude.integridade}%`} />
          <Metrica
            rotulo="Relações quebradas"
            valor={String(saude.relacoesQuebradas)}
            alerta={saude.relacoesQuebradas > 0}
          />
          <Metrica rotulo="Proveniência válida" valor={`${saude.provenienciaValida}%`} />
          <Metrica
            rotulo="Nós órfãos"
            valor={String(saude.nosOrfaos)}
            alerta={saude.nosOrfaos > 0}
          />
          <Metrica rotulo="Nós ativos (30 d)" valor={`${saude.nosAtivos} de ${saude.totalNos}`} />
          <Metrica
            rotulo="Tempo médio de atualização"
            valor={
              saude.tempoMedioAtualizacaoHoras == null
                ? "—"
                : `${saude.tempoMedioAtualizacaoHoras} h`
            }
          />
          <Metrica rotulo="Relações válidas" valor={String(calculado.grafo.relacoes.length)} />
          <Metrica
            rotulo="Frescor do conhecimento"
            valor={saude.frescor == null ? "—" : `${saude.frescor}%`}
            alerta={saude.dominiosVencidos.length > 0}
          />
          <Metrica
            rotulo="Confiança do conhecimento"
            valor={saude.confianca == null ? "—" : `${saude.confianca}%`}
          />
        </div>

        {/* SPRINT 26.1 — Knowledge Freshness por domínio. */}
        <div className="space-y-2">
          <p className="text-xs font-medium">Frescor por domínio</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {saude.porDominioFrescor.map((d) => (
              <li
                key={d.dominio}
                className="flex items-center justify-between rounded-md border p-2 text-xs"
              >
                <span>{dominioLabels[d.dominio]}</span>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {d.idadeMedianaHoras == null
                      ? "sem data"
                      : `há ${formatarIdade(d.idadeMedianaHoras)}`}
                  </span>
                  <Badge variant={badgeSemaforo(d.semaforo)}>{semaforoLabels[d.semaforo]}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* SPRINT 26.1 — Knowledge Confidence Score por domínio. */}
        <div className="space-y-2">
          <p className="text-xs font-medium">Confiança por domínio</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {saude.porDominioConfianca.map((d) => (
              <li key={d.dominio} className="rounded-md border p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span>{dominioLabels[d.dominio]}</span>
                  <Badge variant={d.score != null && d.score < 60 ? "destructive" : "secondary"}>
                    {d.score == null ? "sem base" : `${d.score}%`}
                  </Badge>
                </div>
                {d.piorNo ? (
                  <p className="text-muted-foreground">
                    Menor: {d.piorNo.rotulo} ({d.piorNo.score}%)
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium">Verificações de integridade</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {Object.entries(integridade.porChecagem).map(([chave, total]) => (
              <li
                key={chave}
                className="flex items-center justify-between rounded-md border p-2 text-xs"
              >
                <span>{checagemLabels[chave as keyof typeof checagemLabels]}</span>
                <span
                  className={total > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}
                >
                  {total}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {saude.tiposAusentes.length > 0 ? (
          <p className="text-muted-foreground text-xs">
            Tipos da ontologia sem nó neste workspace:{" "}
            {saude.tiposAusentes.map((t) => tipoNoLabels[t]).join(", ")}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Metrica({ rotulo, valor, alerta }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-muted-foreground text-xs">{rotulo}</p>
      <p className={`text-xl font-semibold ${alerta ? "text-destructive" : ""}`}>{valor}</p>
    </div>
  );
}

function formatarIdade(horas: number): string {
  if (horas < 1) return "menos de 1 h";
  if (horas < 48) return `${Math.round(horas)} h`;
  return `${Math.round(horas / 24)} dias`;
}

function badgeSemaforo(s: Semaforo): "secondary" | "outline" | "destructive" {
  if (s === "vermelho") return "destructive";
  if (s === "verde") return "secondary";
  return "outline";
}
