import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { recordAudit } from "@/lib/platform/audit.server";
import { LEAD_ORIGENS } from "@/lib/platform/comercial";
import {
  ACTIVITY_TIPOS,
  ADDRESS_TIPOS,
  CONTACT_CANAIS,
  PERSON_ESTAGIOS,
  PERSON_TIPOS,
  RELATIONSHIP_TIPOS,
} from "@/lib/platform/relacionamento";

/**
 * SPRINT 05 — Relationship Core.
 * `people` é a identidade da pessoa e nunca recebe campo comercial: valor,
 * estágio de pipeline e probabilidade vivem em `opportunities`.
 * Contatos, endereços, relacionamentos e atividades são satélites.
 * Toda leitura/escrita sob RLS — nenhum service role aqui.
 */

const opcional = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const listPeople = createServerFn({ method: "GET" })
  .middleware([instrumented("people", "pesquisa")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        busca: z.string().trim().max(120).optional(),
        estagio: z.enum(PERSON_ESTAGIOS).optional(),
        limite: z.number().int().min(1).max(500).default(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    let query = supabase
      .from("people")
      .select(
        "id, nome, nome_social, tipo, documento, estagio_jornada, origem, responsavel_id, ultimo_contato_em, created_at",
      )
      .eq("workspace_id", data.workspaceId)
      .is("merged_into", null)
      .order("created_at", { ascending: false })
      .limit(data.limite);

    if (data.estagio) query = query.eq("estagio_jornada", data.estagio);
    if (data.busca) {
      const termo = data.busca.replace(/[%,()]/g, "");
      query = query.or(`nome.ilike.%${termo}%,documento.ilike.%${termo}%`);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("[listPeople]", error.message);
      throw new Error("Não foi possível carregar as pessoas.");
    }

    const ids = (rows ?? []).map((r) => r.id);
    if (!ids.length) return [];

    const [contatos, oportunidades, perfis] = await Promise.all([
      supabase
        .from("person_contacts")
        .select("person_id, canal, valor, principal")
        .in("person_id", ids),
      supabase.from("opportunities").select("id, person_id, estagio, valor").in("person_id", ids),
      (async () => {
        const responsaveis = [
          ...new Set((rows ?? []).map((r) => r.responsavel_id).filter(Boolean)),
        ] as string[];
        if (!responsaveis.length) return { data: [] as { id: string; nome: string | null; email: string | null }[] };
        return supabase.from("profiles").select("id, nome, email").in("id", responsaveis);
      })(),
    ]);

    const byPerfil = new Map((perfis.data ?? []).map((p) => [p.id, p]));

    return (rows ?? []).map((row) => {
      const meus = (contatos.data ?? []).filter((c) => c.person_id === row.id);
      const abertas = (oportunidades.data ?? []).filter(
        (o) => o.person_id === row.id && o.estagio !== "fechado" && o.estagio !== "perdido",
      );
      return {
        ...row,
        email: meus.find((c) => c.canal === "email")?.valor ?? null,
        telefone: meus.find((c) => c.canal === "telefone" || c.canal === "whatsapp")?.valor ?? null,
        oportunidadesAbertas: abertas.length,
        valorEmAberto: abertas.reduce((soma, o) => soma + Number(o.valor ?? 0), 0),
        responsavelNome: row.responsavel_id
          ? (byPerfil.get(row.responsavel_id)?.nome ??
            byPerfil.get(row.responsavel_id)?.email ??
            "—")
          : null,
      };
    });
  });

/** Customer 360 — tudo o que se sabe sobre a pessoa em uma chamada. */
export const getPerson360 = createServerFn({ method: "GET" })
  .middleware([instrumented("people", "abrir_pessoa")])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid(), personId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: pessoa, error } = await supabase
      .from("people")
      .select("*")
      .eq("id", data.personId)
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();

    if (error) {
      console.error("[getPerson360]", error.message);
      throw new Error("Não foi possível carregar a pessoa.");
    }
    if (!pessoa) throw new Error("Pessoa não encontrada.");

    const [contatos, enderecos, oportunidades, propostas, atividades, relacoes, relacoesInversas] =
      await Promise.all([
        supabase
          .from("person_contacts")
          .select("id, canal, valor, rotulo, principal, verificado")
          .eq("person_id", pessoa.id)
          .order("principal", { ascending: false }),
        supabase.from("person_addresses").select("*").eq("person_id", pessoa.id),
        supabase
          .from("opportunities")
          .select(
            "id, titulo, estagio, temperatura, valor, probabilidade, proxima_acao, proxima_acao_em, responsavel_id, created_at, empreendimentos(id, nome)",
          )
          .eq("person_id", pessoa.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("proposals")
          .select("id, status, valor, validade, created_at")
          .eq("person_id", pessoa.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("activities")
          .select("id, tipo, titulo, descricao, autor_id, ocorreu_em")
          .eq("person_id", pessoa.id)
          .order("ocorreu_em", { ascending: false })
          .limit(100),
        supabase
          .from("person_relationships")
          .select("id, tipo, observacao, to_person_id, people!person_relationships_to_person_id_fkey(id, nome)")
          .eq("from_person_id", pessoa.id),
        supabase
          .from("person_relationships")
          .select("id, tipo, observacao, from_person_id, people!person_relationships_from_person_id_fkey(id, nome)")
          .eq("to_person_id", pessoa.id),
      ]);

    const autores = [
      ...new Set([
        ...(atividades.data ?? []).map((a) => a.autor_id),
        pessoa.responsavel_id,
      ].filter(Boolean)),
    ] as string[];

    const { data: perfis } = autores.length
      ? await supabase.from("profiles").select("id, nome, email, avatar_url").in("id", autores)
      : { data: [] as { id: string; nome: string | null; email: string | null; avatar_url: string | null }[] };
    const byId = new Map((perfis ?? []).map((p) => [p.id, p]));
    const nomeDe = (id: string | null) =>
      id ? (byId.get(id)?.nome ?? byId.get(id)?.email ?? "Sistema") : "Sistema";

    return {
      pessoa: { ...pessoa, responsavelNome: nomeDe(pessoa.responsavel_id) },
      contatos: contatos.data ?? [],
      enderecos: enderecos.data ?? [],
      oportunidades: (oportunidades.data ?? []).map((o) => ({
        ...o,
        empreendimentoNome: o.empreendimentos?.nome ?? null,
      })),
      propostas: propostas.data ?? [],
      atividades: (atividades.data ?? []).map((a) => ({ ...a, autorNome: nomeDe(a.autor_id) })),
      relacionamentos: [
        ...(relacoes.data ?? []).map((r) => ({
          id: r.id,
          tipo: r.tipo,
          observacao: r.observacao,
          direcao: "saida" as const,
          outraPessoaId: r.to_person_id,
          outraPessoaNome: r.people?.nome ?? "—",
        })),
        ...(relacoesInversas.data ?? []).map((r) => ({
          id: r.id,
          tipo: r.tipo,
          observacao: r.observacao,
          direcao: "entrada" as const,
          outraPessoaId: r.from_person_id,
          outraPessoaNome: r.people?.nome ?? "—",
        })),
      ],
    };
  });

