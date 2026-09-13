import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Porta única do formulário de consultoria do site.
 * Emite o desafio de captcha, aplica as proteções anti-abuso e grava o lead
 * no fluxo canônico (people → opportunities → notificação), com telemetria
 * de conversão por rota.
 */

const FORMULARIO = "consultoria";

export const emitirDesafioConsultoria = createServerFn({ method: "GET" }).handler(async () => {
  const { gerarDesafio } = await import("@/lib/site/captcha.server");
  return gerarDesafio();
});

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo.").max(120),
  email: z.string().trim().email("E-mail inválido.").max(160),
  telefone: z.string().trim().min(10, "Telefone incompleto.").max(30),
  objetivo: z.enum(["primeiro-imovel", "investimento", "troca", "carreira"]),
  mensagem: z.string().trim().max(1000).optional().or(z.literal("")),
  captchaToken: z.string().trim().min(10).max(300),
  captchaResposta: z.string().trim().min(1).max(6),
  /** Rota de origem — usada para medir conversão por página. */
  rota: z.string().trim().max(120).default("/"),
  /** Honeypot: campo invisível ao usuário. Preenchido = bot. */
  isca: z.string().max(200).optional().or(z.literal("")),
});

export type ConsultoriaInput = z.infer<typeof schema>;

export const ROTULO_OBJETIVO: Record<ConsultoriaInput["objetivo"], string> = {
  "primeiro-imovel": "Primeiro imóvel",
  investimento: "Investimento",
  troca: "Troca de imóvel",
  carreira: "Carreira no mercado imobiliário",
};

export const submitConsultoria = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { verificarDesafio, idadeDoDesafioMs } = await import("@/lib/site/captcha.server");
    const {
      fingerprintVisitante,
      registrarHit,
      excedeuLimite,
      TEMPO_MINIMO_MS,
      LIMITE_ENVIOS,
      LIMITE_JANELA_MINUTOS,
    } = await import("@/lib/site/antispam.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { registrarTelemetriaSite } = await import("@/lib/site/telemetria-site.server");

    const fingerprint = fingerprintVisitante();
    const rota = data.rota || "/";

    /** Telemetria de conversão precisa de workspace: usa o do portfólio público. */
    async function workspacePublico(): Promise<string | null> {
      const { data: emp } = await supabaseAdmin
        .from("empreendimentos")
        .select("workspace_id")
        .eq("publico", true)
        .limit(1)
        .maybeSingle();
      return emp?.workspace_id ?? null;
    }

    async function medir(
      action: "consultoria_submit" | "consultoria_sucesso" | "consultoria_erro",
      extra: { ok?: boolean; erro?: string | null; entityId?: string | null; workspaceId?: string | null } = {},
    ) {
      const workspaceId = extra.workspaceId ?? (await workspacePublico());
      if (!workspaceId) return;
      await registrarTelemetriaSite(supabaseAdmin, {
        workspaceId,
        domain: "marketing",
        action,
        surface: rota,
        ok: extra.ok ?? true,
        erro: extra.erro ?? null,
        entityType: extra.entityId ? "opportunity" : null,
        entityId: extra.entityId ?? null,
      });
    }

    async function recusar(motivo: string, mensagem: string): Promise<never> {
      await registrarHit(supabaseAdmin, {
        formulario: FORMULARIO,
        rota,
        fingerprint,
        bloqueado: true,
        motivo,
      });
      await medir("consultoria_erro", { ok: false, erro: motivo });
      throw new Error(mensagem);
    }

    await medir("consultoria_submit");

    // 1) Honeypot — só um bot preenche um campo escondido.
    if (data.isca && data.isca.trim().length > 0) {
      await recusar("honeypot", "Não foi possível validar o envio.");
    }

    // 2) Tempo de preenchimento implausível.
    const idade = idadeDoDesafioMs(data.captchaToken);
    if (idade !== null && idade < TEMPO_MINIMO_MS) {
      await recusar("preenchimento_instantaneo", "Envio muito rápido. Revise os dados e tente novamente.");
    }

    // 3) Captcha assinado no servidor.
    const check = verificarDesafio(data.captchaToken, data.captchaResposta);
    if (!check.ok) await recusar("captcha", check.motivo);

    // 4) Rate limit ad-hoc por visitante e janela.
    if (await excedeuLimite(supabaseAdmin, FORMULARIO, fingerprint)) {
      await recusar(
        "rate_limit",
        `Você já enviou ${LIMITE_ENVIOS} solicitações na última hora. Aguarde ${LIMITE_JANELA_MINUTOS} minutos ou fale pelo WhatsApp.`,
      );
    }

    const { submitLeadPublico } = await import("@/lib/platform/vitrine.functions");

    let resultado: { workspaceId: string; opportunityId: string };
    try {
      resultado = await submitLeadPublico({
        data: {
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          mensagem: [`Objetivo: ${ROTULO_OBJETIVO[data.objetivo]}`, data.mensagem]
            .filter(Boolean)
            .join(" — ")
            .slice(0, 1000),
          origem: "site" as const,
        },
      });
    } catch (e) {
      await medir("consultoria_erro", {
        ok: false,
        erro: e instanceof Error ? e.message.slice(0, 500) : "erro_desconhecido",
      });
      throw e;
    }

    await registrarHit(supabaseAdmin, {
      formulario: FORMULARIO,
      rota,
      fingerprint,
      bloqueado: false,
      motivo: null,
    });

    await medir("consultoria_sucesso", {
      workspaceId: resultado.workspaceId,
      entityId: resultado.opportunityId,
    });

    return { ok: true as const };
  });
