import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  addComment,
  editComment,
  listComments,
  removeComment,
} from "@/lib/platform/comments.functions";

type Props = {
  workspaceId: string;
  entity: string;
  entityId: string;
  titulo?: string;
};

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * GATE 03.5 — thread de comentários reutilizável.
 * Plugue em qualquer entidade: <EntityComments entity="lead" entityId={lead.id} />
 */
export function EntityComments({ workspaceId, entity, entityId, titulo = "Comentários" }: Props) {
  const queryClient = useQueryClient();
  const [rascunho, setRascunho] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edicao, setEdicao] = useState("");

  const fetchComments = useServerFn(listComments);
  const create = useServerFn(addComment);
  const update = useServerFn(editComment);
  const destroy = useServerFn(removeComment);

  const key = ["comments", workspaceId, entity, entityId] as const;

  const { data: comentarios, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchComments({ data: { workspaceId, entity, entityId } }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const onError = (error: Error) => toast.error(error.message);

  const publicar = useMutation({
    mutationFn: async (corpo: string) => create({ data: { workspaceId, entity, entityId, corpo } }),
    onSuccess: () => {
      setRascunho("");
      invalidate();
    },
    onError,
  });

  const salvarEdicao = useMutation({
    mutationFn: async (input: { commentId: string; corpo: string }) => update({ data: input }),
    onSuccess: () => {
      setEditandoId(null);
      invalidate();
    },
    onError,
  });

  const excluir = useMutation({
    mutationFn: async (commentId: string) => destroy({ data: { commentId } }),
    onSuccess: invalidate,
    onError,
  });

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>

      <div className="space-y-2">
        <Textarea
          value={rascunho}
          onChange={(event) => setRascunho(event.target.value)}
          placeholder="Escreva um comentário…"
          rows={3}
          maxLength={5000}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!rascunho.trim() || publicar.isPending}
            onClick={() => publicar.mutate(rascunho.trim())}
          >
            {publicar.isPending ? "Publicando…" : "Comentar"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : !comentarios?.length ? (
        <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
      ) : (
        <ul className="space-y-4">
          {comentarios.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                {c.autorAvatar && <AvatarImage src={c.autorAvatar} alt={c.autorNome} />}
                <AvatarFallback className="text-xs">{iniciais(c.autorNome)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium text-foreground">{c.autorNome}</span>
                  <span className="text-xs text-muted-foreground">{quando(c.createdAt)}</span>
                  {c.editado && !c.removido && (
                    <span className="text-xs text-muted-foreground">(editado)</span>
                  )}
                </div>

                {c.removido ? (
                  <p className="mt-1 text-sm italic text-muted-foreground">Comentário removido.</p>
                ) : editandoId === c.id ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={edicao}
                      onChange={(event) => setEdicao(event.target.value)}
                      rows={3}
                      maxLength={5000}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={!edicao.trim() || salvarEdicao.isPending}
                        onClick={() =>
                          salvarEdicao.mutate({ commentId: c.id, corpo: edicao.trim() })
                        }
                      >
                        Salvar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditandoId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{c.corpo}</p>
                    {c.proprio && (
                      <div className="mt-1 flex gap-3">
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditandoId(c.id);
                            setEdicao(c.corpo);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => excluir.mutate(c.id)}
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