/** Identity Resolution — chamado antes de gravar um cadastro novo. */
export const findPersonDuplicates = createServerFn({ method: "POST" })
  .middleware([instrumented("people", "deduplicacao")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        documento: opcional(30),
        email: opcional(160),
        telefone: opcional(30),
        nome: opcional(120),
        excluirId: z.string().uuid().nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("find_person_duplicates", {
      _workspace_id: data.workspaceId,
      _documento: data.documento || undefined,
      _email: data.email || undefined,
      _telefone: data.telefone || undefined,
      _nome: data.nome || undefined,
      _exclude: data.excluirId ?? undefined,
    });

    if (error) {
      console.error("[findPersonDuplicates]", error.message);
      return [];
    }
    return rows ?? [];
  });

const contatoSchema = z.object({
  canal: z.enum(CONTACT_CANAIS),
  valor: z.string().trim().min(3).max(180),
  rotulo: opcional(40),
  principal: z.boolean().default(false),
});

export const createPerson = createServerFn({ method: "POST" })
  .middleware([instrumented("people", "criar_pessoa")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        nome: z.string().trim().min(2).max(120),
        nomeSocial: opcional(120),
        tipo: z.enum(PERSON_TIPOS).default("fisica"),
        documento: opcional(30),
        nascimento: z.string().trim().max(10).optional().or(z.literal("")),
        origem: z.enum(LEAD_ORIGENS).optional(),
        observacao: opcional(2000),
        responsavelId: z.string().uuid().nullish(),
        contatos: z.array(contatoSchema).max(10).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: pessoa, error } = await supabase
      .from("people")
      .insert({
        workspace_id: data.workspaceId,
        nome: data.nome,
        nome_social: data.nomeSocial || null,
        tipo: data.tipo,
        documento: data.documento || null,
        nascimento: data.nascimento || null,
        origem: data.origem ?? null,
        observacao: data.observacao || null,
        responsavel_id: data.responsavelId ?? userId,
        criado_por: userId,
      })
      .select("id, nome")
      .single();

    if (error) {
      console.error("[createPerson]", error.message);
      if (error.code === "23505") throw new Error("Já existe uma pessoa com este documento.");
      throw new Error("Não foi possível cadastrar a pessoa.");
    }

    if (data.contatos.length) {
      const { error: contatoErr } = await supabase.from("person_contacts").insert(
        data.contatos.map((c) => ({
          workspace_id: data.workspaceId,
          person_id: pessoa.id,
          canal: c.canal,
          valor: c.valor,
          rotulo: c.rotulo || null,
          principal: c.principal,
        })),
      );
      if (contatoErr) console.error("[createPerson:contatos]", contatoErr.message);
    }

    await supabase.from("activities").insert({
      workspace_id: data.workspaceId,
      person_id: pessoa.id,
      tipo: "sistema",
      titulo: "Pessoa cadastrada",
      autor_id: userId,
    });

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "person.created",
      entity: "person",
      entityId: pessoa.id,
      metadata: { nome: pessoa.nome },
    });

    return pessoa;
  });

