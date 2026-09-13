import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import {
  analisarRegiao,
  lerIndicador,
  montarRadarEconomico,
  montarRadarRegional,
  type AnaliseRegiao,
  type LeituraIndicador,
  type ObservacaoIndicador,
  type Periodicidade,
  type RadarEconomico,
  type RadarRegional,
  type RegiaoBase,
  type SerieIndicador,
  type SnapshotRegiao,
  type TipoRegiao,
} from "@/lib/platform/market";
import { montarMarketContext, type MarketContext } from "@/lib/platform/market-context";

/**
 * SPRINT 25 — MARKET: única porta do contexto.
 *
 * Lê APENAS as tabelas do contexto Market. Nenhuma tabela transacional é
 * consultada aqui — dado de mercado e dado próprio não se cruzam nesta camada
 * (ADR-023). Todo cálculo acontece em `market.ts`, auditável em teste.
 */

type Linha = Record<string, unknown>;
const num = (v: unknown) => (v == null ? null : Number(v));
const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

export type MarketRadar = {
  economico: RadarEconomico;
  regional: RadarRegional;
  /** Interpretação de negócio dos indicadores (ADR-024). */
  contexto: MarketContext;
  geradoEm: string;
};

export const getMarketRadar = createServerFn({ method: "GET" })
  .middleware([instrumented("observability", "market.radar")])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<MarketRadar> => {
    const [seriesRes, valoresRes, regioesRes, snapshotsRes] = await Promise.all([
      context.supabase
        .from("market_indicator_series")
        .select("id, codigo, nome, unidade, periodicidade, fonte_nome, fonte_url, fonte_serie, descricao, ordem")
        .eq("ativo", true)
        .order("ordem", { ascending: true }),
      context.supabase
        .from("market_indicator_values")
        .select("series_id, referencia, valor, fonte_nome, fonte_url, coletado_em, versao")
        .order("referencia", { ascending: false })
        .limit(1000),
      context.supabase
        .from("market_regions")
        .select("id, nome, tipo, cidade, uf")
        .eq("workspace_id", data.workspaceId)
        .order("nome", { ascending: true }),
      context.supabase
        .from("market_region_snapshots")
        .select(
          "region_id, referencia, preco_medio_m2, oferta_unidades, demanda_indice, absorcao_pct, vacancia_pct, tempo_medio_venda_dias, liquidez_indice, amostra, fonte_nome, fonte_url, metodologia, coletado_em, versao",
        )
        .eq("workspace_id", data.workspaceId)
        .order("referencia", { ascending: false })
        .limit(1000),
    ]);

    const erro = seriesRes.error ?? valoresRes.error ?? regioesRes.error ?? snapshotsRes.error;
    if (erro) {
      console.error("[getMarketRadar]", erro.message);
      throw new Error("Não foi possível ler os dados de mercado.");
    }

    const observacoes = new Map<string, ObservacaoIndicador[]>();
    for (const linha of (valoresRes.data ?? []) as unknown as Linha[]) {
      const chave = String(linha["series_id"]);
      const lista = observacoes.get(chave) ?? [];
      lista.push({
        referencia: String(linha["referencia"]),
        valor: Number(linha["valor"]),
        fonteNome: txt(linha["fonte_nome"]) ?? "",
        fonteUrl: txt(linha["fonte_url"]),
        coletadoEm: String(linha["coletado_em"]),
        versao: Number(linha["versao"] ?? 1),
      });
      observacoes.set(chave, lista);
    }

    const agora = new Date();

    const leituras: LeituraIndicador[] = ((seriesRes.data ?? []) as unknown as Linha[]).map((linha) => {
      const serie: SerieIndicador = {
        codigo: String(linha["codigo"]),
        nome: String(linha["nome"]),
        unidade: String(linha["unidade"]),
        periodicidade: String(linha["periodicidade"]) as Periodicidade,
        fonteNome: String(linha["fonte_nome"]),
        fonteUrl: txt(linha["fonte_url"]),
        fonteSerie: txt(linha["fonte_serie"]),
        descricao: txt(linha["descricao"]),
        ordem: Number(linha["ordem"] ?? 0),
      };
      return lerIndicador(serie, observacoes.get(String(linha["id"])) ?? [], agora);
    });

    const snapshots = new Map<string, SnapshotRegiao[]>();
    for (const linha of (snapshotsRes.data ?? []) as unknown as Linha[]) {
      const chave = String(linha["region_id"]);
      const lista = snapshots.get(chave) ?? [];
      lista.push({
        referencia: String(linha["referencia"]),
        precoMedioM2: num(linha["preco_medio_m2"]),
        ofertaUnidades: num(linha["oferta_unidades"]),
        demandaIndice: num(linha["demanda_indice"]),
        absorcaoPct: num(linha["absorcao_pct"]),
        vacanciaPct: num(linha["vacancia_pct"]),
        tempoMedioVendaDias: num(linha["tempo_medio_venda_dias"]),
        liquidezIndice: num(linha["liquidez_indice"]),
        amostra: num(linha["amostra"]),
        fonteNome: txt(linha["fonte_nome"]) ?? "Fonte não declarada",
        fonteUrl: txt(linha["fonte_url"]),
        metodologia: txt(linha["metodologia"]),
        coletadoEm: String(linha["coletado_em"]),
        versao: Number(linha["versao"] ?? 1),
      });
      snapshots.set(chave, lista);
    }

    const analises: AnaliseRegiao[] = ((regioesRes.data ?? []) as unknown as Linha[]).map((linha) => {
      const regiao: RegiaoBase = {
        id: String(linha["id"]),
        nome: String(linha["nome"]),
        tipo: String(linha["tipo"]) as TipoRegiao,
        cidade: txt(linha["cidade"]),
        uf: txt(linha["uf"]),
      };
      return analisarRegiao(regiao, snapshots.get(regiao.id) ?? [], agora);
    });

    return {
      economico: montarRadarEconomico(leituras, agora),
      regional: montarRadarRegional(analises, agora),
      contexto: montarMarketContext(leituras, agora),
      geradoEm: agora.toISOString(),
    };
  });

