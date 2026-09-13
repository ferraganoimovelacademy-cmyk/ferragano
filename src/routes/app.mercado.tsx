import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSession } from "@/hooks/use-session";
import { useTrackScreen } from "@/hooks/use-telemetry";
import { isAdminRole } from "@/lib/platform/roles";
import {
  classeAmbienteLabels,
  classeAquecimentoLabels,
  frescorLabels,
  pct,
  tipoRegiaoLabels,
  type AnaliseRegiao,
  type ClasseAmbiente,
  type ClasseAquecimento,
  type Frescor,
  type LeituraAmbiente,
  type LeituraIndicador,
  type Proveniencia,
} from "@/lib/platform/market";
import {
  baseConclusaoLabels,
  confiancaContextoLabels,
  publicoLabels,
  type ConfiancaContexto,
  type ContextoIndicador,
  type NarrativaMercado,
} from "@/lib/platform/market-context";
import {
  coletarIndicadoresAgora,
  getMarketRadar,
  salvarColetaRegional,
  salvarRegiao,
} from "@/lib/platform/market.functions";
import {
  direcaoCorrelacaoLabels,
  forcaLabels,
  type Correlacao,
  type ForcaCorrelacao,
} from "@/lib/platform/market-analytics";
import { getMarketCorrelations } from "@/lib/platform/market-analytics.functions";
import {
  avaliarEvidencia,
  estadoDriftLabels,
  forcaEvidenciaLabels,
  type Drift,
  type EstadoDrift,
  type Evidencia,
  type ForcaEvidencia,
} from "@/lib/platform/evidence";

