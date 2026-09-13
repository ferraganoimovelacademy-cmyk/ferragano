import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import {
  analisarComportamento,
  montarPanorama,
  type PanoramaBehavior,
  type PerfilComportamental,
  type PersonBehaviorRow,
} from "@/lib/platform/behavior";

/**
 * SPRINT 24 — BEHAVIOR: única porta de leitura do contexto.
 *
 * Lê apenas `read_person_behavior` (Query Layer certificada). Nenhuma tabela
 * transacional é consultada daqui e nenhum cálculo acontece aqui — o perfil é
 * montado na camada pura (`behavior.ts`), auditável em teste.
 */

type Linha = Record<string, unknown>;
const num = (v: unknown) => (v == null ? 0 : Number(v));
const numOuNulo = (v: unknown) => (v == null ? null : Number(v));
const texto = (v: unknown, padrao: string) => (typeof v === "string" && v.trim() ? v : padrao);
const textoOuNulo = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const boolOuNulo = (v: unknown) => (v == null ? null : Boolean(v));

export type BehaviorPanel = {
  perfis: PerfilComportamental[];
  panorama: PanoramaBehavior;
  geradoEm: string;
};

export const getBehaviorPanel = createServerFn({ method: "GET" })
  .middleware([instrumented("observability", "behavior.panel")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        limite: z.number().int().min(1).max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<BehaviorPanel> => {
    const { data: rows, error } = await context.supabase.rpc("read_person_behavior" as never, {
      _workspace_id: data.workspaceId,
      _limit: data.limite ?? 200,
    } as never);

    if (error) {
      console.error("[getBehaviorPanel]", error.message);
      throw new Error("Não foi possível ler o comportamento das pessoas.");
    }

    const brutos: PersonBehaviorRow[] = ((rows ?? []) as unknown as Linha[]).map((r) => ({
      personId: String(r["person_id"]),
      nome: texto(r["nome"], "Sem nome"),
      estagio: textoOuNulo(r["estagio"]),
      origem: textoOuNulo(r["origem"]),
      responsavelId: (r["responsavel_id"] as string | null) ?? null,
      responsavelNome: textoOuNulo(r["responsavel_nome"]),
      criadoEm: textoOuNulo(r["criado_em"]),
      ultimoContatoEm: textoOuNulo(r["ultimo_contato_em"]),
      perfil: textoOuNulo(r["perfil"]),
      precoTeto: numOuNulo(r["preco_teto"]),
      primeiroImovel: boolOuNulo(r["primeiro_imovel"]),
      restricaoCredito: boolOuNulo(r["restricao_credito"]),
      interacoesTotal: num(r["interacoes_total"]),
      interacoes90d: num(r["interacoes_90d"]),
      intWhatsapp: num(r["int_whatsapp"]),
      intLigacao: num(r["int_ligacao"]),
      intEmail: num(r["int_email"]),
      intMensagem: num(r["int_mensagem"]),
      intVisita: num(r["int_visita"]),
      primeiraInteracao: textoOuNulo(r["primeira_interacao"]),
      ultimaInteracao: textoOuNulo(r["ultima_interacao"]),
      horaFavorita: numOuNulo(r["hora_favorita"]),
      horaFavoritaAmostra: num(r["hora_favorita_amostra"]),
      diaSemanaFavorito: numOuNulo(r["dia_semana_favorito"]),
      intervaloMedioHoras: numOuNulo(r["intervalo_medio_horas"]),
      respostaPropostaHoras: numOuNulo(r["resposta_proposta_horas"]),
      respostaPropostaAmostra: num(r["resposta_proposta_amostra"]),
      visitasAgendadas: num(r["visitas_agendadas"]),
      visitasRealizadas: num(r["visitas_realizadas"]),
      visitasFaltou: num(r["visitas_faltou"]),
      propostas: num(r["propostas"]),
      propostasEnviadas: num(r["propostas_enviadas"]),
      propostasAceitas: num(r["propostas_aceitas"]),
      propostasRecusadas: num(r["propostas_recusadas"]),
      rodadasPropostaMax: num(r["rodadas_proposta_max"]),
      diasAtePrimeiraProposta: numOuNulo(r["dias_ate_primeira_proposta"]),
      descontoMedioPct: numOuNulo(r["desconto_medio_pct"]),
      vendas: num(r["vendas"]),
      distratos: num(r["distratos"]),
      ltv: num(r["ltv"]),
      cicloFechamentoDias: numOuNulo(r["ciclo_fechamento_dias"]),
      oportunidades: num(r["oportunidades"]),
      oportunidadesPerdidas: num(r["oportunidades_perdidas"]),
      motivosPerda: Array.isArray(r["motivos_perda"]) ? (r["motivos_perda"] as string[]) : [],
      indicacoesFeitas: num(r["indicacoes_feitas"]),
    }));

    const agora = new Date();
    const perfis = brutos.map((b) => analisarComportamento(b, agora));

    return {
      perfis,
      panorama: montarPanorama(perfis, agora),
      geradoEm: agora.toISOString(),
    };
  });
