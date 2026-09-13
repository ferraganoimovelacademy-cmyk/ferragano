/**
 * ASSET INTELLIGENCE (contexto Property/Asset) — camada pura e client-safe.
 *
 * Não consulta nada: recebe a mídia já lida pela biblioteca (Sprint UI 04.2) e a
 * demanda medida do Read Model `property_360`, e devolve:
 *   1. cobertura de mídia e lacunas por empreendimento;
 *   2. impacto estimado da lacuna visual — sempre no envelope `Previsao` (ADR-021);
 *   3. ranking de ativos por contribuição determinística;
 *   4. correlação entre qualidade visual e conversão medida (ADR-025: correlação
 *      não é causalidade — a leitura sai rotulada como tal).
 *
 * Nenhuma métrica nova é inventada aqui: o que não tem evidência devolve `null`
 * com motivo declarado.
 */
import {
  GALERIA_MINIMA,
  avaliarMidia,
  type MediaChecklist,
  type MidiaItem,
} from "@/lib/platform/media";
import { nivelDeConfianca, type Fator, type Previsao } from "@/lib/platform/predictive";
import { pearson, pValorPearson, type ForcaCorrelacao } from "@/lib/platform/market-analytics";

/* ------------------------------------------------------------------ *
 * Entradas
 * ------------------------------------------------------------------ */

/** Demanda medida do empreendimento (Read Model `property_360`). */
export type DemandaEmpreendimento = {
  oportunidadesTotal: number;
  oportunidadesAbertas: number;
  oportunidadesGanhas: number;
  visitasTotal: number;
  visitas30d: number;
  valorPipeline: number;
  conversaoPercentual: number | null;
  unidadesDisponiveis: number;
};

export type EmpreendimentoAtivos = {
  empreendimentoId: string;
  nome: string;
  slug: string;
  cidade: string | null;
  publico: boolean;
  capaUrl: string | null;
  itens: MidiaItem[];
  demanda: DemandaEmpreendimento | null;
};

/* ------------------------------------------------------------------ *
 * GATE 01 — Cobertura e lacunas
 * ------------------------------------------------------------------ */

export type ItemChecklist = keyof MediaChecklist;

/** Peso de exposição pública de cada ativo requerido (soma 100). */
export const PESO_EXPOSICAO: Record<ItemChecklist, number> = {
  capa: 28,
  galeria: 24,
  plantas: 14,
  seo: 12,
  tour: 10,
  video: 8,
  pdf: 4,
};

/** Ativos que o visitante vê antes de decidir visitar. */
export const ATIVOS_VISUAIS: ItemChecklist[] = ["capa", "galeria", "plantas", "tour"];

export const LACUNA_LABELS: Record<ItemChecklist, string> = {
  capa: "Capa oficial ausente",
  galeria: `Galeria com menos de ${GALERIA_MINIMA} imagens`,
  plantas: "Nenhuma planta publicada",
  seo: "Texto alternativo pendente",
  tour: "Sem tour virtual",
  video: "Sem vídeo oficial",
  pdf: "Sem material em PDF",
};

export const LACUNA_ACOES: Record<ItemChecklist, string> = {
  capa: "Definir capa na Biblioteca de mídia",
  galeria: `Importar ao menos ${GALERIA_MINIMA} imagens oficiais`,
  plantas: "Importar plantas humanizadas",
  seo: "Preencher alt das imagens e plantas",
  tour: "Publicar link do tour 360º",
  video: "Publicar vídeo oficial da construtora",
  pdf: "Anexar material comercial em PDF",
};

export type Lacuna = {
  item: ItemChecklist;
  rotulo: string;
  acao: string;
  peso: number;
  visual: boolean;
};

export function lacunasDe(emp: EmpreendimentoAtivos): Lacuna[] {
  const { checklist } = avaliarMidia({ capaUrl: emp.capaUrl, itens: emp.itens });
  return (Object.keys(PESO_EXPOSICAO) as ItemChecklist[])
    .filter((k) => !checklist[k])
    .map((item) => ({
      item,
      rotulo: LACUNA_LABELS[item],
      acao: LACUNA_ACOES[item],
      peso: PESO_EXPOSICAO[item],
      visual: ATIVOS_VISUAIS.includes(item),
    }))
    .sort((a, b) => b.peso - a.peso);
}

/* ------------------------------------------------------------------ *
 * GATE 02 — Impacto estimado da lacuna visual (ADR-021)
 * ------------------------------------------------------------------ */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
    .format(v);

