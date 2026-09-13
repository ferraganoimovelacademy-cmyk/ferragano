/**
 * Sprint UI 05 — GATE "Seu sonho".
 * Apenas apresentação: cada objetivo de vida aponta para o portfólio Cury já
 * filtrado pelos parâmetros que a rota /empreendimentos/cury reconhece.
 */
export type Sonho = {
  id: string;
  eyebrow: string;
  titulo: string;
  texto: string;
  icone: string;
  marcadores: string[];
  filtro: { dorm?: string; faixa?: string; status?: string };
};

export const SONHOS: Sonho[] = [
  {
    id: "primeiro",
    eyebrow: "Conquista",
    titulo: "Primeiro imóvel",
    texto:
      "Imagine abrir a janela do seu próprio apartamento. Sair do aluguel com uma parcela que cabe no bolso e a segurança de um teto seu.",
    icone: "key",
    marcadores: ["Elegível ao MCMV", "Entrada parcelada", "2 dormitórios"],
    filtro: { dorm: "2", status: "lancamento" },
  },
  {
    id: "investir",
    eyebrow: "Estratégia",
    titulo: "Investimento",
    texto:
      "Seu dinheiro trabalhando enquanto você dorme. Unidades em eixos de alta valorização e locação garantida pelo metrô a poucos minutos.",
    icone: "trending_up",
    marcadores: ["Próximo ao metrô", "Alta liquidez", "Ticket de entrada"],
    filtro: { status: "lancamento" },
  },
  {
    id: "mudar",
    eyebrow: "Evolução",
    titulo: "Mudar de casa",
    texto:
      "Ter mais espaço para os filhos brincarem e levar a família para a escola caminhando. Qualidade de vida é o melhor investimento.",
    icone: "family_restroom",
    marcadores: ["3 dormitórios", "Lazer completo", "Vaga coberta"],
    filtro: { dorm: "3" },
  },
  {
    id: "altopadrao",
    eyebrow: "Exclusividade",
    titulo: "Alto padrão",
    texto:
      "Acabamentos premium e localizações nobres. Onde cada detalhe foi pensado para refletir o nível da sua conquista.",
    icone: "workspace_premium",
    marcadores: ["Acabamento superior", "Bairros nobres", "Vista privilegiada"],
    filtro: { status: "pronto" },
  },
];
