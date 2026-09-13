import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import {
  memoriaCampanha,
  type Campanha,
  type Decisao,
  type Licao,
  type Playbook,
} from "@/lib/platform/memory";
import {
  cronicaExecutiva,
  curvaAprendizado,
  evolucaoConhecimento,
  grafoOrganizacional,
  indicadoresOrganizacionais,
  linhagemConhecimento,
  scoreInstitucional,
  vigenciaConhecimento,
  type CronicaExecutiva,
  type CurvaAprendizado,
  type EvolucaoItem,
  type GrafoOrganizacional,
  type IndicadoresOrganizacionais,
  type ItemVigencia,
  type Linhagem,
  type ScoreInstitucional,
  type UsoConhecimento,
  type VersaoConhecimento,
} from "@/lib/platform/organizational";

/**
 * SPRINT 29 — ORGANIZATIONAL INTELLIGENCE: porta única do contexto.
 *
 * LÊ `memory_*` (Enterprise Memory) e escreve apenas em `org_knowledge_versions`
 * e `org_knowledge_usage`. Nunca altera memória, conhecimento, fabric ou advisor.
 */

type Linha = Record<string, unknown>;

const txt = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const lista = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))) : [];

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

const paraVersao = (r: Linha): VersaoConhecimento => ({
  id: String(r["id"]),
  entidade: r["entidade"] as VersaoConhecimento["entidade"],
  entidadeId: String(r["entidade_id"]),
  tema: txt(r["tema"]) ?? "—",
  titulo: txt(r["titulo"]) ?? "—",
  versao: num(r["versao"]) ?? 1,
  mudanca: txt(r["mudanca"]) ?? "",
  motivo: txt(r["motivo"]) ?? "",
  evidencias: lista(r["evidencias"]),
  aprovadoNome: txt(r["aprovado_nome"]),
  vigenteEm: txt(r["vigente_em"]) ?? new Date().toISOString(),
  substituidaEm: txt(r["substituida_em"]),
});

const paraUso = (r: Linha): UsoConhecimento => ({
  id: String(r["id"]),
  entidade: r["entidade"] as UsoConhecimento["entidade"],
  entidadeId: String(r["entidade_id"]),
  versao: num(r["versao"]),
  contexto: txt(r["contexto"]) ?? "",
  decisionId: txt(r["decision_id"]),
  campaignId: txt(r["campaign_id"]),
  resultado: txt(r["resultado"]),
  usadoNome: txt(r["usado_nome"]),
  usadoEm: txt(r["usado_em"]) ?? new Date().toISOString(),
});

export type OrganizationalEstado = {
  indicadores: IndicadoresOrganizacionais;
  score: ScoreInstitucional;
  evolucao: EvolucaoItem[];
  curva: CurvaAprendizado;
  vigencias: ItemVigencia[];
  grafo: GrafoOrganizacional;
  cronica: CronicaExecutiva;
  licoes: { id: string; titulo: string; tema: string | null; tipo: string }[];
  usos: UsoConhecimento[];
  versoes: VersaoConhecimento[];
  playbooks: { id: string; titulo: string; tema: string; versao: number }[];
  fontesIndisponiveis: string[];
  geradoEm: string;
};

const workspaceInput = z.object({ workspaceId: z.string().uuid() });

