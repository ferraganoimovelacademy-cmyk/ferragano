import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import { recordAudit } from "@/lib/platform/audit.server";
import { LEAD_ESTAGIOS, LEAD_ORIGENS, LEAD_TEMPERATURAS } from "@/lib/platform/comercial";
import { PERSON_TIPOS } from "@/lib/platform/relacionamento";
import { RESERVATION_STATUS, VISIT_STATUS } from "@/lib/platform/sales";
import {
  acharUnidade,
  acharPessoa,
  chaveNome,
  indexarOportunidadesPorPessoa,
  indexarPessoas,
  indexarPorNome,
  indexarUnidades,
} from "@/lib/platform/import.server";

/**
 * FASE 1 — GATE P04: Import Wizard (gravação).
 * Escreve sempre no modelo canônico (`people` + `person_contacts`) sob RLS.
 * A deduplicação usa documento e e-mail já existentes no workspace: linha
 * duplicada não vira pessoa nova, é reportada ao usuário.
 */

const linhaSchema = z.object({
  linha: z.number().int().min(1),
  nome: z.string().trim().min(2).max(120),
  documento: z.string().trim().max(30).default(""),
  email: z.string().trim().max(160).default(""),
  telefone: z.string().trim().max(30).default(""),
  tipo: z.enum(PERSON_TIPOS).default("fisica"),
  origem: z.enum(LEAD_ORIGENS).nullish(),
  observacao: z.string().trim().max(2000).default(""),
});

const digitos = (valor: string) => valor.replace(/\D/g, "");

export const importPeople = createServerFn({ method: "POST" })
  .middleware([instrumented("people", "importar_pessoas")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        linhas: z.array(linhaSchema).min(1).max(500),
        origemPadrao: z.enum(LEAD_ORIGENS).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const documentos = [...new Set(data.linhas.map((l) => digitos(l.documento)).filter(Boolean))];
    const emails = [...new Set(data.linhas.map((l) => l.email.toLowerCase()).filter(Boolean))];

    // Chaves já existentes no workspace — a checagem é feita antes de inserir.
    const [existentes, contatos] = await Promise.all([
      documentos.length
        ? supabase
            .from("people")
            .select("id, documento")
            .eq("workspace_id", data.workspaceId)
            .not("documento", "is", null)
        : Promise.resolve({ data: [] as { id: string; documento: string | null }[] }),
      emails.length
        ? supabase
            .from("person_contacts")
            .select("valor")
            .eq("workspace_id", data.workspaceId)
            .eq("canal", "email")
            .in("valor", emails)
        : Promise.resolve({ data: [] as { valor: string }[] }),
    ]);

    const docsExistentes = new Set(
      (existentes.data ?? []).map((p) => digitos(p.documento ?? "")).filter(Boolean),
    );
    const emailsExistentes = new Set(
      (contatos.data ?? []).map((c) => (c.valor ?? "").toLowerCase()),
    );

    const duplicadas: { linha: number; nome: string; motivo: string }[] = [];
    const falhas: { linha: number; nome: string; motivo: string }[] = [];
    let criadas = 0;

    for (const item of data.linhas) {
      const doc = digitos(item.documento);
      const email = item.email.toLowerCase();

      if (doc && docsExistentes.has(doc)) {
        duplicadas.push({ linha: item.linha, nome: item.nome, motivo: "Documento já cadastrado." });
        continue;
      }
      if (email && emailsExistentes.has(email)) {
        duplicadas.push({ linha: item.linha, nome: item.nome, motivo: "E-mail já cadastrado." });
        continue;
      }

      const { data: pessoa, error } = await supabase
        .from("people")
        .insert({
          workspace_id: data.workspaceId,
          nome: item.nome,
          tipo: item.tipo,
          documento: item.documento || null,
          origem: item.origem ?? data.origemPadrao ?? null,
          observacao: item.observacao || null,
          responsavel_id: userId,
          criado_por: userId,
        })
        .select("id")
        .single();

      if (error || !pessoa) {
        console.error("[importPeople]", error?.message);
        falhas.push({
          linha: item.linha,
          nome: item.nome,
          motivo:
            error?.code === "23505"
              ? "Documento já cadastrado."
              : "Não foi possível gravar esta linha.",
        });
        continue;
      }

      const novosContatos = [
        email ? { canal: "email" as const, valor: email, principal: true } : null,
        item.telefone ? { canal: "whatsapp" as const, valor: item.telefone, principal: !email } : null,
      ].filter(Boolean) as { canal: "email" | "whatsapp"; valor: string; principal: boolean }[];

      if (novosContatos.length) {
        const { error: contatoErr } = await supabase.from("person_contacts").insert(
          novosContatos.map((c) => ({
            workspace_id: data.workspaceId,
            person_id: pessoa.id,
            canal: c.canal,
            valor: c.valor,
            principal: c.principal,
          })),
        );
        if (contatoErr) console.error("[importPeople:contatos]", contatoErr.message);
      }

      await supabase.from("activities").insert({
        workspace_id: data.workspaceId,
        person_id: pessoa.id,
        tipo: "sistema",
        titulo: "Pessoa importada",
        descricao: `Importada via Import Wizard (linha ${item.linha}).`,
        autor_id: userId,
      });

      if (doc) docsExistentes.add(doc);
      if (email) emailsExistentes.add(email);
      criadas++;
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "people.imported",
      entity: "person",
      entityId: null,
      metadata: {
        recebidas: data.linhas.length,
        criadas,
        duplicadas: duplicadas.length,
        falhas: falhas.length,
      },
    });

    return { recebidas: data.linhas.length, criadas, duplicadas, falhas };
  });

