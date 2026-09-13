import { Badge } from "@/components/ui/badge";
import {
  achatarArvore,
  camadaLabels,
  tipoNoLabels,
  tipoRelacaoLabels,
  type ArvoreProveniencia,
  type CamadaConhecimento,
} from "@/lib/platform/knowledge";

export const camadaCores: Record<CamadaConhecimento, string> = {
  dominio: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  mercado: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  analitico: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  decisao: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  resultado: "bg-muted text-muted-foreground",
};

/**
 * SPRINT 26 — GATE 02/04: árvore de proveniência completa.
 * Nunca resume: renderiza todos os níveis, do nó derivado até a fonte.
 */
export function KnowledgeTree({ arvore }: { arvore: ArvoreProveniencia }) {
  const linhas = achatarArvore(arvore);

  if (linhas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma árvore de proveniência disponível para este nó.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <ol className="space-y-2" aria-label="Cadeia de proveniência, da resposta até a fonte">
        {linhas.map((n, i) => (
          <li
            key={`${n.no.id}-${i}`}
            className="rounded-md border bg-muted/30 p-2 text-xs"
            style={{ marginLeft: `${Math.min(n.profundidade, 8) * 12}px` }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={camadaCores[n.no.proveniencia.camada]}>
                {tipoNoLabels[n.no.tipo]}
              </Badge>
              <span className="font-medium">{n.no.rotulo}</span>
              {n.via ? (
                <span className="text-muted-foreground">↑ {tipoRelacaoLabels[n.via]}</span>
              ) : null}
              {n.ciclo ? (
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  ciclo interrompido
                </Badge>
              ) : null}
            </div>
            <p className="pt-1 text-muted-foreground">
              {camadaLabels[n.no.proveniencia.camada]} · fonte {n.no.proveniencia.fonte}
              {n.no.proveniencia.algoritmo
                ? ` · ${n.no.proveniencia.algoritmo} v${n.no.proveniencia.versaoAlgoritmo}`
                : ""}
              {n.no.proveniencia.adr ? ` · ${n.no.proveniencia.adr}` : ""}
              {n.no.proveniencia.atualizadoEm
                ? ` · ${new Date(n.no.proveniencia.atualizadoEm).toLocaleString("pt-BR")}`
                : " · sem data"}
            </p>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">
        {arvore.totalNos} nós · profundidade {arvore.profundidadeMaxima} · fontes primárias:{" "}
        {arvore.fontes.join(", ") || "—"}.{" "}
        {arvore.completa
          ? "Cadeia completa até o dado original."
          : "Cadeia incompleta: não alcança dado primário."}
      </p>
    </div>
  );
}
