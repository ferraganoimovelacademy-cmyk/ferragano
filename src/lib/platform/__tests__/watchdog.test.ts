import { describe, expect, it } from "vitest";
import type { AdvisorSinal } from "@/lib/platform/advisor";
import {
  EVENTO_SINAL_QUALQUER,
  eventoDoSinal,
  janelaDoDia,
  montarEfeitosDeSinais,
  type WatchdogRegra,
} from "@/lib/platform/watchdog";

const agora = new Date("2026-07-31T12:00:00.000Z");

const sinal = (over: Partial<AdvisorSinal> = {}): AdvisorSinal => ({
  codigo: "followup",
  titulo: "Follow-up perdido",
  evidencia: "12 oportunidades com follow-up vencido.",
  severidade: "critico",
  area: "operacao",
  ...over,
});

const regra = (over: Partial<WatchdogRegra> = {}): WatchdogRegra => ({
  id: "r1",
  eventType: eventoDoSinal("followup"),
  acao: "task",
  canal: "interno",
  config: { responsavelId: "u1" },
  delaySegundos: 0,
  ativa: true,
  ...over,
});

describe("montarEfeitosDeSinais", () => {
  it("ignora sinal ok", () => {
    expect(montarEfeitosDeSinais([sinal({ severidade: "ok" })], [regra()], agora)).toHaveLength(0);
  });

  it("sem regra, só crítico gera efeito padrão de notificação", () => {
    const efeitos = montarEfeitosDeSinais(
      [sinal(), sinal({ codigo: "ciclo", severidade: "atencao" })],
      [],
      agora,
    );
    expect(efeitos).toHaveLength(1);
    expect(efeitos[0]!.ruleId).toBeNull();
    expect(efeitos[0]!.payload["acao"]).toBe("notification");
    expect(efeitos[0]!.eventType).toBe("advisor.signal.followup");
  });

  it("regra ativa define ação, canal e delay", () => {
    const efeitos = montarEfeitosDeSinais([sinal()], [regra({ delaySegundos: 300 })], agora);
    expect(efeitos).toHaveLength(1);
    expect(efeitos[0]!.payload["acao"]).toBe("task");
    expect(efeitos[0]!.payload["responsavelId"]).toBe("u1");
    expect(efeitos[0]!.delaySegundos).toBe(300);
    expect(efeitos[0]!.ruleId).toBe("r1");
  });

  it("regra inativa não dispara e cai no efeito padrão do crítico", () => {
    const efeitos = montarEfeitosDeSinais([sinal()], [regra({ ativa: false })], agora);
    expect(efeitos).toHaveLength(1);
    expect(efeitos[0]!.ruleId).toBeNull();
  });

  it("curinga reage a sinal em atenção", () => {
    const efeitos = montarEfeitosDeSinais(
      [sinal({ codigo: "ciclo", severidade: "atencao" })],
      [regra({ eventType: EVENTO_SINAL_QUALQUER })],
      agora,
    );
    expect(efeitos).toHaveLength(1);
    expect(efeitos[0]!.eventType).toBe("advisor.signal.ciclo");
    expect(efeitos[0]!.payload["prioridade"]).toBe("media");
  });

  it("idempotência é por sinal, severidade, regra e dia", () => {
    const [efeito] = montarEfeitosDeSinais([sinal()], [regra()], agora);
    expect(efeito!.idempotencyKey).toBe("advisor.signal.followup:critico:r1:2026-07-31");
    expect(janelaDoDia(agora)).toBe("2026-07-31");
  });

  it("duas regras para o mesmo sinal geram efeitos distintos", () => {
    const efeitos = montarEfeitosDeSinais(
      [sinal()],
      [regra(), regra({ id: "r2", acao: "notification" })],
      agora,
    );
    expect(efeitos.map((e) => e.idempotencyKey)).toHaveLength(2);
    expect(new Set(efeitos.map((e) => e.idempotencyKey)).size).toBe(2);
  });
});