export const updatePerson = createServerFn({ method: "POST" })
  .middleware([instrumented("people", "editar_pessoa")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        personId: z.string().uuid(),
        nome: z.string().trim().min(2).max(120).optional(),
        nomeSocial: opcional(120),
        tipo: z.enum(PERSON_TIPOS).optional(),
        documento: opcional(30),
        nascimento: z.string().trim().max(10).optional().or(z.literal("")),
        origem: z.enum(LEAD_ORIGENS).optional(),
        observacao: opcional(2000),
        responsavelId: z.string().uuid().nullish(),
        /** Só os estágios que não são derivados de oportunidades. */
        estagioJornada: z.enum(["proprietario", "investidor", "indicador"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const patch: Database["public"]["Tables"]["people"]["Update"] = {};
    if (data.nome !== undefined) patch.nome = data.nome;
    if (data.nomeSocial !== undefined) patch.nome_social = data.nomeSocial || null;
    if (data.tipo !== undefined) patch.tipo = data.tipo;
    if (data.documento !== undefined) patch.documento = data.documento || null;
    if (data.nascimento !== undefined) patch.nascimento = data.nascimento || null;
    if (data.origem !== undefined) patch.origem = data.origem;
    if (data.observacao !== undefined) patch.observacao = data.observacao || null;
    if (data.responsavelId !== undefined) patch.responsavel_id = data.responsavelId;
    if (data.estagioJornada !== undefined) patch.estagio_jornada = data.estagioJornada;

    const { error } = await supabase
      .from("people")
      .update(patch)
      .eq("id", data.personId)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[updatePerson]", error.message);
      if (error.code === "23505") throw new Error("Já existe uma pessoa com este documento.");
      throw new Error("Não foi possível salvar a pessoa.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "person.updated",
      entity: "person",
      entityId: data.personId,
      metadata: { campos: Object.keys(patch) },
    });

    return { ok: true };
  });

export const addPersonContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        personId: z.string().uuid(),
        canal: z.enum(CONTACT_CANAIS),
        valor: z.string().trim().min(3).max(180),
        rotulo: opcional(40),
        principal: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("person_contacts").insert({
      workspace_id: data.workspaceId,
      person_id: data.personId,
      canal: data.canal,
      valor: data.valor,
      rotulo: data.rotulo || null,
      principal: data.principal,
    });

    if (error) {
      console.error("[addPersonContact]", error.message);
      if (error.code === "23505") throw new Error("Este contato já está cadastrado.");
      throw new Error("Não foi possível adicionar o contato.");
    }
    return { ok: true };
  });

