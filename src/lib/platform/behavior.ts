/**
 * SPRINT 24 — BEHAVIORAL INTELLIGENCE (contexto Behavior).
 *
 * Camada pura e client-safe. Recebe evidência já lida pela Query Layer
 * (`behavior.functions.ts` → `read_person_behavior`) e devolve TRAÇOS
 * COMPORTAMENTAIS explicáveis.
 *
 * ADR-021 continua valendo: nenhum traço sai daqui sem `fatores`,
 * `confianca`, `base` e `calculadoEm`. Sem amostra suficiente, o traço devolve
 * `valor: null` com `motivoAusencia` — nunca zero, nunca palpite.
 *
 * ADR-022: comportamento é MEDIDO, nunca inferido por IA. Cada número aponta a
 * tabela e a amostra que o produziram.
 */

import { nivelDeConfianca, type Fator, type Previsao } from "@/lib/platform/predictive";

/* ------------------------------------------------------------------ *
 * Evidência bruta (1 linha por pessoa, vinda da RPC)
 * ------------------------------------------------------------------ */

export type PersonBehaviorRow = {
  personId: string;
  nome: string;
  estagio: string | null;
  origem: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  criadoEm: string | null;
  ultimoContatoEm: string | null;
  perfil: string | null;
  precoTeto: number | null;
  primeiroImovel: boolean | null;
  restricaoCredito: boolean | null;
  interacoesTotal: number;
  interacoes90d: number;
  intWhatsapp: number;
  intLigacao: number;
  intEmail: number;
  intMensagem: number;
  intVisita: number;
  primeiraInteracao: string | null;
  ultimaInteracao: string | null;
  horaFavorita: number | null;
  horaFavoritaAmostra: number;
  diaSemanaFavorito: number | null;
  intervaloMedioHoras: number | null;
  respostaPropostaHoras: number | null;
  respostaPropostaAmostra: number;
  visitasAgendadas: number;
  visitasRealizadas: number;
  visitasFaltou: number;
  propostas: number;
  propostasEnviadas: number;
  propostasAceitas: number;
  propostasRecusadas: number;
  rodadasPropostaMax: number;
  diasAtePrimeiraProposta: number | null;
  descontoMedioPct: number | null;
  vendas: number;
  distratos: number;
  ltv: number;
  cicloFechamentoDias: number | null;
  oportunidades: number;
  oportunidadesPerdidas: number;
  motivosPerda: string[];
  indicacoesFeitas: number;
};

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round = (v: number, casas = 0) => {
  const f = 10 ** casas;
  return Math.round(v * f) / f;
};
const n = (v: number) => new Intl.NumberFormat("pt-BR").format(round(v, 1));
const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

function traco<T>(
  valor: T | null,
  confianca: number,
  fatores: Fator[],
  base: string,
  calculadoEm: string,
  motivoAusencia?: string,
): Previsao<T> {
  const c = clamp(round(confianca), 0, 100);
  return {
    valor,
    confianca: c,
    nivel: nivelDeConfianca(c),
    fatores,
    base,
    calculadoEm,
    ...(motivoAusencia ? { motivoAusencia } : {}),
  };
}

/** Confiança cresce com a amostra e satura: 0 em 0, ~50 no mínimo exigido, 95 em 5x. */
export function confiancaPorAmostra(amostra: number, minimo: number): number {
  if (amostra <= 0 || minimo <= 0) return 0;
  const razao = amostra / minimo;
  if (razao < 1) return round(razao * 45);
  return round(clamp(45 + Math.log2(razao + 1) * 28, 45, 95));
}

export const diasEntre = (de: string | null, ate: Date): number | null => {
  if (!de) return null;
  const t = new Date(de).getTime();
  if (Number.isNaN(t)) return null;
  return (ate.getTime() - t) / 86_400_000;
};

/* ------------------------------------------------------------------ *
 * GATE 01 — Canal favorito
 * ------------------------------------------------------------------ */

export type Canal = "whatsapp" | "ligacao" | "email" | "mensagem" | "visita";

export const canalLabels: Record<Canal, string> = {
  whatsapp: "WhatsApp",
  ligacao: "Ligação",
  email: "E-mail",
  mensagem: "Mensagem",
  visita: "Visita",
};

export type CanalPreferido = { canal: Canal; interacoes: number; participacaoPct: number };

const MIN_CANAL = 5;

