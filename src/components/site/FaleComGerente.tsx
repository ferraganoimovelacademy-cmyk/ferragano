import { Link } from "@tanstack/react-router";

import carlos from "@/assets/carlos-ferragano.jpg";
import { Icon } from "@/components/Icon";
import { PAPEL, RESPONSAVEL } from "@/lib/site/posicionamento";
import { WHATSAPP_MSG_GERENTE, whatsappLink } from "@/lib/site/contato";

/**
 * Diferencial de posicionamento: o atendimento não é com um corretor,
 * é com o gerente comercial. Só apresentação — nenhuma regra de negócio.
 */
export function FaleComGerente() {
  return (
    <div className="mt-10 grid items-center gap-10 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <figure className="overflow-hidden rounded-2xl border border-border bg-muted">
        <img
          src={carlos}
          alt={`${RESPONSAVEL}, ${PAPEL}`}
          loading="lazy"
          className="aspect-[4/5] w-full object-cover"
        />
      </figure>
      <div>
        <p className="t-caps text-gold">Fale com o gerente</p>
        <h3 className="mt-3 font-display text-2xl leading-tight font-semibold tracking-tight md:text-3xl">
          Quer entender qual lançamento faz mais sentido para o seu patrimônio?
        </h3>
        <p className="mt-4 max-w-xl text-muted-foreground">
          A conversa é direta com {RESPONSAVEL} — {PAPEL} — e não com um plantão de vendas. Quem
          conhece a tabela, o estoque e a política de crédito é quem atende você.
        </p>
        <ul className="mt-6 space-y-3">
          {[
            "Leitura de renda, FGTS e subsídio antes da primeira visita",
            "Acesso ao estoque real, inclusive o que não está no site",
            "Comparação entre lançamentos com o mesmo critério",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Icon name="check_circle" size={18} aria-hidden className="mt-0.5 text-primary" />
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href={whatsappLink(WHATSAPP_MSG_GERENTE)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.02] hover:bg-primary-hover"
          >
            <Icon name="chat" size={18} aria-hidden />
            Falar com o gerente
          </a>
          <Link
            to="/contato"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border px-6 text-sm font-medium transition-colors hover:bg-accent"
          >
            Agendar consultoria
            <Icon name="arrow_forward" size={18} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