const linhaOppSchema = z.object({
  linha: z.number().int().min(1),
  documento: z.string().trim().max(30).default(""),
  email: z.string().trim().max(160).default(""),
  pessoa: z.string().trim().max(120).default(""),
  titulo: z.string().trim().max(160).default(""),
  valor: z.number().min(0).max(1_000_000_000).nullish(),
  estagio: z.enum(LEAD_ESTAGIOS).default("novo"),
  temperatura: z.enum(LEAD_TEMPERATURAS).default("morno"),
  origem: z.enum(LEAD_ORIGENS).nullish(),
  proximaAcao: z.string().trim().max(200).default(""),
  observacao: z.string().trim().max(2000).default(""),
});

/**
 * FASE 1 — GATE P04: importação de oportunidades.
 * A oportunidade sempre aponta para uma pessoa já existente — o wizard não
 * cria identidade aqui, para não duplicar cadastro.
 */
export const importOpportunities = createServerFn({ method: "POST" })
  .middleware([instrumented("sales", "importar_oportunidades")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        linhas: z.array(linhaOppSchema).min(1).max(500),
        origemPadrao: z.enum(LEAD_ORIGENS).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const emails = [...new Set(data.linhas.map((l) => l.email.toLowerCase()).filter(Boolean))];
    const indice = await indexarPessoas(supabase, data.workspaceId, emails);

    const falhas: { linha: number; nome: string; motivo: string }[] = [];
    let criadas = 0;

    for (const item of data.linhas) {
      const rotulo = item.pessoa || item.email || item.documento || `Linha ${item.linha}`;
      const achado = acharPessoa(indice, item);
      if ("motivo" in achado) {
        falhas.push({ linha: item.linha, nome: rotulo, motivo: achado.motivo });
        continue;
      }

      const fechada = item.estagio === "fechado" || item.estagio === "perdido";
      const { data: oportunidade, error } = await supabase
        .from("opportunities")
        .insert({
          workspace_id: data.workspaceId,
          person_id: achado.id,
          titulo: item.titulo || null,
          valor: item.valor ?? null,
          estagio: item.estagio,
          temperatura: item.temperatura,
          origem: item.origem ?? data.origemPadrao ?? null,
          proxima_acao: item.proximaAcao || null,
          fechado_em: fechada ? new Date().toISOString() : null,
          responsavel_id: userId,
          criado_por: userId,
        })
        .select("id")
        .single();

      if (error || !oportunidade) {
        console.error("[importOpportunities]", error?.message);
        falhas.push({
          linha: item.linha,
          nome: rotulo,
          motivo: "Não foi possível gravar esta oportunidade.",
        });
        continue;
      }

      await supabase.from("activities").insert({
        workspace_id: data.workspaceId,
        person_id: achado.id,
        opportunity_id: oportunidade.id,
        tipo: "sistema",
        titulo: "Oportunidade importada",
        descricao: item.observacao
          ? `Importada via Import Wizard (linha ${item.linha}). ${item.observacao}`
          : `Importada via Import Wizard (linha ${item.linha}).`,
        autor_id: userId,
      });

      criadas++;
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "opportunities.imported",
      entity: "opportunity",
      entityId: null,
      metadata: { recebidas: data.linhas.length, criadas, falhas: falhas.length },
    });

    return { recebidas: data.linhas.length, criadas, duplicadas: [], falhas };
  });
const linhaVisitaSchema = z.object({
  linha: z.number().int().min(1),
  documento: z.string().trim().max(30).default(""),
  email: z.string().trim().max(160).default(""),
  pessoa: z.string().trim().max(120).default(""),
  empreendimento: z.string().trim().max(160).default(""),
  data: z.string().datetime(),
  status: z.enum(VISIT_STATUS).default("agendada"),
  nota: z.number().min(0).max(10).nullish(),
  feedback: z.string().trim().max(2000).default(""),
});

