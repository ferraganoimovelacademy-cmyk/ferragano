import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/platform/comercial";
import { whatsappLink } from "@/lib/site/contato";
import { COMPROMETIMENTO, PRAZO_MESES, simularUnidade } from "@/lib/site/credito";
import type { CuryUnidade } from "@/lib/site/cury";

/**
 * Sprint UI 06 — simulador contextual do empreendimento.
 * Parte do preço real da unidade escolhida e devolve a parcela estimada.
 * 100% client-side, determinístico e sem análise de crédito.
 */
const soDigitos = (v: string) => {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export function SimuladorEmpreendimento({
  nome,
  unidades,
  precoMin,
}: {
  nome: string;
  unidades: CuryUnidade[];
  precoMin: number | null;
}) {
  const opcoes = useMemo(
    () =>
      unidades
        .filter((u) => u.status === "disponivel" && (u.preco ?? 0) > 0)
        .sort((a, b) => (a.preco ?? 0) - (b.preco ?? 0))
        .slice(0, 8),
    [unidades],
  );

  const [unidadeId, setUnidadeId] = useState<string | null>(opcoes[0]?.id ?? null);
  const [renda, setRenda] = useState(7000);
  const [fgts, setFgts] = useState(20000);
  const [entrada, setEntrada] = useState(30000);

  const unidade = opcoes.find((u) => u.id === unidadeId) ?? opcoes[0] ?? null;
  const valorImovel = unidade?.preco ?? precoMin ?? 0;
  const s = simularUnidade({ valorImovel, renda, fgts, entrada });

  const mensagem = whatsappLink(
    `Olá! Simulei o ${nome}${unidade ? ` (unidade ${unidade.identificador})` : ""} ` +
      `com renda de ${formatBRL(renda)} e recursos de ${formatBRL(s.recursosProprios)}. ` +
      `A parcela estimada ficou em ${formatBRL(s.parcela)}. Quero validar as condições reais.`,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
      <form
        className="rounded-2xl border border-border bg-card p-6"
        onSubmit={(ev) => ev.preventDefault()}
      >
        <p className="t-caps text-muted-foreground">Seu cenário</p>

        {opcoes.length > 0 && (
          <div className="mt-5">
            <Label htmlFor="sim-unidade" className="text-xs text-muted-foreground">
              Unidade
            </Label>
            <select
              id="sim-unidade"
              value={unidade?.id ?? ""}
              onChange={(ev) => setUnidadeId(ev.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              {opcoes.map((u) => (
                <option key={u.id} value={u.id}>
                  {[u.identificador, u.dormitorios ? `${u.dormitorios} dorm` : null, u.area_privativa ? `${u.area_privativa} m²` : null]
                    .filter(Boolean)
                    .join(" · ")}{" "}
                  — {formatBRL(u.preco)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-5 grid gap-4">
          <div>
            <Label htmlFor="sim-renda" className="text-xs text-muted-foreground">
              Renda familiar mensal
            </Label>
            <Input
              id="sim-renda"
              inputMode="numeric"
              value={formatBRL(renda)}
              onChange={(ev) => setRenda(soDigitos(ev.target.value))}
              className="mt-2 h-11"
            />
          </div>
          <div>
            <Label htmlFor="sim-fgts" className="text-xs text-muted-foreground">
              FGTS disponível
            </Label>
            <Input
              id="sim-fgts"
              inputMode="numeric"
              value={formatBRL(fgts)}
              onChange={(ev) => setFgts(soDigitos(ev.target.value))}
              className="mt-2 h-11"
            />
          </div>
          <div>
            <Label htmlFor="sim-entrada" className="text-xs text-muted-foreground">
              Entrada em dinheiro
            </Label>
            <Input
              id="sim-entrada"
              inputMode="numeric"
              value={formatBRL(entrada)}
              onChange={(ev) => setEntrada(soDigitos(ev.target.value))}
              className="mt-2 h-11"
            />
          </div>
        </div>

        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          Estimativa em {PRAZO_MESES} meses com a taxa de referência da {s.faixa.rotulo.toLowerCase()}.
          Não é análise de crédito: taxa, subsídio e prazo finais são confirmados pelo banco.
        </p>
      </form>

      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <p className="t-caps text-gold">Resultado</p>
        <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Parcela estimada</p>
            <p className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              {formatBRL(s.parcela)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor do imóvel</p>
            <p className="font-display text-xl font-semibold tracking-tight">{formatBRL(s.valorImovel)}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-4">
            <dt className="text-xs text-muted-foreground">Recursos próprios (FGTS + entrada)</dt>
            <dd className="mt-1 font-medium">{formatBRL(s.recursosProprios)}</dd>
          </div>
          <div className="rounded-xl border border-border p-4">
            <dt className="text-xs text-muted-foreground">Subsídio estimado</dt>
            <dd className="mt-1 font-medium">{s.subsidio > 0 ? formatBRL(s.subsidio) : "Não aplicável"}</dd>
          </div>
          <div className="rounded-xl border border-border p-4">
            <dt className="text-xs text-muted-foreground">Valor financiado</dt>
            <dd className="mt-1 font-medium">{formatBRL(s.financiado)}</dd>
          </div>
          <div className="rounded-xl border border-border p-4">
            <dt className="text-xs text-muted-foreground">Comprometimento da renda</dt>
            <dd className="mt-1 font-medium">
              {renda > 0 ? `${Math.round(s.comprometimento * 100)}%` : "—"}
            </dd>
          </div>
        </dl>

        <p
          className={`mt-6 flex items-start gap-2 rounded-xl border p-4 text-sm leading-relaxed ${
            s.cabe ? "border-border bg-background" : "border-gold/40 bg-gold/5"
          }`}
        >
          <Icon name={s.cabe ? "check_circle" : "info"} size={18} className="mt-0.5 shrink-0 text-gold" />
          <span>
            {s.cabe
              ? `A parcela fica dentro dos ${Math.round(COMPROMETIMENTO * 100)}% da renda — cenário aprovável na maioria dos bancos.`
              : `Para manter a parcela em ${Math.round(COMPROMETIMENTO * 100)}% da renda, a referência seria ${formatBRL(
                  s.rendaSugerida,
                )} de renda familiar, ou aumentar FGTS e entrada. Compor renda com um segundo comprador resolve a maioria dos casos.`}
          </span>
        </p>

        <a
          href={mensagem}
          target="_blank"
          rel="noopener noreferrer"
          className="press mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground"
        >
          <Icon name="chat" size={18} />
          Validar esta simulação com o Ferragano
        </a>
      </div>
    </div>
  );
}