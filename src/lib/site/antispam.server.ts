import { createHash } from "node:crypto";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

/**
 * Proteção anti-abuso dos formulários públicos do site.
 *
 * Não existe primitiva de rate limiting na plataforma: este limite é ad-hoc,
 * baseado em contagem por janela na tabela `public_form_hits`. Serve para
 * conter abuso trivial (envio repetido, bot simples) — não substitui um WAF.
 *
 * O visitante nunca é identificado por IP em texto: guardamos apenas um
 * fingerprint HMAC-like (SHA-256 com CAPTCHA_SECRET) de IP + user-agent.
 */

export const LIMITE_JANELA_MINUTOS = 60;
export const LIMITE_ENVIOS = 3;

/** Tempo mínimo entre carregar o desafio e enviar: bot preenche instantâneo. */
export const TEMPO_MINIMO_MS = 3_000;

export function fingerprintVisitante(): string {
  const ip = getRequestIP({ xForwardedFor: true }) ?? "sem-ip";
  const ua = getRequestHeader("user-agent") ?? "sem-ua";
  const segredo = process.env["CAPTCHA_SECRET"] ?? "";
  return createHash("sha256").update(`${segredo}|${ip}|${ua}`).digest("hex").slice(0, 48);
}

type Admin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

export async function registrarHit(
  admin: Admin,
  entrada: {
    formulario: string;
    rota: string | null;
    fingerprint: string;
    bloqueado: boolean;
    motivo?: string | null;
  },
): Promise<void> {
  const { error } = await admin.from("public_form_hits").insert({
    formulario: entrada.formulario,
    rota: entrada.rota,
    fingerprint: entrada.fingerprint,
    bloqueado: entrada.bloqueado,
    motivo: entrada.motivo ?? null,
  });
  if (error) console.warn("[antispam:hit]", error.message);
}

/** true quando o visitante já passou do limite da janela. */
export async function excedeuLimite(
  admin: Admin,
  formulario: string,
  fingerprint: string,
): Promise<boolean> {
  const { data, error } = await admin.rpc("public_form_rate_check" as never, {
    _formulario: formulario,
    _fingerprint: fingerprint,
    _janela_minutos: LIMITE_JANELA_MINUTOS,
    _limite: LIMITE_ENVIOS,
  } as never);

  if (error) {
    // Sem leitura confiável não bloqueamos o cliente legítimo.
    console.warn("[antispam:rate]", error.message);
    return false;
  }
  const linha = Array.isArray(data) ? data[0] : data;
  return Boolean((linha as { excedido?: boolean } | null)?.excedido);
}