/* ------------------------------------------------------------------ *
 * Escrita — regiões e coletas regionais (apenas admin do workspace)
 * ------------------------------------------------------------------ */

async function exigirAdmin(
  supabase: { rpc: (fn: never, args: never) => PromiseLike<{ data: unknown; error: unknown }> },
  userId: string,
  workspaceId: string,
) {
  const { data, error } = await supabase.rpc("is_workspace_admin" as never, {
    _user_id: userId,
    _workspace_id: workspaceId,
  } as never);
  if (error || data !== true) throw new Error("Apenas administradores do workspace podem alterar o Market.");
}

export const salvarRegiao = createServerFn({ method: "POST" })
  .middleware([instrumented("observability", "market.regiao.salvar")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        nome: z.string().trim().min(2).max(120),
        tipo: z.enum(["bairro", "cidade", "regiao"]),
        cidade: z.string().trim().max(120).optional().nullable(),
        uf: z.string().trim().length(2).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context.supabase as never, context.userId, data.workspaceId);

    const { data: criada, error } = await context.supabase
      .from("market_regions")
      .insert({
        workspace_id: data.workspaceId,
        nome: data.nome,
        tipo: data.tipo,
        cidade: data.cidade ?? null,
        uf: data.uf ? data.uf.toUpperCase() : null,
        created_by: context.userId,
      } as never)
      .select("id")
      .single();

    if (error) {
      console.error("[salvarRegiao]", error.message);
      throw new Error(
        error.code === "23505" || error.message.includes("duplicate")
          ? "Essa região já está cadastrada."
          : "Não foi possível salvar a região.",
      );
    }
    return { id: (criada as { id: string }).id };
  });

export const salvarColetaRegional = createServerFn({ method: "POST" })
  .middleware([instrumented("observability", "market.coleta.salvar")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        regionId: z.string().uuid(),
        referencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        // Fonte é obrigatória: sem origem declarada o dado não entra (ADR-023).
        fonteNome: z.string().trim().min(2).max(160),
        fonteUrl: z.string().trim().url().max(500).optional().nullable(),
        metodologia: z.string().trim().max(500).optional().nullable(),
        precoMedioM2: z.number().nonnegative().optional().nullable(),
        ofertaUnidades: z.number().int().nonnegative().optional().nullable(),
        demandaIndice: z.number().optional().nullable(),
        absorcaoPct: z.number().min(0).max(100).optional().nullable(),
        vacanciaPct: z.number().min(0).max(100).optional().nullable(),
        tempoMedioVendaDias: z.number().min(0).max(3650).optional().nullable(),
        amostra: z.number().int().nonnegative().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context.supabase as never, context.userId, data.workspaceId);

    // Revisão nunca sobrescreve: a nova coleta entra como próxima versão.
    const { data: anteriores } = await context.supabase
      .from("market_region_snapshots")
      .select("versao")
      .eq("region_id", data.regionId)
      .eq("referencia", data.referencia)
      .order("versao", { ascending: false })
      .limit(1);

    const versao = ((anteriores ?? [])[0] as { versao?: number } | undefined)?.versao ?? 0;

    const { error } = await context.supabase.from("market_region_snapshots").insert({
      workspace_id: data.workspaceId,
      region_id: data.regionId,
      referencia: data.referencia,
      preco_medio_m2: data.precoMedioM2 ?? null,
      oferta_unidades: data.ofertaUnidades ?? null,
      demanda_indice: data.demandaIndice ?? null,
      absorcao_pct: data.absorcaoPct ?? null,
      vacancia_pct: data.vacanciaPct ?? null,
      tempo_medio_venda_dias: data.tempoMedioVendaDias ?? null,
      amostra: data.amostra ?? null,
      fonte_nome: data.fonteNome,
      fonte_url: data.fonteUrl ?? null,
      metodologia: data.metodologia ?? null,
      coletado_em: new Date().toISOString(),
      versao: versao + 1,
      created_by: context.userId,
    } as never);

    if (error) {
      console.error("[salvarColetaRegional]", error.message);
      throw new Error("Não foi possível salvar a coleta de mercado.");
    }
    return { ok: true, versao: versao + 1 };
  });

/** Dispara a coleta das séries públicas do Banco Central sob demanda. */
export const coletarIndicadoresAgora = createServerFn({ method: "POST" })
  .middleware([instrumented("observability", "market.coletar")])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context.supabase as never, context.userId, data.workspaceId);
    const { coletarIndicadores } = await import("@/lib/platform/market.server");
    return await coletarIndicadores();
  });