import { Icon } from "@/components/Icon";
import { WHATSAPP_MSG_PADRAO, whatsappLink } from "@/lib/site/contato";

/** Botão flutuante de WhatsApp (desktop). No mobile quem assume é a MobileCtaBar. */
export function WhatsAppFab() {
  return (
    <a
      href={whatsappLink(WHATSAPP_MSG_PADRAO)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com um especialista pelo WhatsApp"
      className="group fixed right-4 bottom-4 z-50 hidden lg:inline-flex min-h-11 items-center gap-2 rounded-full bg-success px-4 py-3 text-success-foreground shadow-e3 transition-transform duration-200 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none lg:right-8 lg:bottom-8"
    >
      <Icon name="chat" size={20} />
      <span className="hidden text-sm font-medium sm:inline">Falar no WhatsApp</span>
    </a>
  );
}
