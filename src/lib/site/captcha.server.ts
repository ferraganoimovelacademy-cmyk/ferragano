import { createHmac, timingSafeEqual, randomInt } from "node:crypto";

/**
 * Captcha determinístico e sem terceiros: o servidor emite uma conta simples
 * assinada com HMAC. O cliente devolve token + resposta; o servidor recalcula.
 * Nada do desafio confia no cliente — a resposta correta nunca é enviada.
 */

const VALIDADE_MS = 10 * 60 * 1000;

function segredo() {
  const s = process.env["CAPTCHA_SECRET"];
  if (!s) throw new Error("CAPTCHA_SECRET não configurado.");
  return s;
}

function assinar(payload: string) {
  return createHmac("sha256", segredo()).update(payload).digest("hex");
}

export interface DesafioCaptcha {
  pergunta: string;
  token: string;
}

/** Gera a conta e o token assinado que carrega a resposta esperada. */
export function gerarDesafio(): DesafioCaptcha {
  const a = randomInt(2, 10);
  const b = randomInt(2, 10);
  const expira = Date.now() + VALIDADE_MS;
  const payload = `${a + b}.${expira}`;
  return {
    pergunta: `Quanto é ${a} + ${b}?`,
    token: `${payload}.${assinar(payload)}`,
  };
}

/** Verifica token + resposta. Retorna motivo legível quando falha. */
export function verificarDesafio(token: string, resposta: string): { ok: true } | { ok: false; motivo: string } {
  const partes = token.split(".");
  if (partes.length !== 3) return { ok: false, motivo: "Verificação inválida. Recarregue a página." };
  const [esperado, expira, assinatura] = partes as [string, string, string];

  const calculada = assinar(`${esperado}.${expira}`);
  const a = Buffer.from(assinatura, "utf8");
  const b = Buffer.from(calculada, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, motivo: "Verificação inválida. Recarregue a página." };
  }

  if (!Number.isFinite(Number(expira)) || Number(expira) < Date.now()) {
    return { ok: false, motivo: "Verificação expirada. Gere uma nova conta." };
  }

  if (resposta.trim() !== esperado) {
    return { ok: false, motivo: "Resposta da verificação incorreta." };
  }
  return { ok: true };
}

/**
 * Quanto tempo passou desde a emissão do desafio, derivado do próprio token.
 * Usado como sinal anti-bot: humano não preenche em menos de alguns segundos.
 * Retorna null quando o token não é interpretável.
 */
export function idadeDoDesafioMs(token: string): number | null {
  const expira = Number(token.split(".")[1]);
  if (!Number.isFinite(expira)) return null;
  return VALIDADE_MS - (expira - Date.now());
}
