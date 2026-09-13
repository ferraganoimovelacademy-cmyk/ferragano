import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recordAudit } from "@/lib/platform/audit.server";
import { publishEvent } from "@/lib/platform/events.server";
import { notify } from "@/lib/platform/notifications.server";
import {
  PROPOSAL_STATUS,
  RESERVATION_STATUS,
  SALE_STATUS,
  TASK_PRIORIDADES,
  TASK_STATUS,
  VISIT_STATUS,
} from "@/lib/platform/sales";

/**
 * SPRINT 06 — Sales Bounded Context.
 * Aqui só existe processo comercial: oportunidade, tarefa, visita, proposta,
 * reserva e venda. Nada de dado de identidade — a pessoa é referência (id),
 * nunca cópia.
 */

const ws = z.string().uuid();

/* ============================ BOARD ============================ */

export const getSalesBoard = createServerFn({ method: "GET" })
  .middleware([instrumented("sales", "abrir_oportunidade")])
  .inputValidator((input: unknown) =>
    z
      .object({ workspaceId: ws, pipelineId: z.string().uuid().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: pipelines, error: errPipe } = await supabase
      .from("pipelines")
      .select("id, nome, padrao")
      .eq("workspace_id", data.workspaceId)
      .eq("ativo", true)
      .order("padrao", { ascending: false })
      .order("nome");

    if (errPipe) {
      console.error("[getSalesBoard:pipelines]", errPipe.message);
      throw new Error("Não foi possível carregar o funil.");
    }

    const pipelineId = data.pipelineId ?? pipelines?.[0]?.id ?? null;
    if (!pipelineId) return { pipelines: [], pipelineId: null, etapas: [], oportunidades: [] };

    const [{ data: etapas, error: errEtapas }, { data: opps, error: errOpps }] = await Promise.all([
      supabase
        .from("pipeline_stages")
        .select("id, nome, ordem, cor, tipo, probabilidade, sla_horas, checklist, criterios_saida")
        .eq("workspace_id", data.workspaceId)
        .eq("pipeline_id", pipelineId)
        .order("ordem"),
      supabase
        .from("opportunities")
        .select(
          "id, titulo, stage_id, estagio, temperatura, score, valor, probabilidade, proxima_acao, proxima_acao_em, stage_entrou_em, responsavel_id, person_id, created_at, people(id, nome), empreendimentos(id, nome)",
        )
        .eq("workspace_id", data.workspaceId)
        .eq("pipeline_id", pipelineId)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    if (errEtapas || errOpps) {
      console.error("[getSalesBoard]", errEtapas?.message ?? errOpps?.message);
      throw new Error("Não foi possível carregar o funil.");
    }

    return {
      pipelines: pipelines ?? [],
      pipelineId,
      etapas: (etapas ?? []).map((e) => ({
        ...e,
        checklist: Array.isArray(e.checklist) ? (e.checklist as string[]) : [],
        criterios_saida: Array.isArray(e.criterios_saida) ? (e.criterios_saida as string[]) : [],
      })),
      oportunidades: (opps ?? []).map((o) => ({
        ...o,
        pessoaNome: o.people?.nome ?? "—",
        empreendimentoNome: o.empreendimentos?.nome ?? null,
      })),
    };
  });

/** Move a oportunidade entre etapas configuráveis, validando critérios de saída. */
export const moveOpportunityToStage = createServerFn({ method: "POST" })
  .middleware([instrumented("sales", "mover_etapa")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        opportunityId: z.string().uuid(),
        stageId: z.string().uuid(),
        motivo: z.string().trim().max(400).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [{ data: opp }, { data: destino }] = await Promise.all([
      supabase
        .from("opportunities")
        .select("id, person_id, stage_id, valor")
        .eq("id", data.opportunityId)
        .eq("workspace_id", data.workspaceId)
        .maybeSingle(),
      supabase
        .from("pipeline_stages")
        .select("id, nome, tipo, probabilidade")
        .eq("id", data.stageId)
        .eq("workspace_id", data.workspaceId)
        .maybeSingle(),
    ]);

    if (!opp || !destino) throw new Error("Oportunidade ou etapa não encontrada.");
    if (destino.tipo === "perdido" && !data.motivo)
      throw new Error("Informe o motivo da perda.");

    const desfecho = destino.tipo !== "aberto";

    const { error } = await supabase
      .from("opportunities")
      .update({
        stage_id: destino.id,
        stage_entrou_em: new Date().toISOString(),
        probabilidade: destino.probabilidade,
        estagio: destino.tipo === "ganho" ? "fechado" : destino.tipo === "perdido" ? "perdido" : "contato",
        perdido_motivo: destino.tipo === "perdido" ? (data.motivo ?? null) : null,
        ganho_motivo: destino.tipo === "ganho" ? (data.motivo || null) : null,
        fechado_em: desfecho ? new Date().toISOString() : null,
      })
      .eq("id", opp.id)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[moveOpportunityToStage]", error.message);
      throw new Error("Não foi possível mover a oportunidade.");
    }

    await publishEvent(supabase, {
      workspaceId: data.workspaceId,
      type:
        destino.tipo === "ganho"
          ? "OpportunityWon"
          : destino.tipo === "perdido"
            ? "OpportunityLost"
            : "OpportunityMoved",
      aggregate: "opportunity",
      aggregateId: opp.id,
      personId: opp.person_id,
      opportunityId: opp.id,
      actorId: userId,
      payload: { etapa: destino.nome, motivo: data.motivo || null },
    });

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "opportunity.stage_moved",
      entity: "opportunity",
      entityId: opp.id,
      metadata: { etapa: destino.nome },
    });

    return { ok: true as const };
  });

