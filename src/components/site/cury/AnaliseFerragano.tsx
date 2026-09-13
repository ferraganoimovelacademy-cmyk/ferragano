import { Icon } from "@/components/Icon";
import { Bloco } from "@/components/site/Bloco";
import { stagger } from "@/lib/site/motion";
import { LINHA_AUTORIDADE, MARCA, RESPONSAVEL } from "@/lib/site/posicionamento";
import type {
  AnaliseFerragano as Analise,
  ComparativoVitrine,
  Liquidez,
} from "@/lib/site/signature";
import { formatBRL } from "@/lib/platform/comercial";

/**
 * UI 04.1 — GATE 03/06.
 * Bloco consultivo exclusivo: o empreendimento é da Cury, a leitura é da
 * Ferragano. Perfil ideal, potencial, público, pontos fortes e oportunidades.
 */
function Cartao({
  icone,
  titulo,
  children,
  delay,
}: {
  icone: string;
  titulo: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <Bloco as="article" delay={delay} className="rounded-2xl border border-border bg-card p-6">
      <span className="grid size-10 place-items-center rounded-full bg-primary-soft/70 text-primary">
        <Icon name={icone} size={20} />
      </span>
      <h3 className="mt-4 font-display text-base font-semibold tracking-tight">{titulo}</h3>
      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </Bloco>
  );
}

const NIVEL_LIQUIDEZ: Record<Liquidez["nivel"], string> = {
  alta: "Liquidez alta",
  moderada: "Liquidez moderada",
  seletiva: "Liquidez seletiva",
};

export function AnaliseFerraganoBloco({
  a,
  nome,
  liquidez,
  comparativo,
}: {
  a: Analise;
  nome: string;
  liquidez?: Liquidez;
  comparativo?: ComparativoVitrine | null;
}) {
  return (
    <div>
      <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-primary-soft/40 to-transparent p-6 md:p-8">
        <p className="t-caps text-gold">Análise {MARCA}</p>
        <p className="mt-3 max-w-3xl font-display text-xl leading-snug tracking-tight md:text-2xl">
          {a.perfilIdeal}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Leitura consultiva de {RESPONSAVEL} — {LINHA_AUTORIDADE}. O empreendimento {nome} é
          incorporado e construído pela Cury; a análise acima é da {MARCA}.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Cartao icone="trending_up" titulo={a.valorizacao.titulo} delay={stagger(0)}>
          <p>
            <span className="font-display text-2xl font-semibold text-foreground">
              {a.valorizacao.nota.toFixed(1)}
            </span>
            <span className="ml-1 text-xs">/ 10</span>
          </p>
          <p className="mt-2">{a.valorizacao.texto}</p>
        </Cartao>

        <Cartao icone="groups" titulo="Público recomendado" delay={stagger(1)}>
          <ul className="flex flex-wrap gap-2">
            {a.publico.map((p) => (
              <li key={p} className="rounded-full border border-border px-3 py-1 text-xs">
                {p}
              </li>
            ))}
          </ul>
        </Cartao>

        <Cartao icone="verified" titulo="Pontos fortes" delay={stagger(2)}>
          <ul className="space-y-2">
            {a.fortes.map((t) => (
              <li key={t} className="flex gap-2">
                <Icon name="check" size={16} className="mt-0.5 shrink-0 text-gold" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Cartao>

        {liquidez && (
          <Cartao icone="swap_horiz" titulo={NIVEL_LIQUIDEZ[liquidez.nivel]} delay={stagger(3)}>
            <p>
              <span className="font-display text-2xl font-semibold text-foreground">
                {liquidez.nota.toFixed(1)}
              </span>
              <span className="ml-1 text-xs">/ 10</span>
            </p>
            <p className="mt-2">{liquidez.texto}</p>
            <ul className="mt-3 space-y-2">
              {liquidez.criterios.map((c) => (
                <li key={c} className="flex gap-2">
                  <Icon name="chevron_right" size={16} className="mt-0.5 shrink-0 text-primary" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </Cartao>
        )}
      </div>

      {comparativo && (
        <Bloco as="div" delay={stagger(4)} className="mt-4 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-base font-semibold tracking-tight">
            Comparação com a vitrine Ferragano
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{comparativo.texto}</p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-4">
              <dt className="text-xs text-muted-foreground">Empreendimentos comparados</dt>
              <dd className="mt-1 font-medium">{comparativo.comparados}</dd>
            </div>
            <div className="rounded-xl border border-border p-4">
              <dt className="text-xs text-muted-foreground">Preço médio de partida na vitrine</dt>
              <dd className="mt-1 font-medium">{formatBRL(comparativo.precoMedio)}</dd>
            </div>
            <div className="rounded-xl border border-border p-4">
              <dt className="text-xs text-muted-foreground">Nota Ferragano · este / média</dt>
              <dd className="mt-1 font-medium">
                {comparativo.score.toFixed(1)} / {comparativo.scoreMedio.toFixed(1)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Comparação feita apenas com dados públicos do catálogo (preço de partida, tipologia,
            estágio e disponibilidade). Não é projeção de rentabilidade futura.
          </p>
        </Bloco>
      )}

      <Bloco as="div" delay={stagger(3)} className="mt-4 rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-base font-semibold tracking-tight">
          Oportunidades e pontos de atenção
        </h3>
        <ul className="mt-3 grid gap-3 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2">
          {a.oportunidades.map((t) => (
            <li key={t} className="flex gap-2">
              <Icon name="lightbulb" size={16} className="mt-0.5 shrink-0 text-primary" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Bloco>
    </div>
  );
}