/** Amostra mínima de oportunidades para falar de pipeline exposto. */
export const AMOSTRA_DEMANDA_MINIMA = 10;

/**
 * Pipeline exposto: parcela do pipeline aberto que hoje é apresentada sem os
 * ativos visuais que o comprador consulta antes da visita. NÃO é perda
 * projetada — é exposição medida sobre pipeline real.
 */
export function estimarPipelineExposto(
  emp: EmpreendimentoAtivos,
  calculadoEm: string,
): Previsao<number> {
  const lacunas = lacunasDe(emp);
  const visuais = lacunas.filter((l) => l.visual);
  const pesoVisualTotal = ATIVOS_VISUAIS.reduce((a, k) => a + PESO_EXPOSICAO[k], 0);
  const pesoAusente = visuais.reduce((a, l) => a + l.peso, 0);
  const fracao = pesoAusente / pesoVisualTotal;

  const base = "Read Model property_360 + property_media (Biblioteca de mídia)";

  if (!emp.demanda) {
    return {
      valor: null,
      confianca: 0,
      nivel: nivelDeConfianca(0),
      fatores: [],
      base,
      calculadoEm,
      motivoAusencia: "Empreendimento sem linha no Read Model property_360.",
    };
  }

  const { valorPipeline, oportunidadesAbertas, oportunidadesTotal } = emp.demanda;

  const fatores: Fator[] = [
    {
      nome: "Lacuna visual",
      detalhe: visuais.length
        ? `${visuais.map((l) => l.item).join(", ")} — ${Math.round(fracao * 100)}% do peso visual ausente`
        : "Todos os ativos visuais publicados",
      peso: Math.round(fracao * 100),
      direcao: visuais.length ? "negativo" : "positivo",
    },
    {
      nome: "Pipeline aberto",
      detalhe: `${brl(valorPipeline)} em ${oportunidadesAbertas} oportunidade(s) aberta(s)`,
      peso: 0,
      direcao: "neutro",
    },
    {
      nome: "Amostra de demanda",
      detalhe: `${oportunidadesTotal} oportunidade(s) registradas · ${emp.demanda.visitasTotal} visita(s)`,
      peso: 0,
      direcao: "neutro",
    },
  ];

  if (valorPipeline <= 0) {
    return {
      valor: null,
      confianca: 0,
      nivel: nivelDeConfianca(0),
      fatores,
      base,
      calculadoEm,
      motivoAusencia: "Sem pipeline aberto medido: não há valor a expor.",
    };
  }

  if (oportunidadesTotal < AMOSTRA_DEMANDA_MINIMA) {
    return {
      valor: null,
      confianca: clamp((oportunidadesTotal / AMOSTRA_DEMANDA_MINIMA) * 30, 0, 29),
      nivel: nivelDeConfianca(0),
      fatores,
      base,
      calculadoEm,
      motivoAusencia: `Amostra insuficiente: menos de ${AMOSTRA_DEMANDA_MINIMA} oportunidades no empreendimento.`,
    };
  }

  // Confiança mede a EVIDÊNCIA (volume medido), nunca o tamanho da exposição.
  const confianca = clamp(
    35 +
      Math.min(oportunidadesTotal / 4, 30) +
      Math.min(emp.demanda.visitasTotal / 4, 20) +
      (emp.publico ? 10 : 0),
    0,
    95,
  );

  return {
    valor: Math.round(valorPipeline * fracao),
    confianca: Math.round(confianca),
    nivel: nivelDeConfianca(confianca),
    fatores,
    base,
    calculadoEm,
  };
}

/* ------------------------------------------------------------------ *
 * GATE 03 — Ranking de ativos por contribuição
 * ------------------------------------------------------------------ */

export type AtivoRanqueado = {
  id: string;
  empreendimentoId: string;
  empreendimento: string;
  tipo: MidiaItem["tipo"];
  titulo: string | null;
  url: string;
  ehCapa: boolean;
  posicao: number;
  contribuicao: number;
  fatores: Fator[];
};

const BASE_TIPO: Record<MidiaItem["tipo"], number> = {
  imagem: 30,
  planta: 24,
  tour: 22,
  video: 18,
  pdf: 8,
  outro: 4,
};

/** Resolução mínima aceita para uso em hero/Open Graph. */
export const LARGURA_MINIMA = 1200;

/**
 * Contribuição do ativo para a experiência pública. Determinística: posição na
 * galeria, papel de capa, SEO preenchido, resolução e publicação.
 */
