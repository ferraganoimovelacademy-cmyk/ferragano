import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import {
  decisionDNA,
  gerarPlaybook,
  indicadoresMemoria,
  memoriaCampanha,
  motorLicoes,
  reusoConhecimento,
  roiMedianoHistorico,
  temasElegiveis,
  timelineCorporativa,
  type Campanha,
  type CampanhaMemoria,
  type Decisao,
  type DecisionDNA,
  type Licao,
  type MemoriaIndicadores,
  type Playbook,
  type PlaybookProposta,
  type ReusoConhecimento,
  type AnoTimeline,
} from "@/lib/platform/memory";

/**
 * SPRINT 28 — ENTERPRISE MEMORY: porta única do contexto.
 *
 * Lê e escreve apenas as tabelas `memory_*`. Não consulta o CRM, não consulta
 * o Advisor: a memória é independente e recebe registros. Toda derivação
 * (lições, playbooks, DNA, indicadores) acontece na camada pura.
 */

type Linha = Record<string, unknown>;

const txt = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const lista = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
  return [];
};

const paraDecisao = (r: Linha): Decisao => ({
  id: String(r["id"]),
  categoria: (r["categoria"] as Decisao["categoria"]) ?? "decisao",
  status: (r["status"] as Decisao["status"]) ?? "registrada",
  titulo: txt(r["titulo"]) ?? "—",
  contexto: txt(r["contexto"]) ?? "",
  motivo: txt(r["motivo"]) ?? "",
  hipotese: txt(r["hipotese"]),
  evidencias: lista(r["evidencias"]),
  responsavelNome: txt(r["responsavel_nome"]),
  participantes: lista(r["participantes"]),
  prazo: txt(r["prazo"]),
  aprovadoEm: txt(r["aprovado_em"]),
  executadoEm: txt(r["executado_em"]),
  resultado: txt(r["resultado"]),
  resultadoValor: num(r["resultado_valor"]),
  avaliacao: num(r["avaliacao"]),
  avaliadoEm: txt(r["avaliado_em"]),
  revisao: txt(r["revisao"]),
  revisadoEm: txt(r["revisado_em"]),
  rollbackPlano: txt(r["rollback_plano"]),
  impacto: txt(r["impacto"]),
  tema: txt(r["tema"]),
  tags: lista(r["tags"]),
  criadoEm: txt(r["created_at"]) ?? new Date().toISOString(),
});

const paraCampanha = (r: Linha): Campanha => ({
  id: String(r["id"]),
  status: (r["status"] as Campanha["status"]) ?? "planejada",
  nome: txt(r["nome"]) ?? "—",
  objetivo: txt(r["objetivo"]) ?? "",
  estrategia: txt(r["estrategia"]) ?? "",
  canal: txt(r["canal"]),
  publico: txt(r["publico"]),
  investimento: num(r["investimento"]) ?? 0,
  inicio: txt(r["inicio"]),
  fim: txt(r["fim"]),
  leads: num(r["leads"]) ?? 0,
  oportunidades: num(r["oportunidades"]) ?? 0,
  vendas: num(r["vendas"]) ?? 0,
  receita: num(r["receita"]) ?? 0,
  motivoNascimento: txt(r["motivo_nascimento"]),
  motivoMudanca: txt(r["motivo_mudanca"]),
  motivoEncerramento: txt(r["motivo_encerramento"]),
  responsavelNome: txt(r["responsavel_nome"]),
  tema: txt(r["tema"]),
  criadoEm: txt(r["created_at"]) ?? new Date().toISOString(),
});

const paraLicao = (r: Linha): Licao => ({
  id: String(r["id"]),
  tipo: r["tipo"] as Licao["tipo"],
  titulo: txt(r["titulo"]) ?? "—",
  licao: txt(r["licao"]) ?? "",
  evidencias: lista(r["evidencias"]),
  decisionId: txt(r["decision_id"]),
  campaignId: txt(r["campaign_id"]),
  origem: txt(r["origem"]) ?? "manual",
  tema: txt(r["tema"]),
  criadoEm: txt(r["created_at"]) ?? new Date().toISOString(),
});

