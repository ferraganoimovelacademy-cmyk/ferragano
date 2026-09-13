import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTrackScreen } from "@/hooks/use-telemetry";
import {
  avaliarAcessoPersona,
  avaliarLiquidez,
  avaliarProntidao,
  camadas,
  mapaTelaPersonas,
  onboardingVerticais,
  personas,
  statusLabels,
  validarAgregacaoCrossWorkspace,
  validarCompliance,
  validarContratoParceria,
  verticaisPorCamada,
  verticaisDaPersona,
  type CamadaKey,
  type PapelUsuario,
  type PersonaKey,
  type VerticalKey,
  type VerticalStatus,
} from "@/lib/platform/ecosystem";

export const Route = createFileRoute("/app/ecossistema")({
  head: () => ({
    meta: [
      { title: "Ecossistema Ferragano — hub das oito verticais" },
      {
        name: "description",
        content:
          "Hub único das oito verticais Ferragano: status, dependências e próximos passos por camada, personas da Ferragano AI, validação de privacidade para agregação entre workspaces e onboarding de prontidão por vertical.",
      },
      { property: "og:title", content: "Ecossistema Ferragano — hub das oito verticais" },
      {
        property: "og:description",
        content:
          "Status, dependências, personas de IA, privacidade de agregação e trilhas de evidência de prontidão em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EcossistemaPage,
});

const corStatus: Record<VerticalStatus, string> = {
  operacional: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  fundacao_pronta: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  em_construcao: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  bloqueada: "bg-destructive/15 text-destructive",
};

function EcossistemaPage() {
  useTrackScreen("platform", "ecossistema");
  const [personaAtiva, setPersonaAtiva] = useState<PersonaKey | "todas">("todas");
  const [papel, setPapel] = useState<PapelUsuario>("admin");
  const [tab, setTab] = useState("verticais");

  const acesso = useMemo(
    () => (personaAtiva === "todas" ? null : avaliarAcessoPersona(personaAtiva, papel)),
    [personaAtiva, papel],
  );

  const permitidas = useMemo(
    () => (personaAtiva === "todas" ? null : verticaisDaPersona(personaAtiva, papel)),
    [personaAtiva, papel],
  );

  const grupos = useMemo(() => {
    const todos = verticaisPorCamada();
    if (!permitidas) return todos;
    const chaves = new Set(permitidas.map((v) => v.key));
    return todos
      .map((g) => ({ ...g, itens: g.itens.filter((v) => chaves.has(v.key)) }))
      .filter((g) => g.itens.length > 0);
  }, [permitidas]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ecossistema Ferragano</h1>
        <p className="text-sm text-muted-foreground">
          As oito verticais em um só lugar: o que já opera, o que depende de quê e o que vem depois.
          Vertical bloqueada não avança por decisão de governança, não por falta de código.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Escopo de operação</CardTitle>
          <p className="text-sm text-muted-foreground">
            Escolha a persona: o hub passa a mostrar apenas as verticais e ações dentro dos limites
            duros dela. Nega por padrão.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={personaAtiva === "todas" ? "default" : "outline"}
              onClick={() => setPersonaAtiva("todas")}
            >
              Sem persona (governança)
            </Button>
            {personas.map((p) => (
              <Button
                key={p.key}
                size="sm"
                variant={personaAtiva === p.key ? "default" : "outline"}
                onClick={() => setPersonaAtiva(p.key)}
              >
                {p.nome}
              </Button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="papel" className="font-normal">
              Papel administrativo
            </Label>
            <Switch
              id="papel"
              checked={papel === "admin"}
              onCheckedChange={(v) => setPapel(v ? "admin" : "membro")}
            />
          </div>
          {acesso ? (
            <p className="text-muted-foreground">
              {acesso.nome} · papel {acesso.papel} ·{" "}
              {acesso.acoes.filter((a) => a.permitido).length} de {acesso.acoes.length} ações
              liberadas · {acesso.telasPermitidas.length} tela(s) acessível(is)
            </p>
          ) : null}
        </CardContent>
      </Card>

      {acesso ? (
        <div className="space-y-2 rounded-md border p-3 text-sm">
          <p className="flex gap-2 font-medium">
            <Icon name="lock" className="mt-0.5 text-base" />
            <span>3 abas estão fechadas porque uma persona está ativa</span>
          </p>
          <p className="text-muted-foreground">
            Privacidade, Network &amp; Capital e Onboarding são telas de governança: nenhuma persona
            opera nelas (ADR-035, nega por padrão).
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">O que fazer: </span>
            clique em “Sem persona (governança)” acima para reabrir as três abas. Trocar o papel
            administrativo não libera essas telas — o bloqueio é de limite duro da persona, não de
            permissão.
          </p>
          <Button size="sm" variant="outline" onClick={() => setPersonaAtiva("todas")}>
            Sair da persona e liberar as abas
          </Button>
        </div>
      ) : null}

      <Tabs
        value={acesso && ["privacidade", "network", "onboarding"].includes(tab) ? "verticais" : tab}
        onValueChange={setTab}
      >
        <TabsList className="flex-wrap">
          <TabsTrigger value="verticais">Verticais</TabsTrigger>
          <TabsTrigger value="personas">Personas de IA</TabsTrigger>
          {(
            [
              ["privacidade", "Privacidade"],
              ["network", "Network & Capital"],
              ["onboarding", "Onboarding"],
            ] as const
          ).map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              disabled={Boolean(acesso)}
              title={
                acesso
                  ? `Fechada para ${acesso.nome}: tela de governança. Selecione “Sem persona (governança)” para acessar.`
                  : undefined
              }
            >
              {label}
              {acesso ? <Icon name="lock" className="ml-1 text-sm" /> : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="verticais" className="space-y-6 pt-4">
          {grupos.length === 0 ? (
            <div className="space-y-2 rounded-md border p-4 text-sm">
              <p className="font-medium">
                Nenhuma vertical dentro do escopo de {acesso?.nome ?? "esta persona"} com o papel{" "}
                {acesso?.papel ?? papel}
              </p>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">O que fazer: </span>
                ative o papel administrativo acima se as ações desta persona exigirem admin, escolha
                outra persona, ou volte para “Sem persona (governança)” para ver as oito verticais.
                Verticais marcadas como bloqueadas continuam fora do escopo até o gate de governança
                correspondente ser cumprido.
              </p>
            </div>
          ) : null}
          {grupos.map((grupo) => (
            <section key={grupo.camada} className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {camadas[grupo.camada as CamadaKey]}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {grupo.itens.map((v) => (
                  <Card key={v.key}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-base">{v.nome}</CardTitle>
                        <Badge className={corStatus[v.status]} variant="secondary">
                          {statusLabels[v.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{v.proposito}</p>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {v.bloqueio ? (
                        <p className="flex gap-2 rounded-md bg-destructive/10 p-2 text-destructive">
                          <Icon name="block" className="mt-0.5 text-base" />
                          <span>{v.bloqueio}</span>
                        </p>
                      ) : null}
                      <div>
                        <p className="font-medium">Dependências</p>
                        <ul className="mt-1 space-y-1 text-muted-foreground">
                          {v.dependencias.map((d) => (
                            <li key={d}>• {d}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">Próximos passos</p>
                        <ul className="mt-1 space-y-1 text-muted-foreground">
                          {v.proximosPassos.map((p) => (
                            <li key={p}>• {p}</li>
                          ))}
                        </ul>
                      </div>
                      {v.telas.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {v.telas.map((t) => (
                            <Badge key={t} variant="outline" className="font-mono text-xs">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Sem tela: ainda não há entrega.</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </TabsContent>

        <TabsContent value="personas" className="space-y-4 pt-4">
          {acesso ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Acesso de {acesso.nome} ({acesso.papel})
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ação fora do mapa da persona é limite duro, não falta de permissão.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-2">
                  {acesso.acoes.map((a) => (
                    <div
                      key={`${a.tela}-${a.acao}`}
                      className="flex items-start gap-2 rounded-md border p-2"
                    >
                      <Icon
                        name={a.permitido ? "check_circle" : "block"}
                        className={`mt-0.5 text-base ${
                          a.permitido ? "text-emerald-600" : "text-destructive"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={a.permitido ? "" : "text-muted-foreground"}>
                            {a.acao}
                          </span>
                          <Badge variant="outline" className="font-mono text-xs">
                            {a.tela}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{a.motivo}</p>
                      </div>
                      <Button size="sm" variant="outline" disabled={!a.permitido}>
                        Executar
                      </Button>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="font-medium">Telas vedadas</p>
                  {acesso.telasNegadas.length === 0 ? (
                    <p className="text-muted-foreground">nenhuma</p>
                  ) : (
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {acesso.telasNegadas.map((t) => (
                        <li key={t.tela}>
                          <span className="font-mono text-xs">{t.tela}</span> — {t.motivo}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {(personaAtiva === "todas"
              ? personas
              : personas.filter((p) => p.key === personaAtiva)
            ).map((p) => (
              <Card key={p.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{p.nome}</CardTitle>
                  <p className="text-sm text-muted-foreground">{p.missao}</p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium">Nunca faz</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {p.limites.map((l) => (
                        <li key={l}>• {l}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Onde opera</p>
                    {p.acoes.map((a) => (
                      <div key={a.acao} className="rounded-md border p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span>{a.acao}</span>
                          <Badge variant="outline" className="font-mono text-xs">
                            {a.tela}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Entrada: {a.entrada.join(", ")} · Saída: {a.saida}
                          {a.requerAdmin ? " · exige papel administrativo" : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mapa tela → persona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {mapaTelaPersonas().map((m) => (
                <div key={m.tela} className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {m.tela}
                  </Badge>
                  <span className="text-muted-foreground">
                    {m.itens.map((i) => i.acao).join(" · ")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacidade" className="pt-4">
          <PrivacidadePanel />
        </TabsContent>

        <TabsContent value="network" className="pt-4">
          <NetworkCapitalPanel />
        </TabsContent>

        <TabsContent value="onboarding" className="pt-4">
          <OnboardingPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PrivacidadePanel() {
  const [workspaces, setWorkspaces] = useState(8);
  const [menorCelula, setMenorCelula] = useState(12);
  const [campos, setCampos] = useState("regiao, ciclo_medio_dias, amostra");
  const [consentimento, setConsentimento] = useState(true);
  const [agregada, setAgregada] = useState(true);
  const [suprime, setSuprime] = useState(true);
  const [procedencia, setProcedencia] = useState("read model sales_360 agregado");

  const resultado = validarAgregacaoCrossWorkspace({
    metrica: "ciclo_medio_dias",
    workspaces,
    campos: campos
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
    menorCelula,
    consentimentoTodos: consentimento,
    granularidade: agregada ? "agregada" : "linha",
    suprimeCelulasPequenas: suprime,
    procedencia,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pedido de agregação entre workspaces</CardTitle>
          <p className="text-sm text-muted-foreground">
            Reprova por padrão. Só passa quando os sete critérios do ADR-034 são atendidos.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ws">Workspaces no resultado</Label>
              <Input
                id="ws"
                type="number"
                min={0}
                value={workspaces}
                onChange={(e) => setWorkspaces(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="celula">Menor célula (registros)</Label>
              <Input
                id="celula"
                type="number"
                min={0}
                value={menorCelula}
                onChange={(e) => setMenorCelula(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="campos">Campos publicados</Label>
            <Input id="campos" value={campos} onChange={(e) => setCampos(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="proc">Procedência</Label>
            <Input id="proc" value={procedencia} onChange={(e) => setProcedencia(e.target.value)} />
          </div>
          <div className="space-y-3">
            <ToggleLinha
              id="consent"
              label="Consentimento de todos os workspaces"
              checked={consentimento}
              onChange={setConsentimento}
            />
            <ToggleLinha
              id="granul"
              label="Resultado agregado (nunca linha individual)"
              checked={agregada}
              onChange={setAgregada}
            />
            <ToggleLinha
              id="suprime"
              label="Supressão de células pequenas ativa"
              checked={suprime}
              onChange={setSuprime}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Critérios de aceite</CardTitle>
            <Badge
              variant="secondary"
              className={
                resultado.aprovado
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/15 text-destructive"
              }
            >
              {resultado.aprovado ? "Aprovado" : "Reprovado"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {resultado.criterios.map((c) => (
            <div key={c.id} className="flex items-start gap-2 rounded-md border p-2">
              <Icon
                name={c.ok ? "check_circle" : "cancel"}
                className={`mt-0.5 text-base ${c.ok ? "text-emerald-600" : "text-destructive"}`}
              />
              <div>
                <p className="font-medium">
                  {c.id} — {c.titulo}
                </p>
                <p className="text-xs text-muted-foreground">{c.detalhe}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleLinha({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function NetworkCapitalPanel() {
  const contrato = validarContratoParceria({
    id: "c-demo",
    parteA: "Imobiliária Ferragano",
    parteB: "Incorporadora Parceira",
    escopoDados: ["oportunidade_compartilhada"],
    comissaoPct: 4,
    vigenciaInicio: "2026-01-01",
    vigenciaFim: "2027-01-01",
    assinadoPor: "Diretoria",
    rescisao: "aviso prévio de 30 dias",
  });

  const compliance = validarCompliance({
    parceiroId: "p-demo",
    cnpjValidado: true,
    creciValidado: false,
    documentosPendentes: ["contrato social"],
    sancoesEncontradas: 0,
    ultimaRevisao: null,
  });

  const liquidez = avaliarLiquidez({
    carteiraTotal: 12_000_000,
    antecipado: 4_800_000,
    inadimplente: 240_000,
    concentracaoMaiorSacado: 18,
    prazoMedioDias: 150,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <VereditoCard
        titulo="Contrato de parceria"
        descricao="Escopo de dado, comissão, vigência e rescisão são obrigatórios."
        veredito={contrato}
      />
      <VereditoCard
        titulo="Compliance do parceiro"
        descricao="Habilitação: CNPJ, CRECI, documentos e sanções."
        veredito={compliance}
      />
      <VereditoCard
        titulo="Liquidez da carteira"
        descricao={`Cobertura ${liquidez.coberturaPct}% · inadimplência ${liquidez.inadimplenciaPct}%`}
        veredito={liquidez}
      />
    </div>
  );
}

function VereditoCard({
  titulo,
  descricao,
  veredito,
}: {
  titulo: string;
  descricao: string;
  veredito: { apto: boolean; motivos: string[]; observacoes: string[] };
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{titulo}</CardTitle>
          <Badge
            variant="secondary"
            className={
              veredito.apto
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/15 text-destructive"
            }
          >
            {veredito.apto ? "Apto" : "Inapto"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="font-medium">Bloqueios</p>
          {veredito.motivos.length === 0 ? (
            <p className="text-muted-foreground">nenhum</p>
          ) : (
            <ul className="mt-1 space-y-1 text-destructive">
              {veredito.motivos.map((m) => (
                <li key={m}>• {m}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="font-medium">Observações</p>
          {veredito.observacoes.length === 0 ? (
            <p className="text-muted-foreground">nenhuma</p>
          ) : (
            <ul className="mt-1 space-y-1 text-muted-foreground">
              {veredito.observacoes.map((o) => (
                <li key={o}>• {o}</li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const VERTICAIS_ONBOARDING = Object.keys(onboardingVerticais) as VerticalKey[];

function OnboardingPanel() {
  const [vertical, setVertical] = useState<VerticalKey>("academy");
  const [evidencias, setEvidencias] = useState<Record<string, string>>({});

  const perguntas = onboardingVerticais[vertical];
  const prontidao = avaliarProntidao(
    vertical,
    perguntas.map((p) => ({ id: p.id, evidencia: evidencias[p.id] ?? "" })),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {VERTICAIS_ONBOARDING.map((k) => (
          <Button
            key={k}
            size="sm"
            variant={k === vertical ? "default" : "outline"}
            onClick={() => setVertical(k)}
          >
            {k}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Trilha de evidência de prontidão</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pergunta sem evidência não conta. Evidência é o que sustenta a resposta.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {prontidao.respondidas} de {prontidao.total} com evidência
              </span>
              <Badge
                variant="secondary"
                className={
                  prontidao.pronta
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                }
              >
                {prontidao.pronta ? "Pronta" : "Pendente"}
              </Badge>
            </div>
            <Progress value={prontidao.progressoPct} />
          </div>

          {prontidao.bloqueio ? (
            <p className="flex gap-2 rounded-md bg-destructive/10 p-2 text-destructive">
              <Icon name="block" className="mt-0.5 text-base" />
              <span>{prontidao.bloqueio}</span>
            </p>
          ) : null}

          {perguntas.map((p) => (
            <div key={p.id} className="space-y-1 rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <Label htmlFor={`ev-${p.id}`} className="font-medium">
                  {p.pergunta}
                </Label>
                {p.bloqueante ? (
                  <Badge variant="outline" className="text-xs">
                    bloqueante
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">Evidência aceita: {p.evidencia}</p>
              <Input
                id={`ev-${p.id}`}
                placeholder="Onde está a evidência?"
                value={evidencias[p.id] ?? ""}
                onChange={(e) => setEvidencias((prev) => ({ ...prev, [p.id]: e.target.value }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