export function pontuarAtivo(
  emp: EmpreendimentoAtivos,
  item: MidiaItem,
  posicao: number,
): AtivoRanqueado {
  const ehCapa = Boolean(emp.capaUrl && item.url === emp.capaUrl);
  const fatores: Fator[] = [];
  let score = BASE_TIPO[item.tipo];
  fatores.push({
    nome: "Tipo do ativo",
    detalhe: item.tipo,
    peso: BASE_TIPO[item.tipo],
    direcao: "positivo",
  });

  if (ehCapa) {
    score += 30;
    fatores.push({
      nome: "Capa pública",
      detalhe: "Aparece em hero, cards, Open Graph e sitemap de imagens",
      peso: 30,
      direcao: "positivo",
    });
  } else if (item.tipo === "imagem" || item.tipo === "planta") {
    const bonus = Math.max(0, 14 - posicao * 3);
    score += bonus;
    fatores.push({
      nome: "Posição na galeria",
      detalhe: `${posicao + 1}ª exibição do tipo ${item.tipo}`,
      peso: bonus,
      direcao: bonus > 0 ? "positivo" : "neutro",
    });
  }

  if (item.alt?.trim()) {
    score += 10;
    fatores.push({ nome: "SEO", detalhe: "Alt preenchido", peso: 10, direcao: "positivo" });
  } else {
    score -= 12;
    fatores.push({
      nome: "SEO",
      detalhe: "Alt ausente: não indexa e falha em acessibilidade",
      peso: -12,
      direcao: "negativo",
    });
  }

  if (item.largura != null) {
    const ok = item.largura >= LARGURA_MINIMA;
    score += ok ? 8 : -10;
    fatores.push({
      nome: "Resolução",
      detalhe: `${item.largura}px de largura (mínimo ${LARGURA_MINIMA}px)`,
      peso: ok ? 8 : -10,
      direcao: ok ? "positivo" : "negativo",
    });
  }

  if (!item.publico) {
    score -= 20;
    fatores.push({
      nome: "Publicação",
      detalhe: "Ativo não publicado: invisível no site",
      peso: -20,
      direcao: "negativo",
    });
  }

  return {
    id: item.id,
    empreendimentoId: emp.empreendimentoId,
    empreendimento: emp.nome,
    tipo: item.tipo,
    titulo: item.titulo,
    url: item.url,
    ehCapa,
    posicao,
    contribuicao: clamp(Math.round(score), 0, 100),
    fatores,
  };
}

export function ranquearAtivos(lista: EmpreendimentoAtivos[], limite = 20): AtivoRanqueado[] {
  const saida: AtivoRanqueado[] = [];
  for (const emp of lista) {
    const contador = new Map<string, number>();
    for (const item of [...emp.itens].sort((a, b) => a.ordem - b.ordem)) {
      const pos = contador.get(item.tipo) ?? 0;
      contador.set(item.tipo, pos + 1);
      saida.push(pontuarAtivo(emp, item, pos));
    }
  }
  return saida.sort((a, b) => b.contribuicao - a.contribuicao).slice(0, limite);
}

/* ------------------------------------------------------------------ *
 * GATE 04 — Qualidade visual × conversão (ADR-025)
 * ------------------------------------------------------------------ */

export const AMOSTRA_CORRELACAO_MINIMA = 8;

export type LeituraQualidade = {
  r: number | null;
  pValor: number | null;
  amostra: number;
  forca: ForcaCorrelacao;
  direcao: "positiva" | "negativa" | "indefinida";
  leitura: string;
  ressalva: string;
};

function forcaDe(r: number, p: number | null): ForcaCorrelacao {
  if (p != null && p > 0.1) return "sem_evidencia";
  const a = Math.abs(r);
  if (a >= 0.6) return "forte";
  if (a >= 0.3) return "moderada";
  return "fraca";
}