const paraPlaybook = (r: Linha): Playbook => ({
  id: String(r["id"]),
  titulo: txt(r["titulo"]) ?? "—",
  tema: txt(r["tema"]) ?? "—",
  casos: num(r["casos"]) ?? 0,
  periodoInicio: txt(r["periodo_inicio"]),
  periodoFim: txt(r["periodo_fim"]),
  taxaSucesso: num(r["taxa_sucesso"]),
  passos: Array.isArray(r["passos"]) ? (r["passos"] as Playbook["passos"]) : [],
  limitacoes: lista(r["limitacoes"]),
  versao: num(r["versao"]) ?? 1,
  geradoEm: txt(r["gerado_em"]) ?? new Date().toISOString(),
});

export type MemoriaEstado = {
  decisoes: Decisao[];
  campanhas: Campanha[];
  campanhasMemoria: CampanhaMemoria[];
  licoes: Licao[];
  playbooks: Playbook[];
  indicadores: MemoriaIndicadores;
  timeline: AnoTimeline[];
  dna: DecisionDNA;
  temas: { tema: string; casos: number; elegivel: boolean; faltam: number }[];
  fontesIndisponiveis: string[];
  geradoEm: string;
};

const workspaceInput = z.object({ workspaceId: z.string().uuid() });

export const getMemoria = createServerFn({ method: "GET" })
  .middleware([instrumented("platform", "memory.estado")])
  .inputValidator((input: unknown) => workspaceInput.parse(input))
  .handler(async ({ data, context }): Promise<MemoriaEstado> => {
    const supabase = context.supabase;
    const [dec, camp, lic, play] = await Promise.all([
      supabase
        .from("memory_decisions")
        .select("*")
        .eq("workspace_id", data.workspaceId)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("memory_campaigns")
        .select("*")
        .eq("workspace_id", data.workspaceId)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("memory_lessons")
        .select("*")
        .eq("workspace_id", data.workspaceId)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("memory_playbooks")
        .select("*")
        .eq("workspace_id", data.workspaceId)
        .order("gerado_em", { ascending: false })
        .limit(100),
    ]);

    const indisponiveis: string[] = [];
    const linhas = (res: { data: unknown; error: { message: string } | null }, nome: string) => {
      if (res.error) {
        console.warn(`[getMemoria] ${nome}`, res.error.message);
        indisponiveis.push(nome);
        return [] as Linha[];
      }
      return (res.data ?? []) as unknown as Linha[];
    };

    const decisoes = linhas(dec, "memory_decisions").map(paraDecisao);
    const campanhas = linhas(camp, "memory_campaigns").map(paraCampanha);
    const licoes = linhas(lic, "memory_lessons").map(paraLicao);
    const playbooks = linhas(play, "memory_playbooks").map(paraPlaybook);

    return {
      decisoes,
      campanhas,
      campanhasMemoria: campanhas.map(memoriaCampanha),
      licoes,
      playbooks,
      indicadores: indicadoresMemoria({ decisoes, campanhas, licoes, playbooks }),
      timeline: timelineCorporativa({ decisoes, campanhas, licoes, playbooks }),
      dna: decisionDNA(decisoes),
      temas: temasElegiveis(decisoes),
      fontesIndisponiveis: indisponiveis,
      geradoEm: new Date().toISOString(),
    };
  });

/* ------------------------------------------------------------------ *
 * GATE 01 — registro e ciclo de vida da decisão
 * ------------------------------------------------------------------ */

export const registrarDecisao = createServerFn({ method: "POST" })
  .middleware([instrumented("platform", "memory.registrar_decisao")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        categoria: z.enum(["decisao", "campanha", "reuniao", "estrategia", "mudanca"]),
        titulo: z.string().trim().min(3).max(180),
        contexto: z.string().trim().min(10).max(4000),
        motivo: z.string().trim().min(5).max(4000),
        hipotese: z.string().trim().max(4000).optional(),
        evidencias: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
        responsavelNome: z.string().trim().min(2).max(160),
        participantes: z.array(z.string().trim().min(1).max(160)).max(50).default([]),
        prazo: z.string().date().optional(),
        rollbackPlano: z.string().trim().max(2000).optional(),
        tema: z.string().trim().max(120).optional(),
        tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: row, error } = await context.supabase
      .from("memory_decisions")
      .insert({
        workspace_id: data.workspaceId,
        categoria: data.categoria,
        titulo: data.titulo,
        contexto: data.contexto,
        motivo: data.motivo,
        hipotese: data.hipotese ?? null,
        evidencias: data.evidencias,
        responsavel_id: context.userId,
        responsavel_nome: data.responsavelNome,
        participantes: data.participantes,
        prazo: data.prazo ?? null,
        rollback_plano: data.rollbackPlano ?? null,
        tema: data.tema ?? null,
        tags: data.tags,
        created_by: context.userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[registrarDecisao]", error.message);
      throw new Error("Não foi possível registrar a decisão na memória.");
    }
    return { id: String(row.id) };
  });

