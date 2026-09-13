/**
 * SPRINT 26 — KNOWLEDGE: montagem do grafo (camada pura, testável).
 *
 * Recebe apenas linhas já lidas pela Query Layer e as transforma em nós e
 * relações REFERENCIADOS (tipo + id). Nada é copiado, nada é recalculado e
 * nenhuma relação é criada sem proveniência declarada (ADR-027).
 */

import {
  camadaDoTipo,
  montarGrafo,
  noId,
  VERSAO_ALGORITMO,
  type GrafoConhecimento,
  type NoConhecimento,
  type Proveniencia,
  type RelacaoConhecimento,
  type TipoNo,
  type TipoRelacao,
} from "@/lib/platform/knowledge";

export type KnowledgeEntrada = {
  pessoas: { id: string; nome: string; responsavelId: string | null; atualizadoEm: string | null }[];
  corretores: { id: string; nome: string; atualizadoEm: string | null }[];
  empreendimentos: {
    id: string;
    nome: string;
    cidade: string | null;
    uf: string | null;
    atualizadoEm: string | null;
  }[];
  oportunidades: {
    id: string;
    titulo: string;
    personId: string | null;
    responsavelId: string | null;
    empreendimentoId: string | null;
    estagio: string | null;
    diasSemInteracao: number | null;
  }[];
  recomendacoes: {
    id: string;
    chave: string;
    tipo: string;
    mensagem: string | null;
    status: string | null;
    resultado: string | null;
    quadrante: string | null;
    score: number | null;
    confianca: number | null;
    geradaEm: string | null;
    avaliadaEm: string | null;
    implementadaEm: string | null;
  }[];
  indicadores: { id: string; codigo: string; nome: string; fonte: string; atualizadoEm: string | null }[];
  regioes: {
    id: string;
    nome: string;
    tipo: string;
    cidade: string | null;
    uf: string | null;
    atualizadoEm: string | null;
  }[];
};

const prov = (
  tipo: TipoNo,
  fonte: string,
  base: Proveniencia["base"],
  atualizadoEm: string | null,
  derivado?: { algoritmo: string; adr: string },
): Proveniencia => ({
  fonte,
  camada: camadaDoTipo[tipo],
  base,
  algoritmo: derivado?.algoritmo ?? null,
  versaoAlgoritmo: derivado ? VERSAO_ALGORITMO : null,
  adr: derivado?.adr ?? null,
  atualizadoEm,
});

const slug = (v: string) => v.trim().toLowerCase().replace(/\s+/g, "-");

