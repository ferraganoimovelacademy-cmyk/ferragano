import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  montarAssetIntelligence,
  type DemandaEmpreendimento,
  type EmpreendimentoAtivos,
} from "@/lib/platform/asset-intelligence";
import { mapearAtivoMidia, SELECT_ATIVO_MIDIA } from "@/lib/platform/asset-intelligence.server";

/**
 * ASSET INTELLIGENCE — única porta de leitura do módulo.
 * Lê a Query Layer (`read_property_360`) e a biblioteca de mídia. Não escreve,
 * não cria métrica nova e degrada por camada: sem demanda medida, a tela
 * continua diagnosticando cobertura em vez de falhar.
 */
export const getAssetIntelligence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const [{ data: emps, error }, { data: midias }, { data: property360 }] = await Promise.all([
      supabase
        .from("empreendimentos")
        .select("id, nome, slug, cidade, capa_url, publico")
        .eq("workspace_id", data.workspaceId)
        .order("nome"),
      supabase
        .from("property_media")
        .select(SELECT_ATIVO_MIDIA)
        .eq("workspace_id", data.workspaceId)
        .order("ordem"),
      supabase.rpc("read_property_360", { _workspace_id: data.workspaceId }),
    ]);

    if (error) {
      console.error("[getAssetIntelligence]", error.message);
      throw new Error("Não foi possível carregar o Asset Intelligence.");
    }

    const porEmp = new Map<string, EmpreendimentoAtivos["itens"]>();
    for (const m of midias ?? []) {
      const chave = String((m as Record<string, unknown>).empreendimento_id ?? "");
      if (!chave) continue;
      const lista = porEmp.get(chave) ?? [];
      lista.push(mapearAtivoMidia(m as Record<string, unknown>));
      porEmp.set(chave, lista);
    }

    const demandaPorEmp = new Map<string, DemandaEmpreendimento>();
    for (const r of property360 ?? []) {
      if (!r.empreendimento_id) continue;
      demandaPorEmp.set(r.empreendimento_id, {
        oportunidadesTotal: Number(r.oportunidades_total ?? 0),
        oportunidadesAbertas: Number(r.oportunidades_abertas ?? 0),
        oportunidadesGanhas: Number(r.oportunidades_ganhas ?? 0),
        visitasTotal: Number(r.visitas_total ?? 0),
        visitas30d: Number(r.visitas_30d ?? 0),
        valorPipeline: Number(r.valor_pipeline ?? 0),
        conversaoPercentual: r.conversao_percentual == null ? null : Number(r.conversao_percentual),
        unidadesDisponiveis: Number(r.unidades_disponiveis ?? 0),
      });
    }

    const lista: EmpreendimentoAtivos[] = (emps ?? []).map((e) => ({
      empreendimentoId: e.id,
      nome: e.nome,
      slug: e.slug,
      cidade: e.cidade,
      publico: e.publico,
      capaUrl: e.capa_url ?? null,
      itens: porEmp.get(e.id) ?? [],
      demanda: demandaPorEmp.get(e.id) ?? null,
    }));

    return montarAssetIntelligence(lista, new Date().toISOString());
  });
