import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type ReasonHistoryItem = { id: string; texto: string; quando?: string | null };

export type ReasonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descricao?: string;
  label?: string;
  placeholder?: string;
  confirmLabel?: string;
  minLength?: number;
  maxLength?: number;
  obrigatorio?: boolean;
  historico?: ReasonHistoryItem[];
  pending?: boolean;
  onConfirm: (motivo: string) => void;
};

/**
 * Diálogo único e acessível para captura de motivo em ações críticas
 * (perda de oportunidade, cancelamento de reserva/venda, alteração de preço).
 * Substitui window.prompt: foco automático, ESC para fechar, Enter para confirmar,
 * Shift+Enter para nova linha, contador e validação de tamanho.
 */
export function ReasonDialog({
  open,
  onOpenChange,
  titulo,
  descricao,
  label = "Motivo",
  placeholder = "Descreva o motivo desta ação",
  confirmLabel = "Confirmar",
  minLength = 5,
  maxLength = 400,
  obrigatorio = true,
  historico,
  pending = false,
  onConfirm,
}: ReasonDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [tocado, setTocado] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setMotivo("");
      setTocado(false);
    }
  }, [open]);

  const texto = motivo.trim();
  const curto = texto.length < minLength;
  const invalido = obrigatorio ? curto : texto.length > 0 && curto;
  const mensagemErro = `Escreva ao menos ${minLength} caracteres.`;

  const confirmar = () => {
    setTocado(true);
    if (invalido) {
      areaRef.current?.focus();
      return;
    }
    onConfirm(texto);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descricao && <DialogDescription>{descricao}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reason-dialog-motivo">
            {label}
            {obrigatorio && (
              <span aria-hidden="true" className="ml-1 text-destructive">
                *
              </span>
            )}
          </Label>
          <Textarea
            id="reason-dialog-motivo"
            ref={areaRef}
            autoFocus
            rows={4}
            value={motivo}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-required={obrigatorio}
            aria-invalid={tocado && invalido}
            aria-describedby="reason-dialog-ajuda"
            onChange={(e) => setMotivo(e.target.value)}
            onBlur={() => setTocado(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                confirmar();
              }
            }}
          />
          <div id="reason-dialog-ajuda" className="flex items-center justify-between gap-2 text-xs">
            <span
              role={tocado && invalido ? "alert" : undefined}
              className={cn("text-muted-foreground", tocado && invalido && "text-destructive")}
            >
              {tocado && invalido
                ? mensagemErro
                : "Enter confirma · Shift+Enter nova linha · Esc cancela"}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {motivo.length}/{maxLength}
            </span>
          </div>
        </div>

        {historico && historico.length > 0 && (
          <div className="rounded-md border border-border p-3">
            <p className="text-xs font-medium">Motivos anteriores</p>
            <ul className="mt-2 space-y-1">
              {historico.slice(0, 5).map((h) => (
                <li key={h.id} className="text-xs text-muted-foreground">
                  <span className="block truncate">{h.texto}</span>
                  {h.quando && <span className="text-[11px]">{h.quando}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={pending || (tocado && invalido)}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
