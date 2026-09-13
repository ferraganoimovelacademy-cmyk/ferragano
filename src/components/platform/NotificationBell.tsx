import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/platform/notifications.functions";

const TIPO_COR: Record<string, string> = {
  info: "bg-primary",
  sucesso: "bg-success",
  alerta: "bg-warning",
  erro: "bg-destructive",
};

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** GATE 03.5 — caixa de notificações no header do app. */
export function NotificationBell({ workspaceId }: { workspaceId: string }) {
  const [aberto, setAberto] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const fetchNotifications = useServerFn(listNotifications);
  const markRead = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);

  const key = ["notifications", workspaceId] as const;

  const { data } = useQuery({
    queryKey: key,
    queryFn: () => fetchNotifications({ data: { workspaceId, limit: 20 } }),
    refetchInterval: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const lerUma = useMutation({
    mutationFn: async (notificationId: string) => markRead({ data: { notificationId } }),
    onSuccess: invalidate,
  });

  const lerTodas = useMutation({
    mutationFn: async () => markAll({ data: { workspaceId } }),
    onSuccess: invalidate,
  });

  const naoLidas = data?.naoLidas ?? 0;

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-4 w-4" />
          {naoLidas > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-on-gold">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notificações</span>
          {naoLidas > 0 && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => lerTodas.mutate()}
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <Separator />
        <ScrollArea className="max-h-80">
          {!data?.items.length ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nada por aqui.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted",
                      !item.lida && "bg-muted/50",
                    )}
                    onClick={() => {
                      if (!item.lida) lerUma.mutate(item.id);
                      if (item.link) {
                        setAberto(false);
                        void navigate({ to: item.link });
                      }
                    }}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        item.lida ? "bg-transparent" : (TIPO_COR[item.tipo] ?? "bg-primary"),
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {item.titulo}
                      </span>
                      {item.mensagem && (
                        <span className="block text-xs text-muted-foreground">{item.mensagem}</span>
                      )}
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {quando(item.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
