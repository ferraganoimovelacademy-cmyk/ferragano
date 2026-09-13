/** Agregado de aceite do Advisor para o Control Center. */
export const getAdvisorAceite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const [acoes, briefings] = await Promise.all([
      context.supabase
        .from("advisor_acoes")
        .select("status, prioridade")
        .eq("workspace_id", data.workspaceId),
      context.supabase
        .from("advisor_briefings")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", data.workspaceId),
    ]);

    if (acoes.error) {
      console.error("[getAdvisorAceite]", acoes.error.message);
      throw new Error("Não foi possível ler o aceite do Advisor.");
    }

    return {
      briefingsTotal: briefings.count ?? 0,
      aceite: resumirAceite(acoes.data ?? []),
      altaPendentes: (acoes.data ?? []).filter(
        (a) => a.prioridade === "alta" && a.status === "pendente",
      ).length,
    };
  });
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ADVISOR_SYSTEM_PROMPT,
  classificarPrioridade,
  derivarSinais,
  montarPromptAdvisor,
  montarSnapshotAdvisor,
  montarTarefaDaAcao,
  resumirAceite,
  type AdvisorSnapshot,
} from "@/lib/platform/advisor";

const briefingSchema = z.object({
  resumo: z.string(),
  recomendacoes: z.array(
    z.object({
      titulo: z.string(),
      acao: z.string(),
      sinal: z.string(),
      prioridade: z.enum(["alta", "media", "baixa"]),
    }),
  ),
  riscos: z.array(z.string()),
});

/**
 * FASE 2 — Ferragano Advisor.
 * Sinais vêm dos Read Models sob RLS; a IA só interpreta a evidência.
 */
export const getAdvisorBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        pergunta: z.string().trim().max(500).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    const [exec, vend, mkt] = await Promise.all([
      supabase.rpc("read_executive_360", { _workspace_id: data.workspaceId }),
      supabase.rpc("read_sales_360", { _workspace_id: data.workspaceId }),
      supabase.rpc("read_marketing_360", { _workspace_id: data.workspaceId }),
    ]);

    const erro = exec.error ?? vend.error ?? mkt.error;
    if (erro) {
      console.error("[getAdvisorBriefing]", erro.message);
      throw new Error("Não foi possível ler os painéis para gerar o briefing.");
    }

    const snapshot: AdvisorSnapshot = montarSnapshotAdvisor(
      (exec.data ?? [])[0] as unknown as Record<string, unknown> | undefined,
      (vend.data ?? []) as unknown as Record<string, unknown>[],
      (mkt.data ?? []) as unknown as Record<string, unknown>[],
    );

    const sinais = derivarSinais(snapshot);
    const prioridade = classificarPrioridade(sinais);

    const persistir = async (
      resumo: string | null,
      recomendacoes: { titulo: string; acao: string; sinal: string; prioridade: string }[],
      riscos: string[],
    ) => {
      const { data: briefing, error } = await supabase
        .from("advisor_briefings")
        .insert({
          workspace_id: data.workspaceId,
          criado_por: context.userId,
          pergunta: data.pergunta,
          resumo,
          prioridade,
          sinais: sinais as unknown as never,
          riscos: riscos as unknown as never,
        })
        .select("id")
        .single();

      if (error || !briefing) {
        console.error("[getAdvisorBriefing] persist", error?.message);
        return null;
      }

      if (recomendacoes.length > 0) {
        const { error: acoesErro } = await supabase.from("advisor_acoes").insert(
          recomendacoes.map((r) => ({
            briefing_id: briefing.id,
            workspace_id: data.workspaceId,
            titulo: r.titulo,
            acao: r.acao,
            sinal: r.sinal,
            prioridade: r.prioridade,
          })),
        );
        if (acoesErro) console.error("[getAdvisorBriefing] persist acoes", acoesErro.message);
      }

      return briefing.id;
    };

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return {
        sinais,
        prioridade,
        briefing: null,
        briefingId: await persistir(null, [], []),
        erro: "IA não configurada.",
      };
    }

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateText, Output } = await import("ai");

    try {
      const gateway = createLovableAiGatewayProvider(apiKey);
      const { output } = await generateText({
        model: gateway("google/gemini-3.6-flash"),
        system: ADVISOR_SYSTEM_PROMPT,
        prompt: montarPromptAdvisor(sinais, data.pergunta),
        output: Output.object({ schema: briefingSchema }),
      });

      const recomendacoes = output.recomendacoes.slice(0, 4);
      const riscos = output.riscos.slice(0, 3);

      return {
        sinais,
        prioridade,
        briefing: {
          ...output,
          recomendacoes,
          riscos,
        },
        briefingId: await persistir(output.resumo, recomendacoes, riscos),
        erro: null as string | null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[getAdvisorBriefing] gateway", msg);
      const amigavel = msg.includes("429")
        ? "Limite de uso da IA atingido. Tente novamente em alguns minutos."
        : msg.includes("402")
          ? "Os créditos de IA do workspace acabaram."
          : "A IA não respondeu. Os sinais medidos continuam disponíveis abaixo.";
      return {
        sinais,
        prioridade,
        briefing: null,
        briefingId: await persistir(null, [], []),
        erro: amigavel,
      };
    }
  });