export const getOrganizationalIntelligence = createServerFn({ method: "GET" })
  .middleware([instrumented("platform", "organizational.estado")])
  .inputValidator((input: unknown) => workspaceInput.parse(input))
  .handler(async ({ data, context }): Promise<OrganizationalEstado> => {
    const supabase = context.supabase;
    const ws = data.workspaceId;
    const [dec, camp, lic, play, ver, uso] = await Promise.all([
      supabase.from("memory_decisions").select("*").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(500),
      supabase.from("memory_campaigns").select("*").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(300),
      supabase.from("memory_lessons").select("*").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(500),
      supabase.from("memory_playbooks").select("*").eq("workspace_id", ws).order("gerado_em", { ascending: false }).limit(200),
      supabase.from("org_knowledge_versions").select("*").eq("workspace_id", ws).order("vigente_em", { ascending: false }).limit(500),
      supabase.from("org_knowledge_usage").select("*").eq("workspace_id", ws).order("usado_em", { ascending: false }).limit(500),
    ]);

    const fontesIndisponiveis: string[] = [];
    const linhas = (res: { data: unknown; error: { message: string } | null }, nome: string) => {
      if (res.error) {
        console.warn(`[getOrganizationalIntelligence] ${nome}`, res.error.message);
        fontesIndisponiveis.push(nome);
        return [] as Linha[];
      }
      return (res.data ?? []) as unknown as Linha[];
    };

    const decisoes = linhas(dec, "memory_decisions").map(paraDecisao);
    const campanhas = linhas(camp, "memory_campaigns").map(paraCampanha);
    const licoes = linhas(lic, "memory_lessons").map(paraLicao);
    const playbooks = linhas(play, "memory_playbooks").map(paraPlaybook);
    const versoes = linhas(ver, "org_knowledge_versions").map(paraVersao);
    const usos = linhas(uso, "org_knowledge_usage").map(paraUso);

    // Evidência nova = lição registrada depois da última versão do conhecimento.
    const evidenciasNovasEm = licoes.map((l) => l.criadoEm);

    const vigencias: ItemVigencia[] = [
      ...playbooks.map((p) =>
        vigenciaConhecimento(
          { entidade: "playbook" as const, entidadeId: p.id, titulo: p.titulo, ultimaAtualizacao: p.geradoEm, versaoAtual: p.versao },
          { versoes, evidenciasNovasEm },
        ),
      ),
      ...licoes.map((l) =>
        vigenciaConhecimento(
          { entidade: "licao" as const, entidadeId: l.id, titulo: l.titulo, ultimaAtualizacao: l.criadoEm },
          { versoes },
        ),
      ),
    ];

    return {
      indicadores: indicadoresOrganizacionais({ decisoes, licoes, playbooks, versoes, usos }),
      score: scoreInstitucional({ decisoes, licoes, playbooks, versoes, usos }),
      evolucao: evolucaoConhecimento(versoes),
      curva: curvaAprendizado({ decisoes, licoes, versoes }),
      vigencias,
      grafo: grafoOrganizacional({ decisoes, campanhas, licoes, playbooks, versoes, usos }),
      cronica: cronicaExecutiva({ decisoes, licoes, versoes, usos }),
      licoes: licoes.map((l) => ({ id: l.id, titulo: l.titulo, tema: l.tema, tipo: l.tipo })),
      usos,
      versoes,
      playbooks: playbooks.map((p) => ({ id: p.id, titulo: p.titulo, tema: p.tema, versao: p.versao })),
      fontesIndisponiveis,
      geradoEm: new Date().toISOString(),
    };
  });

/* ------------------------------------------------------------------ *
 * GATE 01 — registrar evolução de um conhecimento
 * ------------------------------------------------------------------ */

