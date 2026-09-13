import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ACADEMY_LICOES } from "@/lib/platform/academy";
import {
  avaliarProntidaoPiloto,
  resumirProntidao,
  type PilotCheck,
  type PilotResumo,
  type PilotSnapshot,
} from "@/lib/platform/pilot";

/**
 * GATES P01–P03 — prontidão do workspace de piloto.
 * Só leitura sob RLS, sempre no workspace do chamador administrador. Nada de
 * service role e nenhum dado semeado: o retrato é o que existe de verdade.
 */
export const getPilotReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{
    snapshot: PilotSnapshot;
    checks: PilotCheck[];
    resumo: PilotResumo;
  }> => {
    const { supabase, userId } = context;
    const workspaceId = data.workspaceId;

    const { data: admin } = await supabase.rpc("is_workspace_admin", {
      _user_id: userId,
      _workspace_id: workspaceId,
    });
    if (!admin) throw new Error("Apenas proprietário e administrador acessam a prontidão do piloto.");

    const obrigatorias = ACADEMY_LICOES.filter((l) => l.obrigatoria).length;

    const [
      pipelines,
      etapas,
      membros,
      papeis,
      empreendimentos,
      unidades,
      auditorias,
      flags,
      progresso,
    ] = await Promise.all([
      supabase.from("pipelines").select("id, padrao").eq("workspace_id", workspaceId).eq("ativo", true),
      supabase
        .from("pipeline_stages")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      supabase
        .from("workspace_members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("ativo", true),
      supabase.from("user_roles").select("role").eq("workspace_id", workspaceId),
      supabase.from("empreendimentos").select("id, publico").eq("workspace_id", workspaceId),
      supabase.from("unidades").select("preco").eq("workspace_id", workspaceId),
      supabase
        .from("audit_log")
        .select("action")
        .eq("workspace_id", workspaceId)
        .in("action", [
          "people.imported",
          "opportunities.imported",
          "visits.imported",
          "reservations.imported",
        ]),
      supabase.from("module_flags").select("module, enabled").eq("workspace_id", workspaceId),
      supabase.from("academy_progress").select("user_id").eq("workspace_id", workspaceId),
    ]);

    const contagemPapeis: Record<string, number> = {};
    for (const row of papeis.data ?? []) {
      const role = row.role as string;
      contagemPapeis[role] = (contagemPapeis[role] ?? 0) + 1;
    }

    const acoes = auditorias.data ?? [];
    const contar = (acao: string) => acoes.filter((a) => a.action === acao).length;

    const licoesPorUsuario = new Map<string, number>();
    for (const row of progresso.data ?? []) {
      licoesPorUsuario.set(row.user_id, (licoesPorUsuario.get(row.user_id) ?? 0) + 1);
    }

    const listaUnidades = unidades.data ?? [];

    const snapshot: PilotSnapshot = {
      funis: (pipelines.data ?? []).length,
      funilPadrao: (pipelines.data ?? []).some((p) => p.padrao),
      etapas: etapas.count ?? 0,
      membrosAtivos: membros.count ?? 0,
      papeis: contagemPapeis,
      empreendimentos: (empreendimentos.data ?? []).length,
      empreendimentosPublicos: (empreendimentos.data ?? []).filter((e) => e.publico).length,
      unidades: listaUnidades.length,
      unidadesComPreco: listaUnidades.filter((u) => (u.preco ?? 0) > 0).length,
      importacoes: {
        pessoas: contar("people.imported"),
        oportunidades: contar("opportunities.imported"),
        visitas: contar("visits.imported"),
        reservas: contar("reservations.imported"),
      },
      flags: Object.fromEntries(
        (flags.data ?? []).map((f) => [f.module as string, f.enabled]),
      ) as Record<string, boolean>,
      academyMembrosConcluiram: [...licoesPorUsuario.values()].filter((n) => n >= obrigatorias)
        .length,
    };

    const checks = avaliarProntidaoPiloto(snapshot);
    return { snapshot, checks, resumo: resumirProntidao(checks) };
  });