export const deletePersonContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid(), contatoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("person_contacts")
      .delete()
      .eq("id", data.contatoId)
      .eq("workspace_id", data.workspaceId);
    if (error) throw new Error("Não foi possível remover o contato.");
    return { ok: true };
  });

export const upsertPersonAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        personId: z.string().uuid(),
        enderecoId: z.string().uuid().nullish(),
        tipo: z.enum(ADDRESS_TIPOS).default("residencial"),
        cep: opcional(12),
        logradouro: opcional(160),
        numero: opcional(20),
        complemento: opcional(80),
        bairro: opcional(80),
        cidade: opcional(80),
        uf: opcional(2),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      workspace_id: data.workspaceId,
      person_id: data.personId,
      tipo: data.tipo,
      cep: data.cep || null,
      logradouro: data.logradouro || null,
      numero: data.numero || null,
      complemento: data.complemento || null,
      bairro: data.bairro || null,
      cidade: data.cidade || null,
      uf: data.uf ? data.uf.toUpperCase() : null,
    };

    const { error } = data.enderecoId
      ? await context.supabase
          .from("person_addresses")
          .update(payload)
          .eq("id", data.enderecoId)
          .eq("workspace_id", data.workspaceId)
      : await context.supabase.from("person_addresses").insert(payload);

    if (error) {
      console.error("[upsertPersonAddress]", error.message);
      throw new Error("Não foi possível salvar o endereço.");
    }
    return { ok: true };
  });

export const deletePersonAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid(), enderecoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("person_addresses")
      .delete()
      .eq("id", data.enderecoId)
      .eq("workspace_id", data.workspaceId);
    if (error) throw new Error("Não foi possível remover o endereço.");
    return { ok: true };
  });

export const addRelationship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        fromPersonId: z.string().uuid(),
        toPersonId: z.string().uuid(),
        tipo: z.enum(RELATIONSHIP_TIPOS),
        observacao: opcional(400),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.fromPersonId === data.toPersonId)
      throw new Error("Não dá para relacionar a pessoa com ela mesma.");

    const { error } = await supabase.from("person_relationships").insert({
      workspace_id: data.workspaceId,
      from_person_id: data.fromPersonId,
      to_person_id: data.toPersonId,
      tipo: data.tipo,
      observacao: data.observacao || null,
      criado_por: userId,
    });

    if (error) {
      console.error("[addRelationship]", error.message);
      if (error.code === "23505") throw new Error("Esse relacionamento já existe.");
      throw new Error("Não foi possível criar o relacionamento.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "relationship.created",
      entity: "person",
      entityId: data.fromPersonId,
      metadata: { tipo: data.tipo, para: data.toPersonId },
    });

    return { ok: true };
  });

export const deleteRelationship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid(), relacionamentoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("person_relationships")
      .delete()
      .eq("id", data.relacionamentoId)
      .eq("workspace_id", data.workspaceId);
    if (error) throw new Error("Não foi possível remover o relacionamento.");
    return { ok: true };
  });