/* ============================ TASKS ============================ */

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        opportunityId: z.string().uuid().optional(),
        status: z.enum(TASK_STATUS).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("tasks")
      .select(
        "id, titulo, descricao, status, prioridade, origem, responsavel_id, vence_em, concluida_em, opportunity_id, person_id, created_at",
      )
      .eq("workspace_id", data.workspaceId)
      .order("vence_em", { ascending: true, nullsFirst: false })
      .limit(300);

    if (data.opportunityId) q = q.eq("opportunity_id", data.opportunityId);
    if (data.status) q = q.eq("status", data.status);

    const { data: rows, error } = await q;
    if (error) {
      console.error("[listTasks]", error.message);
      throw new Error("Não foi possível carregar as tarefas.");
    }
    return rows ?? [];
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        opportunityId: z.string().uuid().nullish(),
        personId: z.string().uuid().nullish(),
        titulo: z.string().trim().min(2).max(160),
        descricao: z.string().trim().max(2000).optional().or(z.literal("")),
        prioridade: z.enum(TASK_PRIORIDADES).default("media"),
        responsavelId: z.string().uuid().nullish(),
        venceEm: z.string().trim().max(40).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("tasks")
      .insert({
        workspace_id: data.workspaceId,
        opportunity_id: data.opportunityId ?? null,
        person_id: data.personId ?? null,
        titulo: data.titulo,
        descricao: data.descricao || null,
        prioridade: data.prioridade,
        origem: "manual",
        responsavel_id: data.responsavelId ?? userId,
        vence_em: data.venceEm ? new Date(data.venceEm).toISOString() : null,
        criado_por: userId,
      })
      .select("id, responsavel_id, opportunity_id, person_id")
      .single();

    if (error) {
      console.error("[createTask]", error.message);
      throw new Error("Não foi possível criar a tarefa.");
    }

    if (row.responsavel_id && row.responsavel_id !== userId) {
      await notify(supabase, {
        workspaceId: data.workspaceId,
        userId: row.responsavel_id,
        titulo: "Nova tarefa atribuída",
        mensagem: data.titulo,
        link: "/app/oportunidades",
        entity: "task",
        entityId: row.id,
      });
    }

    await publishEvent(supabase, {
      workspaceId: data.workspaceId,
      type: "TaskCreated",
      aggregate: "task",
      aggregateId: row.id,
      personId: row.person_id,
      opportunityId: row.opportunity_id,
      actorId: userId,
      payload: { titulo: data.titulo, prioridade: data.prioridade },
    });

    return row;
  });