export const registrarEvolucao = createServerFn({ method: "POST" })
  .middleware([instrumented("platform", "organizational.registrar_evolucao")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        entidade: z.enum(["playbook", "licao", "decisao", "processo"]),
        entidadeId: z.string().uuid(),
        tema: z.string().trim().min(2).max(120),
        titulo: z.string().trim().min(3).max(180),
        mudanca: z.string().trim().min(5).max(4000),
        motivo: z.string().trim().min(5).max(4000),
        evidencias: z.array(z.string().trim().min(1).max(500)).min(1).max(30),
        aprovadoNome: z.string().trim().min(2).max(160),
        vigenteEm: z.string().date().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ id: string; versao: number }> => {
    // Nova versão sempre sucede a maior já registrada: nada é sobrescrito.
    const { data: ultima, error: erroUltima } = await context.supabase
      .from("org_knowledge_versions")
      .select("id, versao")
      .eq("workspace_id", data.workspaceId)
      .eq("entidade", data.entidade)
      .eq("entidade_id", data.entidadeId)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (erroUltima) {
      console.error("[registrarEvolucao] leitura", erroUltima.message);
      throw new Error("Não foi possível ler o histórico de versões deste conhecimento.");
    }

    const versao = (Number(ultima?.versao ?? 0) || 0) + 1;
    const vigenteEm = data.vigenteEm ? new Date(data.vigenteEm).toISOString() : new Date().toISOString();

    const { data: row, error } = await context.supabase
      .from("org_knowledge_versions")
      .insert({
        workspace_id: data.workspaceId,
        entidade: data.entidade,
        entidade_id: data.entidadeId,
        tema: data.tema,
        titulo: data.titulo,
        versao,
        mudanca: data.mudanca,
        motivo: data.motivo,
        evidencias: data.evidencias,
        aprovado_por: context.userId,
        aprovado_nome: data.aprovadoNome,
        vigente_em: vigenteEm,
        created_by: context.userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[registrarEvolucao]", error.message);
      throw new Error("Não foi possível registrar a evolução do conhecimento.");
    }

    if (ultima?.id) {
      const { error: erroFecha } = await context.supabase
        .from("org_knowledge_versions")
        .update({ substituida_em: vigenteEm })
        .eq("id", ultima.id);
      if (erroFecha) console.warn("[registrarEvolucao] fechamento da versão anterior", erroFecha.message);
    }

    return { id: String(row.id), versao };
  });

/* ------------------------------------------------------------------ *
 * GATE 07 — registrar reuso de conhecimento
 * ------------------------------------------------------------------ */

export const registrarUsoConhecimento = createServerFn({ method: "POST" })
  .middleware([instrumented("platform", "organizational.registrar_uso")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        entidade: z.enum(["playbook", "licao", "decisao", "processo"]),
        entidadeId: z.string().uuid(),
        versao: z.number().int().min(1).optional(),
        contexto: z.string().trim().min(5).max(2000),
        decisionId: z.string().uuid().optional(),
        campaignId: z.string().uuid().optional(),
        resultado: z.string().trim().max(2000).optional(),
        usadoNome: z.string().trim().min(2).max(160),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: row, error } = await context.supabase
      .from("org_knowledge_usage")
      .insert({
        workspace_id: data.workspaceId,
        entidade: data.entidade,
        entidade_id: data.entidadeId,
        versao: data.versao ?? null,
        contexto: data.contexto,
        decision_id: data.decisionId ?? null,
        campaign_id: data.campaignId ?? null,
        resultado: data.resultado ?? null,
        usado_por: context.userId,
        usado_nome: data.usadoNome,
        created_by: context.userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[registrarUsoConhecimento]", error.message);
      throw new Error("Não foi possível registrar o reuso do conhecimento.");
    }
    return { id: String(row.id) };
  });

/* ------------------------------------------------------------------ *
 * GATE 07 — linhagem de uma lição
 * ------------------------------------------------------------------ */

export const getLinhagem = createServerFn({ method: "POST" })
  .middleware([instrumented("platform", "organizational.linhagem")])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid(), licaoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ linhagem: Linhagem | null; roiCampanha: number | null }> => {
    const supabase = context.supabase;
    const ws = data.workspaceId;
    const [lic, dec, camp, play, uso] = await Promise.all([
      supabase.from("memory_lessons").select("*").eq("workspace_id", ws).limit(500),
      supabase.from("memory_decisions").select("*").eq("workspace_id", ws).limit(500),
      supabase.from("memory_campaigns").select("*").eq("workspace_id", ws).limit(300),
      supabase.from("memory_playbooks").select("*").eq("workspace_id", ws).limit(200),
      supabase.from("org_knowledge_usage").select("*").eq("workspace_id", ws).limit(500),
    ]);

    const licoes = ((lic.data ?? []) as unknown as Linha[]).map(paraLicao);
    const decisoes = ((dec.data ?? []) as unknown as Linha[]).map(paraDecisao);
    const campanhas = ((camp.data ?? []) as unknown as Linha[]).map(paraCampanha);
    const playbooks = ((play.data ?? []) as unknown as Linha[]).map(paraPlaybook);
    const usos = ((uso.data ?? []) as unknown as Linha[]).map(paraUso);

    const linhagem = linhagemConhecimento(data.licaoId, { licoes, decisoes, campanhas, playbooks, usos });
    const campanha = linhagem?.campanhaOrigem
      ? campanhas.find((c) => c.id === linhagem.campanhaOrigem!.id)
      : undefined;

    return { linhagem, roiCampanha: campanha ? memoriaCampanha(campanha).roiPct : null };
  });