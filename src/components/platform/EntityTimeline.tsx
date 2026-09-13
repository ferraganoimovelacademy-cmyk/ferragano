import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@/components/Icon";
import { Skeleton } from "@/components/ui/skeleton";
import { listTimeline, type TimelineSource } from "@/lib/platform/timeline.functions";

type Props = {
  workspaceId: string;
  entity?: string;
  entityId?: string;
  limit?: number;
  titulo?: string;
};

const icones: Record<TimelineSource, string> = {
  auditoria: "history",
  comentario: "chat_bubble",
  arquivo: "attach_file",
  atividade: "bolt",
  evento: "graph_2",
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
  const data = new Date(iso);
  const diff = Date.now() - data.getTime();
  const minutos = Math.round(diff / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * GATE 03.5 — linha do tempo reutilizável.
 * Sem `entity` mostra a atividade do workspace inteiro; com `entity`/`entityId`
 * vira o histórico daquele registro.
 */
export function EntityTimeline({
  workspaceId,
  entity,
  entityId,
  limit = 20,
  titulo = "Atividade recente",
}: Props) {
  const fetchTimeline = useServerFn(listTimeline);

  const { data: eventos, isLoading } = useQuery({
    queryKey: ["timeline", workspaceId, entity ?? null, entityId ?? null, limit],
    queryFn: () => fetchTimeline({ data: { workspaceId, entity, entityId, limit } }),
  });

  return (
    <section>
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {titulo}
      </h2>

      {isLoading ? (
        <div className="mt-3 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !eventos?.length ? (
        <p className="mt-3 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma atividade registrada ainda.
        </p>
      ) : (
        <ol className="mt-3 space-y-1">
          {eventos.map((evento) => (
            <li
              key={evento.id}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60"
            >
              <Avatar className="mt-0.5 size-7">
                {evento.actorAvatar ? <AvatarImage src={evento.actorAvatar} alt="" /> : null}
                <AvatarFallback className="text-[10px]">
                  {iniciais(evento.actorNome)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{evento.actorNome}</span>{" "}
                  <span className="text-muted-foreground">{evento.titulo}</span>{" "}
                  <span className="text-muted-foreground">· {evento.entity}</span>
                </p>
                {evento.detalhe ? (
                  <p className="truncate text-xs text-muted-foreground">{evento.detalhe}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Icon name={icones[evento.source]} size={14} />
                <span>{quando(evento.createdAt)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