export const setTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ workspaceId: ws, taskId: z.string().uuid(), status: z.enum(TASK_STATUS) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("tasks")
      .update({
        status: data.status,
        concluida_em: data.status === "concluida" ? new Date().toISOString() : null,
      })
      .eq("id", data.taskId)
      .eq("workspace_id", data.workspaceId)
      .select("id, titulo, opportunity_id, person_id")
      .single();

    if (error) {
      console.error("[setTaskStatus]", error.message);
      throw new Error("Você não tem permissão para alterar esta tarefa.");
    }

    if (data.status === "concluida") {
      await publishEvent(supabase, {
        workspaceId: data.workspaceId,
        type: "TaskCompleted",
        aggregate: "task",
        aggregateId: row.id,
        personId: row.person_id,
        opportunityId: row.opportunity_id,
        actorId: userId,
        payload: { titulo: row.titulo },
      });
    }

    return { ok: true as const };
  });

/* ============================ VISITS ============================ */

export const listVisits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ workspaceId: ws, opportunityId: z.string().uuid().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("visits")
      .select(
        "id, agendada_para, status, compareceu, feedback, nota, opportunity_id, person_id, empreendimento_id, unidade_id, corretor_id, empreendimentos(nome), unidades(identificador)",
      )
      .eq("workspace_id", data.workspaceId)
      .order("agendada_para", { ascending: false })
      .limit(200);

    if (data.opportunityId) q = q.eq("opportunity_id", data.opportunityId);

    const { data: rows, error } = await q;
    if (error) {
      console.error("[listVisits]", error.message);
      throw new Error("Não foi possível carregar as visitas.");
    }
    return (rows ?? []).map((r) => ({
      ...r,
      empreendimentoNome: r.empreendimentos?.nome ?? null,
      unidadeIdentificador: r.unidades?.identificador ?? null,
    }));
  });

export const scheduleVisit = createServerFn({ method: "POST" })
  .middleware([instrumented("sales", "criar_visita")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        opportunityId: z.string().uuid(),
        personId: z.string().uuid().nullish(),
        empreendimentoId: z.string().uuid().nullish(),
        unidadeId: z.string().uuid().nullish(),
        agendadaPara: z.string().trim().min(4).max(40),
        acompanhantes: z.array(z.string().trim().max(120)).max(10).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("visits")
      .insert({
        workspace_id: data.workspaceId,
        opportunity_id: data.opportunityId,
        person_id: data.personId ?? null,
        empreendimento_id: data.empreendimentoId ?? null,
        unidade_id: data.unidadeId ?? null,
        corretor_id: userId,
        agendada_para: new Date(data.agendadaPara).toISOString(),
        acompanhantes: data.acompanhantes as never,
        criado_por: userId,
      })
      .select("id, person_id")
      .single();

    if (error) {
      console.error("[scheduleVisit]", error.message);
      throw new Error("Não foi possível agendar a visita.");
    }

    await publishEvent(supabase, {
      workspaceId: data.workspaceId,
      type: "VisitScheduled",
      aggregate: "visit",
      aggregateId: row.id,
      personId: row.person_id,
      opportunityId: data.opportunityId,
      actorId: userId,
      payload: { agendadaPara: data.agendadaPara },
    });

    return row;
  });

