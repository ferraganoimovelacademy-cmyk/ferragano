import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Bloco } from "@/components/site/Bloco";
import { AtivoSlot } from "@/components/site/cury/AtivoSlot";
import { stagger } from "@/lib/site/motion";
import { CATEGORIAS, entornoDoBairro, type PoiCategoria } from "@/lib/site/localizacao";

/**
 * Sprint UI 06 — GATE 04 (Smart Location).
 * Mapa radial próprio (SVG, sem tiles nem chave de API) com o empreendimento
 * no centro e as referências de entorno em anéis por tempo estimado.
 * Sem curadoria do bairro, a seção assume o estado "a confirmar".
 */
const ORDEM: PoiCategoria[] = ["metro", "via", "shopping", "mercado", "escola", "hospital", "parque"];

export function SmartLocation({
  nome,
  bairro,
  cidade,
}: {
  nome: string;
  bairro: string | null;
  cidade: string | null;
}) {
  const entorno = entornoDoBairro(bairro);
  const [foco, setFoco] = useState<string | null>(null);

  if (!entorno) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <AtivoSlot
          titulo={`Mapa do entorno de ${nome}`}
          icone="map"
          proporcao="aspect-[16/10]"
          nota="A curadoria de entorno deste bairro ainda não foi validada pela Ferragano."
        />
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="t-caps text-muted-foreground">Localização</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {[bairro, cidade].filter(Boolean).join(", ") || "Endereço"} — as distâncias até metrô,
            escolas, saúde e comércio são confirmadas pelo consultor antes da visita. Preferimos não
            publicar tempo estimado sem checagem.
          </p>
        </div>
      </div>
    );
  }

  const pontos = ORDEM.flatMap((c) => entorno.pois.filter((p) => p.categoria === c));
  const maxMin = Math.max(...pontos.map((p) => p.minutos), 1);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary-soft/50 to-accent/25 p-2">
        <svg
          viewBox="0 0 100 100"
          className="h-auto w-full"
          role="img"
          aria-label={`Mapa esquemático do entorno de ${nome} em ${entorno.bairro}`}
        >
          {[18, 30, 42].map((r) => (
            <circle
              key={r}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeWidth="0.4"
            />
          ))}
          {pontos.map((p, i) => {
            const ang = (i / pontos.length) * Math.PI * 2 - Math.PI / 2;
            const raio = 16 + (p.minutos / maxMin) * 28;
            const x = 50 + Math.cos(ang) * raio;
            const y = 50 + Math.sin(ang) * raio;
            const ativo = foco === p.nome;
            return (
              <g key={p.nome}>
                <line
                  x1="50"
                  y1="50"
                  x2={x}
                  y2={y}
                  stroke="currentColor"
                  className={ativo ? "text-gold" : "text-border"}
                  strokeWidth={ativo ? 0.7 : 0.4}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={ativo ? 3.4 : 2.4}
                  fill="currentColor"
                  className={ativo ? "text-gold" : "text-primary"}
                />
                <text
                  x={x}
                  y={y - 4.5}
                  textAnchor="middle"
                  fontSize="3.2"
                  fill="currentColor"
                  className="text-muted-foreground"
                >
                  {p.minutos} min
                </text>
              </g>
            );
          })}
          <circle cx="50" cy="50" r="5" fill="currentColor" className="text-primary" />
          <text x="50" y="59.5" textAnchor="middle" fontSize="3.6" fill="currentColor" className="text-foreground">
            {entorno.bairro}
          </text>
        </svg>
      </div>

      <div>
        <p className="text-sm leading-relaxed text-muted-foreground">{entorno.resumo}</p>

        <ul className="mt-5 grid gap-2">
          {pontos.map((p, i) => (
            <li key={p.nome}>
              <Bloco
                as="div"
                delay={stagger(i)}
                className="rounded-xl border border-border bg-card"
              >
              <button
                type="button"
                onMouseEnter={() => setFoco(p.nome)}
                onFocus={() => setFoco(p.nome)}
                onMouseLeave={() => setFoco(null)}
                onBlur={() => setFoco(null)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft/70 text-primary">
                  <Icon name={CATEGORIAS[p.categoria].icone} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">
                    {CATEGORIAS[p.categoria].rotulo}
                  </span>
                  <span className="block truncate text-sm font-medium">{p.nome}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-base font-semibold">{p.minutos} min</span>
                  <span className="block text-xs text-muted-foreground">{p.modo}</span>
                </span>
                </button>
              </Bloco>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Tempos estimados em condição normal de trânsito, apurados pela curadoria Ferragano — não
          são medições oficiais da construtora e podem variar por horário e ponto exato de saída.
        </p>
      </div>
    </div>
  );
}