export function canalFavorito(r: PersonBehaviorRow, agora: Date): Previsao<CanalPreferido> {
  const calculadoEm = agora.toISOString();
  const contagens: Array<[Canal, number]> = [
    ["whatsapp", r.intWhatsapp],
    ["ligacao", r.intLigacao],
    ["email", r.intEmail],
    ["mensagem", r.intMensagem],
    ["visita", r.intVisita],
  ];
  const total = contagens.reduce((s, [, v]) => s + v, 0);
  const base = `activities da pessoa (${n(total)} interação(ões) registradas).`;

  if (total < MIN_CANAL) {
    return traco<CanalPreferido>(
      null,
      confiancaPorAmostra(total, MIN_CANAL),
      [],
      base,
      calculadoEm,
      `Apenas ${n(total)} interação(ões) registradas — mínimo de ${MIN_CANAL} para medir preferência de canal.`,
    );
  }

  const ordenado = [...contagens].sort((a, b) => b[1] - a[1]);
  const [canal, qtd] = ordenado[0]!;
  const participacao = (qtd / total) * 100;
  const segundo = ordenado[1]!;

  const fatores: Fator[] = [
    {
      nome: `Concentração em ${canalLabels[canal]}`,
      detalhe: `${n(qtd)} de ${n(total)} interações (${n(participacao)}%).`,
      peso: round(participacao),
      direcao: "positivo",
    },
  ];
  if (segundo[1] > 0) {
    fatores.push({
      nome: `Segundo canal: ${canalLabels[segundo[0]]}`,
      detalhe: `${n(segundo[1])} interação(ões) (${n((segundo[1] / total) * 100)}%).`,
      peso: 0,
      direcao: "neutro",
    });
  }

  // Preferência fraca quando os dois primeiros canais empatam.
  const separacao = (qtd - segundo[1]) / total;
  const confianca = confiancaPorAmostra(total, MIN_CANAL) * clamp(0.55 + separacao, 0.55, 1);
  if (separacao < 0.15) {
    fatores.push({
      nome: "Preferência pouco marcada",
      detalhe: "Os dois canais mais usados estão a menos de 15 pontos de distância.",
      peso: 0,
      direcao: "negativo",
    });
  }

  return traco<CanalPreferido>(
    { canal, interacoes: qtd, participacaoPct: round(participacao, 1) },
    confianca,
    fatores,
    base,
    calculadoEm,
  );
}

/* ------------------------------------------------------------------ *
 * GATE 01b — Janela favorita (horário e dia)
 * ------------------------------------------------------------------ */

export type JanelaContato = { hora: number; faixa: string; diaSemana: number | null; diaLabel: string | null };

export const diasLabels = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const faixaDoDia = (hora: number) =>
  hora < 6 ? "madrugada" : hora < 12 ? "manhã" : hora < 18 ? "tarde" : "noite";

const MIN_JANELA = 6;

export function janelaFavorita(r: PersonBehaviorRow, agora: Date): Previsao<JanelaContato> {
  const calculadoEm = agora.toISOString();
  const base = `activities da pessoa, hora local (America/Sao_Paulo); amostra da hora dominante = ${n(r.horaFavoritaAmostra)}.`;

  if (r.horaFavorita == null || r.interacoesTotal < MIN_JANELA) {
    return traco<JanelaContato>(
      null,
      confiancaPorAmostra(r.interacoesTotal, MIN_JANELA),
      [],
      base,
      calculadoEm,
      `Amostra de ${n(r.interacoesTotal)} interação(ões) — mínimo de ${MIN_JANELA} para medir horário preferido.`,
    );
  }

  const dominancia = r.interacoesTotal > 0 ? (r.horaFavoritaAmostra / r.interacoesTotal) * 100 : 0;
  const fatores: Fator[] = [
    {
      nome: "Horário mais frequente",
      detalhe: `${r.horaFavorita}h concentra ${n(r.horaFavoritaAmostra)} de ${n(r.interacoesTotal)} interações (${n(dominancia)}%).`,
      peso: round(dominancia),
      direcao: "positivo",
    },
  ];
  if (r.diaSemanaFavorito != null) {
    fatores.push({
      nome: "Dia da semana mais frequente",
      detalhe: `${diasLabels[r.diaSemanaFavorito] ?? "—"} é o dia com mais interações registradas.`,
      peso: 0,
      direcao: "neutro",
    });
  }

  return traco<JanelaContato>(
    {
      hora: r.horaFavorita,
      faixa: faixaDoDia(r.horaFavorita),
      diaSemana: r.diaSemanaFavorito,
      diaLabel: r.diaSemanaFavorito == null ? null : (diasLabels[r.diaSemanaFavorito] ?? null),
    },
    confiancaPorAmostra(r.interacoesTotal, MIN_JANELA) * clamp(0.6 + dominancia / 100, 0.6, 1),
    fatores,
    base,
    calculadoEm,
  );
}

