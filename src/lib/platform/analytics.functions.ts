import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Camadas de leitura (capítulo 09 do Blueprint).
 * Nada de tabela nova: tudo é projeção sobre as entidades canônicas,
 * sempre sob RLS do usuário e com filtro explícito de workspace.
 */

const workspaceInput = (input: unknown) =>
  z.object({ workspaceId: z.string().uuid() }).parse(input);

type Contagem = Record<string, number>;

const contar = <T extends string>(rows: { [k: string]: unknown }[], campo: string): Contagem => {
  const out: Contagem = {};
  for (const row of rows) {
    const key = String(row[campo] ?? "outro") as T;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
};

/** Performance do time comercial: membros, papéis e carteira de oportunidades. */
export const listCorretores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(workspaceInput)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const ws = data.workspaceId;

    const [{ data: members }, { data: roles }, { data: leads }, { data: compromissos }] =
      await Promise.all([
        supabase
          .from("workspace_members")
          .select("user_id, ativo, joined_at")
          .eq("workspace_id", ws)
          .eq("ativo", true),
        supabase.from("user_roles").select("user_id, role").eq("workspace_id", ws),
        supabase
          .from("opportunities")
          .select("id, responsavel_id, estagio, valor, created_at, people(ultimo_contato_em)")
          .eq("workspace_id", ws),
        supabase
          .from("compromissos")
          .select("id, responsavel_id, status, inicio_em")
          .eq("workspace_id", ws)
          .eq("status", "pendente"),
      ]);

    const ids = (members ?? []).map((m) => m.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, nome, email, avatar_url").in("id", ids)
      : { data: [] as { id: string; nome: string | null; email: string | null; avatar_url: string | null }[] };

    const perfilPor = new Map((profiles ?? []).map((p) => [p.id, p]));
    const papeisPor = new Map<string, string[]>();
    for (const r of roles ?? []) {
      papeisPor.set(r.user_id, [...(papeisPor.get(r.user_id) ?? []), r.role as string]);
    }

    const agora = Date.now();
    const parado = (l: { people: { ultimo_contato_em: string | null } | null; created_at: string }) =>
      agora - new Date(l.people?.ultimo_contato_em ?? l.created_at).getTime() > 7 * 864e5;

    const corretores = (members ?? []).map((m) => {
      const meus = (leads ?? []).filter((l) => l.responsavel_id === m.user_id);
      const fechados = meus.filter((l) => l.estagio === "fechado");
      const encerrados = meus.filter((l) => l.estagio === "fechado" || l.estagio === "perdido");
      return {
        userId: m.user_id,
        joinedAt: m.joined_at,
        profile: perfilPor.get(m.user_id) ?? null,
        roles: papeisPor.get(m.user_id) ?? [],
        leads: meus.length,
        ativos: meus.filter((l) => l.estagio !== "fechado" && l.estagio !== "perdido").length,
        fechados: fechados.length,
        parados: meus.filter((l) => l.estagio !== "fechado" && l.estagio !== "perdido" && parado(l))
          .length,
        conversao: encerrados.length
          ? Math.round((fechados.length / encerrados.length) * 100)
          : null,
        vgvFechado: fechados.reduce((s, l) => s + Number(l.valor ?? 0), 0),
        compromissosPendentes: (compromissos ?? []).filter((c) => c.responsavel_id === m.user_id)
          .length,
      };
    });

    corretores.sort((a, b) => b.leads - a.leads);

    return {
      corretores,
      semResponsavel: (leads ?? []).filter((l) => !l.responsavel_id).length,
    };
  });

