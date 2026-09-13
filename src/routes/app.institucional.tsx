import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { isAdminRole } from "@/lib/platform/roles";
import {
  AVISO_SEM_CAUSALIDADE,
  entidadeLabels,
  vigenciaLabels,
  type Linhagem,
  type OrgEntidade,
  type Vigencia,
} from "@/lib/platform/organizational";
import {
  getLinhagem,
  getOrganizationalIntelligence,
  registrarEvolucao,
  registrarUsoConhecimento,
} from "@/lib/platform/organizational.functions";

export const Route = createFileRoute("/app/institucional")({
  head: () => ({
    meta: [
      { title: "Inteligência Organizacional — evolução do conhecimento" },
      {
        name: "description",
        content:
          "Como o conhecimento da empresa evoluiu: versões com justificativa e aprovação, curva de aprendizado, vigência dos playbooks, grafo institucional e crônica executiva de fatos registrados.",
      },
      { property: "og:title", content: "Inteligência Organizacional — evolução do conhecimento" },
      {
        property: "og:description",
        content:
          "Conhecimento versionado, com justificativa, evidência e aprovação. Versões anteriores permanecem auditáveis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InstitucionalPage,
});

const ENTIDADES: OrgEntidade[] = ["playbook", "licao", "decisao", "processo"];

const corVigencia: Record<Vigencia, string> = {
  atual: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  em_revisao: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  desatualizado: "bg-destructive/15 text-destructive",
};

const dia = (v: string | null) => (v == null ? "—" : v.slice(0, 10).split("-").reverse().join("/"));
const numero = (v: number | null, sufixo = "") => (v == null ? "—" : `${v}${sufixo}`);

function InstitucionalPage() {
  useTrackScreen("platform", "organizational_intelligence");
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id ?? null;
  const admin = isAdminRole(session?.roles);
  const queryClient = useQueryClient();

  const carregar = useServerFn(getOrganizationalIntelligence);
  const { data, isLoading } = useQuery({
    queryKey: ["institucional", workspaceId],
    queryFn: () => carregar({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId),
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Sprint 29 · Organizational Intelligence
        </p>
        <h1 className="font-display text-2xl font-semibold">Inteligência Organizacional</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          A memória guarda o que aconteceu; aqui fica registrado como o conhecimento evoluiu. Toda
          versão declara o que mudou, por que mudou, qual evidência motivou, quem aprovou e quando
          entrou em vigor. Versões anteriores permanecem auditáveis (ADR-032).
        </p>
      </header>

      {!workspaceId ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Selecione um workspace para consultar a inteligência organizacional.
          </CardContent>
        </Card>
      ) : isLoading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador
              titulo="Patrimônio ativo"
              valor={String(data.indicadores.patrimonioAtivo)}
              nota="conhecimento vigente, reutilizado e versionado"
            />
            <Indicador
              titulo="Playbooks vigentes"
              valor={`${data.indicadores.playbooksVigentes}`}
              nota={`${data.indicadores.playbooksDesatualizados} potencialmente desatualizado(s)`}
            />
            <Indicador
              titulo="Lições reutilizadas"
              valor={String(data.indicadores.licoesReutilizadas)}
              nota="com reuso registrado em decisão ou campanha"
            />
            <Indicador
              titulo="Score institucional"
              valor={data.score.score == null ? "—" : String(data.score.score)}
              nota={
                data.score.score == null
                  ? "sem dimensão medida — nada foi estimado"
                  : "reutilização, velocidade, cobertura, atualização, consistência"
              }
            />
          </section>

          {data.fontesIndisponiveis.length > 0 && (
            <Card className="border-amber-500/40">
              <CardContent className="flex gap-2 p-4 text-sm text-muted-foreground">
                <Icon name="warning" className="mt-0.5 text-amber-500" />
                <span>
                  Fontes indisponíveis nesta leitura: {data.fontesIndisponiveis.join(", ")}. Os
                  indicadores correspondentes ficam sem valor em vez de estimados.
                </span>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="evolucao">
            <TabsList className="flex w-full flex-wrap justify-start">
              <TabsTrigger value="evolucao">Evolução</TabsTrigger>
              <TabsTrigger value="curva">Curva de aprendizado</TabsTrigger>
              <TabsTrigger value="vigencia">Vigência</TabsTrigger>
              <TabsTrigger value="grafo">Grafo institucional</TabsTrigger>
              <TabsTrigger value="score">Score</TabsTrigger>
              <TabsTrigger value="cronica">Crônica executiva</TabsTrigger>
              <TabsTrigger value="linhagem">Linhagem</TabsTrigger>
              <TabsTrigger value="registrar">Registrar</TabsTrigger>
            </TabsList>

            {/* GATE 01 */}
            <TabsContent value="evolucao" className="space-y-3 pt-4">
              {data.evolucao.length === 0 ? (
                <Vazio texto="Nenhuma evolução de conhecimento registrada. Registre a primeira versão na aba Registrar." />
              ) : (
                data.evolucao.map((item) => (
                  <Card key={`${item.entidade}:${item.entidadeId}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                        {item.titulo}
                        <Badge variant="secondary">{entidadeLabels[item.entidade]}</Badge>
                        <Badge variant="outline">v{item.versaoAtual}</Badge>
                        {item.tema && <Badge variant="outline">{item.tema}</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p className="text-muted-foreground">
                        Intervalo mediano entre versões:{" "}
                        {numero(item.intervaloMedianoDias, " dias")} · primeira vigência{" "}
                        {dia(item.primeiraVigencia)}
                      </p>
                      <ol className="space-y-3 border-l pl-4">
                        {item.versoes.map((v) => (
                          <li key={v.id} className="space-y-1">
                            <p className="font-medium">
                              v{v.versao} · em vigor desde {dia(v.vigenteEm)}
                              {v.substituidaEm ? ` · substituída em ${dia(v.substituidaEm)}` : ""}
                            </p>
                            <p>
                              <span className="text-muted-foreground">O que mudou: </span>
                              {v.mudanca}
                            </p>
                            <p>
                              <span className="text-muted-foreground">Por que mudou: </span>
                              {v.motivo}
                            </p>
                            <p className="text-muted-foreground">
                              Aprovado por: {v.aprovadoNome ?? "não registrado"}
                            </p>
                            <ul className="list-disc pl-5 text-muted-foreground">
                              {v.evidencias.map((e, i) => (
                                <li key={i}>{e}</li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ol>
                      <Lacunas itens={item.lacunas} />
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* GATE 02 */}
            <TabsContent value="curva" className="space-y-3 pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    A empresa está aprendendo mais rápido?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      Completude das decisões: {rotuloTendencia(data.curva.tendenciaCompletude)}
                    </Badge>
                    <Badge variant="secondary">
                      Problema → lição: {rotuloTendencia(data.curva.tendenciaTempoAteLicao)}
                    </Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <caption className="sr-only">
                        Curva de aprendizado organizacional por trimestre
                      </caption>
                      <thead className="text-left text-muted-foreground">
                        <tr>
                          <th scope="col" className="py-2 pr-4">
                            Trimestre
                          </th>
                          <th scope="col" className="py-2 pr-4">
                            Decisões
                          </th>
                          <th scope="col" className="py-2 pr-4">
                            Avaliadas
                          </th>
                          <th scope="col" className="py-2 pr-4">
                            Completude média
                          </th>
                          <th scope="col" className="py-2 pr-4">
                            Lições
                          </th>
                          <th scope="col" className="py-2 pr-4">
                            Versões
                          </th>
                          <th scope="col" className="py-2">
                            Problema → lição
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.curva.periodos.map((p) => (
                          <tr key={p.periodo} className="border-t">
                            <td className="py-2 pr-4 font-medium">{p.periodo}</td>
                            <td className="py-2 pr-4">{p.decisoes}</td>
                            <td className="py-2 pr-4">{p.decisoesAvaliadas}</td>
                            <td className="py-2 pr-4">{numero(p.completudeMedia, "%")}</td>
                            <td className="py-2 pr-4">{p.licoes}</td>
                            <td className="py-2 pr-4">{p.versoes}</td>
                            <td className="py-2">{numero(p.tempoAteLicaoDias, " dias")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground">Base: {data.curva.base}</p>
                  <Lacunas itens={data.curva.lacunas} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* GATE 03 */}
            <TabsContent value="vigencia" className="space-y-3 pt-4">
              {data.vigencias.length === 0 ? (
                <Vazio texto="Nenhum playbook ou lição registrado — não há vigência a avaliar." />
              ) : (
                data.vigencias.map((v) => (
                  <Card key={`${v.entidade}:${v.entidadeId}`}>
                    <CardContent className="space-y-2 p-4 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${corVigencia[v.vigencia]}`}
                        >
                          {vigenciaLabels[v.vigencia]}
                        </span>
                        <span className="font-medium">{v.titulo}</span>
                        <Badge variant="outline">{entidadeLabels[v.entidade]}</Badge>
                      </div>
                      <ul className="list-disc pl-5 text-muted-foreground">
                        {v.criterios.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* GATE 04 */}
            <TabsContent value="grafo" className="space-y-3 pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Grafo institucional</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.grafo.totais).map(([tipo, total]) => (
                      <Badge key={tipo} variant="secondary">
                        {tipo}: {total}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-muted-foreground">
                    {data.grafo.arestas.length} relação(ões) registrada(s) ·{" "}
                    {data.grafo.orfaos.length} nó(s) sem ligação
                  </p>
                  <ul className="space-y-1">
                    {data.grafo.arestas.slice(0, 40).map((a, i) => (
                      <li key={i} className="text-muted-foreground">
                        <code className="text-xs">{a.de}</code> — {a.relacao} →{" "}
                        <code className="text-xs">{a.para}</code>
                      </li>
                    ))}
                  </ul>
                  {data.grafo.arestas.length > 40 && (
                    <p className="text-xs text-muted-foreground">
                      Exibindo as 40 primeiras relações de {data.grafo.arestas.length}.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* GATE 05 */}
            <TabsContent value="score" className="space-y-3 pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Institutional Knowledge Score:{" "}
                    {data.score.score == null ? "indisponível" : data.score.score}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {data.score.dimensoes.map((d) => (
                    <div key={d.chave} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{d.nome}</span>
                        <span>{d.valor == null ? "sem medição" : `${d.valor}`}</span>
                      </div>
                      <div className="h-2 w-full rounded bg-muted">
                        <div
                          className="h-2 rounded bg-primary"
                          style={{ width: `${d.valor ?? 0}%` }}
                          role="presentation"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Peso {Math.round(d.peso * 100)}% · {d.base}
                      </p>
                    </div>
                  ))}
                  <Lacunas itens={data.score.lacunas} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* GATE 06 */}
            <TabsContent value="cronica" className="space-y-3 pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Crônica executiva</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {data.cronica.capitulos.length === 0 ? (
                    <p className="text-muted-foreground">
                      Nenhum fato registrado no período — a crônica não é preenchida por estimativa.
                    </p>
                  ) : (
                    data.cronica.capitulos.map((c) => (
                      <div key={c.periodo} className="space-y-1">
                        <p className="font-medium capitalize">{c.periodo}</p>
                        <ul className="list-disc pl-5 text-muted-foreground">
                          {c.fatos.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                  <p className="rounded border border-dashed p-3 text-xs text-muted-foreground">
                    {AVISO_SEM_CAUSALIDADE}
                  </p>
                  <p className="text-xs text-muted-foreground">Base: {data.cronica.base}</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* GATE 07 */}
            <TabsContent value="linhagem" className="pt-4">
              <PainelLinhagem workspaceId={workspaceId} licoes={data.licoes} />
            </TabsContent>

            {/* GATE 01 + 07 — escrita */}
            <TabsContent value="registrar" className="space-y-4 pt-4">
              {!admin ? (
                <Vazio texto="Somente administradores e proprietários registram evolução de conhecimento institucional." />
              ) : (
                <>
                  <FormEvolucao
                    workspaceId={workspaceId}
                    playbooks={data.playbooks}
                    onPronto={() => queryClient.invalidateQueries({ queryKey: ["institucional"] })}
                  />
                  <FormUso
                    workspaceId={workspaceId}
                    playbooks={data.playbooks}
                    licoes={data.licoes}
                    onPronto={() => queryClient.invalidateQueries({ queryKey: ["institucional"] })}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function rotuloTendencia(t: string): string {
  const mapa: Record<string, string> = {
    melhorando: "melhorando",
    piorando: "piorando",
    estavel: "estável",
    acelerando: "acelerando",
    desacelerando: "desacelerando",
    sem_dados: "sem série suficiente",
  };
  return mapa[t] ?? t;
}

function Indicador({ titulo, valor, nota }: { titulo: string; valor: string; nota: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
        <p className="font-display text-2xl font-semibold">{valor}</p>
        <p className="text-xs text-muted-foreground">{nota}</p>
      </CardContent>
    </Card>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-muted-foreground">{texto}</CardContent>
    </Card>
  );
}

function Lacunas({ itens }: { itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <div className="rounded border border-dashed p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Lacunas declaradas
      </p>
      <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
        {itens.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

function PainelLinhagem({
  workspaceId,
  licoes,
}: {
  workspaceId: string;
  licoes: { id: string; titulo: string; tema: string | null; tipo: string }[];
}) {
  const [licaoId, setLicaoId] = useState<string>("");
  const consultar = useServerFn(getLinhagem);
  const [resultado, setResultado] = useState<{
    linhagem: Linhagem | null;
    roiCampanha: number | null;
  } | null>(null);

  const mutation = useMutation({
    mutationFn: () => consultar({ data: { workspaceId, licaoId } }),
    onSuccess: (r) => setResultado(r),
    onError: () => toast.error("Não foi possível consultar a linhagem."),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Linhagem do conhecimento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {licoes.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma lição registrada para rastrear.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-1">
                <Label htmlFor="linhagem-licao">Lição</Label>
                <Select value={licaoId} onValueChange={setLicaoId}>
                  <SelectTrigger id="linhagem-licao">
                    <SelectValue placeholder="Selecione a lição" />
                  </SelectTrigger>
                  <SelectContent>
                    {licoes.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => mutation.mutate()} disabled={!licaoId || mutation.isPending}>
                {mutation.isPending ? "Rastreando…" : "Rastrear"}
              </Button>
            </div>

            {resultado?.linhagem && (
              <div className="space-y-2">
                <p className="font-medium">{resultado.linhagem.licao.titulo}</p>
                <ol className="space-y-1 border-l pl-4 text-muted-foreground">
                  <li>
                    Decisão de origem:{" "}
                    {resultado.linhagem.decisaoOrigem
                      ? `${resultado.linhagem.decisaoOrigem.titulo} (${resultado.linhagem.decisaoOrigem.status})`
                      : "não registrada"}
                  </li>
                  <li>
                    Campanha que utilizou:{" "}
                    {resultado.linhagem.campanhaOrigem
                      ? `${resultado.linhagem.campanhaOrigem.nome} (${resultado.linhagem.campanhaOrigem.status})`
                      : "não registrada"}
                    {resultado.roiCampanha != null
                      ? ` · ROI observado ${resultado.roiCampanha}%`
                      : ""}
                  </li>
                  <li>
                    Playbooks que incorporaram:{" "}
                    {resultado.linhagem.playbooksQueIncorporaram.length === 0
                      ? "nenhum"
                      : resultado.linhagem.playbooksQueIncorporaram
                          .map((p) => `${p.titulo} v${p.versao}`)
                          .join(", ")}
                  </li>
                  <li>
                    Resultados posteriores: {resultado.linhagem.usosPosteriores.length} reuso(s)
                    registrado(s)
                  </li>
                </ol>
                {resultado.linhagem.usosPosteriores.length > 0 && (
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {resultado.linhagem.usosPosteriores.map((u) => (
                      <li key={u.id}>
                        {dia(u.usadoEm)} · {u.contexto}
                        {u.resultado ? ` — resultado: ${u.resultado}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
                <Lacunas itens={resultado.linhagem.lacunas} />
              </div>
            )}
            {resultado && !resultado.linhagem && (
              <p className="text-muted-foreground">Lição não localizada neste workspace.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FormEvolucao({
  workspaceId,
  playbooks,
  onPronto,
}: {
  workspaceId: string;
  playbooks: { id: string; titulo: string; tema: string; versao: number }[];
  onPronto: () => void;
}) {
  const registrar = useServerFn(registrarEvolucao);
  const [entidade, setEntidade] = useState<OrgEntidade>("playbook");
  const [entidadeId, setEntidadeId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [tema, setTema] = useState("");
  const [mudanca, setMudanca] = useState("");
  const [motivo, setMotivo] = useState("");
  const [evidencias, setEvidencias] = useState("");
  const [aprovador, setAprovador] = useState("");

  const listaEvidencias = useMemo(
    () =>
      evidencias
        .split("\n")
        .map((e) => e.trim())
        .filter(Boolean),
    [evidencias],
  );

  const mutation = useMutation({
    mutationFn: () =>
      registrar({
        data: {
          workspaceId,
          entidade,
          entidadeId,
          titulo,
          tema,
          mudanca,
          motivo,
          evidencias: listaEvidencias,
          aprovadoNome: aprovador,
        },
      }),
    onSuccess: (r) => {
      toast.success(`Versão v${r.versao} registrada.`);
      setMudanca("");
      setMotivo("");
      setEvidencias("");
      onPronto();
    },
    onError: () => toast.error("Não foi possível registrar a evolução."),
  });

  const enviar = () => {
    if (listaEvidencias.length === 0) {
      toast.error("Evolução sem evidência não é aceita (ADR-032).");
      return;
    }
    if (aprovador.trim().length < 2) {
      toast.error("Informe quem aprovou a mudança.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Registrar evolução de conhecimento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="ev-entidade">Tipo de conhecimento</Label>
            <Select value={entidade} onValueChange={(v) => setEntidade(v as OrgEntidade)}>
              <SelectTrigger id="ev-entidade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTIDADES.map((e) => (
                  <SelectItem key={e} value={e}>
                    {entidadeLabels[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ev-id">Identificador do conhecimento</Label>
            {entidade === "playbook" && playbooks.length > 0 ? (
              <Select
                value={entidadeId}
                onValueChange={(v) => {
                  setEntidadeId(v);
                  const p = playbooks.find((x) => x.id === v);
                  if (p) {
                    setTitulo(p.titulo);
                    setTema(p.tema);
                  }
                }}
              >
                <SelectTrigger id="ev-id">
                  <SelectValue placeholder="Selecione o playbook" />
                </SelectTrigger>
                <SelectContent>
                  {playbooks.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.titulo} (v{p.versao})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="ev-id"
                value={entidadeId}
                onChange={(e) => setEntidadeId(e.target.value)}
                placeholder="UUID do registro"
              />
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="ev-titulo">Título</Label>
            <Input id="ev-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ev-tema">Tema</Label>
            <Input id="ev-tema" value={tema} onChange={(e) => setTema(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ev-mudanca">O que mudou</Label>
          <Textarea
            id="ev-mudanca"
            value={mudanca}
            onChange={(e) => setMudanca(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ev-motivo">Por que mudou</Label>
          <Textarea
            id="ev-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ev-evidencias">Evidências (uma por linha) — obrigatório</Label>
          <Textarea
            id="ev-evidencias"
            value={evidencias}
            onChange={(e) => setEvidencias(e.target.value)}
            rows={3}
            aria-describedby="ev-evidencias-nota"
          />
          <p id="ev-evidencias-nota" className="text-xs text-muted-foreground">
            Nenhuma versão é aceita sem evidência registrada (ADR-032).
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ev-aprovador">Quem aprovou</Label>
          <Input
            id="ev-aprovador"
            value={aprovador}
            onChange={(e) => setAprovador(e.target.value)}
          />
        </div>
        <Button
          onClick={enviar}
          disabled={
            mutation.isPending ||
            !entidadeId ||
            titulo.trim().length < 3 ||
            tema.trim().length < 2 ||
            mudanca.trim().length < 5 ||
            motivo.trim().length < 5
          }
        >
          Registrar nova versão
        </Button>
      </CardContent>
    </Card>
  );
}

function FormUso({
  workspaceId,
  playbooks,
  licoes,
  onPronto,
}: {
  workspaceId: string;
  playbooks: { id: string; titulo: string; tema: string; versao: number }[];
  licoes: { id: string; titulo: string; tema: string | null; tipo: string }[];
  onPronto: () => void;
}) {
  const registrar = useServerFn(registrarUsoConhecimento);
  const [entidade, setEntidade] = useState<"playbook" | "licao">("playbook");
  const [entidadeId, setEntidadeId] = useState("");
  const [contexto, setContexto] = useState("");
  const [resultado, setResultado] = useState("");
  const [usuario, setUsuario] = useState("");

  const opcoes = entidade === "playbook" ? playbooks : licoes;

  const mutation = useMutation({
    mutationFn: () =>
      registrar({
        data: {
          workspaceId,
          entidade,
          entidadeId,
          contexto,
          resultado: resultado.trim() ? resultado : undefined,
          usadoNome: usuario,
        },
      }),
    onSuccess: () => {
      toast.success("Reuso registrado.");
      setContexto("");
      setResultado("");
      onPronto();
    },
    onError: () => toast.error("Não foi possível registrar o reuso."),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Registrar reuso de conhecimento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="uso-entidade">Conhecimento</Label>
            <Select
              value={entidade}
              onValueChange={(v) => {
                setEntidade(v as "playbook" | "licao");
                setEntidadeId("");
              }}
            >
              <SelectTrigger id="uso-entidade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="playbook">Playbook</SelectItem>
                <SelectItem value="licao">Lição</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="uso-id">Registro</Label>
            <Select value={entidadeId} onValueChange={setEntidadeId}>
              <SelectTrigger id="uso-id">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {opcoes.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="uso-contexto">Contexto de uso</Label>
          <Textarea
            id="uso-contexto"
            value={contexto}
            onChange={(e) => setContexto(e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="uso-resultado">Resultado observado (opcional)</Label>
          <Textarea
            id="uso-resultado"
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="uso-nome">Quem utilizou</Label>
          <Input id="uso-nome" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={
            mutation.isPending ||
            !entidadeId ||
            contexto.trim().length < 5 ||
            usuario.trim().length < 2
          }
        >
          Registrar reuso
        </Button>
      </CardContent>
    </Card>
  );
}