/** Histórico de briefings do workspace com as ações derivadas. */
export const listAdvisorHistorico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: briefings, error } = await context.supabase
      .from("advisor_briefings")
      .select("id, pergunta, resumo, prioridade, created_at")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[listAdvisorHistorico]", error.message);
      throw new Error("Não foi possível ler o histórico do Advisor.");
    }

    const ids = (briefings ?? []).map((b) => b.id);
    if (ids.length === 0) return { briefings: [], acoes: [] };

    const { data: acoes, error: acoesErro } = await context.supabase
      .from("advisor_acoes")
      .select(
        "id, briefing_id, titulo, acao, sinal, prioridade, status, observacao, decidido_em, task_id",
      )
      .in("briefing_id", ids)
      .order("created_at", { ascending: true });

    if (acoesErro) {
      console.error("[listAdvisorHistorico] acoes", acoesErro.message);
      throw new Error("Não foi possível ler as ações do Advisor.");
    }

    return { briefings: briefings ?? [], acoes: acoes ?? [] };
  });

/** Fecha o ciclo de decisão: aceitar, descartar ou concluir uma recomendação. */
export const decidirAdvisorAcao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        acaoId: z.string().uuid(),
        status: z.enum(["pendente", "aceita", "descartada", "concluida"]),
        observacao: z.string().trim().max(1000).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: acao, error: leituraErro } = await context.supabase
      .from("advisor_acoes")
      .select("id, workspace_id, titulo, acao, sinal, prioridade, task_id")
      .eq("id", data.acaoId)
      .single();

    if (leituraErro || !acao) {
      console.error("[decidirAdvisorAcao] leitura", leituraErro?.message);
      throw new Error("Recomendação não encontrada.");
    }

    // Ponte Advisor → Execução: aceitar cria a tarefa; concluir fecha a tarefa.
    let taskId = acao.task_id;

    if (data.status === "aceita" && !taskId) {
      const tarefa = montarTarefaDaAcao(acao);
      const { data: task, error: taskErro } = await context.supabase
        .from("tasks")
        .insert({
          workspace_id: acao.workspace_id,
          titulo: tarefa.titulo,
          descricao: tarefa.descricao,
          prioridade: tarefa.prioridade,
          origem: "sistema",
          responsavel_id: context.userId,
          criado_por: context.userId,
          vence_em: tarefa.venceEm,
        })
        .select("id")
        .single();

      if (taskErro) console.error("[decidirAdvisorAcao] task", taskErro.message);
      else taskId = task?.id ?? null;
    }

    if (data.status === "concluida" && taskId) {
      const { error: fecharErro } = await context.supabase
        .from("tasks")
        .update({ status: "concluida", concluida_em: new Date().toISOString() })
        .eq("id", taskId);
      if (fecharErro) console.error("[decidirAdvisorAcao] concluir task", fecharErro.message);
    }

    const { error } = await context.supabase
      .from("advisor_acoes")
      .update({
        status: data.status,
        observacao: data.observacao,
        task_id: taskId,
        decidido_por: context.userId,
        decidido_em: new Date().toISOString(),
      })
      .eq("id", data.acaoId);

    if (error) {
      console.error("[decidirAdvisorAcao]", error.message);
      throw new Error("Não foi possível registrar a decisão.");
    }

    return { ok: true, taskId };
  });