import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileText, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  FILES_BUCKET,
  MAX_FILE_BYTES,
  buildFilePath,
  deleteFile,
  getFileUrl,
  listFiles,
  registerFile,
} from "@/lib/platform/files.functions";

type Props = {
  workspaceId: string;
  entity: string;
  entityId?: string | null;
  titulo?: string;
  readOnly?: boolean;
};

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * GATE 03.5 — anexos reutilizáveis.
 * Upload direto ao bucket privado (RLS pela pasta do workspace) e registro no
 * catálogo. Download sempre via URL assinada de curta duração.
 */
export function EntityFiles({
  workspaceId,
  entity,
  entityId = null,
  titulo = "Arquivos",
  readOnly,
}: Props) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  const fetchFiles = useServerFn(listFiles);
  const register = useServerFn(registerFile);
  const sign = useServerFn(getFileUrl);
  const destroy = useServerFn(deleteFile);

  const key = ["files", workspaceId, entity, entityId] as const;

  const { data: arquivos, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchFiles({ data: { workspaceId, entity, entityId } }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const enviar = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Arquivo acima de 25 MB.");
      return;
    }

    setEnviando(true);
    try {
      const path = buildFilePath({ workspaceId, entity, entityId, nome: file.name });
      const { error } = await supabase.storage.from(FILES_BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (error) throw new Error(error.message);

      await register({
        data: {
          workspaceId,
          entity,
          entityId,
          path,
          nome: file.name.slice(0, 200),
          mimeType: file.type || null,
          tamanhoBytes: file.size,
        },
      });
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no envio.");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const baixar = useMutation({
    mutationFn: async (fileId: string) => sign({ data: { fileId } }),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: (error: Error) => toast.error(error.message),
  });

  const remover = useMutation({
    mutationFn: async (fileId: string) => destroy({ data: { fileId } }),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
        {!readOnly && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void enviar(file);
              }}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={enviando}
              onClick={() => inputRef.current?.click()}
            >
              <Paperclip className="mr-1.5 h-3.5 w-3.5" />
              {enviando ? "Enviando…" : "Anexar"}
            </Button>
          </>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : !arquivos?.length ? (
        <p className="text-sm text-muted-foreground">Nenhum arquivo anexado.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {arquivos.map((arquivo) => (
            <li key={arquivo.id} className="flex items-center gap-3 px-3 py-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{arquivo.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {formatarTamanho(arquivo.tamanhoBytes)}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label={`Baixar ${arquivo.nome}`}
                onClick={() => baixar.mutate(arquivo.id)}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              {!readOnly && arquivo.proprio && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  aria-label={`Remover ${arquivo.nome}`}
                  onClick={() => remover.mutate(arquivo.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