export const registerVisitOutcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        visitId: z.string().uuid(),
        status: z.enum(VISIT_STATUS),
        feedback: z.string().trim().max(2000).optional().or(z.literal("")),
        nota: z.number().int().min(0).max(10).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("visits")
      .update({
        status: data.status,
        compareceu: data.status === "realizada",
        feedback: data.feedback || null,
        nota: data.nota ?? null,
      })
      .eq("id", data.visitId)
      .eq("workspace_id", data.workspaceId)
      .select("id, opportunity_id, person_id")
      .single();

    if (error) {
      console.error("[registerVisitOutcome]", error.message);
      throw new Error("Você não tem permissão para alterar esta visita.");
    }

    if (data.status === "realizada" || data.status === "nao_compareceu") {
      await publishEvent(supabase, {
        workspaceId: data.workspaceId,
        type: data.status === "realizada" ? "VisitCompleted" : "VisitNoShow",
        aggregate: "visit",
        aggregateId: row.id,
        personId: row.person_id,
        opportunityId: row.opportunity_id,
        actorId: userId,
        payload: { nota: data.nota ?? null },
      });
    }

    return { ok: true as const };
  });

/* ============================ PROPOSALS ============================ */

export const listProposals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ workspaceId: ws, opportunityId: z.string().uuid().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("proposals")
      .select(
        "id, versao, status, valor, entrada, banco, prazo_meses, validade, enviada_em, opportunity_id, person_id, created_at",
      )
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (data.opportunityId) q = q.eq("opportunity_id", data.opportunityId);

    const { data: rows, error } = await q;
    if (error) {
      console.error("[listProposals]", error.message);
      throw new Error("Não foi possível carregar as propostas.");
    }
    return rows ?? [];
  });

export const createProposal = createServerFn({ method: "POST" })
  .middleware([instrumented("sales", "criar_proposta")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        opportunityId: z.string().uuid(),
        personId: z.string().uuid().nullish(),
        empreendimentoId: z.string().uuid().nullish(),
        unidadeId: z.string().uuid().nullish(),
        valor: z.number().nonnegative().max(1e11).nullish(),
        entrada: z.number().nonnegative().max(1e11).nullish(),
        banco: z.string().trim().max(80).optional().or(z.literal("")),
        prazoMeses: z.number().int().min(0).max(600).nullish(),
        condicoes: z.string().trim().max(2000).optional().or(z.literal("")),
        validade: z.string().trim().max(10).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: anteriores } = await supabase
      .from("proposals")
      .select("versao")
      .eq("workspace_id", data.workspaceId)
      .eq("opportunity_id", data.opportunityId)
      .order("versao", { ascending: false })
      .limit(1);

    const versao = (anteriores?.[0]?.versao ?? 0) + 1;

    const { data: row, error } = await supabase
      .from("proposals")
      .insert({
        workspace_id: data.workspaceId,
        opportunity_id: data.opportunityId,
        person_id: data.personId ?? null,
        empreendimento_id: data.empreendimentoId ?? null,
        unidade_id: data.unidadeId ?? null,
        versao,
        valor: data.valor ?? null,
        entrada: data.entrada ?? null,
        banco: data.banco || null,
        prazo_meses: data.prazoMeses ?? null,
        condicoes: data.condicoes || null,
        validade: data.validade || null,
        responsavel_id: userId,
        criado_por: userId,
      })
      .select("id, versao, person_id")
      .single();

    if (error) {
      console.error("[createProposal]", error.message);
      throw new Error("Não foi possível criar a proposta.");
    }

    await publishEvent(supabase, {
      workspaceId: data.workspaceId,
      type: "ProposalCreated",
      aggregate: "proposal",
      aggregateId: row.id,
      personId: row.person_id,
      opportunityId: data.opportunityId,
      actorId: userId,
      payload: { versao: row.versao, valor: data.valor ?? null },
    });

    return row;
  });

export const setProposalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        proposalId: z.string().uuid(),
        status: z.enum(PROPOSAL_STATUS),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const agora = new Date().toISOString();

    const { data: row, error } = await supabase
      .from("proposals")
      .update({
        status: data.status,
        enviada_em: data.status === "enviada" ? agora : undefined,
        respondida_em:
          data.status === "aceita" || data.status === "recusada" ? agora : undefined,
      })
      .eq("id", data.proposalId)
      .eq("workspace_id", data.workspaceId)
      .select("id, opportunity_id, person_id")
      .single();

    if (error) {
      console.error("[setProposalStatus]", error.message);
      throw new Error("Você não tem permissão para alterar esta proposta.");
    }

    const evento =
      data.status === "enviada"
        ? "ProposalSent"
        : data.status === "aceita"
          ? "ProposalAccepted"
          : data.status === "recusada"
            ? "ProposalRejected"
            : null;

    if (evento) {
      await publishEvent(supabase, {
        workspaceId: data.workspaceId,
        type: evento,
        aggregate: "proposal",
        aggregateId: row.id,
        personId: row.person_id,
        opportunityId: row.opportunity_id,
        actorId: userId,
      });
    }

    return { ok: true as const };
  });