/* ------------------------------------------------------------------ *
 * GATE 02 — Responsividade (tempo médio de resposta MEDIDO)
 * ------------------------------------------------------------------ */

export type Responsividade = {
  horas: number;
  classe: "imediata" | "rapida" | "lenta" | "muito_lenta";
};

export const responsividadeLabels: Record<Responsividade["classe"], string> = {
  imediata: "Responde no mesmo dia",
  rapida: "Responde em até 3 dias",
  lenta: "Responde em até uma semana",
  muito_lenta: "Responde depois de uma semana",
};

const MIN_RESPOSTA = 2;

export function responsividade(r: PersonBehaviorRow, agora: Date): Previsao<Responsividade> {
  const calculadoEm = agora.toISOString();
  const base = `proposals: intervalo entre envio e resposta (${n(r.respostaPropostaAmostra)} proposta(s) respondida(s)).`;

  if (r.respostaPropostaHoras == null || r.respostaPropostaAmostra < MIN_RESPOSTA) {
    const fatores: Fator[] = [];
    if (r.intervaloMedioHoras != null) {
      fatores.push({
        nome: "Ritmo de interação (proxy, não é resposta)",
        detalhe: `Intervalo médio de ${n(r.intervaloMedioHoras / 24)} dia(s) entre interações registradas.`,
        peso: 0,
        direcao: "neutro",
      });
    }
    return traco<Responsividade>(
      null,
      confiancaPorAmostra(r.respostaPropostaAmostra, MIN_RESPOSTA),
      fatores,
      base,
      calculadoEm,
      r.respostaPropostaAmostra === 0
        ? "Nenhuma proposta com envio e resposta registrados — não há tempo de resposta medido."
        : `Apenas ${n(r.respostaPropostaAmostra)} resposta(s) medida(s) — mínimo de ${MIN_RESPOSTA}.`,
    );
  }

  const h = r.respostaPropostaHoras;
  const classe: Responsividade["classe"] =
    h <= 24 ? "imediata" : h <= 72 ? "rapida" : h <= 168 ? "lenta" : "muito_lenta";

  return traco<Responsividade>(
    { horas: round(h, 1), classe },
    confiancaPorAmostra(r.respostaPropostaAmostra, MIN_RESPOSTA),
    [
      {
        nome: "Tempo médio de resposta",
        detalhe: `${n(h)}h (${n(h / 24)} dia(s)) entre proposta enviada e respondida, em ${n(r.respostaPropostaAmostra)} caso(s).`,
        peso: round(h),
        direcao: h <= 72 ? "positivo" : "negativo",
      },
    ],
    base,
    calculadoEm,
  );
}

/* ------------------------------------------------------------------ *
 * GATE 03 — Velocidade de decisão
 * ------------------------------------------------------------------ */

export type VelocidadeDecisao = {
  diasAtePrimeiraProposta: number | null;
  cicloFechamentoDias: number | null;
  classe: "rapida" | "media" | "longa";
};

const MIN_DECISAO = 1;

