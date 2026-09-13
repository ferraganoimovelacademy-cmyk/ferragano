import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { WHATSAPP_MSG_CONSULTORIA, whatsappLink } from "@/lib/site/contato";

/** CTA de fechamento das páginas institucionais. */
export function CtaFinal() {
  return (
    <section aria-label="Fale com a Ferragano" className="bg-inverse-surface">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-16 text-center md:px-8 md:py-20">
        <p className="t-caps text-gold">Próximo passo</p>
        <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl leading-tight font-semibold tracking-tight text-inverse-on-surface md:text-4xl">
          Seu patrimônio começa pela decisão certa.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-inverse-on-surface/75">
          Uma conversa de 30 minutos define prazo, capacidade de crédito e o tipo de ativo que faz
          sentido para o seu momento.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={whatsappLink(WHATSAPP_MSG_CONSULTORIA)}
            target="_blank"
            rel="noopener noreferrer"
            className="press inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-10 text-base font-medium text-primary-foreground hover:bg-primary-hover sm:w-auto"
          >
            <Icon name="event" size={20} />
            Agendar Consultoria
          </a>
          <a
            href={whatsappLink(WHATSAPP_MSG_CONSULTORIA)}
            target="_blank"
            rel="noopener noreferrer"
            className="press inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-inverse-on-surface/25 px-10 text-base font-medium text-inverse-on-surface hover:bg-inverse-on-surface/10 sm:w-auto"
          >
            <Icon name="chat" size={20} />
            Falar no WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
