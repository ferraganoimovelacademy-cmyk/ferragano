import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type PerguntaFaq = { pergunta: string; resposta: string };

/** GATE 04/05 — FAQ acessível; o mesmo conteúdo alimenta o JSON-LD FAQPage. */
export function FaqPremium({ itens }: { itens: PerguntaFaq[] }) {
  return (
    <Accordion
      type="single"
      collapsible
      className="mt-8 divide-y divide-border border-y border-border"
    >
      {itens.map((item, i) => (
        <AccordionItem key={item.pergunta} value={`faq-${i}`} className="border-none">
          <AccordionTrigger className="py-5 text-left font-display text-base font-semibold tracking-tight hover:no-underline">
            {item.pergunta}
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-sm text-muted-foreground">
            {item.resposta}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
