import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { MEDIA_TIPOS, mediaTipoIcones, mediaTipoLabels, type MediaTipo } from "@/lib/platform/property";
import {
  MEDIA_BUCKET,
  MEDIA_MAX_BYTES,
  caminhoMidia,
  pesoLegivel,
} from "@/lib/platform/media";
import { importarMidiaLote, sincronizarVitrine } from "@/lib/platform/media.functions";

/**
 * GATE 01 — Wizard de importação oficial Cury.
 * Aceita arquivos (enviados para o bucket `cury-media`, organizados por
 * empreendimento e tipo — GATE 02) e URLs oficiais em lote. O SEO das imagens
 * é preenchido automaticamente no servidor quando não informado (GATE 04).
 */

type Alvo = { id: string; nome: string; slug: string };

type Pendente = {
  chave: string;
  tipo: MediaTipo;
  nome: string;
  url?: string;
  path?: string;
  file?: File;
  bytes?: number;
  largura?: number;
  altura?: number;
  mime?: string;
};

const PUBLIC_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}`;

async function medirImagem(file: File): Promise<{ largura?: number; altura?: number }> {
  if (!file.type.startsWith("image/")) return {};
  try {
    const bitmap = await createImageBitmap(file);
    const medida = { largura: bitmap.width, altura: bitmap.height };
    bitmap.close();
    return medida;
  } catch {
    return {};
  }
}

export function MediaImportWizard({
  workspaceId,
  empreendimentos,
}: {
  workspaceId: string;
  empreendimentos: Alvo[];
}) {
  const [open, setOpen] = useState(false);
  const [alvo, setAlvo] = useState("");
  const [tipo, setTipo] = useState<MediaTipo>("imagem");
  const [urls, setUrls] = useState("");
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [progresso, setProgresso] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const importar = useServerFn(importarMidiaLote);
  const sincronizar = useServerFn(sincronizarVitrine);

  const empreendimento = useMemo(
    () => empreendimentos.find((e) => e.id === alvo) ?? null,
    [alvo, empreendimentos],
  );

  function adicionarArquivos(lista: FileList | null) {
    if (!lista?.length || !empreendimento) return;
    const aceitos = [...lista].filter((f) => {
      if (f.size > MEDIA_MAX_BYTES) {
        toast.error(`${f.name} passa de ${pesoLegivel(MEDIA_MAX_BYTES)}.`);
        return false;
      }
      return true;
    });
    setPendentes((atual) => [
      ...atual,
      ...aceitos.map((file) => ({
        chave: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
        tipo,
        nome: file.name,
        file,
        bytes: file.size,
        mime: file.type || undefined,
      })),
    ]);
  }

  function adicionarUrls() {
    if (!urls.trim()) return;
    const linhas = urls
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^https?:\/\//i.test(l));
    if (!linhas.length) {
      toast.error("Informe uma URL oficial por linha (http/https).");
      return;
    }
    setPendentes((atual) => [
      ...atual,
      ...linhas.map((url) => ({
        chave: `${url}-${Math.random().toString(36).slice(2, 7)}`,
        tipo,
        nome: decodeURIComponent(url.split("/").pop() ?? "ativo"),
        url,
      })),
    ]);
    setUrls("");
  }

  const enviar = useMutation({
    mutationFn: async () => {
      if (!empreendimento) throw new Error("Selecione o empreendimento.");
      if (!pendentes.length) throw new Error("Nenhum ativo na fila.");

      const itens: {
        tipo: MediaTipo;
        url: string;
        path?: string | null;
        titulo?: string | null;
        largura?: number | null;
        altura?: number | null;
        bytes?: number | null;
        mime?: string | null;
        publico: boolean;
      }[] = [];

      let i = 0;
      for (const item of pendentes) {
        i += 1;
        setProgresso(`Enviando ${i} de ${pendentes.length}…`);

        if (item.file) {
          const medida = await medirImagem(item.file);
          const path = caminhoMidia({
            workspaceId,
            slug: empreendimento.slug,
            tipo: item.tipo,
            nome: item.nome,
          });
          const { error } = await supabase.storage
            .from(MEDIA_BUCKET)
            .upload(path, item.file, { cacheControl: "31536000", upsert: false });
          if (error) throw new Error(`Falha ao enviar ${item.nome}: ${error.message}`);

          itens.push({
            tipo: item.tipo,
            url: `${PUBLIC_BASE}/${path}`,
            path,
            titulo: null,
            largura: medida.largura ?? null,
            altura: medida.altura ?? null,
            bytes: item.bytes ?? null,
            mime: item.mime ?? null,
            publico: true,
          });
          continue;
        }

        itens.push({
          tipo: item.tipo,
          url: item.url!,
          path: null,
          titulo: null,
          publico: true,
        });
      }

      setProgresso("Registrando na biblioteca…");
      const resultado = await importar({
        data: { workspaceId, empreendimentoId: empreendimento.id, itens },
      });
      await sincronizar({ data: { workspaceId, empreendimentoId: empreendimento.id } });
      return resultado;
    },
    onSuccess: (r) => {
      toast.success(`${r.criados} ativo(s) importado(s). Vitrine sincronizada.`);
      setPendentes([]);
      setProgresso(null);
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["biblioteca-midia"] });
    },
    onError: (e: Error) => {
      setProgresso(null);
      toast.error(e.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Icon name="cloud_upload" size={18} className="mr-1" />
          Importar mídia oficial
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importador oficial Cury</DialogTitle>
          <DialogDescription>
            Envie arquivos ou cole URLs oficiais. Os ativos são organizados em
            <code className="mx-1 rounded bg-muted px-1">cury/&lt;empreendimento&gt;/&lt;tipo&gt;</code>
            e o texto alternativo é gerado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Empreendimento</Label>
              <Select value={alvo} onValueChange={setAlvo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {empreendimentos.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Tipo do lote</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as MediaTipo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEDIA_TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {mediaTipoLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="midia-arquivos">Arquivos</Label>
            <Input
              id="midia-arquivos"
              type="file"
              multiple
              disabled={!alvo}
              onChange={(ev) => {
                adicionarArquivos(ev.target.files);
                ev.target.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">
              Até {pesoLegivel(MEDIA_MAX_BYTES)} por arquivo. Imagens, plantas, vídeos e PDFs.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="midia-urls">URLs oficiais (uma por linha)</Label>
            <Textarea
              id="midia-urls"
              rows={3}
              value={urls}
              disabled={!alvo}
              onChange={(ev) => setUrls(ev.target.value)}
              placeholder="https://…/perspectiva-fachada.webp"
            />
            <Button type="button" variant="outline" size="sm" disabled={!alvo} onClick={adicionarUrls}>
              Adicionar URLs à fila
            </Button>
          </div>

          {pendentes.length > 0 && (
            <div className="rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border px-3 py-2 text-sm">
                <span className="font-medium">Fila ({pendentes.length})</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPendentes([])}>
                  Limpar
                </Button>
              </div>
              <ul className="max-h-48 divide-y divide-border overflow-auto text-sm">
                {pendentes.map((p) => (
                  <li key={p.chave} className="flex items-center gap-2 px-3 py-2">
                    <Icon name={mediaTipoIcones[p.tipo]} size={16} className="text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                    <Badge variant="secondary">{mediaTipoLabels[p.tipo]}</Badge>
                    <span className="w-16 text-right text-xs text-muted-foreground">
                      {p.bytes ? pesoLegivel(p.bytes) : "URL"}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remover ${p.nome} da fila`}
                      className="grid size-7 place-items-center rounded-md hover:bg-muted"
                      onClick={() => setPendentes((a) => a.filter((x) => x.chave !== p.chave))}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="items-center gap-2">
          {progresso && <span className="mr-auto text-xs text-muted-foreground">{progresso}</span>}
          <Button variant="outline" onClick={() => setOpen(false)} disabled={enviar.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => enviar.mutate()}
            disabled={enviar.isPending || !alvo || !pendentes.length}
          >
            {enviar.isPending ? "Importando…" : `Importar ${pendentes.length || ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
