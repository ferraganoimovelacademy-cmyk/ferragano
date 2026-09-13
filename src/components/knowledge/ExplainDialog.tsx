import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { KnowledgeTree } from "@/components/knowledge/KnowledgeTree";
import {
  arvoreProveniencia,
  baseProvenienciaLabels,
  montarEvidenceTrace,
} from "@/lib/platform/knowledge";
import { getKnowledgeGraph } from "@/lib/platform/knowledge.functions";

/**
 * SPRINT 26 — GATE 04/05: "Por que recebi esta recomendação?".
 * Abre a árvore de conhecimento inteira usada para gerar a resposta.
 */
export function ExplainDialog({
  workspaceId,
  titulo = "Por que recebi esta recomendação?",
}: {
  workspaceId: string;
  titulo?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const carregar = useServerFn(getKnowledgeGraph);

  const grafo = useQuery({
    queryKey: ["knowledge", "graph", workspaceId, 120],
    queryFn: () => carregar({ data: { workspaceId, limite: 120 } }),
    enabled: aberto,
    staleTime: 60_000,
  });

  const nos = grafo.data?.grafo.nos.filter((n) => n.tipo === "recomendacao") ?? [];

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {titulo}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Explicabilidade do Advisor</DialogTitle>
          <DialogDescription>
            Cadeia completa de proveniência de cada recomendação: origem, algoritmo, versão, ADR,
            evidência e data. Nada é resumido.
          </DialogDescription>
        </DialogHeader>

        {grafo.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : nos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma recomendação registrada no grafo de conhecimento deste workspace.
          </p>
        ) : (
          <div className="space-y-5">
            {nos.map((no) => {
              const trace = montarEvidenceTrace(grafo.data!.grafo, no.id, {
                criterios: [
                  "impacto × urgência",
                  "confiança estatística",
                  "histórico de resultado",
                ],
                forcaEvidencia: no.detalhe ?? null,
                confianca: null,
              });
              return (
                <section key={no.id} className="space-y-2">
                  <h3 className="text-sm font-semibold">{no.rotulo}</h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">{no.proveniencia.fonte}</Badge>
                    <Badge variant="secondary">
                      {no.proveniencia.algoritmo} v{no.proveniencia.versaoAlgoritmo}
                    </Badge>
                    <Badge variant="secondary">{no.proveniencia.adr}</Badge>
                    <Badge variant="secondary">
                      {baseProvenienciaLabels[no.proveniencia.base]}
                    </Badge>
                  </div>
                  {trace && trace.faltando.length > 0 ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Rastro incompleto — falta: {trace.faltando.join(", ")}.
                    </p>
                  ) : null}
                  <KnowledgeTree arvore={arvoreProveniencia(grafo.data!.grafo, no.id)} />
                </section>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
