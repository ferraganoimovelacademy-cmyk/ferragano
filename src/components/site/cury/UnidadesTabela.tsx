import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/platform/comercial";
import type { CuryUnidade } from "@/lib/site/cury";

const statusLabels: Record<CuryUnidade["status"], string> = {
  disponivel: "Disponível",
  reservada: "Reservada",
  vendida: "Vendida",
  bloqueada: "Indisponível",
  em_analise: "Em análise",
};

/** GATE 03 — estoque público do empreendimento. Somente leitura. */
export function UnidadesTabela({
  unidades,
  slug,
}: {
  unidades: CuryUnidade[];
  slug: string;
}) {
  const [soDisponiveis, setSoDisponiveis] = useState(true);
  const [dorm, setDorm] = useState<number | null>(null);

  const tipologias = [...new Set(unidades.map((u) => u.dormitorios).filter((d): d is number => !!d))].sort();

  const lista = unidades.filter((u) => {
    if (soDisponiveis && u.status !== "disponivel") return false;
    if (dorm && u.dormitorios !== dorm) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSoDisponiveis((v) => !v)}
          aria-pressed={soDisponiveis}
          className={`h-9 rounded-full border px-4 text-xs font-medium transition-colors ${
            soDisponiveis ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"
          }`}
        >
          Só disponíveis
        </button>
        {tipologias.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDorm((v) => (v === d ? null : d))}
            aria-pressed={dorm === d}
            className={`h-9 rounded-full border px-4 text-xs font-medium transition-colors ${
              dorm === d ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"
            }`}
          >
            {d} dorm.
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {lista.length} de {unidades.length} unidades
        </span>
      </div>

      {!lista.length ? (
        <p className="mt-6 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma unidade com esse filtro. Fale com um consultor para checar a tabela vigente.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <caption className="sr-only">Unidades do empreendimento</caption>
            <thead className="bg-card">
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Unidade</th>
                <th scope="col" className="px-4 py-3 font-medium">Tipologia</th>
                <th scope="col" className="px-4 py-3 font-medium">Andar</th>
                <th scope="col" className="px-4 py-3 font-medium">Área</th>
                <th scope="col" className="px-4 py-3 font-medium">Vagas</th>
                <th scope="col" className="px-4 py-3 font-medium">Preço</th>
                <th scope="col" className="px-4 py-3 font-medium">Situação</th>
                <th scope="col" className="px-4 py-3 font-medium sr-only">Ação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{u.identificador}</td>
                  <td className="px-4 py-3">
                    {u.dormitorios ? `${u.dormitorios} dorm.` : "—"}
                    {u.suites ? ` · ${u.suites} suíte${u.suites > 1 ? "s" : ""}` : ""}
                  </td>
                  <td className="px-4 py-3">{u.andar ?? "—"}</td>
                  <td className="px-4 py-3">
                    {u.area_privativa ? `${u.area_privativa.toFixed(0)} m²` : "—"}
                  </td>
                  <td className="px-4 py-3">{u.vagas ?? "—"}</td>
                  <td className="px-4 py-3">{formatBRL(u.preco)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.status === "disponivel" ? "gold" : "outline"}>
                      {statusLabels[u.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/empreendimentos/cury/$slug/unidade/$unidadeId"
                      params={{ slug, unidadeId: u.id }}
                      className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium transition-colors hover:bg-accent"
                    >
                      Detalhe
                      <Icon name="arrow_forward" size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}