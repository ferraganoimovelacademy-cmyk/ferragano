import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * FASE 1 — GATE P04: resolução de identidade na importação de oportunidades.
 * Mantido fora de `import.functions.ts` porque o split de server functions
 * remove declarações irmãs do módulo transformado.
 */
export const soDigitos = (valor: string) => valor.replace(/\D/g, "");

export const chaveNome = (valor: string) =>
  valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

export type IndicePessoas = {
  porDocumento: Map<string, string>;
  porEmail: Map<string, string>;
  porNome: Map<string, string | null>;
};

/**
 * Indexa as pessoas do workspace por documento, e-mail e nome.
 * Nome repetido guarda `null` para forçar erro de ambiguidade na linha.
 */
export async function indexarPessoas(
  client: SupabaseClient<Database>,
  workspaceId: string,
  emails: string[],
): Promise<IndicePessoas> {
  const [pessoas, contatos] = await Promise.all([
    client.from("people").select("id, nome, documento").eq("workspace_id", workspaceId),
    emails.length
      ? client
          .from("person_contacts")
          .select("person_id, valor")
          .eq("workspace_id", workspaceId)
          .eq("canal", "email")
          .in("valor", emails)
      : Promise.resolve({ data: [] as { person_id: string; valor: string }[], error: null }),
  ]);

  const porDocumento = new Map<string, string>();
  const porEmail = new Map<string, string>();
  const porNome = new Map<string, string | null>();

  for (const pessoa of pessoas.data ?? []) {
    const doc = soDigitos(pessoa.documento ?? "");
    if (doc && !porDocumento.has(doc)) porDocumento.set(doc, pessoa.id);
    const nome = chaveNome(pessoa.nome ?? "");
    if (!nome) continue;
    porNome.set(nome, porNome.has(nome) ? null : pessoa.id);
  }
  for (const contato of contatos.data ?? []) {
    const email = (contato.valor ?? "").toLowerCase();
    if (email && !porEmail.has(email)) porEmail.set(email, contato.person_id);
  }

  return { porDocumento, porEmail, porNome };
}

/** Encontra a pessoa da linha: documento > e-mail > nome exato. */
export function indexarPorNome(
  itens: { id: string; nome: string | null }[],
): Map<string, string | null> {
  const mapa = new Map<string, string | null>();
  for (const item of itens) {
    const chave = chaveNome(item.nome ?? "");
    if (!chave) continue;
    mapa.set(chave, mapa.has(chave) ? null : item.id);
  }
  return mapa;
}

/** Encontra a pessoa da linha: documento > e-mail > nome exato. */
export function acharPessoa(
  indice: IndicePessoas,
  linha: { documento: string; email: string; pessoa: string },
): { id: string } | { motivo: string } {
  const doc = soDigitos(linha.documento);
  if (doc) {
    const id = indice.porDocumento.get(doc);
    if (id) return { id };
  }
  if (linha.email) {
    const id = indice.porEmail.get(linha.email.toLowerCase());
    if (id) return { id };
  }
  if (linha.pessoa) {
    const chave = chaveNome(linha.pessoa);
    if (indice.porNome.has(chave)) {
      const id = indice.porNome.get(chave);
      if (id) return { id };
      return { motivo: "Mais de uma pessoa com esse nome — use documento ou e-mail." };
    }
  }
  return { motivo: "Pessoa não encontrada. Importe a pessoa antes da oportunidade." };
}

/* ---------- Reservas: oportunidade e unidade existentes ---------- */

/**
 * Indexa a oportunidade mais recente e ainda aberta de cada pessoa. Sem
 * oportunidade a reserva não pode ser gravada (`opportunity_id` é obrigatório).
 */
export async function indexarOportunidadesPorPessoa(
  client: SupabaseClient<Database>,
  workspaceId: string,
): Promise<Map<string, string>> {
  const { data } = await client
    .from("opportunities")
    .select("id, person_id, estagio, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const mapa = new Map<string, string>();
  for (const opp of data ?? []) {
    if (!opp.person_id) continue;
    if (opp.estagio === "perdido") continue;
    if (!mapa.has(opp.person_id)) mapa.set(opp.person_id, opp.id);
  }
  return mapa;
}

export type IndiceUnidades = {
  /** `empreendimentoId|identificador` → unidade. */
  porEmpreendimento: Map<string, { id: string; status: string } | null>;
  /** `identificador` → unidade (null quando repetido em mais de um produto). */
  porIdentificador: Map<string, { id: string; status: string } | null>;
};

export async function indexarUnidades(
  client: SupabaseClient<Database>,
  workspaceId: string,
): Promise<IndiceUnidades> {
  const { data } = await client
    .from("unidades")
    .select("id, identificador, empreendimento_id, status")
    .eq("workspace_id", workspaceId);

  const porEmpreendimento = new Map<string, { id: string; status: string } | null>();
  const porIdentificador = new Map<string, { id: string; status: string } | null>();

  for (const unidade of data ?? []) {
    const ident = chaveNome(unidade.identificador ?? "");
    if (!ident) continue;
    const valor = { id: unidade.id, status: unidade.status as string };
    const chave = `${unidade.empreendimento_id}|${ident}`;
    porEmpreendimento.set(chave, porEmpreendimento.has(chave) ? null : valor);
    porIdentificador.set(ident, porIdentificador.has(ident) ? null : valor);
  }

  return { porEmpreendimento, porIdentificador };
}

/** Resolve a unidade da linha: dentro do empreendimento quando informado. */
export function acharUnidade(
  indice: IndiceUnidades,
  linha: { unidade: string },
  empreendimentoId: string | null,
): { id: string; status: string } | { motivo: string } {
  const ident = chaveNome(linha.unidade);
  if (!ident) return { motivo: "Unidade não informada." };

  if (empreendimentoId) {
    const chave = `${empreendimentoId}|${ident}`;
    if (!indice.porEmpreendimento.has(chave)) {
      return { motivo: `Unidade "${linha.unidade}" não existe nesse empreendimento.` };
    }
    const achada = indice.porEmpreendimento.get(chave);
    return achada ?? { motivo: `Mais de uma unidade "${linha.unidade}" nesse empreendimento.` };
  }

  if (!indice.porIdentificador.has(ident)) {
    return { motivo: `Unidade "${linha.unidade}" não encontrada.` };
  }
  const achada = indice.porIdentificador.get(ident);
  return achada ?? { motivo: `Unidade "${linha.unidade}" existe em mais de um empreendimento — informe o empreendimento.` };
}