export function velocidadeDecisao(r: PersonBehaviorRow, agora: Date): Previsao<VelocidadeDecisao> {
  const calculadoEm = agora.toISOString();
  const base = "opportunities → proposals.enviada_em e sales.assinado_em da própria pessoa.";
  const temCiclo = r.cicloFechamentoDias != null && r.vendas > 0;
  const temProposta = r.diasAtePrimeiraProposta != null && r.propostasEnviadas > 0;

  if (!temCiclo && !temProposta) {
    return traco<VelocidadeDecisao>(
      null,
      0,
      [],
      base,
      calculadoEm,
      "Sem proposta enviada nem venda assinada — não há intervalo de decisão medido.",
    );
  }

  const fatores: Fator[] = [];
  if (temProposta) {
    fatores.push({
      nome: "Da criação até a proposta",
      detalhe: `${n(r.diasAtePrimeiraProposta!)} dia(s) em média, em ${n(r.propostasEnviadas)} proposta(s) enviada(s).`,
      peso: round(r.diasAtePrimeiraProposta!),
      direcao: r.diasAtePrimeiraProposta! <= 15 ? "positivo" : "negativo",
    });
  }
  if (temCiclo) {
    fatores.push({
      nome: "Ciclo até a assinatura",
      detalhe: `${n(r.cicloFechamentoDias!)} dia(s) entre criação da oportunidade e assinatura, em ${n(r.vendas)} venda(s).`,
      peso: round(r.cicloFechamentoDias!),
      direcao: r.cicloFechamentoDias! <= 45 ? "positivo" : "negativo",
    });
  }
  if (r.rodadasPropostaMax > 1) {
    fatores.push({
      nome: "Rodadas de negociação",
      detalhe: `Até ${n(r.rodadasPropostaMax)} versões de proposta na mesma negociação.`,
      peso: 0,
      direcao: "negativo",
    });
  }

  const referencia = r.cicloFechamentoDias ?? r.diasAtePrimeiraProposta!;
  const classe: VelocidadeDecisao["classe"] =
    referencia <= 30 ? "rapida" : referencia <= 90 ? "media" : "longa";

  const amostra = (temCiclo ? r.vendas : 0) + (temProposta ? r.propostasEnviadas : 0);

  return traco<VelocidadeDecisao>(
    {
      diasAtePrimeiraProposta: temProposta ? round(r.diasAtePrimeiraProposta!, 1) : null,
      cicloFechamentoDias: temCiclo ? round(r.cicloFechamentoDias!, 1) : null,
      classe,
    },
    confiancaPorAmostra(amostra, 3) * (temCiclo ? 1 : 0.7),
    fatores,
    base,
    calculadoEm,
  );
}

/* ------------------------------------------------------------------ *
 * GATE 04 — Sensibilidade a preço
 * ------------------------------------------------------------------ */

export type SensibilidadePreco = {
  descontoMedioPct: number | null;
  rodadas: number;
  classe: "baixa" | "media" | "alta";
};

export function sensibilidadePreco(r: PersonBehaviorRow, agora: Date): Previsao<SensibilidadePreco> {
  const calculadoEm = agora.toISOString();
  const base = "sales.valor_final × proposals.valor e número de versões da proposta.";
  const temDesconto = r.descontoMedioPct != null && r.vendas > 0;

  if (!temDesconto && r.rodadasPropostaMax <= 1 && r.propostasRecusadas === 0) {
    return traco<SensibilidadePreco>(
      null,
      0,
      [],
      base,
      calculadoEm,
      "Sem venda com proposta vinculada, renegociação ou recusa — não há evidência de sensibilidade a preço.",
    );
  }

  const fatores: Fator[] = [];
  let pontos = 0;

  if (temDesconto) {
    const d = r.descontoMedioPct!;
    pontos += clamp(d * 6, -30, 60);
    fatores.push({
      nome: d >= 0 ? "Desconto médio obtido" : "Fechou acima da proposta",
      detalhe: `${n(Math.abs(d))}% de diferença entre proposta e valor final, em ${n(r.vendas)} venda(s).`,
      peso: round(d, 1),
      direcao: d >= 3 ? "negativo" : "positivo",
    });
  }
  if (r.rodadasPropostaMax > 1) {
    pontos += (r.rodadasPropostaMax - 1) * 12;
    fatores.push({
      nome: "Renegociações",
      detalhe: `${n(r.rodadasPropostaMax)} versões de proposta registradas.`,
      peso: (r.rodadasPropostaMax - 1) * 12,
      direcao: "negativo",
    });
  }
  if (r.propostasRecusadas > 0) {
    pontos += r.propostasRecusadas * 10;
    fatores.push({
      nome: "Propostas recusadas",
      detalhe: `${n(r.propostasRecusadas)} proposta(s) recusada(s).`,
      peso: r.propostasRecusadas * 10,
      direcao: "negativo",
    });
  }
  if (r.precoTeto != null && r.ltv > 0) {
    const acima = r.ltv > r.precoTeto;
    fatores.push({
      nome: acima ? "Comprou acima do teto declarado" : "Comprou dentro do teto declarado",
      detalhe: `Teto ${brl(r.precoTeto)} · valor fechado ${brl(r.ltv)}.`,
      peso: 0,
      direcao: acima ? "positivo" : "neutro",
    });
    if (acima) pontos -= 15;
  }

  const classe: SensibilidadePreco["classe"] = pontos >= 40 ? "alta" : pontos >= 15 ? "media" : "baixa";
  const amostra = r.vendas + r.propostas;

  return traco<SensibilidadePreco>(
    {
      descontoMedioPct: temDesconto ? round(r.descontoMedioPct!, 1) : null,
      rodadas: r.rodadasPropostaMax,
      classe,
    },
    confiancaPorAmostra(amostra, 3),
    fatores,
    base,
    calculadoEm,
  );
}

