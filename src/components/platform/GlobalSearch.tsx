import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { globalSearch } from "@/lib/platform/search.functions";

/** SPRINT 08 — Search Everywhere. Atalho ⌘K / Ctrl+K. */
export function GlobalSearch({ workspaceId }: { workspaceId?: string }) {
  const [open, setOpen] = useState(false);
  const [termo, setTermo] = useState("");
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();
  const buscar = useServerFn(globalSearch);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(termo.trim()), 250);
    return () => clearTimeout(t);
  }, [termo]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", workspaceId, debounced],
    queryFn: () => buscar({ data: { workspaceId: workspaceId!, termo: debounced } }),
    enabled: Boolean(workspaceId) && debounced.length >= 2 && open,
    staleTime: 15_000,
  });

  const grupos = useMemo(() => {
    const map = new Map<string, NonNullable<typeof data>["hits"]>();
    for (const hit of data?.hits ?? []) {
      map.set(hit.tipo, [...(map.get(hit.tipo) ?? []), hit]);
    }
    return Array.from(map.entries());
  }, [data]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:bg-accent flex items-center gap-2 rounded-md p-2 md:w-64 md:justify-between md:border md:border-border md:px-3 md:py-1.5"
        aria-label="Buscar em tudo"
      >
        <span className="flex items-center gap-2">
          <Icon name="search" size={18} />
          <span className="hidden text-sm md:inline">Buscar…</span>
        </span>
        <kbd className="hidden rounded border border-border px-1 text-[10px] md:inline">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={termo}
          onValueChange={setTermo}
          placeholder="Buscar clientes, leads, unidades, usuários…"
        />
        <CommandList>
          {debounced.length < 2 ? (
            <CommandEmpty>Digite ao menos 2 caracteres.</CommandEmpty>
          ) : isFetching && !data ? (
            <CommandEmpty>Buscando…</CommandEmpty>
          ) : grupos.length === 0 ? (
            <CommandEmpty>Nada encontrado.</CommandEmpty>
          ) : null}

          {grupos.map(([tipo, hits]) => (
            <CommandGroup key={tipo} heading={tipo}>
              {hits.map((hit) => (
                <CommandItem
                  key={`${tipo}-${hit.id}`}
                  value={`${tipo}-${hit.id}-${hit.titulo}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate({ to: hit.to });
                  }}
                >
                  <Icon name={hit.icon} size={16} />
                  <span className="flex-1 truncate">{hit.titulo}</span>
                  {hit.subtitulo && (
                    <span className="text-muted-foreground truncate text-xs">{hit.subtitulo}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
