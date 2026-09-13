import { canonical, jsonLd, metaBasica, schemaBreadcrumb } from "@/lib/site/seo";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { VitrineContato } from "@/components/platform/VitrineContato";
import { Faixa } from "@/components/site/Bloco";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import {
  WHATSAPP_MSG_CONSULTORIA,
  WHATSAPP_MSG_LANCAMENTOS,
  whatsappLink,
} from "@/lib/site/contato";

const TITULO = "Agendar consultoria patrimonial — Ferragano";
const DESCRICAO =
  "Fale com um especialista da Ferragano: diagnóstico de crédito, curadoria de lançamentos e plano patrimonial em uma conversa de 30 minutos.";
const URL = "https://ferragano.lovable.app/contato";

const PASSOS = [
  "Você conta renda, reservas e objetivo.",
  "Fazemos o diagnóstico de crédito e o plano de prazo.",
  "Recebe uma seleção curta de lançamentos compatíveis.",
];

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: metaBasica({ titulo: TITULO, descricao: DESCRICAO, path: "/contato", tipo: "website" }),
    links: canonical("/contato"),
    scripts: jsonLd(
      {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name: TITULO,
        description: DESCRICAO,
        url: URL,
      },
      schemaBreadcrumb([
        { nome: "Início", path: "/" },
        { nome: "Contato", path: "/contato" },
      ]),
    ),
  }),
  component: Contato,
});

function Contato() {
  return (
    <SiteLayout>
      <Faixa>
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="t-caps text-gold">Atendimento</p>
            <h1 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-tight md:text-5xl">
              Agendar consultoria patrimonial
            </h1>
            <p className="mt-5 max-w-md text-muted-foreground md:text-lg">
              Trinta minutos para definir capacidade de crédito, prazo e o tipo de ativo que faz
              sentido agora. Sem custo e sem compromisso.
            </p>
            <ol className="mt-8 space-y-3">
              {PASSOS.map((p, i) => (
                <li key={p} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="t-data mt-0.5 shrink-0 text-gold">0{i + 1}</span>
                  {p}
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={whatsappLink(WHATSAPP_MSG_CONSULTORIA)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <Icon name="chat" size={18} />
                Falar no WhatsApp
              </a>
              <a
                href={whatsappLink(WHATSAPP_MSG_LANCAMENTOS)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border px-6 text-sm font-medium transition-colors hover:bg-accent"
              >
                <Icon name="apartment" size={18} />
                Quero ver lançamentos
              </a>
            </div>
          </div>
          <VitrineContato ctaTexto="Quero uma consultoria patrimonial" />
        </div>
      </Faixa>
      <WhatsAppFab />
    </SiteLayout>
  );
}