/* ------------------------------------------------------------------ *
 * GATE 05 — Perfil de compra / investimento
 * ------------------------------------------------------------------ */

export type PerfilCompra = {
  declarado: string | null;
  observado: "investidor" | "moradia" | "indefinido";
};

export function perfilDeCompra(r: PersonBehaviorRow, agora: Date): Previsao<PerfilCompra> {
  const calculadoEm = agora.toISOString();
  const base = "person_qualifications.perfil (declarado) × vendas, estágio e recorrência (observado).";
  const fatores: Fator[] = [];

  if (r.perfil) {
    fatores.push({
      nome: "Perfil declarado",
      detalhe: `Registrado na qualificação como "${r.perfil}".`,
      peso: 0,
      direcao: "neutro",
    });
  }

  let investidor = 0;
  if (r.vendas > 1) {
    investidor += 2;
    fatores.push({
      nome: "Compra recorrente",
      detalhe: `${n(r.vendas)} vendas registradas para a mesma pessoa.`,
      peso: 2,
      direcao: "positivo",
    });
  }
  if (r.estagio === "investidor") {
    investidor += 2;
    fatores.push({
      nome: "Estágio da jornada",
      detalhe: "Classificada como investidor no cadastro.",
      peso: 2,
      direcao: "positivo",
    });
  }
  if (r.primeiroImovel === true) {
    investidor -= 2;
    fatores.push({
      nome: "Primeiro imóvel",
      detalhe: "Declarou que é a primeira aquisição.",
      peso: -2,
      direcao: "negativo",
    });
  }

  if (!r.perfil && investidor === 0) {
    return traco<PerfilCompra>(
      null,
      0,
      fatores,
      base,
      calculadoEm,
      "Sem qualificação preenchida e sem histórico suficiente para observar perfil.",
    );
  }

  const observado: PerfilCompra["observado"] =
    investidor >= 2 ? "investidor" : investidor <= -2 ? "moradia" : "indefinido";

  return traco<PerfilCompra>(
    { declarado: r.perfil, observado },
    confiancaPorAmostra(r.vendas + (r.perfil ? 2 : 0), 3),
    fatores,
    base,
    calculadoEm,
  );
}

/* ------------------------------------------------------------------ *
 * GATE 06 — Objeções recorrentes
 * ------------------------------------------------------------------ */

export function objecoesRecorrentes(r: PersonBehaviorRow, agora: Date): Previsao<string[]> {
  const calculadoEm = agora.toISOString();
  const base = `opportunities.perdido_motivo (${n(r.oportunidadesPerdidas)} oportunidade(s) perdida(s)).`;
  const motivos = r.motivosPerda.filter((m) => m.trim().length > 0);

  if (motivos.length === 0) {
    return traco<string[]>(
      null,
      0,
      [],
      base,
      calculadoEm,
      r.oportunidadesPerdidas === 0
        ? "Nenhuma oportunidade perdida registrada."
        : "Oportunidades perdidas sem motivo preenchido — a objeção não foi registrada.",
    );
  }

  return traco<string[]>(
    motivos,
    confiancaPorAmostra(motivos.length, 2),
    motivos.map((m) => ({
      nome: "Objeção registrada",
      detalhe: m,
      peso: 0,
      direcao: "negativo" as const,
    })),
    base,
    calculadoEm,
  );
}

/* ------------------------------------------------------------------ *
 * GATE 07 — Valor do cliente e propensão a indicar
 * ------------------------------------------------------------------ */

export type ValorCliente = { ltv: number; vendas: number; distratos: number };

export function valorDoCliente(r: PersonBehaviorRow, agora: Date): Previsao<ValorCliente> {
  const calculadoEm = agora.toISOString();
  const base = "sales assinadas da pessoa (valor_final).";

  if (r.vendas === 0) {
    return traco<ValorCliente>(
      null,
      0,
      [],
      base,
      calculadoEm,
      "Nenhuma venda assinada — o valor realizado ainda é zero, não estimado.",
    );
  }

  const fatores: Fator[] = [
    {
      nome: "Valor realizado",
      detalhe: `${brl(r.ltv)} em ${n(r.vendas)} venda(s) assinada(s).`,
      peso: round(r.ltv),
      direcao: "positivo",
    },
  ];
  if (r.distratos > 0) {
    fatores.push({
      nome: "Distratos",
      detalhe: `${n(r.distratos)} contrato(s) distratado(s).`,
      peso: -r.distratos,
      direcao: "negativo",
    });
  }

  return traco<ValorCliente>(
    { ltv: round(r.ltv), vendas: r.vendas, distratos: r.distratos },
    confiancaPorAmostra(r.vendas, 1),
    fatores,
    base,
    calculadoEm,
  );
}

