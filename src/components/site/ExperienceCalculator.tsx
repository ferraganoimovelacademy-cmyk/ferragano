import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/platform/comercial";
import { MOTION } from "@/lib/site/motion";
import { MARCA } from "@/lib/site/posicionamento";
import type { CuryEmpreendimento } from "@/lib/site/cury";
import { whatsappLink } from "@/lib/site/contato";
import {
  COMPROMETIMENTO,
  FAIXAS_MCMV,
  PRAZO_MESES,
  compativeis,
  faixaPorRenda,
  recomendacaoFerragano,
  simularCompra,
} from "@/lib/site/credito";

/**
 * GATE 05 — Experience Calculator.
 * Entradas: renda, FGTS, entrada, cidade, faixa MCMV.
 * Saídas: faixa financiável, parcela, empreendimentos compatíveis e
 * recomendação da Ferragano — com transição suave em cada atualização.
 */
function paraNumero(v: string) {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Interpola o valor exibido a cada mudança de entrada (motion do número). */
function useValorAnimado(alvo: number) {
  const [valor, setValor] = useState(alvo);
  const anterior = useRef(alvo);

  useEffect(() => {
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduzido) {
      anterior.current = alvo;
      setValor(alvo);
      return;
    }
    const de = anterior.current;
    const inicio = performance.now();
    let raf = 0;
    const tick = (agora: number) => {
      const t = Math.min((agora - inicio) / MOTION.duration.lento, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValor(de + (alvo - de) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else anterior.current = alvo;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [alvo]);

  return valor;
}

export function ExperienceCalculator({ itens }: { itens: CuryEmpreendimento[] }) {
  const [renda, setRenda] = useState("6000");
  const [fgts, setFgts] = useState("20000");
  const [entrada, setEntrada] = useState("15000");
  const [cidade, setCidade] = useState("");
  const [faixaId, setFaixaId] = useState("");

  const rendaNum = paraNumero(renda);
  const sugerida = faixaPorRenda(rendaNum);

  const s = useMemo(
    () =>
      simularCompra({
        renda: rendaNum,
        fgts: paraNumero(fgts),
        entrada: paraNumero(entrada),
        faixaId: faixaId || sugerida.id,
      }),
    [rendaNum, fgts, entrada, faixaId, sugerida.id],
  );

  const encontrados = useMemo(() => compativeis(itens, s, cidade), [itens, s, cidade]);
  const parcela = useValorAnimado(s.parcela);
  const teto = useValorAnimado(s.valorMax);
  const piso = useValorAnimado(s.valorMin);

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
      <form className="panel space-y-5 p-6" onSubmit={(ev) => ev.preventDefault()}>
        <Campo id="exp-renda" rotulo="Renda familiar mensal (R$)" valor={renda} onChange={setRenda} />
        <Campo id="exp-fgts" rotulo="Saldo de FGTS (R$)" valor={fgts} onChange={setFgts} />
        <Campo id="exp-entrada" rotulo="Entrada em dinheiro (R$)" valor={entrada} onChange={setEntrada} />

        <div className="space-y-2">
          <Label htmlFor="exp-cidade">Cidade ou bairro de interesse</Label>
          <Input
            id="exp-cidade"
            value={cidade}
            onChange={(ev) => setCidade(ev.target.value)}
            placeholder="Ex.: São Paulo"
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Faixa do programa</legend>
          <p className="text-xs text-muted-foreground">
            Sugerida pela renda: {sugerida.rotulo}. Você pode testar outra faixa compatível.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {FAIXAS_MCMV.map((f) => {
              const permitida = rendaNum <= f.rendaMax;
              const ativo = (faixaId || sugerida.id) === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={!permitida}
                  aria-pressed={ativo}
                  onClick={() => setFaixaId(f.id)}
                  className={`h-9 rounded-full border px-4 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    ativo
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {f.rotulo}
                </button>
              );
            })}
          </div>
          <p className="pt-1 text-xs text-muted-foreground">{s.faixa.nota}</p>
        </fieldset>
      </form>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metrica rotulo="Parcela estimada" valor={formatBRL(parcela)} nota={`${COMPROMETIMENTO * 100}% da renda`} />
          <Metrica
            rotulo="Crédito aprovável"
            valor={formatBRL(s.financiavel)}
            nota={`${PRAZO_MESES / 12} anos a ${(s.faixa.taxaAno * 100).toFixed(2).replace(".", ",")}% a.a.`}
          />
          <Metrica
            rotulo="Imóvel viável"
            valor={`${formatBRL(piso)} a ${formatBRL(teto)}`}
            nota={s.subsidio > 0 ? `Inclui subsídio de até ${formatBRL(s.subsidio)}` : "Sem subsídio nesta faixa"}
            destaque
          />
        </div>

        <div className="panel p-6">
          <p className="t-caps text-muted-foreground">Composição do valor do imóvel</p>
          <div
            className="mt-5 flex h-4 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`Composição: crédito ${formatBRL(s.financiavel)}, recursos próprios ${formatBRL(s.recursosProprios)}, subsídio ${formatBRL(s.subsidio)}.`}
          >
            {[
              { id: "credito", valor: s.financiavel, classe: "bg-primary" },
              { id: "proprios", valor: s.recursosProprios, classe: "bg-gold" },
              { id: "subsidio", valor: s.subsidio, classe: "bg-primary-soft" },
            ].map((p) => (
              <div
                key={p.id}
                className={`${p.classe} h-full transition-[width] duration-700`}
                style={{ width: `${s.valorMax > 0 ? (p.valor / s.valorMax) * 100 : 0}%` }}
              />
            ))}
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-primary" />
              Financiamento {formatBRL(s.financiavel)}
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-gold" />
              FGTS + entrada {formatBRL(s.recursosProprios)}
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-primary-soft" />
              Subsídio {formatBRL(s.subsidio)}
            </li>
          </ul>
        </div>

        <div className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="t-caps text-muted-foreground">Empreendimentos compatíveis</p>
            <Badge variant="outline">{encontrados.length} encontrado{encontrados.length === 1 ? "" : "s"}</Badge>
          </div>

          {encontrados.length ? (
            <ul className="mt-5 space-y-3">
              {encontrados.map((e) => (
                <li key={e.id}>
                  <Link
                    to="/empreendimentos/cury/$slug"
                    params={{ slug: e.slug }}
                    className="press flex items-center justify-between gap-4 rounded-xl border border-border p-4 hover:border-primary/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-display text-base font-semibold tracking-tight">
                        {e.nome}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {[e.bairro, e.cidade].filter(Boolean).join(", ") || "Local a confirmar"} ·{" "}
                        {e.dormitorios.length ? `${e.dormitorios.join(" e ")} dorm.` : "tipologias a confirmar"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-sm font-semibold">
                        {formatBRL(e.preco_min)}
                      </span>
                      <Icon name="arrow_forward" size={16} className="ml-auto text-muted-foreground" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum empreendimento do portfólio atual entra nesse teto. Ajuste a cidade, o FGTS ou a
              entrada — ou fale com um consultor sobre lançamentos ainda não publicados.
            </p>
          )}
        </div>

        <div className="gold-rule panel p-6">
          <p className="t-caps text-gold">Recomendação {MARCA}</p>
          <p className="mt-3 leading-relaxed">{recomendacaoFerragano(s, encontrados.length)}</p>
          <a
            href={whatsappLink(
              `Olá! Simulei no site: renda de ${formatBRL(rendaNum)}, FGTS de ${formatBRL(paraNumero(fgts))} e entrada de ${formatBRL(paraNumero(entrada))}. Quero validar o cenário.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="press mt-5 inline-flex h-12 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground"
          >
            <Icon name="chat" size={18} />
            Validar com um especialista
          </a>
        </div>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Icon name="info" size={14} className="mt-0.5 shrink-0" />
          Simulação determinística feita no seu navegador: parcela de até {COMPROMETIMENTO * 100}% da
          renda, prazo de {PRAZO_MESES} meses e taxa de referência da faixa selecionada. Não é
          análise de crédito — taxa, subsídio e prazo finais são definidos pelo banco.
        </p>
      </div>
    </div>
  );
}

function Campo({
  id,
  rotulo,
  valor,
  onChange,
}: {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} inputMode="numeric" value={valor} onChange={(ev) => onChange(ev.target.value)} />
    </div>
  );
}

function Metrica({
  rotulo,
  valor,
  nota,
  destaque,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  destaque?: boolean;
}) {
  return (
    <div className={`panel p-5 ${destaque ? "gold-rule" : ""}`}>
      <p className="t-caps text-muted-foreground">{rotulo}</p>
      <p className="mt-2 font-display text-lg font-semibold tracking-tight">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{nota}</p>
    </div>
  );
}