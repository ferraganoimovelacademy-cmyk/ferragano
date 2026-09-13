import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcularProgresso } from "@/lib/platform/academy";
import { resumirGoNogo, type GoNogoEntrada, type GoNogoResumo } from "@/lib/platform/gonogo";
import type { FeatureAdoption, DecisionAccuracy } from "@/lib/platform/telemetry";
import type { PlatformMetricsSummary } from "@/lib/platform/metrics";

/**
 * FASE 1 — GATE P10: agregador da revisão Go/No-Go.
 *
 * Lê só pelas funções agregadas já existentes (`platform_metrics_summary`,
 * `feature_adoption`, `decision_accuracy`) e pelo write model sob RLS. Nada de
 * service role: quem não é administrador do workspace não recebe número algum.
 */
export const getGoNogoReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        janelaDias: z.number().int().min(7).max(30).default(30),
      })
      .parse(input),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ resumo: GoNogoResumo; entrada: GoNogoEntrada; geradoEm: string }> => {
      const { supabase, userId } = context;
      const janelaHoras = data.janelaDias * 24;
      const desde = new Date(Date.now() - janelaHoras * 3_600_000).toISOString();
      const desde14d = new Date(Date.now() - 14 * 86_400_000).toISOString();

      const { data: admin, error: erroPapel } = await supabase.rpc("is_workspace_admin", {
        _user_id: userId,
        _workspace_id: data.workspaceId,
      });
      if (erroPapel || !admin) {
        throw new Error("A revisão Go/No-Go é restrita a proprietário e administrador.");
      }

      const [metricas, adocao, decisao, oportunidades, esquecidas, feedback, academy, membros] =
        await Promise.all([
          supabase.rpc("platform_metrics_summary" as never, {
            _workspace_id: data.workspaceId,
            _janela_horas: janelaHoras,
          } as never),
          supabase.rpc("feature_adoption" as never, {
            _workspace_id: data.workspaceId,
            _janela_horas: janelaHoras,
          } as never),
          supabase.rpc("decision_accuracy" as never, {
            _workspace_id: data.workspaceId,
            _janela_horas: janelaHoras,
          } as never),
          supabase
            .from("opportunities")
            .select("id, updated_at")
            .eq("workspace_id", data.workspaceId),
          supabase
            .from("opportunities")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", data.workspaceId)
            .lt("updated_at", desde14d),
          supabase
            .from("pilot_feedback")
            .select("severidade, status")
            .eq("workspace_id", data.workspaceId),
          supabase
            .from("academy_progress")
            .select("user_id, licao_key")
            .eq("workspace_id", data.workspaceId),
          supabase
            .from("workspace_members")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", data.workspaceId)
            .eq("status", "ativo"),
        ]);

      const resumoMetricas = metricas.data as unknown as PlatformMetricsSummary | null;
      const resumoAdocao = adocao.data as unknown as FeatureAdoption | null;
      const resumoDecisao = decisao.data as unknown as DecisionAccuracy | null;

      const usoFeature = (domain: string, action: string) =>
        resumoAdocao?.features?.find((f) => f.domain === domain && f.action === action)?.usos ??
        null;

      const oportunidadesTotal = oportunidades.data?.length ?? null;
      const oportunidadesAtualizadas =
        oportunidades.data?.filter((o) => o.updated_at != null && o.updated_at >= desde).length ??
        null;

      const feedbackRows = feedback.data ?? [];
      const feedbackCriticoAberto = feedbackRows.filter(
        (f) =>
          (f.severidade === "critica" || f.severidade === "alta") &&
          f.status !== "resolvido" &&
          f.status !== "descartado",
      ).length;

      const licoesPorUsuario = new Map<string, string[]>();
      for (const row of academy.data ?? []) {
        const atual = licoesPorUsuario.get(row.user_id) ?? [];
        atual.push(row.licao_key);
        licoesPorUsuario.set(row.user_id, atual);
      }
      const academyCertificados = [...licoesPorUsuario.values()].filter(
        (keys) => calcularProgresso(keys).certificado,
      ).length;

      const membrosAtivos = membros.count ?? resumoMetricas?.produto?.membrosAtivos ?? 0;

      const entrada: GoNogoEntrada = {
        janelaDias: data.janelaDias,
        membrosAtivos,
        usuariosAtivos7d: resumoMetricas?.produto?.usuariosAtivos7d ?? null,
        oportunidadesTotal,
        oportunidadesAtualizadas,
        oportunidadesEsquecidas: esquecidas.count ?? null,
        eventosTotal: resumoAdocao?.totalEventos ?? null,
        eventosComErro:
          resumoAdocao?.features?.reduce((soma, f) => soma + (f.erros ?? 0), 0) ?? null,
        oportunidadesGanhas: resumoMetricas?.comercial?.oportunidadesGanhas ?? null,
        oportunidadesPerdidas: resumoMetricas?.comercial?.oportunidadesPerdidas ?? null,
        tempoMedioEtapaHoras: resumoMetricas?.comercial?.tempoMedioEtapaHoras ?? null,
        usosBuscaGlobal: usoFeature("platform", "busca_global"),
        usosDecisionCenter: usoFeature("observability", "decision_center"),
        eventosAutomacao: usoFeature("automation", "evento_processado"),
        decisoesTotal: resumoDecisao?.total ?? null,
        decisoesAceitas: resumoDecisao?.aceitas ?? null,
        feedbackTotal: feedbackRows.length,
        feedbackCriticoAberto,
        academyCertificados,
      };

      return {
        resumo: resumirGoNogo(entrada),
        entrada,
        geradoEm: new Date().toISOString(),
      };
    },
  );