export const avancarDecisao = createServerFn({ method: "POST" })
  .middleware([instrumented("platform", "memory.avancar_decisao")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        id: z.string().uuid(),
        status: z.enum(["aprovada", "executada", "avaliada", "revisada", "descartada"]),
        resultado: z.string().trim().max(4000).optional(),
        resultadoValor: z.number().finite().optional(),
        avaliacao: z.number().int().min(1).max(5).optional(),
        revisao: z.string().trim().max(4000).optional(),
        impacto: z.string().trim().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const agora = new Date().toISOString();
    const patch: Record<string, unknown> = { status: data.status };

    if (data.status === "aprovada") {
      patch["aprovado_por"] = context.userId;
      patch["aprovado_em"] = agora;
    }
    if (data.status === "executada") patch["executado_em"] = agora;
    if (data.status === "avaliada") {
      patch["avaliado_em"] = agora;
      if (data.avaliacao != null) patch["avaliacao"] = data.avaliacao;
    }
    if (data.status === "revisada") patch["revisado_em"] = agora;
    if (data.resultado != null) patch["resultado"] = data.resultado;
    if (data.resultadoValor != null) patch["resultado_valor"] = data.resultadoValor;
    if (data.revisao != null) patch["revisao"] = data.revisao;
    if (data.impacto != null) patch["impacto"] = data.impacto;

    const { error } = await context.supabase
      .from("memory_decisions")
      .update(patch as never)
      .eq("id", data.id)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[avancarDecisao]", error.message);
      throw new Error(error.message.includes("ADR-031") ? error.message : "Não foi possível atualizar a decisão.");
    }
    return { ok: true };
  });

/* ------------------------------------------------------------------ *
 * GATE 02/03 — campanha e motor de lições
 * ------------------------------------------------------------------ */

export const registrarCampanha = createServerFn({ method: "POST" })
  .middleware([instrumented("platform", "memory.registrar_campanha")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        nome: z.string().trim().min(3).max(180),
        objetivo: z.string().trim().min(5).max(2000),
        estrategia: z.string().trim().min(5).max(2000),
        motivoNascimento: z.string().trim().min(5).max(2000),
        canal: z.string().trim().max(80).optional(),
        publico: z.string().trim().max(400).optional(),
        investimento: z.number().finite().min(0).default(0),
        inicio: z.string().date().optional(),
        tema: z.string().trim().max(120).optional(),
        responsavelNome: z.string().trim().min(2).max(160),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: row, error } = await context.supabase
      .from("memory_campaigns")
      .insert({
        workspace_id: data.workspaceId,
        nome: data.nome,
        objetivo: data.objetivo,
        estrategia: data.estrategia,
        motivo_nascimento: data.motivoNascimento,
        canal: data.canal ?? null,
        publico: data.publico ?? null,
        investimento: data.investimento,
        inicio: data.inicio ?? null,
        tema: data.tema ?? null,
        responsavel_id: context.userId,
        responsavel_nome: data.responsavelNome,
        status: data.inicio ? "ativa" : "planejada",
        created_by: context.userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[registrarCampanha]", error.message);
      throw new Error("Não foi possível registrar a campanha na memória.");
    }
    return { id: String(row.id) };
  });

/**
 * GATE 03 — encerra a campanha e deriva lições do que foi REGISTRADO.
 * Se os números não permitirem conclusão, nenhuma lição é criada e a lacuna
 * é devolvida ao usuário.
 */
