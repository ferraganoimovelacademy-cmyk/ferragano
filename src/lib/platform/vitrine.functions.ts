import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  LEAD_ORIGENS,
  calcularScore,
  temperaturaPorScore,
} from "@/lib/platform/comercial";

/**
 * Vitrine pública — leitura SSR do portfólio e captação de leads do site.
 * Nada aqui exige sessão: só trafega o que está marcado como público
 * (RLS anon: empreendimentos.publico = true e unidades desses empreendimentos).
 */

const EMP_FIELDS =
  "id, nome, slug, construtora, cidade, uf, bairro, status, segmento, preco_min, preco_max, entrega_prevista, capa_url, descricao, destaque, galeria";

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

export const getEmpreendimentoPublico = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = publicClient();

    const { data: emp, error } = await supabase
      .from("empreendimentos")
      .select(EMP_FIELDS)
      .eq("id", data.id)
      .eq("publico", true)
      .maybeSingle();

    if (error) {
      console.error("[getEmpreendimentoPublico]", error.message);
      throw new Error("Não foi possível carregar o empreendimento.");
    }
    if (!emp) return null;

    const { data: unidades } = await supabase
      .from("unidades")
      .select("id, identificador, tipologia, dormitorios, vagas, area_privativa, andar, preco, status")
      .eq("empreendimento_id", emp.id)
      .order("identificador");

    return { empreendimento: emp, unidades: unidades ?? [] };
  });

export type EmpreendimentoDetalhe = NonNullable<
  Awaited<ReturnType<typeof getEmpreendimentoPublico>>
>;

/**
 * Captação de lead pelo site. Endpoint público por natureza:
 * valida tudo no servidor, nunca aceita workspace/score vindos do cliente
 * (o workspace é derivado do empreendimento publicado).
 */
export const submitLeadPublico = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        empreendimentoId: z.string().uuid().nullish(),
        landingPageId: z.string().uuid().nullish(),
        nome: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(160).optional().or(z.literal("")),
        telefone: z.string().trim().min(8).max(30),
        mensagem: z.string().trim().max(1000).optional().or(z.literal("")),
        origem: z.enum(LEAD_ORIGENS).default("site"),
      })
      .refine((v) => Boolean(v.email) || Boolean(v.telefone), {
        message: "Informe e-mail ou telefone.",
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const publico = publicClient();

    let workspaceId: string | null = null;
    let responsavelId: string | null = null;
    let nomeEmp: string | null = null;
    let landingPageId: string | null = null;
    let campanha: string | null = null;

    // A LP ativa define workspace e (quando houver) empreendimento da captação.
    let empreendimentoId = data.empreendimentoId ?? null;
    if (data.landingPageId) {
      const { data: lp } = await publico
        .from("landing_pages")
        .select("id, workspace_id, empreendimento_id, campanha")
        .eq("id", data.landingPageId)
        .eq("ativa", true)
        .maybeSingle();
      if (lp) {
        landingPageId = lp.id;
        workspaceId = lp.workspace_id;
        campanha = lp.campanha;
        empreendimentoId = empreendimentoId ?? lp.empreendimento_id;
      }
    }

    if (empreendimentoId) {
      const { data: emp } = await publico
        .from("empreendimentos")
        .select("id, nome, workspace_id, responsavel_id, criado_por")
        .eq("id", empreendimentoId)
        .eq("publico", true)
        .maybeSingle();
      if (!emp) throw new Error("Empreendimento indisponível.");
      workspaceId = emp.workspace_id;
      responsavelId = emp.responsavel_id ?? emp.criado_por ?? null;
      nomeEmp = emp.nome;
    } else if (!workspaceId) {
      const { data: emp } = await publico
        .from("empreendimentos")
        .select("workspace_id, responsavel_id, criado_por")
        .eq("publico", true)
        .limit(1)
        .maybeSingle();
      if (!emp) throw new Error("Contato indisponível no momento.");
      workspaceId = emp.workspace_id;
      responsavelId = emp.responsavel_id ?? emp.criado_por ?? null;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const score = calcularScore({
      origem: data.origem,
      temperatura: "morno",
      temTelefone: Boolean(data.telefone),
      temEmail: Boolean(data.email),
      temEmpreendimento: Boolean(empreendimentoId),
      valorEstimado: null,
    });

    // Sprint 10.5 — Legacy Zero: a captação pública entra direto no Write Model
    // canônico (people + person_contacts + opportunities), sem passar por `leads`.
    const { data: person, error: personError } = await supabaseAdmin
      .from("people")
      .insert({
        workspace_id: workspaceId!,
        nome: data.nome,
        tipo: "fisica",
        origem: data.origem,
        estagio_jornada: "lead",
        responsavel_id: responsavelId,
        observacao: data.mensagem || null,
      })
      .select("id")
      .single();

    if (personError) {
      console.error("[submitLeadPublico:person]", personError.message);
      throw new Error("Não foi possível enviar seu contato agora.");
    }

    const contatos: Database["public"]["Tables"]["person_contacts"]["Insert"][] = [
      {
        workspace_id: workspaceId!,
        person_id: person.id,
        canal: "telefone" as const,
        valor: data.telefone,
        principal: true,
      },
    ];
    if (data.email) {
      contatos.push({
        workspace_id: workspaceId!,
        person_id: person.id,
        canal: "email" as const,
        valor: data.email,
        principal: true,
      });
    }
    await supabaseAdmin.from("person_contacts").insert(contatos);

    const { data: oportunidade, error } = await supabaseAdmin
      .from("opportunities")
      .insert({
        workspace_id: workspaceId!,
        person_id: person.id,
        titulo: nomeEmp ? `Interesse — ${nomeEmp}` : "Contato pelo site",
        origem: data.origem,
        estagio: "novo",
        score,
        temperatura: temperaturaPorScore(score),
        empreendimento_id: empreendimentoId,
        landing_page_id: landingPageId,
        responsavel_id: responsavelId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[submitLeadPublico:opportunity]", error.message);
      throw new Error("Não foi possível enviar seu contato agora.");
    }

    const descricao = campanha
      ? `Contato pela landing page — campanha ${campanha}.`
      : nomeEmp
        ? `Contato pelo site — ${nomeEmp}.`
        : "Contato pelo site.";

    await supabaseAdmin.from("activities").insert({
      workspace_id: workspaceId!,
      person_id: person.id,
      opportunity_id: oportunidade.id,
      tipo: "sistema",
      titulo: "Contato recebido pelo site",
      descricao,
    });

    const { publishEvent } = await import("@/lib/platform/events.server");
    await publishEvent(supabaseAdmin, {
      workspaceId: workspaceId!,
      type: "OpportunityCreated",
      aggregate: "opportunity",
      aggregateId: oportunidade.id,
      personId: person.id,
      opportunityId: oportunidade.id,
      actorId: null,
      payload: { origem: data.origem, campanha, empreendimentoId, landingPageId },
    });

    const { notify, notifyWorkspace } = await import("@/lib/platform/notifications.server");
    const aviso = {
      titulo: "Novo contato pelo site",
      mensagem: `${data.nome}${nomeEmp ? ` — ${nomeEmp}` : ""}`,
      tipo: "sucesso" as const,
      link: "/app/oportunidades",
      entity: "opportunity",
      entityId: oportunidade.id,
    };

    if (responsavelId) {
      await notify(supabaseAdmin, { workspaceId: workspaceId!, userId: responsavelId, ...aviso });
    } else {
      await notifyWorkspace(supabaseAdmin, workspaceId!, aviso);
    }

    return { ok: true as const, workspaceId: workspaceId!, opportunityId: oportunidade.id };
  });
