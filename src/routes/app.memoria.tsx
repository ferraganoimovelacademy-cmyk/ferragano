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
  MINIMO_CASOS_PLAYBOOK,
  campanhaStatusLabels,
  categoriaLabels,
  completudeDecisao,
  licaoLabels,
  statusLabels,
  type MemoryCategoria,
  type ReusoConhecimento,
} from "@/lib/platform/memory";
import {
  consultarReuso,
  gerarPlaybookTema,
  getMemoria,
  registrarDecisao,
} from "@/lib/platform/memory.functions";

export const Route = createFileRoute("/app/memoria")({
  head: () => ({
    meta: [
      { title: "Memória Corporativa — decisões, lições e playbooks" },
      {
        name: "description",
        content:
          "Patrimônio intelectual do workspace: decisões com contexto e evidência, campanhas com histórico, lições aprendidas, timeline corporativa e playbooks gerados do próprio histórico.",
      },
      { property: "og:title", content: "Memória Corporativa — decisões, lições e playbooks" },
      {
        property: "og:description",
        content:
          "Toda decisão da empresa registrada com responsável, motivo, evidências e resultado observado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MemoriaPage,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (v: number | null) => (v == null ? "—" : `${v}%`);
const dia = (v: string | null) => (v == null ? "—" : v.slice(0, 10).split("-").reverse().join("/"));

const CATEGORIAS: MemoryCategoria[] = ["decisao", "campanha", "reuniao", "estrategia", "mudanca"];

function MemoriaPage() {
  useTrackScreen("platform", "enterprise_memory");
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id ?? null;
  const admin = isAdminRole(session?.roles);
  const queryClient = useQueryClient();

  const carregar = useServerFn(getMemoria);
  const { data, isLoading } = useQuery({
    queryKey: ["memoria", workspaceId],
    queryFn: () => carregar({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId),
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Sprint 28 · Enterprise Memory
        </p>
        <h1 className="font-display text-2xl font-semibold">Memória Corporativa</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Toda decisão da empresa se transforma em patrimônio intelectual: contexto, motivo,
          evidências, resultado observado e revisão posterior. Nenhuma lição existe sem evidência
          registrada e nenhum playbook é gerado sem histórico suficiente (ADR-031).
        </p>
      </header>

      {!workspaceId ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Selecione um workspace para consultar a memória corporativa.
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
              titulo="Patrimônio intelectual"
              valor={String(data.indicadores.patrimonioIntelectual)}
              nota="contagem ponderada de conhecimento auditável"
            />
            <Indicador
              titulo="Decisões registradas"
              valor={String(data.indicadores.decisoesRegistradas)}
              nota={`${data.indicadores.decisoesFechadas} avaliadas ou revisadas`}
            />
            <Indicador
              titulo="Lições aprendidas"
              valor={String(data.indicadores.licoesAprendidas)}
              nota={`${data.indicadores.playbooksGerados} playbook(s) gerado(s)`}
            />
            <Indicador
              titulo="Cobertura da memória"
              valor={`${data.indicadores.coberturaPct}%`}
              nota={`completude média ${data.indicadores.completudeMediaPct}% · reuso ${data.indicadores.reutilizacaoPct}%`}
            />
          </section>

          {data.indicadores.lacunas.length > 0 && (
            <Card className="border-amber-500/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Icon name="warning" size={16} /> Lacunas declaradas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pt-0 text-sm text-muted-foreground">
                {data.indicadores.lacunas.map((l) => (
                  <p key={l}>· {l}</p>
                ))}
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="decisoes">
            <TabsList className="flex-wrap">
              <TabsTrigger value="decisoes">Decisões</TabsTrigger>
              <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
              <TabsTrigger value="licoes">Lições</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="reuso">Reuso</TabsTrigger>
              <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
              <TabsTrigger value="dna">Decision DNA</TabsTrigger>
            </TabsList>

            {/* GATE 01 */}
            <TabsContent value="decisoes" className="space-y-3 pt-4">
              {admin && (
                <RegistrarDecisao
                  workspaceId={workspaceId}
                  onSalvo={() => void queryClient.invalidateQueries({ queryKey: ["memoria"] })}
                />
              )}
              {data.decisoes.length === 0 ? (
                <Vazio texto="Nenhuma decisão registrada ainda." />
              ) : (
                data.decisoes.map((d) => {
                  const c = completudeDecisao(d);
                  return (
                    <Card key={d.id}>
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base">{d.titulo}</CardTitle>
                          <Badge variant="outline">{categoriaLabels[d.categoria]}</Badge>
                          <Badge variant="secondary">{statusLabels[d.status]}</Badge>
                          <Badge variant={c.pontos >= 70 ? "default" : "outline"}>
                            memória {c.pontos}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-0 text-sm">
                        <p className="text-muted-foreground">
                          <strong className="text-foreground">Contexto:</strong> {d.contexto}
                        </p>
                        <p className="text-muted-foreground">
                          <strong className="text-foreground">Motivo:</strong> {d.motivo}
                        </p>
                        {d.hipotese && (
                          <p className="text-muted-foreground">
                            <strong className="text-foreground">Hipótese:</strong> {d.hipotese}
                          </p>
                        )}
                        {d.resultado && (
                          <p className="text-muted-foreground">
                            <strong className="text-foreground">Resultado observado:</strong>{" "}
                            {d.resultado}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Responsável: {d.responsavelNome ?? "—"}</span>
                          <span>Evidências: {d.evidencias.length}</span>
                          <span>Registrada em {dia(d.criadoEm)}</span>
                          {d.tema && <span>Tema: {d.tema}</span>}
                          {d.avaliacao != null && <span>Avaliação: {d.avaliacao}/5</span>}
                        </div>
                        {c.faltando.length > 0 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            Falta registrar: {c.faltando.join(", ")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            {/* GATE 02 */}
            <TabsContent value="campanhas" className="space-y-3 pt-4">
              {data.campanhasMemoria.length === 0 ? (
                <Vazio texto="Nenhuma campanha registrada na memória." />
              ) : (
                data.campanhasMemoria.map((m) => (
                  <Card key={m.campanha.id}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{m.campanha.nome}</CardTitle>
                        <Badge variant="secondary">{campanhaStatusLabels[m.campanha.status]}</Badge>
                        {m.campanha.canal && <Badge variant="outline">{m.campanha.canal}</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0 text-sm">
                      <div className="grid gap-2 sm:grid-cols-4 text-xs">
                        <Metrica rotulo="Investimento" valor={brl(m.campanha.investimento)} />
                        <Metrica rotulo="Receita" valor={brl(m.campanha.receita)} />
                        <Metrica rotulo="ROI" valor={pct(m.roiPct)} />
                        <Metrica rotulo="Conversão" valor={pct(m.conversaoPct)} />
                      </div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">Por que nasceu:</strong>{" "}
                        {m.narrativa.porQueNasceu ?? "não registrado"}
                      </p>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">Por que mudou:</strong>{" "}
                        {m.narrativa.porQueMudou ?? "não registrado"}
                      </p>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">Por que terminou:</strong>{" "}
                        {m.narrativa.porQueTerminou ?? "não registrado"}
                      </p>
                      {m.lacunas.length > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Lacunas: {m.lacunas.join(" · ")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* GATE 03 */}
            <TabsContent value="licoes" className="space-y-3 pt-4">
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.indicadores.licoesPorTipo).map(([tipo, qtd]) => (
                  <Badge key={tipo} variant="outline">
                    {licaoLabels[tipo as keyof typeof licaoLabels]}: {qtd}
                  </Badge>
                ))}
              </div>
              {data.licoes.length === 0 ? (
                <Vazio texto="Nenhuma lição registrada. Lições nascem do encerramento de campanhas, sempre com evidência." />
              ) : (
                data.licoes.map((l) => (
                  <Card key={l.id}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{l.titulo}</CardTitle>
                        <Badge variant="secondary">{licaoLabels[l.tipo]}</Badge>
                        <Badge variant="outline">{l.origem}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0 text-sm">
                      <p className="text-muted-foreground">{l.licao}</p>
                      <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                        <p className="mb-1 font-medium text-foreground">Evidências utilizadas</p>
                        {l.evidencias.map((e, i) => (
                          <p key={i}>· {e}</p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* GATE 04 */}
            <TabsContent value="timeline" className="space-y-4 pt-4">
              {data.timeline.length === 0 ? (
                <Vazio texto="A linha do tempo da empresa começa no primeiro registro." />
              ) : (
                data.timeline.map((ano) => (
                  <Card key={ano.ano}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {ano.ano}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          · {ano.total} registro(s)
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      {ano.itens.slice(0, 40).map((item) => (
                        <div
                          key={`${item.tipo}-${item.refId}`}
                          className="flex items-start gap-3 border-l-2 border-border pl-3 text-sm"
                        >
                          <span className="w-20 shrink-0 text-xs text-muted-foreground">
                            {dia(item.em)}
                          </span>
                          <span className="flex-1">
                            {item.titulo}
                            {item.detalhe && (
                              <span className="text-muted-foreground"> · {item.detalhe}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* GATE 05 */}
            <TabsContent value="reuso" className="pt-4">
              <Reuso workspaceId={workspaceId} />
            </TabsContent>

            {/* GATE 06 */}
            <TabsContent value="playbooks" className="space-y-3 pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Temas do histórico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {data.temas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum tema registrado nas decisões.
                    </p>
                  ) : (
                    data.temas.map((t) => (
                      <TemaLinha
                        key={t.tema}
                        tema={t}
                        workspaceId={workspaceId}
                        admin={admin}
                        onGerado={() =>
                          void queryClient.invalidateQueries({ queryKey: ["memoria"] })
                        }
                      />
                    ))
                  )}
                  <p className="pt-1 text-xs text-muted-foreground">
                    Mínimo de {MINIMO_CASOS_PLAYBOOK} casos comparáveis por tema.
                  </p>
                </CardContent>
              </Card>

              {data.playbooks.map((p) => (
                <Card key={p.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{p.titulo}</CardTitle>
                      <Badge variant="outline">v{p.versao}</Badge>
                      <Badge variant="secondary">{p.casos} casos</Badge>
                      <Badge variant="outline">
                        sucesso {p.taxaSucesso == null ? "—" : `${p.taxaSucesso}%`}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0 text-sm">
                    <p className="text-xs text-muted-foreground">
                      Período analisado: {dia(p.periodoInicio)} a {dia(p.periodoFim)}
                    </p>
                    <ol className="space-y-1">
                      {p.passos.map((passo) => (
                        <li key={passo.ordem}>
                          <span className="font-medium">
                            {passo.ordem}. {passo.passo}
                          </span>
                          <span className="block text-xs text-muted-foreground">{passo.base}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                      <p className="mb-1 font-medium text-foreground">Limitações da comparação</p>
                      {p.limitacoes.map((l, i) => (
                        <p key={i}>· {l}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* GATE 07 */}
            <TabsContent value="dna" className="space-y-3 pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Descrição histórica, não regra</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 text-sm">
                  <div className="grid gap-2 sm:grid-cols-3 text-xs">
                    <Metrica
                      rotulo="Decisões aprovadas"
                      valor={`${data.dna.padroesAprovacao.aprovadas} de ${data.dna.totalDecisoes}`}
                    />
                    <Metrica
                      rotulo="Tempo médio até aprovar"
                      valor={
                        data.dna.padroesAprovacao.tempoMedioAprovacaoHoras == null
                          ? "—"
                          : `${data.dna.padroesAprovacao.tempoMedioAprovacaoHoras} h`
                      }
                    />
                    <Metrica
                      rotulo="Tempo médio até executar"
                      valor={
                        data.dna.tempoMedioExecucaoHoras == null
                          ? "—"
                          : `${data.dna.tempoMedioExecucaoHoras} h`
                      }
                    />
                  </div>

                  <div>
                    <p className="mb-1 font-medium">Estratégias recorrentes</p>
                    {data.dna.estrategiasRecorrentes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Nenhum tema aparece mais de uma vez.
                      </p>
                    ) : (
                      data.dna.estrategiasRecorrentes.map((e) => (
                        <p key={e.tema} className="text-xs text-muted-foreground">
                          · {e.tema} — {e.casos} casos ({e.participacaoPct}% do histórico)
                        </p>
                      ))
                    )}
                  </div>

                  <div>
                    <p className="mb-1 font-medium">Fatores observados nas decisões avaliadas</p>
                    {data.dna.fatoresObservados.map((f) => (
                      <p key={f.fator} className="text-xs text-muted-foreground">
                        · {f.fator}: {f.comFator} com / {f.semFator} sem · diferença de avaliação{" "}
                        {f.diferencaMedia == null ? "indisponível" : f.diferencaMedia}
                      </p>
                    ))}
                  </div>

                  {data.dna.lacunas.length > 0 && (
                    <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                      {data.dna.lacunas.map((l) => (
                        <p key={l}>· {l}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
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
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
        <p className="mt-1 font-display text-2xl font-semibold">{valor}</p>
        <p className="mt-1 text-xs text-muted-foreground">{nota}</p>
      </CardContent>
    </Card>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-md border border-border p-2">
      <p className="text-muted-foreground">{rotulo}</p>
      <p className="font-medium text-foreground">{valor}</p>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-center text-sm text-muted-foreground">{texto}</CardContent>
    </Card>
  );
}

function RegistrarDecisao({ workspaceId, onSalvo }: { workspaceId: string; onSalvo: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({
    categoria: "decisao" as MemoryCategoria,
    titulo: "",
    contexto: "",
    motivo: "",
    hipotese: "",
    evidencias: "",
    responsavelNome: "",
    tema: "",
  });
  const salvar = useServerFn(registrarDecisao);

  const mutation = useMutation({
    mutationFn: () =>
      salvar({
        data: {
          workspaceId,
          categoria: form.categoria,
          titulo: form.titulo.trim(),
          contexto: form.contexto.trim(),
          motivo: form.motivo.trim(),
          hipotese: form.hipotese.trim() || undefined,
          evidencias: form.evidencias
            .split("\n")
            .map((e) => e.trim())
            .filter(Boolean),
          responsavelNome: form.responsavelNome.trim(),
          participantes: [],
          tema: form.tema.trim() || undefined,
          tags: [],
        },
      }),
    onSuccess: () => {
      toast.success("Decisão registrada na memória.");
      setAberto(false);
      setForm({
        categoria: "decisao",
        titulo: "",
        contexto: "",
        motivo: "",
        hipotese: "",
        evidencias: "",
        responsavelNome: "",
        tema: "",
      });
      onSalvo();
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  if (!aberto) {
    return (
      <Button variant="outline" onClick={() => setAberto(true)}>
        <Icon name="add" size={16} /> Registrar decisão
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Nova memória de decisão</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="mem-categoria">Categoria</Label>
            <Select
              value={form.categoria}
              onValueChange={(v) => setForm((f) => ({ ...f, categoria: v as MemoryCategoria }))}
            >
              <SelectTrigger id="mem-categoria">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {categoriaLabels[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="mem-responsavel">Responsável</Label>
            <Input
              id="mem-responsavel"
              value={form.responsavelNome}
              onChange={(e) => setForm((f) => ({ ...f, responsavelNome: e.target.value }))}
              placeholder="Quem responde por esta decisão"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="mem-titulo">Título</Label>
          <Input
            id="mem-titulo"
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mem-contexto">Contexto (obrigatório)</Label>
          <Textarea
            id="mem-contexto"
            rows={3}
            value={form.contexto}
            onChange={(e) => setForm((f) => ({ ...f, contexto: e.target.value }))}
            placeholder="O que estava acontecendo quando a decisão foi tomada"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mem-motivo">Motivo (obrigatório)</Label>
          <Textarea
            id="mem-motivo"
            rows={2}
            value={form.motivo}
            onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mem-hipotese">Hipótese</Label>
          <Textarea
            id="mem-hipotese"
            rows={2}
            value={form.hipotese}
            onChange={(e) => setForm((f) => ({ ...f, hipotese: e.target.value }))}
            placeholder="O que se esperava que acontecesse"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mem-evidencias">Evidências utilizadas (uma por linha)</Label>
          <Textarea
            id="mem-evidencias"
            rows={3}
            value={form.evidencias}
            onChange={(e) => setForm((f) => ({ ...f, evidencias: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mem-tema">Tema (agrupa casos comparáveis)</Label>
          <Input
            id="mem-tema"
            value={form.tema}
            onChange={(e) => setForm((f) => ({ ...f, tema: e.target.value }))}
            placeholder="ex.: lançamento, precificação, contratação"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Registrando…" : "Registrar"}
          </Button>
          <Button variant="ghost" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Reuso({ workspaceId }: { workspaceId: string }) {
  const [titulo, setTitulo] = useState("");
  const [contexto, setContexto] = useState("");
  const [tema, setTema] = useState("");
  const [resposta, setResposta] = useState<ReusoConhecimento | null>(null);
  const consultar = useServerFn(consultarReuso);

  const mutation = useMutation({
    mutationFn: () =>
      consultar({
        data: {
          workspaceId,
          titulo: titulo.trim(),
          contexto: contexto.trim(),
          tema: tema.trim() || undefined,
        },
      }),
    onSuccess: (r) => setResposta(r),
    onError: (erro: Error) => toast.error(erro.message),
  });

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Há registros anteriores comparáveis?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="space-y-1">
            <Label htmlFor="reuso-titulo">Decisão em análise</Label>
            <Input
              id="reuso-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="ex.: reduzir preço da torre B"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reuso-contexto">Contexto atual</Label>
            <Textarea
              id="reuso-contexto"
              rows={3}
              value={contexto}
              onChange={(e) => setContexto(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reuso-tema">Tema</Label>
            <Input id="reuso-tema" value={tema} onChange={(e) => setTema(e.target.value)} />
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || titulo.trim().length < 3 || contexto.trim().length < 3}
          >
            {mutation.isPending ? "Consultando…" : "Consultar memória"}
          </Button>
        </CardContent>
      </Card>

      {resposta && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{resposta.pergunta}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-sm">
            <p className="text-xs text-muted-foreground">
              Base utilizada: {resposta.baseUtilizada}
            </p>
            {resposta.casos.length === 0 ? (
              <p className="text-muted-foreground">Nenhum caso comparável encontrado.</p>
            ) : (
              resposta.casos.map((c) => (
                <div key={c.decisao.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.decisao.titulo}</span>
                    <Badge variant="outline">
                      similaridade {Math.round(c.similaridade * 100)}%
                    </Badge>
                    {c.avaliacao != null && (
                      <Badge variant="secondary">avaliação {c.avaliacao}/5</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Comparado por: {c.motivosDaComparacao.join(" · ")}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Resultado observado: {c.resultadoObservado ?? "não registrado"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Diferenças de contexto: {c.diferencasDeContexto.join(" · ")}
                  </p>
                </div>
              ))
            )}
            {resposta.limitacoes.length > 0 && (
              <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">Limitações</p>
                {resposta.limitacoes.map((l) => (
                  <p key={l}>· {l}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TemaLinha({
  tema,
  workspaceId,
  admin,
  onGerado,
}: {
  tema: { tema: string; casos: number; elegivel: boolean; faltam: number };
  workspaceId: string;
  admin: boolean;
  onGerado: () => void;
}) {
  const gerar = useServerFn(gerarPlaybookTema);
  const mutation = useMutation({
    mutationFn: () => gerar({ data: { workspaceId, tema: tema.tema } }),
    onSuccess: (r) => {
      if (r.gerado) {
        toast.success(`Playbook "${tema.tema}" gerado (v${r.versao}).`);
        onGerado();
      } else {
        toast.info(r.motivo);
      }
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  const nota = useMemo(
    () => (tema.elegivel ? "histórico suficiente" : `faltam ${tema.faltam} caso(s)`),
    [tema.elegivel, tema.faltam],
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
      <span>
        {tema.tema}{" "}
        <span className="text-xs text-muted-foreground">
          · {tema.casos} caso(s) · {nota}
        </span>
      </span>
      {admin && (
        <Button
          size="sm"
          variant="outline"
          disabled={!tema.elegivel || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Gerando…" : "Gerar playbook"}
        </Button>
      )}
    </div>
  );
}
