import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * GATE 03.5 — motor de arquivos.
 * O bucket `workspace-files` é privado. O upload é feito pelo cliente direto
 * no storage (policy exige ser membro do workspace da primeira pasta) e o
 * registro no catálogo passa por aqui. Leitura sempre por URL assinada.
 * Convenção de caminho: <workspace_id>/<entity>/<entity_id>/<uuid>-<arquivo>
 */

export const FILES_BUCKET = "workspace-files";
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

const entityRef = {
  workspaceId: z.string().uuid(),
  entity: z.string().trim().min(1).max(60).regex(/^[a-z_]+$/, "entidade inválida"),
  entityId: z.string().uuid().nullish(),
};

/** Nome seguro para compor o caminho no storage. */
export function sanitizeFileName(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "arquivo";
}

export function buildFilePath(input: {
  workspaceId: string;
  entity: string;
  entityId?: string | null;
  nome: string;
}): string {
  const id = crypto.randomUUID();
  return [
    input.workspaceId,
    input.entity,
    input.entityId ?? "geral",
    `${id}-${sanitizeFileName(input.nome)}`,
  ].join("/");
}

export const listFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object(entityRef).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let query = supabase
      .from("files")
      .select("id, nome, path, mime_type, tamanho_bytes, enviado_por, created_at")
      .eq("workspace_id", data.workspaceId)
      .eq("entity", data.entity)
      .order("created_at", { ascending: false });

    query = data.entityId ? query.eq("entity_id", data.entityId) : query.is("entity_id", null);

    const { data: rows, error } = await query;
    if (error) {
      console.error("[listFiles]", error.message);
      throw new Error("Não foi possível carregar os arquivos.");
    }

    return (rows ?? []).map((row) => ({
      id: row.id,
      nome: row.nome,
      path: row.path,
      mimeType: row.mime_type,
      tamanhoBytes: row.tamanho_bytes,
      createdAt: row.created_at,
      proprio: row.enviado_por === userId,
    }));
  });

/** Registra no catálogo um arquivo já enviado ao storage. */
export const registerFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ...entityRef,
        path: z.string().trim().min(3).max(500),
        nome: z.string().trim().min(1).max(200),
        mimeType: z.string().trim().max(150).nullish(),
        tamanhoBytes: z.number().int().min(0).max(MAX_FILE_BYTES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // O caminho precisa pertencer ao workspace declarado — a policy do storage
    // usa a mesma regra, mas o catálogo não pode divergir dela.
    if (!data.path.startsWith(`${data.workspaceId}/`)) {
      throw new Error("Caminho de arquivo inválido.");
    }

    const { data: created, error } = await context.supabase
      .from("files")
      .insert({
        workspace_id: data.workspaceId,
        entity: data.entity,
        entity_id: data.entityId ?? null,
        bucket: FILES_BUCKET,
        path: data.path,
        nome: data.nome,
        mime_type: data.mimeType ?? null,
        tamanho_bytes: data.tamanhoBytes,
        enviado_por: context.userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[registerFile]", error.message);
      throw new Error("Não foi possível registrar o arquivo.");
    }
    return { id: created.id };
  });

/** URL assinada de curta duração. Nunca há link público. */
export const getFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ fileId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: file, error } = await context.supabase
      .from("files")
      .select("path, bucket")
      .eq("id", data.fileId)
      .maybeSingle();

    if (error || !file) throw new Error("Arquivo não encontrado.");

    const { data: signed, error: signError } = await context.supabase.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 300);

    if (signError || !signed) {
      console.error("[getFileUrl]", signError?.message);
      throw new Error("Não foi possível gerar o link do arquivo.");
    }
    return { url: signed.signedUrl };
  });

export const deleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ fileId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: file } = await supabase
      .from("files")
      .select("path, bucket")
      .eq("id", data.fileId)
      .maybeSingle();

    if (!file) return { ok: true as const };

    const { error } = await supabase.from("files").delete().eq("id", data.fileId);
    if (error) {
      console.error("[deleteFile]", error.message);
      throw new Error("Não foi possível remover o arquivo.");
    }

    // Órfão no storage não expõe nada (bucket privado), mas ocupa espaço.
    const { error: storageError } = await supabase.storage.from(file.bucket).remove([file.path]);
    if (storageError) console.error("[deleteFile:storage]", storageError.message);

    return { ok: true as const };
  });
