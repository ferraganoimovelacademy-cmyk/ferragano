import { supabase } from "@/integrations/supabase/client";
import type { EmpreendimentoSegmento, EmpreendimentoStatus } from "@/lib/platform/comercial";

/**
 * Vitrine pública — leitura anônima do portfólio.
 * Só retorna o que o workspace marcou como público (RLS: publico = true).
 * Nenhum dado de lead, membro ou workspace trafega aqui.
 */
export type EmpreendimentoPublico = {
  id: string;
  nome: string;
  slug: string;
  construtora: string | null;
  cidade: string | null;
  uf: string | null;
  bairro: string | null;
  status: EmpreendimentoStatus;
  segmento: EmpreendimentoSegmento;
  preco_min: number | null;
  preco_max: number | null;
  entrega_prevista: string | null;
  capa_url: string | null;
  descricao: string | null;
  destaque: boolean;
};

export async function listVitrine(): Promise<EmpreendimentoPublico[]> {
  const { data, error } = await supabase
    .from("empreendimentos")
    .select(
      "id, nome, slug, construtora, cidade, uf, bairro, status, segmento, preco_min, preco_max, entrega_prevista, capa_url, descricao, destaque",
    )
    .eq("publico", true)
    .order("destaque", { ascending: false })
    .order("nome");

  if (error) {
    console.error("[listVitrine]", error.message);
    throw new Error("Não foi possível carregar os empreendimentos.");
  }
  return (data ?? []) as EmpreendimentoPublico[];
}

/** Unidade exposta na página pública de detalhe. */
export type UnidadePublica = {
  id: string;
  identificador: string;
  tipologia: string | null;
  dormitorios: number | null;
  vagas: number | null;
  area_privativa: number | null;
  andar: number | null;
  preco: number | null;
  status: "disponivel" | "reservada" | "vendida" | "bloqueada";
};

export type EmpreendimentoDetalhePublico = {
  empreendimento: EmpreendimentoPublico & { galeria: unknown };
  unidades: UnidadePublica[];
};
