import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";

export type SearchHit = {
  id: string;
  tipo: string;
  titulo: string;
  subtitulo: string | null;
  to: string;
  icon: string;
};

const escape = (term: string) => term.replace(/[%,()]/g, " ").trim();

/**
 * Busca global — SPRINT 08 antecipada.
 * Lê sob RLS como o próprio usuário: só retorna o que ele já pode ver.
 */
export const globalSearch = createServerFn({ method: "GET" })
  .middleware([instrumented("platform", "busca_global")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        termo: z.string().trim().min(2).max(80),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const q = escape(data.termo);
    if (!q) return { hits: [] as SearchHit[] };
    const like = `%${q}%`;
    const ws = data.workspaceId;
    const limit = 5;

    const [pessoas, clientes, empreendimentos, unidades, propostas, landings, membros] =
      await Promise.all([
        supabase
          .from("people")
          .select("id, nome, documento, estagio_jornada")
          .eq("workspace_id", ws)
          .is("merged_into", null)
          .or(`nome.ilike.${like},documento.ilike.${like}`)
          .limit(limit),
        supabase
          .from("clientes")
          .select("id, nome, email, telefone")
          .eq("workspace_id", ws)
          .or(`nome.ilike.${like},email.ilike.${like},telefone.ilike.${like}`)
          .limit(limit),
        supabase
          .from("empreendimentos")
          .select("id, nome, cidade, uf, construtora")
          .eq("workspace_id", ws)
          .or(`nome.ilike.${like},construtora.ilike.${like},cidade.ilike.${like}`)
          .limit(limit),
        supabase
          .from("unidades")
          .select("id, identificador, tipologia, status, empreendimento_id")
          .eq("workspace_id", ws)
          .or(`identificador.ilike.${like},tipologia.ilike.${like}`)
          .limit(limit),
        supabase
          .from("proposals")
          .select("id, status, valor, condicoes, opportunity_id")
          .eq("workspace_id", ws)
          .ilike("condicoes", like)
          .limit(limit),
        supabase
          .from("landing_pages")
          .select("id, slug, titulo, campanha")
          .eq("workspace_id", ws)
          .or(`titulo.ilike.${like},slug.ilike.${like},campanha.ilike.${like}`)
          .limit(limit),
        supabase
          .from("profiles")
          .select("id, nome, email, cargo")
          .or(`nome.ilike.${like},email.ilike.${like}`)
          .limit(limit),
      ]);

    const hits: SearchHit[] = [];

    for (const p of pessoas.data ?? []) {
      hits.push({
        id: p.id,
        tipo: "Pessoa",
        titulo: p.nome,
        subtitulo: p.documento ?? String(p.estagio_jornada),
        to: `/app/pessoas/${p.id}`,
        icon: "contacts",
      });
    }

    for (const c of clientes.data ?? []) {
      hits.push({
        id: c.id,
        tipo: "Cliente",
        titulo: c.nome,
        subtitulo: c.email ?? c.telefone,
        to: "/app/clientes",
        icon: "groups",
      });
    }
    for (const e of empreendimentos.data ?? []) {
      hits.push({
        id: e.id,
        tipo: "Empreendimento",
        titulo: e.nome,
        subtitulo: [e.construtora, e.cidade && `${e.cidade}/${e.uf ?? ""}`]
          .filter(Boolean)
          .join(" · "),
        to: `/app/empreendimentos`,
        icon: "apartment",
      });
    }
    for (const u of unidades.data ?? []) {
      hits.push({
        id: u.id,
        tipo: "Unidade",
        titulo: u.identificador,
        subtitulo: [u.tipologia, u.status].filter(Boolean).join(" · "),
        to: `/app/empreendimentos/${u.empreendimento_id}/unidades`,
        icon: "door_front",
      });
    }
    for (const p of propostas.data ?? []) {
      hits.push({
        id: p.id,
        tipo: "Proposta",
        titulo: p.valor ? `Proposta R$ ${Number(p.valor).toLocaleString("pt-BR")}` : "Proposta",
        subtitulo: String(p.status),
        to: "/app/oportunidades",
        icon: "description",
      });
    }
    for (const lp of landings.data ?? []) {
      hits.push({
        id: lp.id,
        tipo: "Landing page",
        titulo: lp.titulo,
        subtitulo: lp.campanha ?? `/lp/${lp.slug}`,
        to: "/app/landing",
        icon: "web",
      });
    }
    for (const m of membros.data ?? []) {
      hits.push({
        id: m.id,
        tipo: "Usuário",
        titulo: m.nome ?? m.email ?? "Usuário",
        subtitulo: m.cargo ?? m.email,
        to: "/app/usuarios",
        icon: "badge",
      });
    }

    return { hits };
  });
