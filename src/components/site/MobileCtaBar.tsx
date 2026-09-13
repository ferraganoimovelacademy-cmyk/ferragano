import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { WHATSAPP_MSG_CONSULTORIA, whatsappLink } from "@/lib/site/contato";

/**
 * GATE 07 — Mobile first premium: barra de ação fixa no rodapé,
 * com duas saídas de conversão e área de toque ≥ 44px.
 */
export function MobileCtaBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-2 gap-2 p-3">
        <Link
          to="/empreendimentos"
          className="press inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border text-sm font-medium transition-colors hover:bg-accent"
        >
          <Icon name="apartment" size={18} aria-hidden />
          Ver Coleção
        </Link>
        <a
          href={whatsappLink(WHATSAPP_MSG_CONSULTORIA)}
          target="_blank"
          rel="noopener noreferrer"
          className="press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-transform duration-200 active:scale-[0.98]"
        >
          <Icon name="event" size={18} aria-hidden />
          Consultoria
        </a>
      </div>
    </div>
  );
}
