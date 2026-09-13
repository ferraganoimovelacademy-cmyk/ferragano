import type { PerguntaFaq } from "@/components/site/FaqPremium";

/**
 * Conteúdo único de FAQ: alimenta a interface e o JSON-LD FAQPage.
 * Toda pergunta exibida precisa existir aqui (GATE 05).
 */
export const FAQ_HOME: PerguntaFaq[] = [
  {
    pergunta: "A consultoria patrimonial tem custo?",
    resposta:
      "Não. O diagnóstico, a curadoria e o acompanhamento são remunerados pela incorporadora na venda, sem acréscimo no valor da sua tabela.",
  },
  {
    pergunta: "Preciso ter entrada para começar?",
    resposta:
      "Não para começar a conversa. O primeiro passo é o diagnóstico de crédito: ele mostra qual entrada e qual parcela cabem no seu orçamento antes de qualquer visita.",
  },
  {
    pergunta: "Por que comprar lançamento em vez de imóvel pronto?",
    resposta:
      "No lançamento você entra na tabela de pré-obra, captura a valorização do ciclo construtivo e dilui a entrada no cronograma. O pronto tem posse imediata, mas o ganho do ciclo ficou com o vendedor anterior.",
  },
  {
    pergunta: "Vocês atendem fora da Zona Oeste de São Paulo?",
    resposta:
      "Sim. A Zona Oeste é onde temos a leitura mais profunda de bairro e produto, mas avaliamos oportunidades em outras regiões quando o plano do cliente pede.",
  },
  {
    pergunta: "A projeção da calculadora é uma promessa de rentabilidade?",
    resposta:
      "Não. A calculadora é determinística e mostra todas as premissas na própria tela. Serve para orientar a conversa; não substitui análise de crédito nem garante retorno.",
  },
  {
    pergunta: "O acompanhamento termina na assinatura do contrato?",
    resposta:
      "Não. Um responsável nomeado acompanha repasse, reajustes de obra e vistoria até a entrega das chaves.",
  },
];
