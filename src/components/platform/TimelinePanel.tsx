import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EntityTimeline } from "@/components/platform/EntityTimeline";

type Props = {
  workspaceId: string;
  entity?: string;
  entityId?: string;
  titulo?: string;
  descricao?: string;
  trigger?: ReactNode;
};

/**
 * SPRINT 07 — Timeline universal como painel lateral.
 * Plugável em qualquer tela: passa a entidade e mostra o histórico completo.
 */
export function TimelinePanel({
  workspaceId,
  entity,
  entityId,
  titulo = "Histórico",
  descricao = "Tudo que aconteceu por aqui.",
  trigger,
}: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Icon name="history" size={18} />
            Histórico
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{titulo}</SheetTitle>
          <SheetDescription>{descricao}</SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <EntityTimeline
            workspaceId={workspaceId}
            entity={entity}
            entityId={entityId}
            limit={40}
            titulo=""
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