export type PropensaoIndicacao = { indicacoesFeitas: number; classe: "alta" | "media" | "baixa" };

export function propensaoIndicacao(r: PersonBehaviorRow, agora: Date): Previsao<PropensaoIndicacao> {
  const calculadoEm = agora.toISOString();
  const base = "person_relationships (tipo indicou), vendas assinadas e distratos.";

  if (r.indicacoesFeitas === 0 && r.vendas === 0) {
    return traco<PropensaoIndicacao>(
      null,
      0,
      [],
      base,
      calculadoEm,
      "Sem indicação registrada e sem venda concluída — não há base para medir propensão.",
    );
  }

  const fatores: Fator[] = [];
  let pontos = 0;

  if (r.indicacoesFeitas > 0) {
    pontos += r.indicacoesFeitas * 25;
    fatores.push({
      nome: "Indicações já feitas",
      detalhe: `${n(r.indicacoesFeitas)} pessoa(s) indicada(s) e registradas no relacionamento.`,
      peso: r.indicacoesFeitas * 25,
      direcao: "positivo",
    });
  }
  if (r.vendas > 0 && r.distratos === 0) {
    pontos += 20;
    fatores.push({
      nome: "Compra concluída sem distrato",
      detalhe: `${n(r.vendas)} venda(s) assinada(s), nenhum distrato.`,
      peso: 20,
      direcao: "positivo",
    });
  }
  if (r.distratos > 0) {
    pontos -= 30;
    fatores.push({
      nome: "Distrato no histórico",
      detalhe: `${n(r.distratos)} distrato(s) registrado(s).`,
      peso: -30,
      direcao: "negativo",
    });
  }

  const classe: PropensaoIndicacao["classe"] = pontos >= 45 ? "alta" : pontos >= 20 ? "media" : "baixa";

  return traco<PropensaoIndicacao>(
    { indicacoesFeitas: r.indicacoesFeitas, classe },
    confiancaPorAmostra(r.indicacoesFeitas + r.vendas, 2),
    fatores,
    base,
    calculadoEm,
  );
}

/* ------------------------------------------------------------------ *
 * GATE 08 — Engajamento (score 0–100)
 * ------------------------------------------------------------------ */

export type Engajamento = { score: number; classe: "ativo" | "morno" | "esfriando" | "inativo" };

export function engajamento(r: PersonBehaviorRow, agora: Date): Previsao<Engajamento> {
  const calculadoEm = agora.toISOString();
  const base = "activities dos últimos 90 dias, visitas realizadas e último contato registrado.";

  if (r.interacoesTotal === 0 && r.ultimoContatoEm == null) {
    return traco<Engajamento>(
      null,
      0,
      [],
      base,
      calculadoEm,
      "Nenhuma interação registrada — não é desengajamento medido, é ausência de registro.",
    );
  }

  const fatores: Fator[] = [];
  let score = 30;
  const aplicar = (peso: number, nome: string, detalhe: string) => {
    score += peso;
    fatores.push({ nome, detalhe, peso, direcao: peso > 0 ? "positivo" : peso < 0 ? "negativo" : "neutro" });
  };

  if (r.interacoes90d > 0) {
    const peso = clamp(r.interacoes90d * 5, 5, 30);
    aplicar(peso, "Interações recentes", `${n(r.interacoes90d)} interação(ões) nos últimos 90 dias.`);
  } else {
    aplicar(-15, "Sem interação em 90 dias", "Nenhuma interação registrada na janela de 90 dias.");
  }

  if (r.visitasRealizadas > 0) {
    aplicar(15, "Visita realizada", `${n(r.visitasRealizadas)} visita(s) com presença confirmada.`);
  }
  if (r.visitasFaltou > 0) {
    aplicar(-10 * Math.min(r.visitasFaltou, 2), "Faltou a visita", `${n(r.visitasFaltou)} ausência(s) em visita agendada.`);
  }
  if (r.propostasEnviadas > 0) {
    aplicar(12, "Proposta em jogo", `${n(r.propostasEnviadas)} proposta(s) enviada(s).`);
  }

  const diasSemContato = diasEntre(r.ultimoContatoEm ?? r.ultimaInteracao, agora);
  if (diasSemContato != null) {
    if (diasSemContato <= 7) aplicar(15, "Contato recente", `Último contato há ${n(diasSemContato)} dia(s).`);
    else if (diasSemContato <= 30) aplicar(0, "Contato no mês", `Último contato há ${n(diasSemContato)} dia(s).`);
    else if (diasSemContato <= 90) aplicar(-12, "Esfriando", `Último contato há ${n(diasSemContato)} dia(s).`);
    else aplicar(-25, "Contato frio", `Último contato há ${n(diasSemContato)} dia(s).`);
  }

  const final = clamp(round(score), 0, 100);
  const classe: Engajamento["classe"] =
    final >= 70 ? "ativo" : final >= 50 ? "morno" : final >= 30 ? "esfriando" : "inativo";

  return traco<Engajamento>(
    { score: final, classe },
    confiancaPorAmostra(r.interacoesTotal, 5),
    fatores,
    base,
    calculadoEm,
  );
}

