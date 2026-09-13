import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { formatBRL } from "@/lib/platform/comercial";
import { whatsappLink } from "@/lib/site/contato";

/**
 * GATE 03 — CTA flutuante sempre visível.
 * Ordem de conversão: agendar visita → WhatsApp → simular financiamento.
 * Desktop: barra completa. Mobile: três ações em ícone + rótulo curto.
 */
export function CtaFixoCury({
  nome,
  precoMin,
  disponiveis,
}: {
  nome: string;
  precoMin: number | null;
  disponiveis: number;
}) {
  const visita = whatsappLink(`Olá! Quero agendar uma visita ao empreendimento ${nome}.`);
  const conversa = whatsappLink(
    `Olá! Vim pelo site da Ferragano e quero informações do empreendimento ${nome}.`,
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-3 md:px-8">
        <div className="hidden min-w-0 lg:block">
          <p className="truncate font-display text-base font-semibold tracking-tight">{nome}</p>
          <p className="text-xs text-muted-foreground">
            A partir de {formatBRL(precoMin)} · {disponiveis} unidade
            {disponiveis === 1 ? "" : "s"} disponíve{disponiveis === 1 ? "l" : "is"}
          </p>
        </div>

        <div className="grid w-full grid-cols-3 items-center gap-2 lg:flex lg:w-auto lg:shrink-0 lg:gap-3">
          <a
            href={visita}
            target="_blank"
            rel="noopener noreferrer"
            className="press inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground lg:h-11 lg:px-5 lg:text-sm"
          >
            <Icon name="event_available" size={18} />
            <span>Agendar visita</span>
          </a>
          <a
            href={conversa}
            target="_blank"
            rel="noopener noreferrer"
            className="press inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border px-4 text-xs font-medium lg:h-11 lg:text-sm"
          >
            <Icon name="chat" size={18} />
            <span>WhatsApp</span>
          </a>
          <Link
            to="/simulacao"
            className="press inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border px-4 text-xs font-medium lg:h-11 lg:text-sm"
          >
            <Icon name="calculate" size={18} />
            <span className="truncate">Simular</span>
          </Link>
        </div>
      </div>
    </div>
  );
}