/* ============================ RESERVATIONS ============================ */

export const listReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ workspaceId: ws, opportunityId: z.string().uuid().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("reservations")
      .select(
        "id, status, valor, expira_em, cancelada_em, cancelamento_motivo, opportunity_id, unidade_id, created_at, unidades(identificador)",
      )
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (data.opportunityId) q = q.eq("opportunity_id", data.opportunityId);

    const { data: rows, error } = await q;
    if (error) {
      console.error("[listReservations]", error.message);
      throw new Error("Não foi possível carregar as reservas.");
    }
    return (rows ?? []).map((r) => ({
      ...r,
      unidadeIdentificador: r.unidades?.identificador ?? null,
      vencida: r.status === "ativa" && new Date(r.expira_em).getTime() < Date.now(),
    }));
  });

export const createReservation = createServerFn({ method: "POST" })
  .middleware([instrumented("sales", "reservar")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        opportunityId: z.string().uuid(),
        personId: z.string().uuid().nullish(),
        unidadeId: z.string().uuid().nullish(),
        proposalId: z.string().uuid().nullish(),
        valor: z.number().nonnegative().max(1e11).nullish(),
        expiraEm: z.string().trim().min(4).max(40),
        observacao: z.string().trim().max(500).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const expira = new Date(data.expiraEm);
    if (Number.isNaN(expira.getTime()) || expira.getTime() < Date.now())
      throw new Error("A validade da reserva deve ser uma data futura.");

    const { data: row, error } = await supabase
      .from("reservations")
      .insert({
        workspace_id: data.workspaceId,
        opportunity_id: data.opportunityId,
        person_id: data.personId ?? null,
        unidade_id: data.unidadeId ?? null,
        proposal_id: data.proposalId ?? null,
        valor: data.valor ?? null,
        expira_em: expira.toISOString(),
        observacao: data.observacao || null,
        criado_por: userId,
      })
      .select("id, person_id")
      .single();

    if (error) {
      console.error("[createReservation]", error.message);
      throw new Error("Não foi possível criar a reserva.");
    }

    if (data.unidadeId) {
      await supabase
        .from("unidades")
        .update({ status: "reservada" })
        .eq("id", data.unidadeId)
        .eq("workspace_id", data.workspaceId);
    }

    await publishEvent(supabase, {
      workspaceId: data.workspaceId,
      type: "ReservationCreated",
      aggregate: "reservation",
      aggregateId: row.id,
      personId: row.person_id,
      opportunityId: data.opportunityId,
      actorId: userId,
      payload: { expiraEm: expira.toISOString() },
    });

    return row;
  });

export const setReservationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        reservationId: z.string().uuid(),
        status: z.enum(RESERVATION_STATUS),
        motivo: z.string().trim().max(400).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.status === "cancelada" && !data.motivo)
      throw new Error("Informe o motivo do cancelamento.");

    const { data: row, error } = await supabase
      .from("reservations")
      .update({
        status: data.status,
        cancelada_em: data.status === "cancelada" ? new Date().toISOString() : null,
        cancelamento_motivo: data.status === "cancelada" ? (data.motivo ?? null) : null,
      })
      .eq("id", data.reservationId)
      .eq("workspace_id", data.workspaceId)
      .select("id, unidade_id, opportunity_id, person_id")
      .single();

    if (error) {
      console.error("[setReservationStatus]", error.message);
      throw new Error("Você não tem permissão para alterar esta reserva.");
    }

    if (row.unidade_id && (data.status === "cancelada" || data.status === "expirada")) {
      await supabase
        .from("unidades")
        .update({ status: "disponivel" })
        .eq("id", row.unidade_id)
        .eq("workspace_id", data.workspaceId);
    }

    if (data.status === "cancelada") {
      await publishEvent(supabase, {
        workspaceId: data.workspaceId,
        type: "ReservationCancelled",
        aggregate: "reservation",
        aggregateId: row.id,
        personId: row.person_id,
        opportunityId: row.opportunity_id,
        actorId: userId,
        payload: { motivo: data.motivo },
      });
    }

    return { ok: true as const };
  });

