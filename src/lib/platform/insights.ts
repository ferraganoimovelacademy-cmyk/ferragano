/**
 * SPRINT 10 — Decision Center (Read Model).
 *
 * Write Model → Domain Events → Read Models → Decision Engine → Dashboards.
 * As telas NUNCA consultam tabelas transacionais: leem os painéis 360 pela
 * Query Layer (`insights.functions.ts`), que passa pelas funções
 * `read_*_360` do banco com verificação de vínculo e papel.
 */

/** Papéis com visão de gestão comercial (Vendas 360). */
export const GESTAO_ROLES = ["proprietario", "administrador", "diretor", "gerente"] as const;

export function isGestaoRole(roles: readonly string[] | undefined | null): boolean {
  return (roles ?? []).some((r) => (GESTAO_ROLES as readonly string[]).includes(r));
}

export const READ_MODELS = [
  "customer_360",
  "property_360",
  "sales_360",
  "executive_360",
  "marketing_360",
] as const;

export type ReadModelKey = (typeof READ_MODELS)[number];

/** PostgREST devolve numeric como string; normaliza para número. */
export const num = (v: unknown): number | null =>
  v == null ? null : typeof v === "number" ? v : Number(v);

export const readModelLabels: Record<ReadModelKey, string> = {
  customer_360: "Cliente 360",
  property_360: "Imóvel 360",
  sales_360: "Vendas 360",
  executive_360: "Executivo 360",
  marketing_360: "Marketing 360",
};

export const origemLabels: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  google: "Google",
  indicacao: "Indicação",
  site: "Site",
  portal: "Portal",
  whatsapp: "WhatsApp",
  evento: "Evento",
  outro: "Outro",
};

export const moeda = (v: number | null | undefined) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(v);

export const numero = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pt-BR").format(v);

export const percentual = (v: number | null | undefined) =>
  v == null ? "—" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)}%`;

/** Semáforo de atenção usado nos painéis de gestão. */
export type Severidade = "ok" | "atencao" | "critico";

export const severidadeCores: Record<Severidade, string> = {
  ok: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  atencao: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  critico: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};