/** Indicadores consolidados do workspace — base do módulo de Relatórios. */
export const getRelatorios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(workspaceInput)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const ws = data.workspaceId;

    const [{ data: leads }, { data: unidades }, { data: propostas }, { data: empreendimentos }] =
      await Promise.all([
        supabase
          .from("opportunities")
          .select("id, estagio, origem, temperatura, valor, created_at, people(ultimo_contato_em)")
          .eq("workspace_id", ws),
        supabase.from("unidades").select("id, status, preco").eq("workspace_id", ws),
        supabase.from("proposals").select("id, status, valor").eq("workspace_id", ws),
        supabase.from("empreendimentos").select("id, publico").eq("workspace_id", ws),
      ]);

    const todos = leads ?? [];
    const agora = Date.now();
    const em30 = todos.filter((l) => agora - new Date(l.created_at).getTime() <= 30 * 864e5);
    const fechados = todos.filter((l) => l.estagio === "fechado");
    const encerrados = todos.filter((l) => l.estagio === "fechado" || l.estagio === "perdido");
    const abertos = todos.filter((l) => l.estagio !== "fechado" && l.estagio !== "perdido");

    return {
      leads: {
        total: todos.length,
        ultimos30: em30.length,
        abertos: abertos.length,
        parados: abertos.filter(
          (l) => agora - new Date(l.people?.ultimo_contato_em ?? l.created_at).getTime() > 7 * 864e5,
        ).length,
        conversao: encerrados.length
          ? Math.round((fechados.length / encerrados.length) * 100)
          : null,
        porEstagio: contar(todos, "estagio"),
        porOrigem: contar(todos, "origem"),
        porTemperatura: contar(todos, "temperatura"),
        vgvFechado: fechados.reduce((s, l) => s + Number(l.valor ?? 0), 0),
      },
      unidades: {
        total: (unidades ?? []).length,
        porStatus: contar(unidades ?? [], "status"),
        vgvDisponivel: (unidades ?? [])
          .filter((u) => u.status === "disponivel")
          .reduce((s, u) => s + Number(u.preco ?? 0), 0),
        vgvVendido: (unidades ?? [])
          .filter((u) => u.status === "vendida")
          .reduce((s, u) => s + Number(u.preco ?? 0), 0),
      },
      propostas: {
        total: (propostas ?? []).length,
        porStatus: contar(propostas ?? [], "status"),
        valorAceito: (propostas ?? [])
          .filter((p) => p.status === "aceita")
          .reduce((s, p) => s + Number(p.valor ?? 0), 0),
      },
      empreendimentos: {
        total: (empreendimentos ?? []).length,
        publicos: (empreendimentos ?? []).filter((e) => e.publico).length,
      },
    };
  });

/**
 * Campanhas: projeção sobre `landing_pages.campanha` + atribuição em `opportunities`.
 * Campanha não é tabela — é o agrupamento das páginas que captam.
 */
export const listCampanhas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(workspaceInput)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const ws = data.workspaceId;

    const [{ data: pages }, { data: leads }] = await Promise.all([
      supabase
        .from("landing_pages")
        .select("id, slug, titulo, campanha, ativa, created_at")
        .eq("workspace_id", ws),
      supabase
        .from("opportunities")
        .select("id, landing_page_id, origem, estagio, valor, created_at")
        .eq("workspace_id", ws),
    ]);

    const paginas = pages ?? [];
    const todosLeads = leads ?? [];
    const chaves = new Map<string, typeof paginas>();
    for (const p of paginas) {
      const chave = (p.campanha ?? "").trim() || "Sem campanha";
      chaves.set(chave, [...(chaves.get(chave) ?? []), p]);
    }

    const campanhas = [...chaves.entries()].map(([nome, ps]) => {
      const ids = new Set(ps.map((p) => p.id));
      const meus = todosLeads.filter((l) => l.landing_page_id && ids.has(l.landing_page_id));
      const fechados = meus.filter((l) => l.estagio === "fechado");
      return {
        nome,
        paginas: ps.map((p) => ({
          ...p,
          leads: todosLeads.filter((l) => l.landing_page_id === p.id).length,
        })),
        ativas: ps.filter((p) => p.ativa).length,
        leads: meus.length,
        fechados: fechados.length,
        conversao: meus.length ? Math.round((fechados.length / meus.length) * 100) : null,
        vgvFechado: fechados.reduce((s, l) => s + Number(l.valor ?? 0), 0),
      };
    });

    campanhas.sort((a, b) => b.leads - a.leads);

    return {
      campanhas,
      semAtribuicao: todosLeads.filter((l) => !l.landing_page_id).length,
      porOrigem: contar(todosLeads, "origem"),
      totalLeads: todosLeads.length,
    };
  });
