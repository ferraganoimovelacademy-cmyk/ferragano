import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recordAudit } from "@/lib/platform/audit.server";
import { slugify } from "@/lib/platform/comercial";

/**
 * Domínio Marketing — landing pages de captação.
 * Uma LP pode ser de campanha (registro em `landing_pages`) ou nascer
 * automaticamente de um empreendimento publicado (fallback pelo slug).
 * A rota pública /lp/$slug resolve nessa ordem.
 */

const LP_FIELDS =
  "id, slug, titulo, subtitulo, descricao, cta_texto, hero_url, empreendimento_id, campanha, ativa, workspace_id";

const EMP_PUBLIC_FIELDS =
  "id, nome, slug, construtora, cidade, uf, bairro, status, segmento, preco_min, preco_max, entrega_prevista, capa_url, descricao, galeria";

type UnidadeLP = {
  id: string;
  identificador: string;
  tipologia: string | null;
  dormitorios: number | null;
  vagas: number | null;
  area_privativa: number | null;
  preco: number | null;
  status: string;
};

type EmpPublico = {
  id: string;
  nome: string;
  slug: string;
  construtora: string | null;
  cidade: string | null;
  uf: string | null;
  bairro: string | null;
  status: string;
  segmento: string;
  preco_min: number | null;
  preco_max: number | null;
  entrega_prevista: string | null;
  capa_url: string | null;
  descricao: string | null;
  galeria: string[] | null;
};

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Leitura pública SSR da LP (campanha ou empreendimento). */
export const getLandingPublica = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().trim().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();

    const { data: lp } = await supabase
      .from("landing_pages")
      .select(LP_FIELDS)
      .eq("slug", data.slug)
      .eq("ativa", true)
      .maybeSingle();

    if (lp) {
      let empreendimento: EmpPublico | null = null;
      let unidades: UnidadeLP[] = [];
      if (lp.empreendimento_id) {
        const { data: emp } = await supabase
          .from("empreendimentos")
          .select(EMP_PUBLIC_FIELDS)
          .eq("id", lp.empreendimento_id)
          .eq("publico", true)
          .maybeSingle();
        empreendimento = (emp as EmpPublico | null) ?? null;
        if (emp) {
          const { data: uns } = await supabase
            .from("unidades")
            .select("id, identificador, tipologia, dormitorios, vagas, area_privativa, preco, status")
            .eq("empreendimento_id", emp.id)
            .eq("status", "disponivel")
            .order("preco");
          unidades = (uns ?? []) as UnidadeLP[];
        }
      }
      return { tipo: "campanha" as const, landing: lp, empreendimento, unidades };
    }

    const { data: emp } = await supabase
      .from("empreendimentos")
      .select(EMP_PUBLIC_FIELDS)
      .eq("slug", data.slug)
      .eq("publico", true)
      .maybeSingle();

    if (!emp) return null;

    const { data: uns } = await supabase
      .from("unidades")
      .select("id, identificador, tipologia, dormitorios, vagas, area_privativa, preco, status")
      .eq("empreendimento_id", emp.id)
      .eq("status", "disponivel")
      .order("preco");

    return {
      tipo: "empreendimento" as const,
      landing: null,
      empreendimento: emp as EmpPublico,
      unidades: (uns ?? []) as UnidadeLP[],
    };
  });

export type LandingPublica = NonNullable<Awaited<ReturnType<typeof getLandingPublica>>>;

/** Painel interno — lista as LPs do workspace com contagem de leads gerados. */
export const listLandings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("landing_pages")
      .select(`${LP_FIELDS}, created_at, empreendimentos(nome)`)
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[listLandings]", error.message);
      throw new Error("Não foi possível carregar as landing pages.");
    }

    const ids = (rows ?? []).map((r) => r.id);
    const { data: oportunidades } = ids.length
      ? await context.supabase
          .from("opportunities")
          .select("landing_page_id")
          .eq("workspace_id", data.workspaceId)
          .in("landing_page_id", ids)
      : { data: [] as { landing_page_id: string | null }[] };

    const contagem = new Map<string, number>();
    for (const o of oportunidades ?? []) {
      if (o.landing_page_id) contagem.set(o.landing_page_id, (contagem.get(o.landing_page_id) ?? 0) + 1);
    }

    return (rows ?? []).map((row) => ({ ...row, leads: contagem.get(row.id) ?? 0 }));
  });

export const createLanding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        titulo: z.string().trim().min(3).max(140),
        slug: z.string().trim().max(120).optional().or(z.literal("")),
        subtitulo: z.string().trim().max(200).optional().or(z.literal("")),
        descricao: z.string().trim().max(2000).optional().or(z.literal("")),
        ctaTexto: z.string().trim().max(60).optional().or(z.literal("")),
        heroUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
        empreendimentoId: z.string().uuid().nullish(),
        campanha: z.string().trim().max(80).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const slug = slugify(data.slug || data.titulo);

    const { data: row, error } = await context.supabase
      .from("landing_pages")
      .insert({
        workspace_id: data.workspaceId,
        slug,
        titulo: data.titulo,
        subtitulo: data.subtitulo || null,
        descricao: data.descricao || null,
        cta_texto: data.ctaTexto || "Quero falar com um especialista",
        hero_url: data.heroUrl || null,
        empreendimento_id: data.empreendimentoId ?? null,
        campanha: data.campanha || null,
        criado_por: context.userId,
      })
      .select("id, slug")
      .single();

    if (error) {
      console.error("[createLanding]", error.message);
      if (error.code === "23505") throw new Error("Já existe uma landing page com esse endereço.");
      throw new Error("Não foi possível criar a landing page.");
    }

    await recordAudit(context.supabase, {
      workspaceId: data.workspaceId,
      actorId: context.userId,
      action: "landing.criada",
      entity: "landing_page",
      entityId: row.id,
      metadata: { slug: row.slug, campanha: data.campanha || null },
    });

    return row;
  });

export const setLandingAtiva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        landingId: z.string().uuid(),
        ativa: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("landing_pages")
      .update({ ativa: data.ativa })
      .eq("id", data.landingId)
      .eq("workspace_id", data.workspaceId)
      .select("id, slug, ativa")
      .single();

    if (error) {
      console.error("[setLandingAtiva]", error.message);
      throw new Error("Não foi possível alterar a publicação.");
    }

    await recordAudit(context.supabase, {
      workspaceId: data.workspaceId,
      actorId: context.userId,
      action: data.ativa ? "landing.publicada" : "landing.despublicada",
      entity: "landing_page",
      entityId: row.id,
      metadata: { slug: row.slug },
    });

    return row;
  });

export const deleteLanding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid(), landingId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("landing_pages")
      .delete()
      .eq("id", data.landingId)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[deleteLanding]", error.message);
      throw new Error("Não foi possível excluir a landing page.");
    }

    await recordAudit(context.supabase, {
      workspaceId: data.workspaceId,
      actorId: context.userId,
      action: "landing.excluida",
      entity: "landing_page",
      entityId: data.landingId,
    });

    return { ok: true as const };
  });