/**
 * FASE 1 — GATE P04: importação de visitas.
 * A visita aponta para uma pessoa já existente e, quando informado, para um
 * empreendimento localizado pelo nome exato dentro do workspace.
 */
export const importVisits = createServerFn({ method: "POST" })
  .middleware([instrumented("sales", "importar_visitas")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        linhas: z.array(linhaVisitaSchema).min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const emails = [...new Set(data.linhas.map((l) => l.email.toLowerCase()).filter(Boolean))];
    const [indice, empreendimentos] = await Promise.all([
      indexarPessoas(supabase, data.workspaceId, emails),
      supabase.from("empreendimentos").select("id, nome").eq("workspace_id", data.workspaceId),
    ]);
    const porEmpreendimento = indexarPorNome(empreendimentos.data ?? []);

    const falhas: { linha: number; nome: string; motivo: string }[] = [];
    let criadas = 0;

    for (const item of data.linhas) {
      const rotulo = item.pessoa || item.email || item.documento || `Linha ${item.linha}`;
      const achado = acharPessoa(indice, item);
      if ("motivo" in achado) {
        falhas.push({ linha: item.linha, nome: rotulo, motivo: achado.motivo });
        continue;
      }

      let empreendimentoId: string | null = null;
      if (item.empreendimento) {
        const chave = chaveNome(item.empreendimento);
        if (!porEmpreendimento.has(chave)) {
          falhas.push({
            linha: item.linha,
            nome: rotulo,
            motivo: `Empreendimento "${item.empreendimento}" não encontrado.`,
          });
          continue;
        }
        const encontrado = porEmpreendimento.get(chave);
        if (!encontrado) {
          falhas.push({
            linha: item.linha,
            nome: rotulo,
            motivo: `Mais de um empreendimento chamado "${item.empreendimento}".`,
          });
          continue;
        }
        empreendimentoId = encontrado;
      }

      const { data: visita, error } = await supabase
        .from("visits")
        .insert({
          workspace_id: data.workspaceId,
          person_id: achado.id,
          empreendimento_id: empreendimentoId,
          agendada_para: item.data,
          status: item.status,
          compareceu:
            item.status === "realizada" ? true : item.status === "nao_compareceu" ? false : null,
          nota: item.nota ?? null,
          feedback: item.feedback || null,
          corretor_id: userId,
          criado_por: userId,
        })
        .select("id")
        .single();

      if (error || !visita) {
        console.error("[importVisits]", error?.message);
        falhas.push({
          linha: item.linha,
          nome: rotulo,
          motivo: "Não foi possível gravar esta visita.",
        });
        continue;
      }

      await supabase.from("activities").insert({
        workspace_id: data.workspaceId,
        person_id: achado.id,
        tipo: "sistema",
        titulo: "Visita importada",
        descricao: `Importada via Import Wizard (linha ${item.linha}).`,
        autor_id: userId,
      });

      criadas++;
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "visits.imported",
      entity: "visit",
      entityId: null,
      metadata: { recebidas: data.linhas.length, criadas, falhas: falhas.length },
    });

    return { recebidas: data.linhas.length, criadas, duplicadas: [], falhas };
  });

const linhaReservaSchema = z.object({
  linha: z.number().int().min(1),
  documento: z.string().trim().max(30).default(""),
  email: z.string().trim().max(160).default(""),
  pessoa: z.string().trim().max(120).default(""),
  empreendimento: z.string().trim().max(160).default(""),
  unidade: z.string().trim().min(1).max(60),
  expiraEm: z.string().datetime(),
  valor: z.number().min(0).max(1_000_000_000).nullish(),
  status: z.enum(RESERVATION_STATUS).default("ativa"),
  observacao: z.string().trim().max(2000).default(""),
});

/**
 * FASE 1 — GATE P04: importação de reservas.
 * A reserva exige pessoa e oportunidade já existentes (a tabela obriga
 * `opportunity_id`) e uma unidade do workspace. Reserva ativa também marca a
 * unidade como reservada, mantendo o estoque coerente após a migração.
 */
