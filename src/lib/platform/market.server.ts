/**
 * SPRINT 25 — COLETOR DE INDICADORES (contexto Market).
 *
 * Server-only. Lê as séries públicas do SGS do Banco Central e grava cada
 * observação com proveniência completa (ADR-023).
 *
 * Regras duras:
 * - a plataforma NUNCA inventa valor: se a fonte não responde, nada é gravado;
 * - revisão da fonte não sobrescreve: entra como nova `versao`;
 * - valor idêntico ao já coletado é ignorado (idempotência).
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SGS = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

type SerieRow = {
  id: string;
  codigo: string;
  nome: string;
  periodicidade: string;
  fonte_nome: string;
  fonte_serie: string | null;
};

type PontoSGS = { data?: string; valor?: string };

export type ResultadoColeta = {
  series: number;
  novos: number;
  revisoes: number;
  ignorados: number;
  falhas: { codigo: string; erro: string }[];
};

/** "01/06/2026" -> "2026-06-01". Formato fixo do SGS. */
export function dataSgsParaIso(valor: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim());
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function janelaDias(periodicidade: string): number {
  if (periodicidade === "diaria") return 45;
  if (periodicidade === "mensal") return 760;
  if (periodicidade === "trimestral") return 1100;
  return 1900;
}

const formatarBr = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

export async function coletarIndicadores(agora = new Date()): Promise<ResultadoColeta> {
  const resultado: ResultadoColeta = { series: 0, novos: 0, revisoes: 0, ignorados: 0, falhas: [] };

  const { data: series, error } = await supabaseAdmin
    .from("market_indicator_series")
    .select("id, codigo, nome, periodicidade, fonte_nome, fonte_serie")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (error) throw new Error(`Catálogo de indicadores indisponível: ${error.message}`);

  for (const serie of (series ?? []) as SerieRow[]) {
    if (!serie.fonte_serie) {
      resultado.falhas.push({ codigo: serie.codigo, erro: "série sem identificador na fonte" });
      continue;
    }
    resultado.series += 1;

    const inicio = new Date(agora.getTime() - janelaDias(serie.periodicidade) * 86_400_000);
    const url =
      `${SGS}.${serie.fonte_serie}/dados?formato=json` +
      `&dataInicial=${formatarBr(inicio)}&dataFinal=${formatarBr(agora)}`;

    let pontos: PontoSGS[] = [];
    try {
      const resposta = await fetch(url, { headers: { accept: "application/json" } });
      if (!resposta.ok) {
        const corpo = await resposta.text();
        throw new Error(`HTTP ${resposta.status}: ${corpo.slice(0, 180)}`);
      }
      pontos = (await resposta.json()) as PontoSGS[];
    } catch (e) {
      // Fonte fora do ar não gera número estimado: a série apenas não atualiza.
      resultado.falhas.push({ codigo: serie.codigo, erro: (e as Error).message });
      continue;
    }

    const { data: existentes, error: erroLeitura } = await supabaseAdmin
      .from("market_indicator_values")
      .select("referencia, valor, versao")
      .eq("series_id", serie.id);

    if (erroLeitura) {
      resultado.falhas.push({ codigo: serie.codigo, erro: erroLeitura.message });
      continue;
    }

    const atuais = new Map<string, { valor: number; versao: number }>();
    for (const linha of (existentes ?? []) as { referencia: string; valor: number; versao: number }[]) {
      const atual = atuais.get(linha.referencia);
      if (!atual || linha.versao > atual.versao) {
        atuais.set(linha.referencia, { valor: Number(linha.valor), versao: linha.versao });
      }
    }

    const coletadoEm = agora.toISOString();
    // A fonte pode repetir a mesma competência no mesmo payload (a TR, por
    // exemplo, publica mais de uma linha por data de referência). Uma
    // competência = uma linha por coleta: a última leitura prevalece.
    const porReferencia = new Map<string, Record<string, unknown>>();
    let novosSerie = 0;
    let revisoesSerie = 0;

    for (const ponto of pontos) {
      if (!ponto.data || ponto.valor == null || ponto.valor === "") continue;
      const referencia = dataSgsParaIso(ponto.data);
      const valor = Number(ponto.valor);
      if (!referencia || !Number.isFinite(valor)) continue;

      const atual = atuais.get(referencia);
      if (atual && Math.abs(atual.valor - valor) < 1e-9) {
        resultado.ignorados += 1;
        porReferencia.delete(referencia);
        continue;
      }

      porReferencia.set(referencia, {
        series_id: serie.id,
        referencia,
        valor,
        fonte_nome: serie.fonte_nome,
        fonte_url: url,
        coletado_em: coletadoEm,
        versao: atual ? atual.versao + 1 : 1,
        ...(atual ? { observacao: `Revisão da fonte: valor anterior ${atual.valor}.` } : {}),
      });
    }

    for (const linha of porReferencia.values()) {
      if ((linha["versao"] as number) > 1) revisoesSerie += 1;
      else novosSerie += 1;
    }

    const inserir = [...porReferencia.values()];
    if (inserir.length) {
      const { error: erroInsert } = await supabaseAdmin
        .from("market_indicator_values")
        .insert(inserir as never);
      if (erroInsert) {
        resultado.falhas.push({ codigo: serie.codigo, erro: erroInsert.message });
        continue;
      }
    }

    resultado.novos += novosSerie;
    resultado.revisoes += revisoesSerie;
  }

  return resultado;
}