import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  attachTag,
  detachTag,
  listEntityTags,
  listTags,
  upsertTag,
} from "@/lib/platform/tags.functions";

type Props = {
  workspaceId: string;
  entity: string;
  entityId: string;
  /** Restringe o catálogo sugerido a um escopo (ex.: "lead"). */
  escopo?: string;
  readOnly?: boolean;
};

const COR_VARIANT: Record<
  string,
  "default" | "soft" | "gold" | "success" | "warning" | "destructive" | "outline"
> = {
  graphite: "outline",
  petrol: "default",
  gold: "gold",
  success: "success",
  warning: "warning",
  danger: "destructive",
  info: "soft",
};

/**
 * GATE 03.5 — widget de tags reutilizável.
 * Plugue em qualquer entidade: <EntityTags entity="lead" entityId={lead.id} />
 */
export function EntityTags({ workspaceId, entity, entityId, escopo, readOnly }: Props) {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);

  const fetchEntityTags = useServerFn(listEntityTags);
  const fetchCatalog = useServerFn(listTags);
  const attach = useServerFn(attachTag);
  const detach = useServerFn(detachTag);
  const create = useServerFn(upsertTag);

  const key = ["entity-tags", workspaceId, entity, entityId] as const;

  const { data: tags, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchEntityTags({ data: { workspaceId, entity, entityId } }),
  });

  const { data: catalogo } = useQuery({
    queryKey: ["tag-catalog", workspaceId, escopo ?? null],
    queryFn: () => fetchCatalog({ data: { workspaceId, escopo } }),
    enabled: aberto,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ["tag-catalog", workspaceId] });
  };

  const vincular = useMutation({
    mutationFn: async (tagId: string) => attach({ data: { workspaceId, entity, entityId, tagId } }),
    onSuccess: () => {
      setBusca("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const criarEVincular = useMutation({
    mutationFn: async (nome: string) => {
      const tag = await create({ data: { workspaceId, nome, escopo: escopo ?? null } });
      await attach({ data: { workspaceId, entity, entityId, tagId: tag.id } });
    },
    onSuccess: () => {
      setBusca("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remover = useMutation({
    mutationFn: async (taggingId: string) => detach({ data: { taggingId } }),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) return <Skeleton className="h-6 w-40" />;

  const jaVinculadas = new Set((tags ?? []).map((t) => t.id));
  const sugestoes = (catalogo ?? [])
    .filter((t) => !jaVinculadas.has(t.id))
    .filter((t) => t.nome.toLowerCase().includes(busca.trim().toLowerCase()));

  const podeCriar =
    busca.trim().length > 0 &&
    !(catalogo ?? []).some((t) => t.nome.toLowerCase() === busca.trim().toLowerCase());

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(tags ?? []).map((tag) => (
        <Badge key={tag.taggingId} variant={COR_VARIANT[tag.cor] ?? "outline"} className="gap-1">
          {tag.nome}
          {!readOnly && (
            <button
              type="button"
              aria-label={`Remover tag ${tag.nome}`}
              onClick={() => remover.mutate(tag.taggingId)}
              className="opacity-60 transition-opacity hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}

      {(tags ?? []).length === 0 && readOnly && (
        <span className="text-xs text-muted-foreground">Sem tags</span>
      )}

      {!readOnly && (
        <Popover open={aberto} onOpenChange={setAberto}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs">
              <Plus className="h-3 w-3" />
              Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            <Input
              autoFocus
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar ou criar tag"
              className="h-8 text-sm"
              maxLength={60}
            />
            <div className="mt-2 max-h-52 space-y-0.5 overflow-y-auto">
              {sugestoes.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => vincular.mutate(tag.id)}
                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  {tag.nome}
                </button>
              ))}
              {podeCriar && (
                <button
                  type="button"
                  onClick={() => criarEVincular.mutate(busca.trim())}
                  className="flex w-full items-center gap-1 rounded-sm px-2 py-1.5 text-left text-sm text-primary hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                  Criar “{busca.trim()}”
                </button>
              )}
              {!sugestoes.length && !podeCriar && (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                  Nenhuma tag disponível.
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