export const importReservations = createServerFn({ method: "POST" })
  .middleware([instrumented("sales", "importar_reservas")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        linhas: z.array(linhaReservaSchema).min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const emails = [...new Set(data.linhas.map((l) => l.email.toLowerCase()).filter(Boolean))];
    const [indice, empreendimentos, oportunidades, unidades] = await Promise.all([
      indexarPessoas(supabase, data.workspaceId, emails),
      supabase.from("empreendimentos").select("id, nome").eq("workspace_id", data.workspaceId),
      indexarOportunidadesPorPessoa(supabase, data.workspaceId),
      indexarUnidades(supabase, data.workspaceId),
    ]);
    const porEmpreendimento = indexarPorNome(empreendimentos.data ?? []);

    const falhas: { linha: number; nome: string; motivo: string }[] = [];
    const duplicadas: { linha: number; nome: string; motivo: string }[] = [];
    const unidadesUsadas = new Set<string>();
    let criadas = 0;

    for (const item of data.linhas) {
      const rotulo = item.pessoa || item.email || item.documento || `Linha ${item.linha}`;
      const achado = acharPessoa(indice, item);
      if ("motivo" in achado) {
        falhas.push({ linha: item.linha, nome: rotulo, motivo: achado.motivo });
        continue;
      }

      let empreendimentoId: string | null = null;
      if (item.empreendimento) {
        const chave = chaveNome(item.empreendimento);
        if (!porEmpreendimento.has(chave)) {
          falhas.push({
            linha: item.linha,
            nome: rotulo,
            motivo: `Empreendimento "${item.empreendimento}" não encontrado.`,
          });
          continue;
        }
        const encontrado = porEmpreendimento.get(chave);
        if (!encontrado) {
          falhas.push({
            linha: item.linha,
            nome: rotulo,
            motivo: `Mais de um empreendimento chamado "${item.empreendimento}".`,
          });
          continue;
        }
        empreendimentoId = encontrado;
      }

      const unidade = acharUnidade(unidades, item, empreendimentoId);
      if ("motivo" in unidade) {
        falhas.push({ linha: item.linha, nome: rotulo, motivo: unidade.motivo });
        continue;
      }

      const oportunidadeId = oportunidades.get(achado.id);
      if (!oportunidadeId) {
        falhas.push({
          linha: item.linha,
          nome: rotulo,
          motivo: "Pessoa sem oportunidade aberta — importe a oportunidade antes da reserva.",
        });
        continue;
      }

      if (item.status === "ativa" && unidadesUsadas.has(unidade.id)) {
        duplicadas.push({
          linha: item.linha,
          nome: rotulo,
          motivo: "Unidade já reservada nesta importação.",
        });
        continue;
      }
      if (item.status === "ativa" && unidade.status === "reservada") {
        duplicadas.push({
          linha: item.linha,
          nome: rotulo,
          motivo: "Unidade já está reservada no sistema.",
        });
        continue;
      }
      if (item.status === "ativa" && unidade.status === "vendida") {
        falhas.push({ linha: item.linha, nome: rotulo, motivo: "Unidade já vendida." });
        continue;
      }

      const cancelada = item.status === "cancelada";
      const { data: reserva, error } = await supabase
        .from("reservations")
        .insert({
          workspace_id: data.workspaceId,
          opportunity_id: oportunidadeId,
          person_id: achado.id,
          unidade_id: unidade.id,
          expira_em: item.expiraEm,
          status: item.status,
          valor: item.valor ?? null,
          observacao: item.observacao || null,
          cancelada_em: cancelada ? new Date().toISOString() : null,
          cancelamento_motivo: cancelada ? "Importada como cancelada" : null,
          criado_por: userId,
        })
        .select("id")
        .single();

      if (error || !reserva) {
        console.error("[importReservations]", error?.message);
        falhas.push({
          linha: item.linha,
          nome: rotulo,
          motivo: "Não foi possível gravar esta reserva.",
        });
        continue;
      }

      if (item.status === "ativa") {
        const { error: unidadeErr } = await supabase
          .from("unidades")
          .update({ status: "reservada" })
          .eq("id", unidade.id)
          .eq("workspace_id", data.workspaceId);
        if (unidadeErr) console.error("[importReservations:unidade]", unidadeErr.message);
        else unidadesUsadas.add(unidade.id);
      }

      await supabase.from("activities").insert({
        workspace_id: data.workspaceId,
        person_id: achado.id,
        opportunity_id: oportunidadeId,
        tipo: "sistema",
        titulo: "Reserva importada",
        descricao: `Unidade ${item.unidade} importada via Import Wizard (linha ${item.linha}).`,
        autor_id: userId,
      });

      criadas++;
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "reservations.imported",
      entity: "reservation",
      entityId: null,
      metadata: {
        recebidas: data.linhas.length,
        criadas,
        duplicadas: duplicadas.length,
        falhas: falhas.length,
      },
    });

    return { recebidas: data.linhas.length, criadas, duplicadas, falhas };
  });