/* ------------------------------------------------------------------ *
 * Perfil comportamental consolidado
 * ------------------------------------------------------------------ */

export type PerfilComportamental = {
  personId: string;
  nome: string;
  estagio: string | null;
  origem: string | null;
  responsavelNome: string | null;
  interacoes: number;
  canal: Previsao<CanalPreferido>;
  janela: Previsao<JanelaContato>;
  resposta: Previsao<Responsividade>;
  velocidade: Previsao<VelocidadeDecisao>;
  preco: Previsao<SensibilidadePreco>;
  perfil: Previsao<PerfilCompra>;
  objecoes: Previsao<string[]>;
  valor: Previsao<ValorCliente>;
  indicacao: Previsao<PropensaoIndicacao>;
  engajamento: Previsao<Engajamento>;
  /** Média das confianças dos traços medidos. 0 quando nada pôde ser medido. */
  cobertura: number;
  /** Como abordar esta pessoa, derivado só dos traços com valor medido. */
  comoAbordar: string[];
  calculadoEm: string;
};

export function analisarComportamento(r: PersonBehaviorRow, agora: Date = new Date()): PerfilComportamental {
  const canal = canalFavorito(r, agora);
  const janela = janelaFavorita(r, agora);
  const resposta = responsividade(r, agora);
  const velocidade = velocidadeDecisao(r, agora);
  const preco = sensibilidadePreco(r, agora);
  const perfil = perfilDeCompra(r, agora);
  const objecoes = objecoesRecorrentes(r, agora);
  const valor = valorDoCliente(r, agora);
  const indicacao = propensaoIndicacao(r, agora);
  const eng = engajamento(r, agora);

  const tracos = [canal, janela, resposta, velocidade, preco, perfil, objecoes, valor, indicacao, eng];
  const medidos = tracos.filter((t) => t.valor != null);
  const cobertura = medidos.length === 0 ? 0 : round(medidos.reduce((s, t) => s + t.confianca, 0) / tracos.length);

  const comoAbordar: string[] = [];
  if (canal.valor) {
    comoAbordar.push(
      `Falar por ${canalLabels[canal.valor.canal]} — ${n(canal.valor.participacaoPct)}% das interações desta pessoa.`,
    );
  }
  if (janela.valor) {
    comoAbordar.push(
      `Procurar por volta das ${janela.valor.hora}h${janela.valor.diaLabel ? `, de preferência ${janela.valor.diaLabel.toLowerCase()}` : ""} (${janela.valor.faixa}).`,
    );
  }
  if (resposta.valor && (resposta.valor.classe === "lenta" || resposta.valor.classe === "muito_lenta")) {
    comoAbordar.push(
      `Dar prazo: responde em média em ${n(resposta.valor.horas / 24)} dia(s). Cobrar antes disso tende a não render.`,
    );
  }
  if (preco.valor?.classe === "alta") {
    comoAbordar.push("Chegar com condição fechada: histórico mostra renegociação e sensibilidade a preço.");
  }
  if (perfil.valor?.observado === "investidor") {
    comoAbordar.push("Argumentar por retorno e liquidez: comportamento observado é de investidor.");
  }
  if (objecoes.valor) {
    comoAbordar.push(`Antecipar a objeção já registrada: ${objecoes.valor[0]}.`);
  }
  if (eng.valor && (eng.valor.classe === "esfriando" || eng.valor.classe === "inativo")) {
    comoAbordar.push(`Reativar antes de propor: engajamento ${eng.valor.classe} (${eng.valor.score}/100).`);
  }
  if (indicacao.valor?.classe === "alta") {
    comoAbordar.push("Pedir indicação: já indicou e não tem distrato no histórico.");
  }

  return {
    personId: r.personId,
    nome: r.nome,
    estagio: r.estagio,
    origem: r.origem,
    responsavelNome: r.responsavelNome,
    interacoes: r.interacoesTotal,
    canal,
    janela,
    resposta,
    velocidade,
    preco,
    perfil,
    objecoes,
    valor,
    indicacao,
    engajamento: eng,
    cobertura,
    comoAbordar,
    calculadoEm: agora.toISOString(),
  };
}