export function montarGrafoConhecimento(
  entrada: KnowledgeEntrada,
  agora = new Date().toISOString(),
): GrafoConhecimento {
  const nos: NoConhecimento[] = [];
  const relacoes: Omit<RelacaoConhecimento, "id">[] = [];

  const ligar = (
    origem: string,
    tipo: TipoRelacao,
    destino: string,
    fonte: string,
    base: Proveniencia["base"],
    atualizadoEm: string | null,
    derivado?: { algoritmo: string; adr: string },
  ) => {
    relacoes.push({
      origem,
      destino,
      tipo,
      atualizadoEm,
      proveniencia: {
        fonte,
        camada: "analitico",
        base,
        algoritmo: derivado?.algoritmo ?? "knowledge.montarGrafoConhecimento",
        versaoAlgoritmo: VERSAO_ALGORITMO,
        adr: derivado?.adr ?? "ADR-027",
        atualizadoEm,
      },
    });
  };

  /* --- Domínio (referências vindas dos Read Models) ------------------ */

  for (const c of entrada.corretores) {
    nos.push({
      id: noId("corretor", c.id),
      tipo: "corretor",
      rotulo: c.nome,
      proveniencia: prov("corretor", "sales_360", "dado_interno", c.atualizadoEm ?? agora),
    });
  }

  for (const p of entrada.pessoas) {
    nos.push({
      id: noId("pessoa", p.id),
      tipo: "pessoa",
      rotulo: p.nome,
      proveniencia: prov("pessoa", "customer_360", "dado_interno", p.atualizadoEm ?? agora),
    });
    if (p.responsavelId) {
      ligar(
        noId("pessoa", p.id),
        "atendida_por",
        noId("corretor", p.responsavelId),
        "customer_360",
        "dado_interno",
        p.atualizadoEm ?? agora,
      );
    }
  }

  for (const e of entrada.empreendimentos) {
    nos.push({
      id: noId("empreendimento", e.id),
      tipo: "empreendimento",
      rotulo: e.nome,
      detalhe: [e.cidade, e.uf].filter(Boolean).join("/") || null,
      proveniencia: prov("empreendimento", "property_360", "dado_interno", e.atualizadoEm ?? agora),
    });
  }

  for (const o of entrada.oportunidades) {
    const id = noId("oportunidade", o.id);
    nos.push({
      id,
      tipo: "oportunidade",
      rotulo: o.titulo,
      detalhe: o.estagio,
      proveniencia: prov("oportunidade", "read_opportunity_signals", "dado_interno", agora),
    });
    if (o.personId) {
      ligar(noId("pessoa", o.personId), "origina", id, "read_opportunity_signals", "dado_interno", agora);
    }
    if (o.empreendimentoId) {
      ligar(
        id,
        "refere_se_a",
        noId("empreendimento", o.empreendimentoId),
        "read_opportunity_signals",
        "dado_interno",
        agora,
      );
    }
  }

  /* --- Mercado (dado externo, nunca misturado ao interno — ADR-023) -- */

  const mercados = new Map<string, string>();
  const registrarMercado = (uf: string | null) => {
    if (!uf) return null;
    const chave = slug(uf);
    const id = noId("mercado", chave);
    if (!mercados.has(chave)) {
      mercados.set(chave, id);
      nos.push({
        id,
        tipo: "mercado",
        rotulo: `Mercado ${uf.toUpperCase()}`,
        proveniencia: prov("mercado", "market_regions", "dado_externo", agora),
      });
    }
    return id;
  };

  for (const r of entrada.regioes) {
    if (r.tipo !== "bairro") {
      registrarMercado(r.uf);
      continue;
    }
    const id = noId("bairro", r.id);
    nos.push({
      id,
      tipo: "bairro",
      rotulo: r.nome,
      detalhe: [r.cidade, r.uf].filter(Boolean).join("/") || null,
      proveniencia: prov("bairro", "market_regions", "dado_externo", r.atualizadoEm ?? agora),
    });
    const mercadoId = registrarMercado(r.uf);
    if (mercadoId) ligar(id, "compoe", mercadoId, "market_regions", "dado_externo", r.atualizadoEm ?? agora);

    // Localização só é afirmada quando cidade e UF coincidem: sem palpite.
    for (const e of entrada.empreendimentos) {
      if (!e.cidade || !r.cidade || !e.uf || !r.uf) continue;
      if (slug(e.cidade) !== slug(r.cidade) || slug(e.uf) !== slug(r.uf)) continue;
      ligar(
        noId("empreendimento", e.id),
        "localizado_em",
        id,
        "property_360 + market_regions",
        "regra_negocio",
        r.atualizadoEm ?? agora,
      );
    }
  }

  for (const i of entrada.indicadores) {
    const id = noId("indicador", i.codigo);
    nos.push({
      id,
      tipo: "indicador",
      rotulo: i.nome,
      detalhe: i.fonte,
      proveniencia: prov("indicador", i.fonte, "dado_externo", i.atualizadoEm ?? agora),
    });
    for (const mercadoId of mercados.values()) {
      ligar(mercadoId, "medido_por", id, i.fonte, "dado_externo", i.atualizadoEm ?? agora);
    }
  }

  /* --- Decisão: evidência → recomendação → advisor → resultado ------- */

  for (const r of entrada.recomendacoes) {
    const recId = noId("recomendacao", r.id);
    const evId = noId("evidencia", `rec-${r.id}`);
    const geradaEm = r.geradaEm ?? agora;

    nos.push({
      id: evId,
      tipo: "evidencia",
      rotulo: `Evidência de ${r.tipo}`,
      detalhe:
        r.confianca == null
          ? "Confiança não medida"
          : `Confiança ${Math.round(r.confianca)}% · score ${r.score ?? "—"}`,
      proveniencia: prov("evidencia", "automation_daily_metrics", "evidencia_historica", geradaEm, {
        algoritmo: "decision-intelligence.avaliarConfianca",
        adr: "ADR-026",
      }),
    });

    nos.push({
      id: recId,
      tipo: "recomendacao",
      rotulo: r.mensagem ?? r.chave,
      detalhe: r.quadrante,
      proveniencia: prov("recomendacao", "recommendation_history", "evidencia_historica", geradaEm, {
        algoritmo: "recommendation.priorizar",
        adr: "ADR-027",
      }),
    });

    ligar(evId, "fundamenta", recId, "recommendation_history", "evidencia_historica", geradaEm, {
      algoritmo: "recommendation.priorizar",
      adr: "ADR-027",
    });

    // O Advisor só existe como nó quando a recomendação chegou ao usuário.
    const apresentada = r.status && r.status !== "pendente";
    if (apresentada) {
      const advId = noId("advisor", r.id);
      nos.push({
        id: advId,
        tipo: "advisor",
        rotulo: `Advisor · ${r.tipo}`,
        detalhe: r.status,
        proveniencia: prov("advisor", "advisor_briefings", "evidencia_historica", geradaEm, {
          algoritmo: "advisory.briefingExecutivo",
          adr: "ADR-020",
        }),
      });
      ligar(recId, "apresentada_por", advId, "advisor_briefings", "evidencia_historica", geradaEm, {
        algoritmo: "advisory.briefingExecutivo",
        adr: "ADR-020",
      });

      if (r.resultado && r.resultado !== "pendente") {
        const resId = noId("resultado", r.id);
        const em = r.avaliadaEm ?? r.implementadaEm ?? geradaEm;
        nos.push({
          id: resId,
          tipo: "resultado",
          rotulo: `Resultado: ${r.resultado}`,
          proveniencia: prov("resultado", "recommendation_history", "dado_interno", em, {
            algoritmo: "recommendation.avaliarAprendizado",
            adr: "ADR-019",
          }),
        });
        ligar(advId, "observado_em", resId, "recommendation_history", "dado_interno", em, {
          algoritmo: "recommendation.avaliarAprendizado",
          adr: "ADR-019",
        });
      }
    }
  }

  return montarGrafo(nos, relacoes, agora);
}