/* ============================ SALES ============================ */

export const listSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ workspaceId: ws, opportunityId: z.string().uuid().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("sales")
      .select(
        "id, status, valor_final, comissao_percentual, comissao_valor, banco, assinado_em, opportunity_id, person_id, unidade_id, created_at, unidades(identificador), people(nome)",
      )
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (data.opportunityId) q = q.eq("opportunity_id", data.opportunityId);

    const { data: rows, error } = await q;
    if (error) {
      console.error("[listSales]", error.message);
      throw new Error("Não foi possível carregar as vendas.");
    }
    return (rows ?? []).map((r) => ({
      ...r,
      pessoaNome: r.people?.nome ?? "—",
      unidadeIdentificador: r.unidades?.identificador ?? null,
    }));
  });

export const createSale = createServerFn({ method: "POST" })
  .middleware([instrumented("sales", "vender")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        opportunityId: z.string().uuid(),
        personId: z.string().uuid().nullish(),
        unidadeId: z.string().uuid().nullish(),
        proposalId: z.string().uuid().nullish(),
        reservationId: z.string().uuid().nullish(),
        valorFinal: z.number().nonnegative().max(1e11).nullish(),
        comissaoPercentual: z.number().min(0).max(100).nullish(),
        banco: z.string().trim().max(80).optional().or(z.literal("")),
        status: z.enum(SALE_STATUS).default("em_assinatura"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const comissaoValor =
      data.valorFinal && data.comissaoPercentual
        ? Number(((data.valorFinal * data.comissaoPercentual) / 100).toFixed(2))
        : null;

    const { data: row, error } = await supabase
      .from("sales")
      .insert({
        workspace_id: data.workspaceId,
        opportunity_id: data.opportunityId,
        person_id: data.personId ?? null,
        unidade_id: data.unidadeId ?? null,
        proposal_id: data.proposalId ?? null,
        reservation_id: data.reservationId ?? null,
        valor_final: data.valorFinal ?? null,
        comissao_percentual: data.comissaoPercentual ?? null,
        comissao_valor: comissaoValor,
        banco: data.banco || null,
        status: data.status,
        assinado_em: data.status === "assinada" ? new Date().toISOString() : null,
        corretor_id: userId,
        criado_por: userId,
      })
      .select("id, person_id")
      .single();

    if (error) {
      console.error("[createSale]", error.message);
      throw new Error("Não foi possível registrar a venda.");
    }

    if (data.unidadeId) {
      await supabase
        .from("unidades")
        .update({ status: "vendida" })
        .eq("id", data.unidadeId)
        .eq("workspace_id", data.workspaceId);
    }

    if (data.reservationId) {
      await supabase
        .from("reservations")
        .update({ status: "convertida" })
        .eq("id", data.reservationId)
        .eq("workspace_id", data.workspaceId);
    }

    await publishEvent(supabase, {
      workspaceId: data.workspaceId,
      type: "SaleCompleted",
      aggregate: "sale",
      aggregateId: row.id,
      personId: row.person_id,
      opportunityId: data.opportunityId,
      actorId: userId,
      payload: { valorFinal: data.valorFinal ?? null, comissaoValor },
    });

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "sale.created",
      entity: "sale",
      entityId: row.id,
      metadata: { valorFinal: data.valorFinal ?? null },
    });

    return row;
  });