/* ------------------------------------------------------------------ *
 * Panorama da carteira
 * ------------------------------------------------------------------ */

export type PanoramaBehavior = {
  pessoas: number;
  comEvidencia: number;
  coberturaMedia: number;
  canais: Array<{ canal: Canal; pessoas: number; participacaoPct: number }>;
  faixas: Array<{ faixa: string; pessoas: number }>;
  engajamento: Record<Engajamento["classe"], number>;
  respostaMediaHoras: number | null;
  cicloMedioDias: number | null;
  objecoesTop: Array<{ motivo: string; ocorrencias: number }>;
  ltvTotal: number;
  geradoEm: string;
};

export function montarPanorama(
  perfis: readonly PerfilComportamental[],
  agora: Date = new Date(),
): PanoramaBehavior {
  const comEvidencia = perfis.filter((p) => p.cobertura > 0);

  const canalCount = new Map<Canal, number>();
  for (const p of perfis) {
    if (p.canal.valor) canalCount.set(p.canal.valor.canal, (canalCount.get(p.canal.valor.canal) ?? 0) + 1);
  }
  const totalCanal = [...canalCount.values()].reduce((s, v) => s + v, 0);

  const faixaCount = new Map<string, number>();
  for (const p of perfis) {
    if (p.janela.valor) faixaCount.set(p.janela.valor.faixa, (faixaCount.get(p.janela.valor.faixa) ?? 0) + 1);
  }

  const eng: Record<Engajamento["classe"], number> = { ativo: 0, morno: 0, esfriando: 0, inativo: 0 };
  for (const p of perfis) if (p.engajamento.valor) eng[p.engajamento.valor.classe] += 1;

  const respostas = perfis.map((p) => p.resposta.valor?.horas).filter((v): v is number => v != null);
  const ciclos = perfis
    .map((p) => p.velocidade.valor?.cicloFechamentoDias)
    .filter((v): v is number => v != null);

  const objecoes = new Map<string, number>();
  for (const p of perfis) {
    for (const m of p.objecoes.valor ?? []) objecoes.set(m, (objecoes.get(m) ?? 0) + 1);
  }

  return {
    pessoas: perfis.length,
    comEvidencia: comEvidencia.length,
    coberturaMedia:
      comEvidencia.length === 0
        ? 0
        : round(comEvidencia.reduce((s, p) => s + p.cobertura, 0) / comEvidencia.length),
    canais: [...canalCount.entries()]
      .map(([canal, pessoas]) => ({
        canal,
        pessoas,
        participacaoPct: totalCanal === 0 ? 0 : round((pessoas / totalCanal) * 100, 1),
      }))
      .sort((a, b) => b.pessoas - a.pessoas),
    faixas: [...faixaCount.entries()]
      .map(([faixa, pessoas]) => ({ faixa, pessoas }))
      .sort((a, b) => b.pessoas - a.pessoas),
    engajamento: eng,
    respostaMediaHoras:
      respostas.length === 0 ? null : round(respostas.reduce((s, v) => s + v, 0) / respostas.length, 1),
    cicloMedioDias: ciclos.length === 0 ? null : round(ciclos.reduce((s, v) => s + v, 0) / ciclos.length, 1),
    objecoesTop: [...objecoes.entries()]
      .map(([motivo, ocorrencias]) => ({ motivo, ocorrencias }))
      .sort((a, b) => b.ocorrencias - a.ocorrencias)
      .slice(0, 5),
    ltvTotal: round(perfis.reduce((s, p) => s + (p.valor.valor?.ltv ?? 0), 0)),
    geradoEm: agora.toISOString(),
  };
}