/** Correlação entre Health Score de mídia e conversão medida por empreendimento. */
export function correlacionarQualidadeConversao(lista: EmpreendimentoAtivos[]): LeituraQualidade {
  const pares = lista
    .filter((e) => e.demanda && e.demanda.oportunidadesTotal >= AMOSTRA_DEMANDA_MINIMA)
    .map((e) => ({
      score: avaliarMidia({ capaUrl: e.capaUrl, itens: e.itens }).score,
      conversao: e.demanda!.conversaoPercentual ?? 0,
    }));

  const ressalva =
    "Correlação não é causalidade (ADR-025): mídia e conversão podem variar juntas por preço, localização ou esforço comercial.";

  if (pares.length < AMOSTRA_CORRELACAO_MINIMA) {
    return {
      r: null,
      pValor: null,
      amostra: pares.length,
      forca: "sem_evidencia",
      direcao: "indefinida",
      leitura: `Amostra insuficiente: ${pares.length} de ${AMOSTRA_CORRELACAO_MINIMA} empreendimentos com demanda medida.`,
      ressalva,
    };
  }

  const r = pearson(
    pares.map((p) => p.score),
    pares.map((p) => p.conversao),
  );

  if (r == null) {
    return {
      r: null,
      pValor: null,
      amostra: pares.length,
      forca: "sem_evidencia",
      direcao: "indefinida",
      leitura: "Sem variação suficiente entre empreendimentos para medir correlação.",
      ressalva,
    };
  }

  const p = pValorPearson(r, pares.length);
  const forca = forcaDe(r, p);
  const direcao = forca === "sem_evidencia" ? "indefinida" : r >= 0 ? "positiva" : "negativa";

  return {
    r: Math.round(r * 100) / 100,
    pValor: p,
    amostra: pares.length,
    forca,
    direcao,
    leitura:
      forca === "sem_evidencia"
        ? "Sem evidência estatística de relação entre qualidade visual e conversão nesta amostra."
        : `Relação ${direcao} ${forca} entre Health Score de mídia e conversão (r = ${(Math.round(r * 100) / 100).toFixed(2)}, n = ${pares.length}).`,
    ressalva,
  };
}

/* ------------------------------------------------------------------ *
 * Agregação do módulo
 * ------------------------------------------------------------------ */

export type EmpreendimentoDiagnostico = {
  empreendimentoId: string;
  nome: string;
  slug: string;
  cidade: string | null;
  publico: boolean;
  score: number;
  estrelas: number;
  arquivos: number;
  lacunas: Lacuna[];
  pipelineExposto: Previsao<number>;
  prioridade: number;
};

export type AssetIntelligence = {
  calculadoEm: string;
  empreendimentos: EmpreendimentoDiagnostico[];
  ativos: AtivoRanqueado[];
  qualidade: LeituraQualidade;
  totais: {
    empreendimentos: number;
    semCapa: number;
    semGaleria: number;
    seoPendente: number;
    scoreMedio: number;
    pipelineExposto: number;
    comEvidencia: number;
  };
};

export function montarAssetIntelligence(
  lista: EmpreendimentoAtivos[],
  calculadoEm: string,
): AssetIntelligence {
  const empreendimentos = lista
    .map((emp) => {
      const { score, estrelas } = avaliarMidia({ capaUrl: emp.capaUrl, itens: emp.itens });
      const lacunas = lacunasDe(emp);
      const pipelineExposto = estimarPipelineExposto(emp, calculadoEm);
      // Prioridade: exposição medida primeiro; sem evidência, cai para a lacuna.
      const prioridade = pipelineExposto.valor
        ? pipelineExposto.valor
        : lacunas.reduce((a, l) => a + l.peso, 0);
      return {
        empreendimentoId: emp.empreendimentoId,
        nome: emp.nome,
        slug: emp.slug,
        cidade: emp.cidade,
        publico: emp.publico,
        score,
        estrelas,
        arquivos: emp.itens.length,
        lacunas,
        pipelineExposto,
        prioridade,
      };
    })
    .sort(
      (a, b) =>
        Number(Boolean(b.pipelineExposto.valor)) - Number(Boolean(a.pipelineExposto.valor)) ||
        b.prioridade - a.prioridade,
    );

  const comValor = empreendimentos.filter((e) => e.pipelineExposto.valor != null);

  return {
    calculadoEm,
    empreendimentos,
    ativos: ranquearAtivos(lista),
    qualidade: correlacionarQualidadeConversao(lista),
    totais: {
      empreendimentos: empreendimentos.length,
      semCapa: empreendimentos.filter((e) => e.lacunas.some((l) => l.item === "capa")).length,
      semGaleria: empreendimentos.filter((e) => e.lacunas.some((l) => l.item === "galeria")).length,
      seoPendente: empreendimentos.filter((e) => e.lacunas.some((l) => l.item === "seo")).length,
      scoreMedio: empreendimentos.length
        ? Math.round(empreendimentos.reduce((a, e) => a + e.score, 0) / empreendimentos.length)
        : 0,
      pipelineExposto: comValor.reduce((a, e) => a + (e.pipelineExposto.valor ?? 0), 0),
      comEvidencia: comValor.length,
    },
  };
}