/** Registro manual de interação. `activities` é append-only. */
export const registerActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        personId: z.string().uuid(),
        opportunityId: z.string().uuid().nullish(),
        tipo: z.enum(ACTIVITY_TIPOS).default("nota"),
        titulo: z.string().trim().min(2).max(160),
        descricao: opcional(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error } = await supabase.from("activities").insert({
      workspace_id: data.workspaceId,
      person_id: data.personId,
      opportunity_id: data.opportunityId ?? null,
      tipo: data.tipo,
      titulo: data.titulo,
      descricao: data.descricao || null,
      autor_id: userId,
    });

    if (error) {
      console.error("[registerActivity]", error.message);
      throw new Error("Não foi possível registrar a interação.");
    }

    if (data.tipo !== "sistema") {
      await supabase
        .from("people")
        .update({ ultimo_contato_em: new Date().toISOString() })
        .eq("id", data.personId)
        .eq("workspace_id", data.workspaceId);
    }

    return { ok: true };
  });

/**
 * Unificação de registros. A pessoa perdedora nunca é apagada:
 * fica marcada com `merged_into` para preservar histórico e links antigos.
 */
export const mergePeople = createServerFn({ method: "POST" })
  .middleware([instrumented("people", "merge")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        manterId: z.string().uuid(),
        absorverId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.manterId === data.absorverId) throw new Error("Selecione duas pessoas diferentes.");

    const filtro = { workspace_id: data.workspaceId };

    const repoint = [
      supabase
        .from("person_contacts")
        .update({ person_id: data.manterId, principal: false })
        .eq("person_id", data.absorverId)
        .match(filtro),
      supabase
        .from("person_addresses")
        .update({ person_id: data.manterId, principal: false })
        .eq("person_id", data.absorverId)
        .match(filtro),
      supabase
        .from("opportunities")
        .update({ person_id: data.manterId })
        .eq("person_id", data.absorverId)
        .match(filtro),
      supabase
        .from("activities")
        .update({ person_id: data.manterId })
        .eq("person_id", data.absorverId)
        .match(filtro),
      supabase
        .from("proposals")
        .update({ person_id: data.manterId })
        .eq("person_id", data.absorverId)
        .match(filtro),
      supabase
        .from("person_relationships")
        .update({ from_person_id: data.manterId })
        .eq("from_person_id", data.absorverId)
        .match(filtro),
      supabase
        .from("person_relationships")
        .update({ to_person_id: data.manterId })
        .eq("to_person_id", data.absorverId)
        .match(filtro),
      supabase
        .from("files")
        .update({ entity_id: data.manterId })
        .eq("entity", "person")
        .eq("entity_id", data.absorverId)
        .match(filtro),
      supabase
        .from("comments")
        .update({ entity_id: data.manterId })
        .eq("entity", "person")
        .eq("entity_id", data.absorverId)
        .match(filtro),
      supabase
        .from("taggings")
        .update({ entity_id: data.manterId })
        .eq("entity", "person")
        .eq("entity_id", data.absorverId)
        .match(filtro),
    ];

    const resultados = await Promise.all(repoint);
    const falha = resultados.find((r) => r.error);
    if (falha?.error) {
      console.error("[mergePeople]", falha.error.message);
      throw new Error("Não foi possível unificar os registros.");
    }

    const { error } = await supabase
      .from("people")
      .update({ merged_into: data.manterId, documento: null })
      .eq("id", data.absorverId)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[mergePeople:marcar]", error.message);
      throw new Error("Não foi possível concluir a unificação.");
    }

    await supabase.from("activities").insert({
      workspace_id: data.workspaceId,
      person_id: data.manterId,
      tipo: "sistema",
      titulo: "Registro duplicado unificado",
      descricao: `Absorveu o cadastro ${data.absorverId}`,
      autor_id: userId,
    });

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "person.merged",
      entity: "person",
      entityId: data.manterId,
      metadata: { absorveu: data.absorverId },
    });

    return { ok: true };
  });
