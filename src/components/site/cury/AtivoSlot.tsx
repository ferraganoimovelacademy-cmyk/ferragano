import { Icon } from "@/components/Icon";

/**
 * Slot de ativo oficial ainda não liberado.
 * O componente já está no lugar da mídia final: quando a equipe comercial
 * publica foto, vídeo, planta ou PDF, o placeholder simplesmente sai.
 */
export function AtivoSlot({
  titulo,
  icone,
  proporcao = "aspect-[16/9]",
  nota,
  compacto = false,
}: {
  titulo: string;
  icone: string;
  proporcao?: string;
  nota?: string;
  compacto?: boolean;
}) {
  return (
    <figure
      className={`${proporcao} relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border bg-gradient-to-br from-primary-soft/50 to-accent/40 p-4 text-center`}
    >
      <span className="grid size-11 place-items-center rounded-full bg-card/80 text-primary">
        <Icon name={icone} size={22} />
      </span>
      <figcaption>
        <p className={`font-medium ${compacto ? "text-xs" : "text-sm"}`}>{titulo}</p>
        <p className="mt-1 max-w-[26ch] text-[11px] leading-snug text-muted-foreground">
          {nota ?? "Aguardando material oficial da construtora."}
        </p>
      </figcaption>
    </figure>
  );
}

/** Aviso de origem de conteúdo — usado no rodapé das páginas de produto. */
export function AvisoAtivos({ className = "" }: { className?: string }) {
  return (
    <p
      className={`rounded-lg border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground ${className}`}
    >
      <Icon name="info" size={14} className="mr-1 align-[-2px]" />
      Imagens, plantas, vídeos, memorial descritivo e tabela de preços são publicados apenas com
      autorização da construtora. Enquanto não houver material licenciado, esta página exibe
      espaços reservados. Valores e disponibilidade são confirmados no atendimento.
    </p>
  );
}