export const encerrarCampanha = createServerFn({ method: "POST" })
  .middleware([instrumented("platform", "memory.encerrar_campanha")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        id: z.string().uuid(),
        motivoEncerramento: z.string().trim().min(5).max(2000),
        leads: z.number().int().min(0),
        oportunidades: z.number().int().min(0),
        vendas: z.number().int().min(0),
        receita: z.number().finite().min(0),
        fim: z.string().date().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ licoesCriadas: number; lacunas: string[] }> => {
    const supabase = context.supabase;

    const { data: atualizada, error: erroUpdate } = await supabase
      .from("memory_campaigns")
      .update({
        status: "encerrada",
        motivo_encerramento: data.motivoEncerramento,
        leads: data.leads,
        oportunidades: data.oportunidades,
        vendas: data.vendas,
        receita: data.receita,
        fim: data.fim ?? new Date().toISOString().slice(0, 10),
      } as never)
      .eq("id", data.id)
      .eq("workspace_id", data.workspaceId)
      .select("*")
      .single();

    if (erroUpdate || !atualizada) {
      console.error("[encerrarCampanha]", erroUpdate?.message);
      throw new Error("Não foi possível encerrar a campanha.");
    }

    const campanha = paraCampanha(atualizada as unknown as Linha);

    const { data: historicoRows } = await supabase
      .from("memory_campaigns")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .eq("status", "encerrada")
      .neq("id", data.id)
      .limit(200);

    const historico = ((historicoRows ?? []) as unknown as Linha[]).map(paraCampanha);
    const { licoes, lacunas } = motorLicoes(campanha, {
      roiMedianoPct: roiMedianoHistorico(historico),
    });

    if (licoes.length === 0) return { licoesCriadas: 0, lacunas };

    const { error: erroLicoes } = await supabase.from("memory_lessons").insert(
      licoes.map((l) => ({
        workspace_id: data.workspaceId,
        tipo: l.tipo,
        titulo: l.titulo,
        licao: l.licao,
        evidencias: l.evidencias,
        campaign_id: data.id,
        origem: "lesson_engine",
        tema: l.tema,
        responsavel_id: context.userId,
        created_by: context.userId,
      })),
    );

    if (erroLicoes) {
      console.error("[encerrarCampanha] licoes", erroLicoes.message);
      return { licoesCriadas: 0, lacunas: [...lacunas, "as lições não puderam ser gravadas"] };
    }

    return { licoesCriadas: licoes.length, lacunas };
  });

/* ------------------------------------------------------------------ *
 * GATE 05 — Knowledge Reuse
 * ------------------------------------------------------------------ */

export const consultarReuso = createServerFn({ method: "POST" })
  .middleware([instrumented("platform", "memory.reuso")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        titulo: z.string().trim().min(3).max(180),
        contexto: z.string().trim().min(3).max(4000),
        tema: z.string().trim().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<ReusoConhecimento> => {
    const { data: rows, error } = await context.supabase
      .from("memory_decisions")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("[consultarReuso]", error.message);
      throw new Error("Não foi possível consultar a memória de decisões.");
    }

    const historico = ((rows ?? []) as unknown as Linha[]).map(paraDecisao);
    return reusoConhecimento(
      { titulo: data.titulo, contexto: data.contexto, tema: data.tema ?? null },
      historico,
    );
  });

/* ------------------------------------------------------------------ *
 * GATE 06 — Playbook Generator
 * ------------------------------------------------------------------ */

export const gerarPlaybookTema = createServerFn({ method: "POST" })
  .middleware([instrumented("platform", "memory.playbook")])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid(), tema: z.string().trim().min(2).max(120) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<
    { gerado: true; playbook: PlaybookProposta; versao: number } | { gerado: false; motivo: string }
  > => {
    const supabase = context.supabase;
    const { data: rows, error } = await supabase
      .from("memory_decisions")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .eq("tema", data.tema)
      .limit(500);

    if (error) {
      console.error("[gerarPlaybookTema]", error.message);
      throw new Error("Não foi possível ler o histórico do tema.");
    }

    const decisoes = ((rows ?? []) as unknown as Linha[]).map(paraDecisao);
    const resultado = gerarPlaybook(data.tema, decisoes);
    if (!("passos" in resultado)) return { gerado: false, motivo: resultado.motivo };

    const { data: ultimo } = await supabase
      .from("memory_playbooks")
      .select("versao")
      .eq("workspace_id", data.workspaceId)
      .eq("tema", data.tema)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();

    const versao = (num(ultimo?.versao) ?? 0) + 1;

    const { error: erroInsert } = await supabase.from("memory_playbooks").insert({
      workspace_id: data.workspaceId,
      titulo: resultado.titulo,
      tema: resultado.tema,
      casos: resultado.casos,
      periodo_inicio: resultado.periodoInicio?.slice(0, 10) ?? null,
      periodo_fim: resultado.periodoFim?.slice(0, 10) ?? null,
      taxa_sucesso: resultado.taxaSucessoPct,
      passos: resultado.passos,
      limitacoes: resultado.limitacoes,
      versao,
      created_by: context.userId,
    });

    if (erroInsert) {
      console.error("[gerarPlaybookTema] insert", erroInsert.message);
      throw new Error("Não foi possível gravar o playbook gerado.");
    }

    return { gerado: true, playbook: resultado, versao };
  });