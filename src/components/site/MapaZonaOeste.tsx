import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";

/**
 * Mapa interativo (esquemático) da Zona Oeste de São Paulo.
 * SVG próprio — sem biblioteca externa, sem requisição de tiles.
 */
const REGIOES = [
  {
    id: "vila-leopoldina",
    nome: "Vila Leopoldina",
    x: 26,
    y: 44,
    perfil: "Lançamentos compactos e alto padrão em requalificação industrial.",
  },
  {
    id: "lapa",
    nome: "Lapa",
    x: 44,
    y: 32,
    perfil: "Bairro consolidado, comércio forte e eixo de trem e metrô.",
  },
  {
    id: "agua-branca",
    nome: "Água Branca",
    x: 58,
    y: 24,
    perfil: "Grandes terrenos e projetos de uso misto próximos ao eixo ferroviário.",
  },
  {
    id: "pinheiros",
    nome: "Pinheiros",
    x: 62,
    y: 62,
    perfil: "Maior liquidez de locação da região e metragens compactas.",
  },
  {
    id: "perdizes",
    nome: "Perdizes",
    x: 74,
    y: 40,
    perfil: "Perfil residencial familiar, oferta escassa e ticket alto.",
  },
  {
    id: "butanta",
    nome: "Butantã",
    x: 34,
    y: 74,
    perfil: "Demanda universitária e valorização puxada pelo metrô.",
  },
];

export function MapaZonaOeste() {
  const [ativo, setAtivo] = useState(REGIOES[0]!.id);
  const regiao = REGIOES.find((r) => r.id === ativo)!;

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="panel overflow-hidden p-4">
        <svg
          viewBox="0 0 100 100"
          role="group"
          aria-label="Mapa esquemático da Zona Oeste de São Paulo"
          className="h-auto w-full"
        >
          <rect x="0" y="0" width="100" height="100" fill="var(--muted)" rx="3" />
          <path
            d="M4 66 C 26 58, 44 74, 96 60"
            fill="none"
            stroke="var(--info)"
            strokeWidth="1.4"
            opacity="0.5"
          />
          <path
            d="M8 20 L 92 34"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1"
            strokeDasharray="3 2"
          />
          {REGIOES.map((r) => (
            <g key={r.id}>
              <circle
                cx={r.x}
                cy={r.y}
                r={r.id === ativo ? 4 : 2.6}
                fill={r.id === ativo ? "var(--gold)" : "var(--primary)"}
                className="transition-all duration-300"
              />
              <text
                x={r.x + 5}
                y={r.y + 1.6}
                fontSize="3.2"
                fill="var(--foreground)"
                opacity={r.id === ativo ? 1 : 0.6}
              >
                {r.nome}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="space-y-3">
        <ul className="flex flex-wrap gap-2 lg:flex-col">
          {REGIOES.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setAtivo(r.id)}
                aria-pressed={r.id === ativo}
                className={`min-h-11 w-full rounded-md border px-4 text-left text-sm transition-colors ${
                  r.id === ativo
                    ? "border-primary bg-primary-soft text-primary-soft-foreground"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {r.nome}
              </button>
            </li>
          ))}
        </ul>
        <div className="panel p-5" aria-live="polite">
          <h3 className="font-display text-lg font-semibold tracking-tight">{regiao.nome}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{regiao.perfil}</p>
          <Link
            to="/empreendimentos"
            search={{ q: regiao.nome }}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver empreendimentos
            <Icon name="arrow_forward" size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
