import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MEDIA_TIPOS } from "@/lib/platform/property";
import {
  MEDIA_BUCKET,
  MEDIA_MAX_BYTES,
  altAutomatico,
  avaliarMidia,
  tituloAutomatico,
  type MidiaItem,
} from "@/lib/platform/media";
import { recordAudit } from "@/lib/platform/audit.server";

/**
 * Sprint UI 04.2 — Cury Media Experience.
 * Biblioteca de mídia oficial: importação em lote, SEO automático, Health Score
 * e sincronização da capa/galeria com o site público.
 */

const ref = { workspaceId: z.string().uuid() };

type Row = Record<string, unknown>;

function mapear(row: Row): MidiaItem {
  return {
    id: String(row.id),
    tipo: row.tipo as MidiaItem["tipo"],
    titulo: (row.titulo as string) ?? null,
    url: String(row.url ?? ""),
    path: (row.path as string) ?? null,
    ordem: Number(row.ordem ?? 0),
    publico: Boolean(row.publico),
    alt: (row.alt as string) ?? null,
    tituloSeo: (row.titulo_seo as string) ?? null,
    legenda: (row.legenda as string) ?? null,
    largura: row.largura == null ? null : Number(row.largura),
    altura: row.altura == null ? null : Number(row.altura),
    bytes: row.bytes == null ? null : Number(row.bytes),
    mime: (row.mime as string) ?? null,
    createdAt: (row.created_at as string) ?? null,
  };
}

const SELECT_MIDIA =
  "id, empreendimento_id, tipo, titulo, url, path, ordem, publico, alt, titulo_seo, legenda, largura, altura, bytes, mime, created_at";

/** GATE 06/07 — biblioteca completa com indicadores e Health Score por empreendimento. */
export const listBibliotecaMidia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object(ref).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const [{ data: emps, error }, { data: midias }] = await Promise.all([
      supabase
        .from("empreendimentos")
        .select("id, nome, slug, cidade, uf, construtora, capa_url, publico, galeria, updated_at")
        .eq("workspace_id", data.workspaceId)
        .order("nome"),
      supabase
        .from("property_media")
        .select(SELECT_MIDIA)
        .eq("workspace_id", data.workspaceId)
        .order("tipo")
        .order("ordem"),
    ]);

    if (error) {
      console.error("[listBibliotecaMidia]", error.message);
      throw new Error("Não foi possível carregar a biblioteca de mídia.");
    }

    const porEmp = new Map<string, MidiaItem[]>();
    for (const m of midias ?? []) {
      const chave = String((m as Row).empreendimento_id ?? "");
      if (!chave) continue;
      const lista = porEmp.get(chave) ?? [];
      lista.push(mapear(m as Row));
      porEmp.set(chave, lista);
    }

    const empreendimentos = (emps ?? []).map((e) => {
      const itens = porEmp.get(e.id) ?? [];
      const avaliacao = avaliarMidia({ capaUrl: e.capa_url ?? null, itens });
      return {
        id: e.id,
        nome: e.nome,
        slug: e.slug,
        cidade: e.cidade,
        uf: e.uf,
        construtora: e.construtora,
        capaUrl: e.capa_url ?? null,
        publico: e.publico,
        atualizadoEm: e.updated_at ?? null,
        itens,
        ...avaliacao,
      };
    });

    const todos = empreendimentos.flatMap((e) => e.itens);
    return {
      empreendimentos,
      totais: {
        arquivos: todos.length,
        bytes: todos.reduce((acc, m) => acc + (m.bytes ?? 0), 0),
        semCapa: empreendimentos.filter((e) => !e.checklist.capa).length,
        semGaleria: empreendimentos.filter((e) => !e.checklist.galeria).length,
        seoPendente: empreendimentos.filter((e) => !e.checklist.seo).length,
        scoreMedio: empreendimentos.length
          ? Math.round(empreendimentos.reduce((a, e) => a + e.score, 0) / empreendimentos.length)
          : 0,
      },
    };
  });

