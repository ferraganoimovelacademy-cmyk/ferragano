/**
 * SPRINT 17 — Automação Inteligente.
 *
 * Fecha o ciclo Read Models → Advisor → Automation Engine: os sinais medidos
 * (camada pura do Advisor) passam a disparar efeitos na fila do Outbox quando
 * cruzam o limite. Aqui não há I/O: é só a decisão de QUAIS efeitos enfileirar.
 *
 * Invariantes:
 *  - só sinais `atencao` ou `critico` geram efeito;
 *  - a idempotência é por sinal + severidade + dia, então o cron pode rodar
 *    quantas vezes quiser sem duplicar tarefa/notificação;
 *  - sem regra ativa casando o evento, apenas sinais `critico` geram o efeito
 *    padrão (notificação para a gestão).
 */

import type { AdvisorSinal, AdvisorSeveridade } from "@/lib/platform/advisor";
import type { AutomationAcao, AutomationCanal, ConfigValue } from "@/lib/platform/automation";

/** Evento de domínio publicado por sinal do Advisor. */
export const eventoDoSinal = (codigo: string) => `advisor.signal.${codigo}`;

/** Curinga: regra que reage a qualquer sinal fora do limite. */
export const EVENTO_SINAL_QUALQUER = "advisor.signal.any";

export const SEVERIDADES_ACIONAVEIS: AdvisorSeveridade[] = ["atencao", "critico"];

export type WatchdogRegra = {
  id: string;
  eventType: string;
  acao: AutomationAcao;
  canal: AutomationCanal;
  config: Record<string, ConfigValue>;
  delaySegundos: number;
  ativa: boolean;
};

export type WatchdogEfeito = {
  eventType: string;
  canal: AutomationCanal;
  ruleId: string | null;
  idempotencyKey: string;
  delaySegundos: number;
  payload: Record<string, ConfigValue>;
};

/** Dia em UTC (YYYY-MM-DD) usado como janela de idempotência. */
export function janelaDoDia(agora: Date = new Date()): string {
  return agora.toISOString().slice(0, 10);
}

const tituloEfeito = (sinal: AdvisorSinal) =>
  sinal.severidade === "critico"
    ? `Sinal crítico: ${sinal.titulo}`
    : `Sinal em atenção: ${sinal.titulo}`;

export function montarEfeitosDeSinais(
  sinais: readonly AdvisorSinal[],
  regras: readonly WatchdogRegra[],
  agora: Date = new Date(),
): WatchdogEfeito[] {
  const dia = janelaDoDia(agora);
  const ativas = regras.filter((r) => r.ativa);
  const efeitos: WatchdogEfeito[] = [];

  for (const sinal of sinais) {
    if (!SEVERIDADES_ACIONAVEIS.includes(sinal.severidade)) continue;

    const eventType = eventoDoSinal(sinal.codigo);
    const base: Record<string, ConfigValue> = {
      titulo: tituloEfeito(sinal),
      mensagem: sinal.evidencia,
      sinal: sinal.codigo,
      area: sinal.area,
      severidade: sinal.severidade,
      tipo: sinal.severidade === "critico" ? "alerta" : "info",
      link: "/app/advisor",
      origem: "automacao",
      prioridade: sinal.severidade === "critico" ? "alta" : "media",
    };

    const casadas = ativas.filter(
      (r) => r.eventType === eventType || r.eventType === EVENTO_SINAL_QUALQUER,
    );

    if (casadas.length === 0) {
      // Sem regra configurada, só o crítico vira efeito — atenção fica no painel.
      if (sinal.severidade !== "critico") continue;
      efeitos.push({
        eventType,
        canal: "interno",
        ruleId: null,
        idempotencyKey: `${eventType}:${sinal.severidade}:padrao:${dia}`,
        delaySegundos: 0,
        payload: { ...base, acao: "notification" },
      });
      continue;
    }

    for (const regra of casadas) {
      efeitos.push({
        eventType,
        canal: regra.canal,
        ruleId: regra.id,
        idempotencyKey: `${eventType}:${sinal.severidade}:${regra.id}:${dia}`,
        delaySegundos: Math.max(0, regra.delaySegundos),
        payload: { ...base, ...regra.config, acao: regra.acao },
      });
    }
  }

  return efeitos;
}
