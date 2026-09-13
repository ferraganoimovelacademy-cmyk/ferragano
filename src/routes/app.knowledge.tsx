import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { useTrackScreen } from "@/hooks/use-telemetry";
import { KnowledgeTree, camadaCores } from "@/components/knowledge/KnowledgeTree";
import {
  TIPOS_NO,
  arvoreProveniencia,
  camadaLabels,
  checagemLabels,
  knowledgeHealth,
  timelineConhecimento,
  tipoNoLabels,
  tipoRelacaoLabels,
  verificarIntegridade,
  type TipoNo,
} from "@/lib/platform/knowledge";
import { getKnowledgeGraph } from "@/lib/platform/knowledge.functions";

export const Route = createFileRoute("/app/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Explorer — grafo de conhecimento" },
      {
        name: "description",
        content:
          "Navegue pelo grafo de conhecimento do Ferragano One: pessoas, oportunidades, empreendimentos, mercado, evidências e recomendações com proveniência completa.",
      },
      { property: "og:title", content: "Knowledge Explorer — grafo de conhecimento" },
      {
        property: "og:description",
        content:
          "Cada decisão rastreável até o dado original: ontologia, relações, timeline do conhecimento e integridade do grafo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KnowledgePage,
});

function KnowledgePage() {
  useTrackScreen("observability", "knowledge_explorer");
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id ?? null;
  const carregar = useServerFn(getKnowledgeGraph);

  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<TipoNo | "todos">("todos");
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const consulta = useQuery({
    queryKey: ["knowledge", "graph", workspaceId, 150],
    queryFn: () => carregar({ data: { workspaceId: workspaceId!, limite: 150 } }),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  });

  const grafo = consulta.data?.grafo;

  const integridade = useMemo(() => (grafo ? verificarIntegridade(grafo) : null), [grafo]);
  const saude = useMemo(
    () => (grafo && integridade ? knowledgeHealth(grafo, integridade) : null),
    [grafo, integridade],
  );
  const timeline = useMemo(() => (grafo ? timelineConhecimento(grafo, 60) : []), [grafo]);

  const nosFiltrados = useMemo(() => {
    if (!grafo) return [];
    const termo = busca.trim().toLowerCase();
    return grafo.nos.filter(
      (n) =>
        (tipo === "todos" || n.tipo === tipo) &&
        (!termo || n.rotulo.toLowerCase().includes(termo) || n.id.toLowerCase().includes(termo)),
    );
  }, [grafo, busca, tipo]);

  const arvore = useMemo(
    () => (grafo && selecionado ? arvoreProveniencia(grafo, selecionado) : null),
    [grafo, selecionado],
  );

  if (!workspaceId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Selecione um workspace para explorar o grafo de conhecimento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Bounded context Knowledge: organiza o conhecimento produzido pela plataforma sem duplicar
          dados. Leitura exclusiva pela Query Layer — cada nó é uma referência com proveniência.
        </p>
      </header>

      {consulta.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : consulta.isError || !grafo || !integridade || !saude ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Não foi possível carregar o grafo de conhecimento.
          </CardContent>
        </Card>
      ) : (
        <>
          {consulta.data?.fontesIndisponiveis.length ? (
            <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              Visão parcial declarada: fontes indisponíveis nesta leitura —{" "}
              {consulta.data.fontesIndisponiveis.join(", ")}.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador
              titulo="Nós"
              valor={String(saude.totalNos)}
              nota={`${saude.nosAtivos} ativos em 30 dias`}
            />
            <Indicador
              titulo="Relações"
              valor={String(grafo.relacoes.length)}
              nota={`${saude.relacoesQuebradas} quebradas`}
            />
            <Indicador
              titulo="Cobertura da ontologia"
              valor={`${saude.cobertura}%`}
              nota={`${TIPOS_NO.length} tipos previstos`}
            />
            <Indicador
              titulo="Knowledge Health"
              valor={saude.score == null ? "—" : String(saude.score)}
              nota={`Proveniência válida ${saude.provenienciaValida}%`}
            />
          </div>

          <Tabs defaultValue="lista">
            <TabsList>
              <TabsTrigger value="lista">Lista</TabsTrigger>
              <TabsTrigger value="arvore">Árvore</TabsTrigger>
              <TabsTrigger value="relacoes">Relações</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="integridade">Integridade</TabsTrigger>
            </TabsList>

            <TabsContent value="lista" className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor="knowledge-busca">Buscar</Label>
                  <Input
                    id="knowledge-busca"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Nome ou identificador do nó"
                    className="w-64"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="knowledge-tipo">Domínio</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as TipoNo | "todos")}>
                    <SelectTrigger id="knowledge-tipo" className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os domínios</SelectItem>
                      {TIPOS_NO.map((t) => (
                        <SelectItem key={t} value={t}>
                          {tipoNoLabels[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {nosFiltrados.length} nós listados. Selecione um nó para abrir sua árvore de
                proveniência.
              </p>

              <ul className="space-y-2">
                {nosFiltrados.slice(0, 120).map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => setSelecionado(n.id)}
                      aria-pressed={selecionado === n.id}
                      className={`w-full rounded-md border p-3 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selecionado === n.id ? "border-primary bg-muted/40" : ""
                      }`}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className={camadaCores[n.proveniencia.camada]}>
                          {tipoNoLabels[n.tipo]}
                        </Badge>
                        <span className="font-medium">{n.rotulo}</span>
                        {n.detalhe ? (
                          <span className="text-xs text-muted-foreground">{n.detalhe}</span>
                        ) : null}
                      </span>
                      <span className="block pt-1 text-xs text-muted-foreground">
                        {camadaLabels[n.proveniencia.camada]} · fonte {n.proveniencia.fonte}
                        {n.proveniencia.atualizadoEm
                          ? ` · ${new Date(n.proveniencia.atualizadoEm).toLocaleDateString("pt-BR")}`
                          : " · sem data"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="arvore" className="space-y-3">
              {arvore ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Proveniência de {selecionado}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <KnowledgeTree arvore={arvore} />
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Selecione um nó na aba Lista para ver a cadeia completa até a fonte original.
                </p>
              )}
            </TabsContent>

            <TabsContent value="relacoes" className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {grafo.relacoes.length} relações válidas — origem, destino, tipo, proveniência e
                data.
              </p>
              <ul className="space-y-2">
                {grafo.relacoes.slice(0, 150).map((r) => (
                  <li key={r.id} className="rounded-md border p-3 text-xs">
                    <span className="font-medium">{r.origem}</span>{" "}
                    <span className="text-muted-foreground">{tipoRelacaoLabels[r.tipo]}</span>{" "}
                    <span className="font-medium">{r.destino}</span>
                    <span className="block pt-1 text-muted-foreground">
                      fonte {r.proveniencia.fonte} · {r.proveniencia.adr} ·{" "}
                      {r.atualizadoEm
                        ? new Date(r.atualizadoEm).toLocaleDateString("pt-BR")
                        : "sem data"}
                    </span>
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Evolução do conhecimento, do mais recente ao mais antigo. Nós sem data ficam fora.
              </p>
              <ol className="space-y-2">
                {timeline.map((e) => (
                  <li key={`${e.no}-${e.em}`} className="rounded-md border p-3 text-xs">
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className={camadaCores[e.camada]}>
                        {tipoNoLabels[e.tipo]}
                      </Badge>
                      <span className="font-medium">{e.rotulo}</span>
                      <span className="text-muted-foreground">
                        {new Date(e.em).toLocaleString("pt-BR")}
                      </span>
                    </span>
                    <span className="block pt-1 text-muted-foreground">fonte {e.fonte}</span>
                  </li>
                ))}
                {timeline.length === 0 ? (
                  <li className="text-sm text-muted-foreground">Nenhum nó datado no grafo.</li>
                ) : null}
              </ol>
            </TabsContent>

            <TabsContent value="integridade" className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(integridade.porChecagem).map(([chave, total]) => (
                  <div key={chave} className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">
                      {checagemLabels[chave as keyof typeof checagemLabels]}
                    </p>
                    <p className={`text-xl font-semibold ${total > 0 ? "text-destructive" : ""}`}>
                      {total}
                    </p>
                  </div>
                ))}
              </div>
              {integridade.ok ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma falha de integridade: todo nó tem proveniência e toda relação tem origem e
                  destino existentes.
                </p>
              ) : (
                <ul className="space-y-2">
                  {integridade.falhas.slice(0, 100).map((f, i) => (
                    <li key={`${f.chave}-${f.alvo}-${i}`} className="rounded-md border p-3 text-xs">
                      <span className="font-medium">{checagemLabels[f.chave]}</span> · {f.alvo}
                      <span className="block pt-1 text-muted-foreground">{f.detalhe}</span>
                    </li>
                  ))}
                </ul>
              )}
              {saude.tiposAusentes.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Tipos da ontologia ainda sem nó neste workspace:{" "}
                  {saude.tiposAusentes.map((t) => tipoNoLabels[t]).join(", ")}.
                </p>
              ) : null}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function Indicador({ titulo, valor, nota }: { titulo: string; valor: string; nota: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{valor}</p>
        <p className="text-xs text-muted-foreground">{nota}</p>
      </CardContent>
    </Card>
  );
}
