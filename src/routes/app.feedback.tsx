import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { isAdminRole } from "@/lib/platform/roles";
import { listarFeedback, triarFeedback } from "@/lib/platform/feedback.functions";
import {
  FEEDBACK_SEVERIDADES,
  FEEDBACK_STATUS,
  feedbackStatusLabels,
  feedbackTipoLabels,
  type FeedbackItem,
  type FeedbackSeveridade,
  type FeedbackStatus,
} from "@/lib/platform/feedback";

export const Route = createFileRoute("/app/feedback")({
  head: () => ({
    meta: [
      { title: "Triagem de feedback · Ferragano OS" },
      {
        name: "description",
        content:
          "Fila de triagem do feedback do piloto: classifique severidade, responda e acompanhe a resolução.",
      },
      { property: "og:title", content: "Triagem de feedback · Ferragano OS" },
      {
        property: "og:description",
        content: "Fila de triagem do feedback enviado pelos usuários do piloto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedbackPage,
});

const severidadeVariant: Record<
  FeedbackSeveridade,
  "soft" | "outline" | "warning" | "destructive"
> = {
  baixa: "outline",
  media: "soft",
  alta: "warning",
  critica: "destructive",
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FeedbackPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const admin = isAdminRole(session?.roles);
  const queryClient = useQueryClient();

  const [filtro, setFiltro] = useState<FeedbackStatus | "todos">("novo");
  const [aberto, setAberto] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");

  const fetchFeedback = useServerFn(listarFeedback);
  const triar = useServerFn(triarFeedback);

  const { data, isLoading } = useQuery({
    queryKey: ["pilot-feedback", workspaceId, filtro],
    queryFn: () =>
      fetchFeedback({
        data: {
          workspaceId: workspaceId!,
          ...(filtro === "todos" ? {} : { status: filtro }),
          limite: 100,
        },
      }),
    enabled: Boolean(workspaceId) && admin,
  });

  const mutation = useMutation({
    mutationFn: (input: {
      feedbackId: string;
      status: FeedbackStatus;
      severidade?: FeedbackSeveridade;
      resposta?: string;
    }) => triar({ data: { workspaceId: workspaceId!, ...input } }),
    onSuccess: () => {
      toast.success("Feedback atualizado.");
      setAberto(null);
      setResposta("");
      void queryClient.invalidateQueries({ queryKey: ["pilot-feedback"] });
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  if (!admin) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Icon name="lock" size={28} className="mx-auto text-muted-foreground" />
        <h1 className="mt-3 font-display text-lg font-semibold">Acesso restrito</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A triagem de feedback é visível apenas para proprietários e administradores.
        </p>
      </div>
    );
  }

  const itens = (data?.items ?? []) as FeedbackItem[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Triagem de feedback</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GATE P07 — tudo que o piloto reportou, com severidade, resposta e status de resolução.
        </p>
      </header>

      <div
        className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3"
        role="group"
        aria-label="Filtrar feedback por status"
      >
        {(["todos", ...FEEDBACK_STATUS] as const).map((status) => (
          <Button
            key={status}
            size="sm"
            variant={filtro === status ? "default" : "outline"}
            aria-pressed={filtro === status}
            onClick={() => setFiltro(status)}
          >
            {status === "todos" ? "Todos" : feedbackStatusLabels[status]}
          </Button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!isLoading && itens.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhum feedback com esse status.
        </div>
      )}

      <ul className="space-y-3">
        {itens.map((item) => {
          const expandido = aberto === item.id;
          return (
            <li key={item.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="soft">{feedbackTipoLabels[item.tipo]}</Badge>
                <Badge variant={severidadeVariant[item.severidade]}>{item.severidade}</Badge>
                <Badge variant="outline">{feedbackStatusLabels[item.status]}</Badge>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {formatarData(item.created_at)}
                </span>
              </div>

              <p className="mt-3 text-sm whitespace-pre-wrap">{item.mensagem}</p>

              {item.rota && (
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">{item.rota}</p>
              )}

              {item.resposta && (
                <p className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
                  <span className="text-xs text-muted-foreground">Resposta: </span>
                  {item.resposta}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Select
                  value={item.severidade}
                  onValueChange={(valor) =>
                    mutation.mutate({
                      feedbackId: item.id,
                      status: item.status === "novo" ? "triado" : item.status,
                      severidade: valor as FeedbackSeveridade,
                    })
                  }
                >
                  <SelectTrigger className="w-36" aria-label="Severidade do feedback">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_SEVERIDADES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={item.status}
                  onValueChange={(valor) =>
                    mutation.mutate({ feedbackId: item.id, status: valor as FeedbackStatus })
                  }
                >
                  <SelectTrigger className="w-44" aria-label="Status do feedback">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {feedbackStatusLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAberto(expandido ? null : item.id);
                    setResposta("");
                  }}
                  aria-expanded={expandido}
                >
                  <Icon name="reply" size={16} />
                  Responder
                </Button>
              </div>

              {expandido && (
                <div className="mt-3 space-y-2">
                  <label className="text-xs text-muted-foreground" htmlFor={`resposta-${item.id}`}>
                    Resposta ao autor
                  </label>
                  <Textarea
                    id={`resposta-${item.id}`}
                    value={resposta}
                    onChange={(e) => setResposta(e.target.value)}
                    rows={3}
                    placeholder="O que foi feito ou quando será resolvido."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={resposta.trim().length < 3 || mutation.isPending}
                      onClick={() =>
                        mutation.mutate({
                          feedbackId: item.id,
                          status: "em_andamento",
                          resposta: resposta.trim(),
                        })
                      }
                    >
                      Enviar resposta
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAberto(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
