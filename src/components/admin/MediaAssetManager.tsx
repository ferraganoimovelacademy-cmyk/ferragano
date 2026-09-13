import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mediaTipoIcones, mediaTipoLabels, type MediaTipo } from "@/lib/platform/property";
import {
  CHECKLIST_LABELS,
  MEDIA_ORDEM_TIPOS,
  pesoLegivel,
  type MediaChecklist,
  type MidiaItem,
} from "@/lib/platform/media";
import {
  atualizarMidia,
  removerMidia,
  sincronizarVitrine,
} from "@/lib/platform/media.functions";

/** GATE 06/07 — Biblioteca de Mídia Cury: filtros, indicadores e Health Score. */

export type EmpMidia = {
  id: string;
  nome: string;
  slug: string;
  cidade: string | null;
  uf: string | null;
  construtora: string | null;
  capaUrl: string | null;
  publico: boolean;
  atualizadoEm: string | null;
  itens: MidiaItem[];
  checklist: MediaChecklist;
  score: number;
  estrelas: number;
  pendencias: string[];
};

export type FiltroMidia =
  | "todos"
  | "publicados"
  | "pendentes"
  | "sem-capa"
  | "sem-galeria"
  | "seo-pendente"
  | MediaTipo;

const FILTROS: { id: FiltroMidia; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "publicados", label: "Publicados" },
  { id: "pendentes", label: "Não publicados" },
  { id: "sem-capa", label: "Sem capa" },
  { id: "sem-galeria", label: "Sem galeria" },
  { id: "seo-pendente", label: "SEO pendente" },
  { id: "video", label: "Com vídeo" },
  { id: "planta", label: "Com planta" },
  { id: "pdf", label: "Com PDF" },
];

function aplicarFiltro(e: EmpMidia, filtro: FiltroMidia): boolean {
  switch (filtro) {
    case "todos":
      return true;
    case "publicados":
      return e.publico;
    case "pendentes":
      return !e.publico;
    case "sem-capa":
      return !e.checklist.capa;
    case "sem-galeria":
      return !e.checklist.galeria;
    case "seo-pendente":
      return !e.checklist.seo;
    default:
      return e.itens.some((m) => m.tipo === filtro);
  }
}

function Estrelas({ quantidade }: { quantidade: number }) {
  return (
    <span className="text-accent" aria-label={`${quantidade} de 5 estrelas`}>
      {"★".repeat(quantidade)}
      <span className="text-muted-foreground">{"★".repeat(5 - quantidade)}</span>
    </span>
  );
}

