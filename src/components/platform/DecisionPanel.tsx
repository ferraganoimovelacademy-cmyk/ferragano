import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/platform/comercial";
import {
  PERFIS_COMPRA,
  aderenciaLabel,
  perfilCompraLabels,
  prioridadeCores,
  type PerfilCompra,
} from "@/lib/platform/decision";
import {
  applyOpportunityScore,
  getDecisionPanel,
  saveQualification,
} from "@/lib/platform/decision.functions";

/**
 * SPRINT 08 — superfície de leitura do Decision Engine.
 * Nenhum cálculo acontece aqui: a tela apenas exibe o que o motor de regras
 * decidiu no servidor, sempre com o motivo ao lado do número.
 */
export function DecisionPanel({
  workspaceId,
  personId,
}: {
  workspaceId: string;
  personId: string;
}) {
  const fetchPanel = useServerFn(getDecisionPanel);
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ["decision", workspaceId, personId],
    queryFn: () => fetchPanel({ data: { workspaceId, personId, limite: 12 } }),
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["decision", workspaceId, personId] });
    queryClient.invalidateQueries({ queryKey: ["person", workspaceId, personId] });
  };

  if (isPending || !data) return <Skeleton className="h-80 w-full rounded-xl" />;

  const cap = data.capacidade;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Qualificação financeira</h2>
            <p className="text-sm text-muted-foreground">
              É a entrada do motor de regras. Sem ela, nenhuma recomendação é confiável.
            </p>
          </div>
          <QualificacaoDialog
            workspaceId={workspaceId}
            personId={personId}
            atual={data.qualificacao}
            observacao={data.observacao}
            onDone={invalidar}
          />
        </div>

        {data.temQualificacao ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador
              titulo="Parcela máxima"
              valor={formatBRL(cap.parcelaMaxima)}
              nota="30% da renda"
            />
            <Indicador
              titulo="Recursos próprios"
              valor={formatBRL(cap.recursosProprios)}
              nota={data.qualificacao.usa_fgts ? "entrada + FGTS" : "entrada"}
            />
            <Indicador
              titulo="Capacidade estimada"
              valor={formatBRL(cap.capacidadeTotal)}
              nota={`${cap.prazoMeses} meses`}
            />
            <Indicador
              titulo="Teto aplicado"
              valor={formatBRL(cap.tetoAplicado)}
              nota={data.qualificacao.preco_teto ? "limitado pelo cliente" : "pela capacidade"}
            />
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Preencha renda ou teto de preço para o motor recomendar unidades.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Próxima melhor ação</h2>
          <span className="text-xs text-muted-foreground">
            {data.oportunidades.length} oportunidade(s)
          </span>
        </div>

        {data.oportunidades.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma oportunidade aberta para calcular score.
          </p>
        )}

        {data.oportunidades.map((o) => (
          <OportunidadeCard
            key={o.id}
            workspaceId={workspaceId}
            oportunidade={o}
            onDone={invalidar}
          />
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Unidades recomendadas</h2>
          <span className="text-xs text-muted-foreground">
            {data.recomendadas.length} de {data.totalUnidadesAvaliadas} unidades disponíveis
          </span>
        </div>

        {data.recomendadas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {data.temQualificacao
              ? "Nenhuma unidade passou pelas regras de elegibilidade."
              : "Qualifique o cliente para ver a lista ranqueada."}
          </p>
        ) : (
          <div className="grid gap-3">
            {data.recomendadas.map((m) => (
              <MatchCard key={m.unidade.id} match={m} />
            ))}
          </div>
        )}

        {data.descartadas.length > 0 && (
          <details className="rounded-xl border border-border bg-muted/30 p-4">
            <summary className="cursor-pointer text-sm font-medium">
              {data.descartadas.length} unidade(s) descartada(s) pelas regras
            </summary>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {data.descartadas.map((d) => (
                <li key={d.unidade.id}>
                  <span className="text-foreground">
                    {d.unidade.empreendimentoNome} · {d.unidade.identificador}
                  </span>{" "}
                  — {d.bloqueios.join("; ")}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}

function Indicador({ titulo, valor, nota }: { titulo: string; valor: string; nota: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="mt-1 font-display text-lg font-semibold">{valor}</p>
      <p className="text-xs text-muted-foreground">{nota}</p>
    </div>
  );
}

type Panel = Awaited<ReturnType<typeof getDecisionPanel>>;

function OportunidadeCard({
  workspaceId,
  oportunidade,
  onDone,
}: {
  workspaceId: string;
  oportunidade: Panel["oportunidades"][number];
  onDone: () => void;
}) {
  const aplicar = useServerFn(applyOpportunityScore);
  const mutation = useMutation({
    mutationFn: () =>
      aplicar({ data: { workspaceId, opportunityId: oportunidade.id, score: oportunidade.score } }),
    onSuccess: () => {
      toast.success("Score aplicado à oportunidade.");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const divergente = oportunidade.scoreAtual !== oportunidade.score;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{oportunidade.titulo ?? "Oportunidade"}</p>
          <p className="text-sm text-muted-foreground">
            {oportunidade.valor ? formatBRL(oportunidade.valor) : "Sem valor"} · score calculado{" "}
            {oportunidade.score}/100 ({oportunidade.temperatura})
          </p>
        </div>
        {divergente && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            <Icon name="sync" size={16} /> Aplicar score ({oportunidade.scoreAtual} →{" "}
            {oportunidade.score})
          </Button>
        )}
      </div>

      <Progress value={oportunidade.score} className="mt-3 h-2" />

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Por que este score
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {oportunidade.fatores.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <Icon
                  name={f.peso >= 0 ? "trending_up" : "trending_down"}
                  size={16}
                  className={f.peso >= 0 ? "text-emerald-600" : "text-rose-600"}
                />
                <span className="text-muted-foreground">
                  {f.texto}{" "}
                  <span className="text-xs">
                    ({f.peso > 0 ? "+" : ""}
                    {f.peso})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Próxima melhor ação
          </p>
          <ul className="mt-2 space-y-2">
            {oportunidade.acoes.map((a) => (
              <li key={a.acao} className="flex items-start gap-2 text-sm">
                <Icon name={a.icone} size={18} className={prioridadeCores[a.prioridade]} />
                <span>
                  <span className="font-medium">{a.titulo}</span>
                  <span className="block text-xs text-muted-foreground">{a.motivo}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: Panel["recomendadas"][number] }) {
  const { unidade: u } = match;
  const rotulo = aderenciaLabel(match.aderencia);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {u.empreendimentoNome} · Unidade {u.identificador}
          </p>
          <p className="text-sm text-muted-foreground">
            {[u.bairro, u.cidade].filter(Boolean).join(", ") || "Localização não informada"} ·{" "}
            {u.dormitorios ?? 0} dorm · {u.vagas ?? 0} vaga(s) ·{" "}
            {u.preco ? formatBRL(u.preco) : "sem preço"}
          </p>
        </div>
        <div className="text-right">
          <p className={`font-display text-2xl font-semibold ${rotulo.classe}`}>
            {match.aderencia}%
          </p>
          <p className="text-xs text-muted-foreground">{rotulo.label}</p>
        </div>
      </div>

      <Separator className="my-3" />

      <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
        {match.motivos.map((m, i) => (
          <li key={i} className="flex items-start gap-2">
            <Icon name="check_circle" size={16} className="text-emerald-600" />
            {m.texto}
          </li>
        ))}
      </ul>

      {match.alertas.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-amber-600 dark:text-amber-400">
          {match.alertas.map((a, i) => (
            <li key={i} className="flex items-start gap-2">
              <Icon name="warning" size={16} />
              {a}
            </li>
          ))}
        </ul>
      )}

      {match.elegivelMcmv && (
        <Badge variant="secondary" className="mt-3">
          Minha Casa Minha Vida
        </Badge>
      )}
    </div>
  );
}

function QualificacaoDialog({
  workspaceId,
  personId,
  atual,
  observacao,
  onDone,
}: {
  workspaceId: string;
  personId: string;
  atual: Panel["qualificacao"];
  observacao: string | null;
  onDone: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(() => paraFormulario(atual, observacao));
  const salvar = useServerFn(saveQualification);

  useEffect(() => {
    if (aberto) setForm(paraFormulario(atual, observacao));
  }, [aberto, atual, observacao]);

  const mutation = useMutation({
    mutationFn: () =>
      salvar({
        data: {
          workspaceId,
          personId,
          renda_mensal: numero(form.renda_mensal),
          entrada_disponivel: numero(form.entrada_disponivel),
          usa_fgts: form.usa_fgts,
          fgts_valor: numero(form.fgts_valor),
          perfil: form.perfil,
          bairros_desejados: form.bairros
            .split(",")
            .map((b) => b.trim())
            .filter(Boolean),
          cidade: form.cidade || null,
          uf: form.uf ? form.uf.toUpperCase() : null,
          dormitorios_min: inteiro(form.dormitorios_min),
          vagas_min: inteiro(form.vagas_min),
          area_min: numero(form.area_min),
          preco_teto: numero(form.preco_teto),
          prazo_meses: inteiro(form.prazo_meses),
          banco_preferido: form.banco_preferido || null,
          restricao_credito: form.restricao_credito,
          primeiro_imovel: form.primeiro_imovel,
          observacao: form.observacao || null,
        },
      }),
    onSuccess: () => {
      toast.success("Qualificação salva.");
      setAberto(false);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Icon name="fact_check" size={16} /> Qualificar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Qualificação do cliente</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            label="Renda mensal (R$)"
            value={form.renda_mensal}
            onChange={(v) => setForm({ ...form, renda_mensal: v })}
          />
          <Campo
            label="Entrada disponível (R$)"
            value={form.entrada_disponivel}
            onChange={(v) => setForm({ ...form, entrada_disponivel: v })}
          />
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="fgts">Usa FGTS</Label>
            <Switch
              id="fgts"
              checked={form.usa_fgts}
              onCheckedChange={(v) => setForm({ ...form, usa_fgts: v })}
            />
          </div>
          <Campo
            label="Valor do FGTS (R$)"
            value={form.fgts_valor}
            onChange={(v) => setForm({ ...form, fgts_valor: v })}
          />

          <div className="space-y-1.5">
            <Label>Perfil</Label>
            <Select
              value={form.perfil}
              onValueChange={(v) => setForm({ ...form, perfil: v as PerfilCompra })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERFIS_COMPRA.map((p) => (
                  <SelectItem key={p} value={p}>
                    {perfilCompraLabels[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Campo
            label="Teto de preço (R$)"
            value={form.preco_teto}
            onChange={(v) => setForm({ ...form, preco_teto: v })}
          />

          <Campo
            label="Cidade desejada"
            value={form.cidade}
            onChange={(v) => setForm({ ...form, cidade: v })}
            texto
          />
          <Campo label="UF" value={form.uf} onChange={(v) => setForm({ ...form, uf: v })} texto />

          <div className="sm:col-span-2">
            <Campo
              label="Bairros desejados (separados por vírgula)"
              value={form.bairros}
              onChange={(v) => setForm({ ...form, bairros: v })}
              texto
            />
          </div>

          <Campo
            label="Dormitórios mínimos"
            value={form.dormitorios_min}
            onChange={(v) => setForm({ ...form, dormitorios_min: v })}
          />
          <Campo
            label="Vagas mínimas"
            value={form.vagas_min}
            onChange={(v) => setForm({ ...form, vagas_min: v })}
          />
          <Campo
            label="Área mínima (m²)"
            value={form.area_min}
            onChange={(v) => setForm({ ...form, area_min: v })}
          />
          <Campo
            label="Prazo de financiamento (meses)"
            value={form.prazo_meses}
            onChange={(v) => setForm({ ...form, prazo_meses: v })}
          />
          <Campo
            label="Banco preferido"
            value={form.banco_preferido}
            onChange={(v) => setForm({ ...form, banco_preferido: v })}
            texto
          />

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="restricao">Restrição de crédito</Label>
            <Switch
              id="restricao"
              checked={form.restricao_credito}
              onCheckedChange={(v) => setForm({ ...form, restricao_credito: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="primeiro">Primeiro imóvel</Label>
            <Switch
              id="primeiro"
              checked={form.primeiro_imovel}
              onCheckedChange={(v) => setForm({ ...form, primeiro_imovel: v })}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Observação</Label>
            <Textarea
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Salvar qualificação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  label,
  value,
  onChange,
  texto,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  texto?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={value}
        inputMode={texto ? "text" : "decimal"}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

const numero = (v: string) => {
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return v.trim() === "" || Number.isNaN(n) ? null : n;
};
const inteiro = (v: string) => {
  const n = numero(v);
  return n == null ? null : Math.round(n);
};
const texto = (v: number | string | null | undefined) => (v == null ? "" : String(v));

function paraFormulario(q: Panel["qualificacao"], observacao: string | null) {
  return {
    renda_mensal: texto(q.renda_mensal),
    entrada_disponivel: texto(q.entrada_disponivel),
    usa_fgts: q.usa_fgts,
    fgts_valor: texto(q.fgts_valor),
    perfil: q.perfil,
    bairros: q.bairros_desejados.join(", "),
    cidade: texto(q.cidade),
    uf: texto(q.uf),
    dormitorios_min: texto(q.dormitorios_min),
    vagas_min: texto(q.vagas_min),
    area_min: texto(q.area_min),
    preco_teto: texto(q.preco_teto),
    prazo_meses: texto(q.prazo_meses),
    banco_preferido: texto(q.banco_preferido),
    restricao_credito: q.restricao_credito,
    primeiro_imovel: q.primeiro_imovel,
    observacao: observacao ?? "",
  };
}
