import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  FEEDBACK_TIPOS,
  feedbackStatusLabels,
  feedbackTipoLabels,
  severidadePadrao,
  type FeedbackItem,
  type FeedbackTipo,
} from "@/lib/platform/feedback";
import { enviarFeedback, listarFeedback } from "@/lib/platform/feedback.functions";

/**
 * FASE 1 — GATE P07: botão permanente de feedback do piloto.
 * Fica no shell, registra a rota de origem e mostra o histórico do usuário.
 */
export function FeedbackButton({ workspaceId }: { workspaceId?: string }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<FeedbackTipo>("sugestao");
  const [mensagem, setMensagem] = useState("");
  const rota = useRouterState({ select: (s) => s.location.pathname });
  const queryClient = useQueryClient();
  const enviar = useServerFn(enviarFeedback);
  const listar = useServerFn(listarFeedback);

  const historico = useQuery({
    queryKey: ["pilot-feedback", workspaceId],
    enabled: Boolean(workspaceId) && open,
    queryFn: async () => (await listar({ data: { workspaceId: workspaceId!, limite: 5 } })).items,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      enviar({
        data: {
          workspaceId: workspaceId!,
          tipo,
          mensagem: mensagem.trim(),
          severidade: severidadePadrao(tipo),
          surface: "app.shell",
          rota,
          userAgent:
            typeof navigator === "undefined" ? undefined : navigator.userAgent.slice(0, 400),
        },
      }),
    onSuccess: () => {
      toast.success("Feedback registrado. Obrigado!");
      setMensagem("");
      void queryClient.invalidateQueries({ queryKey: ["pilot-feedback", workspaceId] });
      setOpen(false);
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar."),
  });

  if (!workspaceId) return null;
  const valido = mensagem.trim().length >= 3;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="fixed right-4 bottom-4 z-40 gap-2 shadow-lg md:right-6 md:bottom-6"
          aria-label="Enviar feedback sobre a plataforma"
        >
          <Icon name="chat" size={18} />
          <span className="hidden sm:inline">Enviar Feedback</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar feedback</DialogTitle>
          <DialogDescription>
            Tudo o que você escrever aqui entra no backlog do piloto.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Tipo</legend>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_TIPOS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tipo === t}
                onClick={() => setTipo(t)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  tipo === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                {feedbackTipoLabels[t]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="feedback-mensagem">Mensagem</Label>
          <Textarea
            id="feedback-mensagem"
            rows={5}
            value={mensagem}
            maxLength={4000}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Descreva o que aconteceu, onde e o que você esperava."
          />
          <p className="text-xs text-muted-foreground">Registrado em {rota}</p>
        </div>

        {historico.data?.length ? (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Seus últimos envios
            </p>
            <ul className="space-y-1.5">
              {(historico.data as FeedbackItem[]).map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-xs">
                  <span className="rounded-sm bg-muted px-1.5 py-0.5 font-medium">
                    {feedbackStatusLabels[item.status]}
                  </span>
                  <span className="flex-1 truncate text-muted-foreground">{item.mensagem}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button disabled={!valido || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Enviando…" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