function EditarSeo({
  workspaceId,
  item,
  onClose,
}: {
  workspaceId: string;
  item: MidiaItem;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const atualizar = useServerFn(atualizarMidia);
  const [alt, setAlt] = useState(item.alt ?? "");
  const [tituloSeo, setTituloSeo] = useState(item.tituloSeo ?? "");
  const [legenda, setLegenda] = useState(item.legenda ?? "");

  const salvar = useMutation({
    mutationFn: () => atualizar({ data: { workspaceId, id: item.id, alt, tituloSeo, legenda } }),
    onSuccess: () => {
      toast.success("SEO do ativo atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["biblioteca-midia"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>SEO do ativo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="seo-alt">Texto alternativo</Label>
            <Input id="seo-alt" value={alt} onChange={(ev) => setAlt(ev.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="seo-title">Title</Label>
            <Input id="seo-title" value={tituloSeo} onChange={(ev) => setTituloSeo(ev.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="seo-legenda">Legenda</Label>
            <Input id="seo-legenda" value={legenda} onChange={(ev) => setLegenda(ev.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            {item.largura && item.altura ? `${item.largura}×${item.altura}px · ` : ""}
            {pesoLegivel(item.bytes)} · {item.mime ?? "formato não informado"}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CardEmpreendimento({ workspaceId, emp }: { workspaceId: string; emp: EmpMidia }) {
  const queryClient = useQueryClient();
  const sincronizar = useServerFn(sincronizarVitrine);
  const remover = useServerFn(removerMidia);
  const [editando, setEditando] = useState<MidiaItem | null>(null);

  const porTipo = useMemo(
    () =>
      MEDIA_ORDEM_TIPOS.map((tipo) => ({
        tipo,
        itens: emp.itens.filter((m) => m.tipo === tipo),
      })).filter((g) => g.itens.length > 0),
    [emp.itens],
  );

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["biblioteca-midia"] });

  const definirCapa = useMutation({
    mutationFn: (url: string) =>
      sincronizar({ data: { workspaceId, empreendimentoId: emp.id, capaUrl: url } }),
    onSuccess: () => {
      toast.success("Capa atualizada — hero, cards, Open Graph e sitemap seguem a nova capa.");
      void invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apagar = useMutation({
    mutationFn: async (id: string) => {
      await remover({ data: { workspaceId, id } });
      await sincronizar({ data: { workspaceId, empreendimentoId: emp.id } });
    },
    onSuccess: () => {
      toast.success("Ativo removido.");
      void invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{emp.nome}</h3>
          <p className="text-xs text-muted-foreground">
            {[emp.construtora, emp.cidade, emp.uf].filter(Boolean).join(" · ") || "Sem localização"}
          </p>
        </div>
        <div className="text-right">
          <Estrelas quantidade={emp.estrelas} />
          <p className="text-sm font-semibold">{emp.score}%</p>
        </div>
      </header>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {(Object.keys(CHECKLIST_LABELS) as (keyof MediaChecklist)[]).map((k) => (
          <li key={k}>
            <Badge variant={emp.checklist[k] ? "default" : "outline"} className="gap-1">
              <Icon name={emp.checklist[k] ? "check" : "remove"} size={12} />
              {CHECKLIST_LABELS[k]}
            </Badge>
          </li>
        ))}
      </ul>

      {emp.pendencias.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Pendências: {emp.pendencias.join(" · ")}</p>
      )}

      {porTipo.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nenhum ativo oficial importado. Use o importador para subir capa, galeria, plantas, vídeo e PDF.
        </p>
      ) : (
        <div className="mt-4 grid gap-4">
          {porTipo.map((grupo) => (
            <section key={grupo.tipo}>
              <h4 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase">
                <Icon name={mediaTipoIcones[grupo.tipo]} size={14} />
                {mediaTipoLabels[grupo.tipo]} ({grupo.itens.length})
              </h4>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {grupo.itens.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm"
                  >
                    {item.tipo === "imagem" || item.tipo === "planta" ? (
                      <img
                        src={item.url}
                        alt={item.alt ?? ""}
                        loading="lazy"
                        decoding="async"
                        className="size-12 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <span className="grid size-12 shrink-0 place-items-center rounded-md bg-muted">
                        <Icon name={mediaTipoIcones[item.tipo]} size={18} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{item.titulo ?? item.alt ?? item.url}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.alt?.trim() ? "SEO ok" : "sem alt"} ·{" "}
                        {item.largura && item.altura ? `${item.largura}×${item.altura} · ` : ""}
                        {pesoLegivel(item.bytes)}
                      </p>
                    </div>
                    {item.tipo === "imagem" && (
                      <button
                        type="button"
                        aria-label="Definir como capa"
                        title="Definir como capa"
                        className="grid size-8 place-items-center rounded-md hover:bg-muted"
                        onClick={() => definirCapa.mutate(item.url)}
                      >
                        <Icon
                          name={emp.capaUrl === item.url ? "star" : "star_border"}
                          size={18}
                          className={emp.capaUrl === item.url ? "text-accent" : ""}
                        />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Editar SEO do ativo"
                      className="grid size-8 place-items-center rounded-md hover:bg-muted"
                      onClick={() => setEditando(item)}
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Remover ativo"
                      className="grid size-8 place-items-center rounded-md hover:bg-muted"
                      onClick={() => apagar.mutate(item.id)}
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {editando && (
        <EditarSeo workspaceId={workspaceId} item={editando} onClose={() => setEditando(null)} />
      )}
    </article>
  );
}

export function MediaAssetManager({
  workspaceId,
  empreendimentos,
}: {
  workspaceId: string;
  empreendimentos: EmpMidia[];
}) {
  const [filtro, setFiltro] = useState<FiltroMidia>("todos");
  const [busca, setBusca] = useState("");

  const lista = useMemo(
    () =>
      empreendimentos
        .filter((e) => aplicarFiltro(e, filtro))
        .filter((e) => e.nome.toLowerCase().includes(busca.trim().toLowerCase()))
        .sort((a, b) => a.score - b.score),
    [empreendimentos, filtro, busca],
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={busca}
          onChange={(ev) => setBusca(ev.target.value)}
          placeholder="Buscar empreendimento"
          className="max-w-xs"
          aria-label="Buscar empreendimento"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={filtro === f.id ? "default" : "outline"}
              onClick={() => setFiltro(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum empreendimento neste filtro.
        </p>
      ) : (
        <div className="grid gap-4">
          {lista.map((e) => (
            <CardEmpreendimento key={e.id} workspaceId={workspaceId} emp={e} />
          ))}
        </div>
      )}
    </div>
  );
}