/** GATE 01 — importação em lote. O SEO é preenchido automaticamente quando ausente. */
export const importarMidiaLote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ...ref,
        empreendimentoId: z.string().uuid(),
        itens: z
          .array(
            z.object({
              tipo: z.enum(MEDIA_TIPOS),
              url: z.string().trim().url().max(2000),
              path: z.string().trim().max(500).nullish(),
              titulo: z.string().trim().max(160).nullish(),
              alt: z.string().trim().max(200).nullish(),
              legenda: z.string().trim().max(400).nullish(),
              largura: z.number().int().min(0).max(20000).nullish(),
              altura: z.number().int().min(0).max(20000).nullish(),
              bytes: z.number().int().min(0).max(MEDIA_MAX_BYTES).nullish(),
              mime: z.string().trim().max(120).nullish(),
              publico: z.boolean().default(true),
            }),
          )
          .min(1)
          .max(60),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: emp, error: erroEmp } = await supabase
      .from("empreendimentos")
      .select("id, nome, cidade")
      .eq("id", data.empreendimentoId)
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();

    if (erroEmp || !emp) throw new Error("Empreendimento não encontrado neste workspace.");

    const { data: existentes } = await supabase
      .from("property_media")
      .select("tipo, ordem")
      .eq("workspace_id", data.workspaceId)
      .eq("empreendimento_id", data.empreendimentoId);

    const proximaOrdem = new Map<string, number>();
    for (const e of existentes ?? []) {
      const t = String((e as Row).tipo);
      proximaOrdem.set(t, Math.max(proximaOrdem.get(t) ?? 0, Number((e as Row).ordem ?? 0) + 1));
    }

    const linhas = data.itens.map((item, i) => {
      const ordem = proximaOrdem.get(item.tipo) ?? 0;
      proximaOrdem.set(item.tipo, ordem + 1);
      return {
        workspace_id: data.workspaceId,
        empreendimento_id: data.empreendimentoId,
        tipo: item.tipo,
        titulo: item.titulo || tituloAutomatico({ empreendimento: emp.nome, tipo: item.tipo }),
        url: item.url,
        bucket: item.path ? MEDIA_BUCKET : null,
        path: item.path || null,
        ordem,
        publico: item.publico,
        alt:
          item.alt ||
          altAutomatico({
            empreendimento: emp.nome,
            cidade: emp.cidade,
            tipo: item.tipo,
            indice: ordem + i,
            titulo: item.titulo,
          }),
        titulo_seo: tituloAutomatico({ empreendimento: emp.nome, tipo: item.tipo }),
        legenda: item.legenda || null,
        largura: item.largura ?? null,
        altura: item.altura ?? null,
        bytes: item.bytes ?? null,
        mime: item.mime || null,
        verificado_em: new Date().toISOString(),
        criado_por: userId,
      };
    });

    const { data: criados, error } = await supabase
      .from("property_media")
      .insert(linhas)
      .select("id, tipo, url");

    if (error) {
      console.error("[importarMidiaLote]", error.message);
      throw new Error("Não foi possível importar a mídia.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "media.imported",
      entity: "empreendimento",
      entityId: data.empreendimentoId,
      metadata: { quantidade: criados?.length ?? 0 },
    });

    return { criados: criados?.length ?? 0 };
  });

/** GATE 04 — edição de SEO/ordem/publicação de um ativo. */
export const atualizarMidia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ...ref,
        id: z.string().uuid(),
        alt: z.string().trim().max(200).optional(),
        tituloSeo: z.string().trim().max(160).optional(),
        legenda: z.string().trim().max(400).optional(),
        titulo: z.string().trim().max(160).optional(),
        ordem: z.number().int().min(0).max(999).optional(),
        publico: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: {
      verificado_em: string;
      alt?: string | null;
      titulo_seo?: string | null;
      legenda?: string | null;
      titulo?: string;
      ordem?: number;
      publico?: boolean;
    } = { verificado_em: new Date().toISOString() };
    if (data.alt !== undefined) patch.alt = data.alt || null;
    if (data.tituloSeo !== undefined) patch.titulo_seo = data.tituloSeo || null;
    if (data.legenda !== undefined) patch.legenda = data.legenda || null;
    if (data.titulo) patch.titulo = data.titulo;
    if (data.ordem !== undefined) patch.ordem = data.ordem;
    if (data.publico !== undefined) patch.publico = data.publico;

    const { error } = await context.supabase
      .from("property_media")
      .update(patch)
      .eq("id", data.id)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[atualizarMidia]", error.message);
      throw new Error("Não foi possível atualizar o ativo.");
    }
    return { ok: true as const };
  });

export const removerMidia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ ...ref, id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row } = await supabase
      .from("property_media")
      .select("id, path, bucket, empreendimento_id")
      .eq("id", data.id)
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();

    const { error } = await supabase
      .from("property_media")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[removerMidia]", error.message);
      throw new Error("Você não tem permissão para remover este ativo.");
    }

    if (row?.path && row.bucket) {
      await supabase.storage.from(row.bucket).remove([row.path]);
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "media.removed",
      entity: "empreendimento",
      entityId: row?.empreendimento_id ?? null,
      metadata: { mediaId: data.id },
    });

    return { ok: true as const };
  });

/**
 * GATE 05 — trocar a capa propaga para hero, cards, comparador, Open Graph,
 * JSON-LD e sitemap: todos leem `empreendimentos.capa_url` e `galeria`.
 */
export const sincronizarVitrine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ...ref,
        empreendimentoId: z.string().uuid(),
        capaUrl: z.string().trim().url().max(2000).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: imagens } = await supabase
      .from("property_media")
      .select("url, tipo, ordem, publico")
      .eq("workspace_id", data.workspaceId)
      .eq("empreendimento_id", data.empreendimentoId)
      .eq("tipo", "imagem")
      .eq("publico", true)
      .order("ordem");

    const galeria = (imagens ?? []).map((m) => String((m as Row).url));
    const capa = data.capaUrl ?? galeria[0] ?? null;

    const { error } = await supabase
      .from("empreendimentos")
      .update({ capa_url: capa, galeria })
      .eq("id", data.empreendimentoId)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[sincronizarVitrine]", error.message);
      throw new Error("Não foi possível sincronizar a vitrine.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "media.showcase_synced",
      entity: "empreendimento",
      entityId: data.empreendimentoId,
      metadata: { capa, imagens: galeria.length },
    });

    return { capa, imagens: galeria.length };
  });
