import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import {
  montarMarketAnalytics,
  recortarJanela,
  serieDeContagem,
  serieDeMedia,
  type MarketAnalytics,
  type SerieMensal,
} from "@/lib/platform/market-analytics";
import { detectarDrift, type Drift } from "@/lib/platform/evidence";

/**
 * SPRINT 25.2 — MARKET ANALYTICS: única porta do Correlation Engine.
 *
 * Lê série externa (contexto Market) e série interna (transacional do
 * workspace) SEM misturar os números: cada uma entra como série própria e a
 * saída é coeficiente + amostra + confiança, nunca um número combinado.
 */

type Linha = Record<string, unknown>;
const txt = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (v == null ? null : Number(v));

export const getMarketCorrelations = createServerFn({ method: "GET" })
  .middleware([instrumented("observability", "market.correlacoes")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        janelaMeses: z.number().int().min(12).max(60).default(24),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<MarketAnalytics & { drifts: Record<string, Drift> }> => {
    const desde = new Date();
    desde.setUTCMonth(desde.getUTCMonth() - data.janelaMeses);
    const desdeIso = desde.toISOString();
    const desdeData = desdeIso.slice(0, 10);

    const [seriesRes, valoresRes, visitasRes, propostasRes, reservasRes, vendasRes] =
      await Promise.all([
        context.supabase
          .from("market_indicator_series")
          .select("id, codigo, nome, unidade")
          .eq("ativo", true)
          .order("ordem", { ascending: true }),
        context.supabase
          .from("market_indicator_values")
          .select("series_id, referencia, valor, versao")
          .gte("referencia", desdeData)
          .order("referencia", { ascending: true })
          .limit(5000),
        context.supabase
          .from("visits")
          .select("agendada_para, compareceu")
          .eq("workspace_id", data.workspaceId)
          .gte("agendada_para", desdeIso)
          .limit(20000),
        context.supabase
          .from("proposals")
          .select("created_at, valor")
          .eq("workspace_id", data.workspaceId)
          .gte("created_at", desdeIso)
          .limit(20000),
        context.supabase
          .from("reservations")
          .select("created_at")
          .eq("workspace_id", data.workspaceId)
          .gte("created_at", desdeIso)
          .limit(20000),
        context.supabase
          .from("sales")
          .select("created_at, valor_final, status")
          .eq("workspace_id", data.workspaceId)
          .gte("created_at", desdeIso)
          .limit(20000),
      ]);

    const erro =
      seriesRes.error ??
      valoresRes.error ??
      visitasRes.error ??
      propostasRes.error ??
      reservasRes.error ??
      vendasRes.error;
    if (erro) {
      console.error("[getMarketCorrelations]", erro.message);
      throw new Error("Não foi possível ler as séries para correlação.");
    }

    // ---- séries externas: competência mensal, maior versão vence -----------
    const catalogo = new Map<string, { codigo: string; nome: string; unidade: string }>();
    for (const l of (seriesRes.data ?? []) as unknown as Linha[]) {
      catalogo.set(String(l["id"]), {
        codigo: txt(l["codigo"]),
        nome: txt(l["nome"]),
        unidade: txt(l["unidade"]),
      });
    }

    const porSerie = new Map<string, Map<string, { valor: number; versao: number }>>();
    for (const l of (valoresRes.data ?? []) as unknown as Linha[]) {
      const seriesId = String(l["series_id"]);
      const competencia = txt(l["referencia"]).slice(0, 7);
      const valor = Number(l["valor"]);
      const versao = Number(l["versao"] ?? 1);
      if (!Number.isFinite(valor)) continue;
      const mapa = porSerie.get(seriesId) ?? new Map();
      const atual = mapa.get(competencia);
      // Uma competência = um valor: a maior versão da fonte prevalece.
      if (!atual || versao >= atual.versao) mapa.set(competencia, { valor, versao });
      porSerie.set(seriesId, mapa);
    }

    const externas: SerieMensal[] = [];
    for (const [seriesId, mapa] of porSerie) {
      const meta = catalogo.get(seriesId);
      if (!meta) continue;
      externas.push(
        recortarJanela(
          {
            chave: meta.codigo,
            nome: meta.nome,
            unidade: meta.unidade,
            origem: "externo",
            pontos: [...mapa.entries()]
              .map(([competencia, { valor }]) => ({ referencia: `${competencia}-01`, valor }))
              .sort((a, b) => (a.referencia < b.referencia ? -1 : 1)),
          },
          data.janelaMeses,
        ),
      );
    }

    // ---- séries internas: contagem e média por competência -----------------
    const visitas = (visitasRes.data ?? []) as unknown as Linha[];
    const propostas = (propostasRes.data ?? []) as unknown as Linha[];
    const vendas = (vendasRes.data ?? []) as unknown as Linha[];

    const internas: SerieMensal[] = [
      serieDeContagem(
        "visitas_realizadas",
        "Visitas realizadas",
        "visitas/mês",
        visitas.filter((v) => v["compareceu"] === true).map((v) => txt(v["agendada_para"])),
      ),
      serieDeContagem(
        "propostas",
        "Propostas emitidas",
        "propostas/mês",
        propostas.map((p) => txt(p["created_at"])),
      ),
      serieDeContagem(
        "reservas",
        "Reservas",
        "reservas/mês",
        ((reservasRes.data ?? []) as unknown as Linha[]).map((r) => txt(r["created_at"])),
      ),
      serieDeContagem(
        "vendas",
        "Vendas fechadas",
        "vendas/mês",
        vendas.filter((v) => txt(v["status"]) !== "cancelada").map((v) => txt(v["created_at"])),
      ),
      serieDeMedia(
        "ticket_medio",
        "Ticket médio da venda",
        "R$",
        vendas
          .filter((v) => txt(v["status"]) !== "cancelada")
          .map((v) => ({ data: txt(v["created_at"]), valor: num(v["valor_final"]) })),
      ),
    ].map((s) => recortarJanela(s, data.janelaMeses));

    const analytics = montarMarketAnalytics(externas, internas, data.janelaMeses);

    // Drift: a mesma defasagem continua aparecendo na janela recente?
    const drifts: Record<string, Drift> = {};
    for (const c of analytics.correlacoes) {
      if (!c.melhor) continue;
      const externa = externas.find((s) => s.chave === c.externo.chave);
      const interna = internas.find((s) => s.chave === c.interno.chave);
      if (!externa || !interna) continue;
      drifts[c.chave] = detectarDrift(externa, interna, c.melhor.lagMeses);
    }

    return { ...analytics, drifts };
  });