export const Route = createFileRoute("/app/mercado")({
  head: () => ({
    meta: [
      { title: "Radar de mercado — indicadores e liquidez por região" },
      {
        name: "description",
        content:
          "Selic, IPCA, IGP-M, INCC, TR, CDI e juros do financiamento imobiliário com fonte e data de coleta, mais preço do m², absorção e liquidez por bairro.",
      },
      { property: "og:title", content: "Radar de mercado — Ferragano One" },
      {
        property: "og:description",
        content:
          "Inteligência de mercado com proveniência declarada: cada número traz fonte, competência, momento da coleta e versão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MercadoPage,
});

const dataHora = (v: string) =>
  new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const competencia = (v: string) =>
  new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" });
const reais = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

const frescorCor: Record<Frescor, string> = {
  atual: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  defasado: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  obsoleto: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  sem_coleta: "bg-muted text-muted-foreground",
};

const ambienteCor: Record<ClasseAmbiente, string> = {
  estimulante: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  neutro: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  apertado: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  restritivo: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  indefinido: "bg-muted text-muted-foreground",
};

const aquecimentoCor: Record<ClasseAquecimento, string> = {
  aquecido: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  equilibrado: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  lento: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  travado: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  indefinido: "bg-muted text-muted-foreground",
};

const confiancaCor: Record<ConfiancaContexto, string> = {
  alta: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  media: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  baixa: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  indefinida: "bg-muted text-muted-foreground",
};

const direcaoIcone: Record<string, { nome: string; cor: string }> = {
  positivo: { nome: "trending_up", cor: "text-emerald-600 dark:text-emerald-400" },
  negativo: { nome: "trending_down", cor: "text-rose-600 dark:text-rose-400" },
  neutro: { nome: "trending_flat", cor: "text-muted-foreground" },
};

/** ADR-024: cada consequência declara público, direção e base da conclusão. */
function ContextoCard({ contexto }: { contexto: ContextoIndicador }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{contexto.nome}</CardTitle>
          <Badge className={confiancaCor[contexto.confianca]} variant="secondary">
            {confiancaContextoLabels[contexto.confianca]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{contexto.motivoConfianca}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {contexto.impactos.length === 0 ? (
          <p className="text-sm text-muted-foreground">{contexto.motivoAusencia}</p>
        ) : (
          <>
            <ul className="space-y-2">
              {contexto.impactos.map((i) => {
                const icone = direcaoIcone[i.direcao] ?? direcaoIcone["neutro"]!;
                return (
                  <li key={`${i.publico}-${i.titulo}`} className="flex gap-2">
                    <Icon name={icone.nome} className={`mt-0.5 text-base ${icone.cor}`} />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {publicoLabels[i.publico]}: {i.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground">{i.leitura}</p>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {baseConclusaoLabels[i.base]}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {contexto.acaoSugerida ? (
              <p className="rounded-md bg-muted px-3 py-2 text-xs">
                <span className="font-medium">Ação sugerida: </span>
                {contexto.acaoSugerida}
              </p>
            ) : null}
            {contexto.regra ? (
              <p className="text-[11px] text-muted-foreground">Regra: {contexto.regra}</p>
            ) : null}
          </>
        )}
        {contexto.proveniencia ? <Origem proveniencia={contexto.proveniencia} /> : null}
      </CardContent>
    </Card>
  );
}

function NarrativaItem({ narrativa }: { narrativa: NarrativaMercado }) {
  return (
    <li className="space-y-1 rounded-md border border-border p-3">
      <p className="text-sm">{narrativa.texto}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge className={confiancaCor[narrativa.confianca]} variant="secondary">
          {confiancaContextoLabels[narrativa.confianca]}
        </Badge>
        <span>{baseConclusaoLabels[narrativa.base]}</span>
        <span>· Fonte: {narrativa.fonte}</span>
      </div>
    </li>
  );
}

const forcaCor: Record<ForcaCorrelacao, string> = {
  forte: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  moderada: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  fraca: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  sem_evidencia: "bg-muted text-muted-foreground",
};

const coef = (v: number | null, casas = 2) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas,
      }).format(v);

const forcaEvidenciaCor: Record<ForcaEvidencia, string> = {
  alta: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  moderada: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  baixa: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  muito_baixa: "bg-muted text-muted-foreground",
};

const driftCor: Record<EstadoDrift, string> = {
  estavel: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  em_drift: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  indefinido: "bg-muted text-muted-foreground",
};

/** ADR-026: Evidence Card — mostra sustentação, nunca causa. */
function EvidenceCard({ evidencia, drift }: { evidencia: Evidencia; drift?: Drift }) {
  const l = evidencia.leitura;
  return (
    <details className="rounded-md border bg-muted/30 p-3">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-xs font-medium">
        <Badge variant="secondary" className={forcaEvidenciaCor[evidencia.forca]}>
          {forcaEvidenciaLabels[evidencia.forca]}
        </Badge>
        {drift ? (
          <Badge variant="secondary" className={driftCor[drift.estado]}>
            {estadoDriftLabels[drift.estado]}
          </Badge>
        ) : null}
        <span className="text-muted-foreground">
          {evidencia.criteriosAtendidos} de {evidencia.criteriosTotal} critérios de sustentação
        </span>
      </summary>
      <div className="space-y-3 pt-3">
        <p className="text-xs text-muted-foreground">{evidencia.narrativa}</p>
        {drift ? <p className="text-xs text-muted-foreground">{drift.detalhe}</p> : null}
        {l ? (
          <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Coeficiente</dt>
              <dd className="font-semibold">{coef(l.coeficiente)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">IC95%</dt>
              <dd className="font-semibold">
                {l.icInferior == null ? "—" : `${coef(l.icInferior)} – ${coef(l.icSuperior)}`}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Defasagem</dt>
              <dd className="font-semibold">{l.lagDias} dias</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">R²</dt>
              <dd className="font-semibold">{coef(l.determinacao)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">p-valor</dt>
              <dd className="font-semibold">{coef(l.pValor, 4)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Amostra</dt>
              <dd className="font-semibold">{l.amostra} meses</dd>
            </div>
          </dl>
        ) : (
          <p className="text-xs text-muted-foreground">{evidencia.motivoAusencia}</p>
        )}
        <ul className="space-y-1 text-xs">
          {evidencia.criterios.map((c) => (
            <li key={c.chave} className="flex gap-2">
              <span
                aria-hidden
                className={c.atendido ? "text-emerald-600" : "text-muted-foreground"}
              >
                {c.atendido ? "✓" : "—"}
              </span>
              <span>
                <span className="font-medium">{c.rotulo}</span>
                {c.informativo ? (
                  <span className="text-muted-foreground"> (informativo)</span>
                ) : null}
                <span className="sr-only">{c.atendido ? " — atendido" : " — não atendido"}</span>
                <span className="text-muted-foreground"> · {c.detalhe}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Base: {evidencia.externo.nome} (fonte externa) + histórico deste workspace ·{" "}
          {baseConclusaoLabels["evidencia_historica"]}. {evidencia.ressalva}
        </p>
      </div>
    </details>
  );
}

/** ADR-025: correlação medida, com amostra e defasagem — nunca causa. */
function CorrelacaoCard({ correlacao, drift }: { correlacao: Correlacao; drift?: Drift }) {
  const melhor = correlacao.melhor;
  const evidencia = avaliarEvidencia(correlacao);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">
            {correlacao.externo.nome} × {correlacao.interno.nome}
          </CardTitle>
          <Badge variant="secondary" className={forcaCor[melhor?.forca ?? "sem_evidencia"]}>
            {forcaLabels[melhor?.forca ?? "sem_evidencia"]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {baseConclusaoLabels["evidencia_historica"]} · janela de {correlacao.janelaMeses} meses
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{correlacao.narrativa}</p>
        {melhor ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Coeficiente</p>
              <p className="text-lg font-semibold">{coef(melhor.coeficiente)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Confiança</p>
              <p className="text-lg font-semibold">{coef(melhor.confiancaPct, 1)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">IC95%</p>
              <p className="text-lg font-semibold">
                {melhor.icInferior == null
                  ? "—"
                  : `${coef(melhor.icInferior)} – ${coef(melhor.icSuperior)}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amostra</p>
              <p className="text-lg font-semibold">{melhor.amostra} meses</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Defasagem</p>
              <p className="text-lg font-semibold">{melhor.lagDias} dias</p>
            </div>
          </div>
        ) : null}
        <EvidenceCard evidencia={evidencia} drift={drift} />
        <div className="space-y-1">
          <p className="text-xs font-medium">Defasagens medidas</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {correlacao.leituras.map((l) => (
              <li key={l.lagMeses}>
                {l.lagDias} dias: {l.forca === "sem_evidencia" ? l.motivoAusencia : null}
                {l.forca !== "sem_evidencia" ? (
                  <>
                    coeficiente {coef(l.coeficiente)} ·{" "}
                    {direcaoCorrelacaoLabels[l.direcao].toLowerCase()} · R² {coef(l.determinacao)} ·{" "}
                    {l.amostra} meses
                    {l.alertaTendencia ? " · possível tendência comum" : ""}
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/** ADR-023: nenhum número externo aparece sem fonte, competência e coleta. */
function Origem({ proveniencia }: { proveniencia: Proveniencia }) {
  return (
    <p className="text-xs text-muted-foreground">
      Fonte: {proveniencia.fonte}
      {proveniencia.fonteSerie ? ` · série ${proveniencia.fonteSerie}` : ""} · competência{" "}
      {competencia(proveniencia.referencia)} · coletado em {dataHora(proveniencia.coletadoEm)} ·
      versão {proveniencia.versao}
      {proveniencia.fonteUrl ? (
        <>
          {" · "}
          <a
            href={proveniencia.fonteUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            abrir fonte
          </a>
        </>
      ) : null}
    </p>
  );
}

function IndicadorCard({ leitura }: { leitura: LeituraIndicador }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {leitura.nome}
          </CardTitle>
          <Badge variant="secondary" className={frescorCor[leitura.frescor]}>
            {frescorLabels[leitura.frescor]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-semibold tracking-tight">
          {leitura.valor == null ? "—" : `${pct(leitura.valor)} `}
          {leitura.valor == null ? null : (
            <span className="text-xs font-normal text-muted-foreground">{leitura.unidade}</span>
          )}
        </p>

        {leitura.valor == null ? (
          <p className="text-xs text-muted-foreground">{leitura.motivoAusencia}</p>
        ) : (
          <div className="space-y-1 text-xs text-muted-foreground">
            {leitura.variacaoAnterior != null ? (
              <p className="flex items-center gap-1">
                <Icon
                  name={
                    leitura.tendencia === "positivo"
                      ? "trending_up"
                      : leitura.tendencia === "negativo"
                        ? "trending_down"
                        : "remove"
                  }
                  className="text-sm"
                />
                {leitura.variacaoAnterior > 0 ? "+" : ""}
                {leitura.variacaoAnterior} p.p. contra a coleta anterior
              </p>
            ) : null}
            {leitura.acumulado12m != null ? (
              <p>Acumulado 12 meses: {pct(leitura.acumulado12m)}</p>
            ) : null}
            <p>
              {leitura.amostra} competência(s) coletada(s)
              {leitura.defasagemDias != null
                ? ` · ${leitura.defasagemDias} dias desde a competência`
                : ""}
            </p>
            {leitura.proveniencia ? <Origem proveniencia={leitura.proveniencia} /> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AmbienteCard({ ambiente }: { ambiente: LeituraAmbiente }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{ambiente.titulo}</CardTitle>
          <Badge variant="secondary" className={ambienteCor[ambiente.classe]}>
            {classeAmbienteLabels[ambiente.classe]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{ambiente.resumo}</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          {ambiente.fatores.map((f) => (
            <li key={f.nome} className="flex gap-2">
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
        {ambiente.baseCodigos.length ? (
          <p className="text-xs text-muted-foreground">
            Séries usadas: {ambiente.baseCodigos.join(", ")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RegiaoItem({ analise }: { analise: AnaliseRegiao }) {
  const s = analise.atual;
  return (
    <AccordionItem value={analise.regiao.id}>
      <AccordionTrigger className="text-left">
        <div className="flex flex-1 flex-wrap items-center gap-2 pr-2">
          <span className="font-medium">{analise.regiao.nome}</span>
          <span className="text-xs text-muted-foreground">
            {tipoRegiaoLabels[analise.regiao.tipo]}
            {analise.regiao.cidade ? ` · ${analise.regiao.cidade}` : ""}
            {analise.regiao.uf ? `/${analise.regiao.uf}` : ""}
          </span>
          <Badge variant="secondary" className={aquecimentoCor[analise.aquecimento]}>
            {classeAquecimentoLabels[analise.aquecimento]}
          </Badge>
          {analise.liquidez != null ? (
            <span className="text-xs text-muted-foreground">Liquidez {analise.liquidez}/100</span>
          ) : null}
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-3">
        {s == null ? (
          <p className="text-sm text-muted-foreground">{analise.motivoAusencia}</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Preço médio do m²</p>
                <p className="text-lg font-semibold">
                  {s.precoMedioM2 == null ? "—" : reais(s.precoMedioM2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tempo médio de venda</p>
                <p className="text-lg font-semibold">
                  {s.tempoMedioVendaDias == null ? "—" : `${s.tempoMedioVendaDias} dias`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cobertura da coleta</p>
                <p className="text-lg font-semibold">{analise.cobertura}%</p>
              </div>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {analise.fatores.map((f) => (
                <li key={f.nome}>
                  <span className="font-medium text-foreground">{f.nome}:</span> {f.detalhe}
                </li>
              ))}
            </ul>
            {analise.motivoAusencia ? (
              <p className="text-xs text-muted-foreground">{analise.motivoAusencia}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={frescorCor[analise.frescor]}>
                {frescorLabels[analise.frescor]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {analise.amostra} competência(s) coletada(s)
              </span>
            </div>
            {analise.proveniencia ? <Origem proveniencia={analise.proveniencia} /> : null}
          </>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

const numeroOuNulo = (v: string) => {
  if (!v.trim()) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

function MercadoPage() {
  useTrackScreen("observability", "market_radar");
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const podeEditar = isAdminRole(session?.roles);
  const queryClient = useQueryClient();

  const carregar = useServerFn(getMarketRadar);
  const coletar = useServerFn(coletarIndicadoresAgora);
  const criarRegiao = useServerFn(salvarRegiao);
  const criarColeta = useServerFn(salvarColetaRegional);

  const radar = useQuery({
    queryKey: ["market-radar", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => carregar({ data: { workspaceId: workspaceId! } }),
  });

  const carregarCorrelacoes = useServerFn(getMarketCorrelations);
  const [janelaMeses, setJanelaMeses] = useState(24);
  const correlacoes = useQuery({
    queryKey: ["market-correlacoes", workspaceId, janelaMeses],
    enabled: Boolean(workspaceId),
    queryFn: () => carregarCorrelacoes({ data: { workspaceId: workspaceId!, janelaMeses } }),
  });

  const [novaRegiao, setNovaRegiao] = useState({ nome: "", tipo: "bairro", cidade: "", uf: "" });
  const [coleta, setColeta] = useState({
    regionId: "",
    referencia: new Date().toISOString().slice(0, 8) + "01",
    fonteNome: "",
    fonteUrl: "",
    metodologia: "",
    precoMedioM2: "",
    ofertaUnidades: "",
    absorcaoPct: "",
    vacanciaPct: "",
    tempoMedioVendaDias: "",
    amostra: "",
  });

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ["market-radar", workspaceId] });

  const coletaIndicadores = useMutation({
    mutationFn: () => coletar({ data: { workspaceId: workspaceId! } }),
    onSuccess: (r) => {
      toast.success(
        `Coleta concluída: ${r.novos} nova(s), ${r.revisoes} revisão(ões), ${r.falhas.length} falha(s).`,
      );
      void invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutacaoRegiao = useMutation({
    mutationFn: () =>
      criarRegiao({
        data: {
          workspaceId: workspaceId!,
          nome: novaRegiao.nome,
          tipo: novaRegiao.tipo as "bairro" | "cidade" | "regiao",
          cidade: novaRegiao.cidade || null,
          uf: novaRegiao.uf || null,
        },
      }),
    onSuccess: () => {
      toast.success("Região cadastrada.");
      setNovaRegiao({ nome: "", tipo: "bairro", cidade: "", uf: "" });
      void invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutacaoColeta = useMutation({
    mutationFn: () =>
      criarColeta({
        data: {
          workspaceId: workspaceId!,
          regionId: coleta.regionId,
          referencia: coleta.referencia,
          fonteNome: coleta.fonteNome,
          fonteUrl: coleta.fonteUrl || null,
          metodologia: coleta.metodologia || null,
          precoMedioM2: numeroOuNulo(coleta.precoMedioM2),
          ofertaUnidades: numeroOuNulo(coleta.ofertaUnidades),
          absorcaoPct: numeroOuNulo(coleta.absorcaoPct),
          vacanciaPct: numeroOuNulo(coleta.vacanciaPct),
          tempoMedioVendaDias: numeroOuNulo(coleta.tempoMedioVendaDias),
          amostra: numeroOuNulo(coleta.amostra),
        },
      }),
    onSuccess: (r) => {
      toast.success(`Coleta registrada como versão ${r.versao}.`);
      void invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const economico = radar.data?.economico;
  const regional = radar.data?.regional;
  const contexto = radar.data?.contexto;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Radar de mercado</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Contexto externo com proveniência declarada: fonte, competência, momento da coleta e
          versão. Dado de mercado não é somado nem comparado com o dado próprio da operação — ele
          explica o cenário, não substitui a medição interna.
        </p>
        {economico ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">
              Cobertura {economico.cobertura}% ({economico.seriesComColeta}/{economico.seriesTotal}{" "}
              séries)
            </Badge>
            {economico.ultimaColeta ? (
              <span>Última coleta: {dataHora(economico.ultimaColeta)}</span>
            ) : null}
            {podeEditar ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => coletaIndicadores.mutate()}
                disabled={coletaIndicadores.isPending}
              >
                <Icon name="cloud_download" className="mr-1 text-sm" />
                {coletaIndicadores.isPending ? "Coletando…" : "Coletar indicadores"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      {radar.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : radar.isError ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Não foi possível carregar o radar de mercado.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="economico">
          <TabsList>
            <TabsTrigger value="economico">Radar econômico</TabsTrigger>
            <TabsTrigger value="contexto">Impacto no negócio</TabsTrigger>
            <TabsTrigger value="correlacoes">Correlações</TabsTrigger>
            <TabsTrigger value="regional">Radar regional</TabsTrigger>
          </TabsList>

          <TabsContent value="economico" className="space-y-6 pt-4">
            <section className="grid gap-4 md:grid-cols-3">
              {economico?.ambientes.map((a) => (
                <AmbienteCard key={a.chave} ambiente={a} />
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">Indicadores</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {economico?.leituras.map((l) => (
                  <IndicadorCard key={l.codigo} leitura={l} />
                ))}
              </div>
              {economico?.seriesObsoletas.length ? (
                <p className="text-xs text-muted-foreground">
                  Coleta obsoleta em: {economico.seriesObsoletas.join(", ")}.
                </p>
              ) : null}
            </section>
          </TabsContent>

          <TabsContent value="contexto" className="space-y-6 pt-4">
            <section className="space-y-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">Contexto para o Advisor</h2>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  Frases geradas por regra de negócio a partir do movimento de cada indicador. Nada
                  aqui é previsão: quando a consequência depende do histórico da operação, isso é
                  declarado na própria frase.
                </p>
              </div>
              {contexto?.narrativas.length ? (
                <ul className="space-y-2">
                  {contexto.narrativas.map((n) => (
                    <NarrativaItem key={n.chave} narrativa={n} />
                  ))}
                </ul>
              ) : (
                <Card>
                  <CardContent className="py-6 text-sm text-muted-foreground">
                    Nenhum indicador se moveu desde a competência anterior — sem movimento, não há
                    recomendação de contexto.
                  </CardContent>
                </Card>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">Consequências por público</h2>
                {contexto ? (
                  <Badge variant="secondary">
                    {contexto.indicadoresComContexto} indicadores interpretados
                    {contexto.indicadoresSemColeta
                      ? ` · ${contexto.indicadoresSemColeta} sem coleta`
                      : ""}
                  </Badge>
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {contexto?.indicadores.map((c) => (
                  <ContextoCard key={c.codigo} contexto={c} />
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="correlacoes" className="space-y-4 pt-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">
                Correlação entre mercado e operação
              </h2>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Medição temporal entre indicador externo e resultado do seu funil, com defasagem de
                0, 30, 60 e 90 dias. A plataforma devolve coeficiente, amostra e confiança —
                correlação não é causa e nada aqui é previsão.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Label htmlFor="janela" className="text-xs text-muted-foreground">
                Janela analisada
              </Label>
              <Select value={String(janelaMeses)} onValueChange={(v) => setJanelaMeses(Number(v))}>
                <SelectTrigger id="janela" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 meses</SelectItem>
                  <SelectItem value="24">24 meses</SelectItem>
                  <SelectItem value="36">36 meses</SelectItem>
                </SelectContent>
              </Select>
              {correlacoes.data ? (
                <Badge variant="secondary">
                  {correlacoes.data.paresComEvidencia} de {correlacoes.data.paresAvaliados} pares
                  com evidência
                </Badge>
              ) : null}
            </div>

            {correlacoes.isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : correlacoes.isError ? (
              <Card>
                <CardContent className="py-6 text-sm text-muted-foreground">
                  Não foi possível medir as correlações.
                </CardContent>
              </Card>
            ) : correlacoes.data?.paresComEvidencia === 0 ? (
              <Card>
                <CardContent className="py-6 text-sm text-muted-foreground">
                  Nenhum par tem evidência histórica suficiente nesta janela. São necessárias 12
                  competências pareadas entre a série de mercado e o resultado da operação.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {correlacoes.data?.correlacoes
                  .filter((c) => c.melhor !== null)
                  .map((c) => (
                    <CorrelacaoCard
                      key={c.chave}
                      correlacao={c}
                      drift={correlacoes.data?.drifts?.[c.chave]}
                    />
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="regional" className="space-y-6 pt-4">
            <section className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Regiões acompanhadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{regional?.regioesTotal ?? 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {regional?.regioesComColeta ?? 0} com coleta · cobertura{" "}
                    {regional?.cobertura ?? 0}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Preço médio do m²
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">
                    {regional?.precoMedioM2 == null ? "—" : reais(regional.precoMedioM2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Média das regiões com coleta</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Liquidez média
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">
                    {regional?.liquidezMedia == null ? "—" : `${regional.liquidezMedia}/100`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tempo de venda, absorção e vacância coletados
                  </p>
                </CardContent>
              </Card>
            </section>

            {regional?.alertas.length ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {regional.alertas.map((a) => (
                  <li key={a} className="flex gap-2">
                    <Icon name="warning" className="mt-0.5 text-sm" />
                    {a}
                  </li>
                ))}
              </ul>
            ) : null}

            {regional && regional.analises.length > 0 ? (
              <Accordion type="single" collapsible className="rounded-lg border">
                {regional.analises.map((a) => (
                  <RegiaoItem key={a.regiao.id} analise={a} />
                ))}
              </Accordion>
            ) : (
              <Card>
                <CardContent className="py-6 text-sm text-muted-foreground">
                  Nenhuma região cadastrada ainda. Cadastre bairros, cidades ou regiões para começar
                  a registrar coletas de mercado.
                </CardContent>
              </Card>
            )}

            {podeEditar ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cadastrar região</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="regiao-nome">Nome</Label>
                        <Input
                          id="regiao-nome"
                          value={novaRegiao.nome}
                          onChange={(e) => setNovaRegiao((s) => ({ ...s, nome: e.target.value }))}
                          placeholder="Pinheiros"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="regiao-tipo">Tipo</Label>
                        <Select
                          value={novaRegiao.tipo}
                          onValueChange={(v) => setNovaRegiao((s) => ({ ...s, tipo: v }))}
                        >
                          <SelectTrigger id="regiao-tipo">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bairro">Bairro</SelectItem>
                            <SelectItem value="cidade">Cidade</SelectItem>
                            <SelectItem value="regiao">Região</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="regiao-cidade">Cidade</Label>
                        <Input
                          id="regiao-cidade"
                          value={novaRegiao.cidade}
                          onChange={(e) => setNovaRegiao((s) => ({ ...s, cidade: e.target.value }))}
                          placeholder="São Paulo"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="regiao-uf">UF</Label>
                        <Input
                          id="regiao-uf"
                          maxLength={2}
                          value={novaRegiao.uf}
                          onChange={(e) =>
                            setNovaRegiao((s) => ({ ...s, uf: e.target.value.toUpperCase() }))
                          }
                          placeholder="SP"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => mutacaoRegiao.mutate()}
                      disabled={mutacaoRegiao.isPending || novaRegiao.nome.trim().length < 2}
                    >
                      Salvar região
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Registrar coleta de mercado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="coleta-regiao">Região</Label>
                        <Select
                          value={coleta.regionId}
                          onValueChange={(v) => setColeta((s) => ({ ...s, regionId: v }))}
                        >
                          <SelectTrigger id="coleta-regiao">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {(regional?.analises ?? []).map((a) => (
                              <SelectItem key={a.regiao.id} value={a.regiao.id}>
                                {a.regiao.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="coleta-referencia">Competência</Label>
                        <Input
                          id="coleta-referencia"
                          type="date"
                          value={coleta.referencia}
                          onChange={(e) => setColeta((s) => ({ ...s, referencia: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor="coleta-fonte">Fonte (obrigatória)</Label>
                        <Input
                          id="coleta-fonte"
                          value={coleta.fonteNome}
                          onChange={(e) => setColeta((s) => ({ ...s, fonteNome: e.target.value }))}
                          placeholder="Ex.: Secovi-SP, Boletim mensal"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor="coleta-url">Endereço da fonte</Label>
                        <Input
                          id="coleta-url"
                          value={coleta.fonteUrl}
                          onChange={(e) => setColeta((s) => ({ ...s, fonteUrl: e.target.value }))}
                          placeholder="https://…"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="coleta-preco">Preço médio do m² (R$)</Label>
                        <Input
                          id="coleta-preco"
                          value={coleta.precoMedioM2}
                          onChange={(e) =>
                            setColeta((s) => ({ ...s, precoMedioM2: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="coleta-oferta">Oferta (unidades)</Label>
                        <Input
                          id="coleta-oferta"
                          value={coleta.ofertaUnidades}
                          onChange={(e) =>
                            setColeta((s) => ({ ...s, ofertaUnidades: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="coleta-absorcao">Absorção (% do estoque/mês)</Label>
                        <Input
                          id="coleta-absorcao"
                          value={coleta.absorcaoPct}
                          onChange={(e) =>
                            setColeta((s) => ({ ...s, absorcaoPct: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="coleta-vacancia">Vacância (%)</Label>
                        <Input
                          id="coleta-vacancia"
                          value={coleta.vacanciaPct}
                          onChange={(e) =>
                            setColeta((s) => ({ ...s, vacanciaPct: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="coleta-tempo">Tempo médio de venda (dias)</Label>
                        <Input
                          id="coleta-tempo"
                          value={coleta.tempoMedioVendaDias}
                          onChange={(e) =>
                            setColeta((s) => ({ ...s, tempoMedioVendaDias: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="coleta-amostra">Amostra (imóveis)</Label>
                        <Input
                          id="coleta-amostra"
                          value={coleta.amostra}
                          onChange={(e) => setColeta((s) => ({ ...s, amostra: e.target.value }))}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Campo em branco fica nulo — a plataforma não preenche lacuna com estimativa.
                      Nova coleta da mesma competência entra como nova versão, sem apagar a
                      anterior.
                    </p>
                    <Button
                      onClick={() => mutacaoColeta.mutate()}
                      disabled={
                        mutacaoColeta.isPending ||
                        !coleta.regionId ||
                        coleta.fonteNome.trim().length < 2
                      }
                    >
                      Registrar coleta
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
