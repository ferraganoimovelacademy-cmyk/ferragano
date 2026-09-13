/**
 * GATE S03 — Chaos Tests.
 *
 * Testa o comportamento do sistema quando algo dá errado: worker chamado sem
 * credencial, corpo inválido, limite fora da faixa, e cálculo de saúde com dado
 * ausente, negativo ou absurdo. A regra é sempre a mesma: degradar, nunca mentir
 * e nunca derrubar.
 */
import { describe, expect, it } from "vitest";
import {
  bloqueiaRelease,
  calcularHealthScore,
  classificarBudget,
  budgetByKey,
  HEALTH_WEIGHTS,
  notaDeOperacao,
  notaDePerformance,
  tierDoScore,
  type HealthDimension,
} from "@/lib/platform/metrics";

const BASE = "http://localhost:8080";
const WORKER = `${BASE}/api/public/hooks/outbox-worker`;

async function servidorNoAr() {
  try {
    const res = await fetch(BASE, { method: "GET" });
    return res.status < 500;
  } catch {
    return false;
  }
}

const noAr = await servidorNoAr();

describe.skipIf(!noAr)("caos — worker do Outbox sob condição adversa", () => {
  it("rejeita chamada sem credencial", async () => {
    const res = await fetch(WORKER, { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("rejeita credencial inválida", async () => {
    const res = await fetch(WORKER, {
      method: "POST",
      headers: { apikey: "chave-invalida" },
    });
    expect(res.status).toBe(401);
  });

  it("GET no endpoint não executa o worker", async () => {
    const res = await fetch(WORKER, { method: "GET" });
    const corpo = await res.text();
    expect(corpo.includes('"ok":true')).toBe(false);
  });

  it("nunca devolve PII no corpo de erro", async () => {
    const res = await fetch(WORKER, { method: "POST" });
    const corpo = (await res.text()).toLowerCase();
    for (const termo of ["cpf", "email", "@", "telefone", "nome"]) {
      expect(corpo.includes(termo)).toBe(false);
    }
  });
});

describe("caos — cálculo de saúde com dado degradado", () => {
  const qualquerBudget = Object.values(budgetByKey)[0]!;

  it("não classifica budget sem medição", () => {
    expect(classificarBudget(qualquerBudget, null)).toBe("sem_dado");
    expect(classificarBudget(qualquerBudget, undefined)).toBe("sem_dado");
    expect(classificarBudget(qualquerBudget, Number.NaN)).toBe("sem_dado");
  });

  it("não bloqueia release por ausência de coleta", () => {
    expect(bloqueiaRelease({}).bloqueado).toBe(false);
    expect(bloqueiaRelease({ [qualquerBudget.key]: null }).violacoes).toEqual([]);
  });

  it("bloqueia release quando budget bloqueante estoura de forma absurda", () => {
    const bloqueante = Object.values(budgetByKey).find((b) => b.blocking && !b.higherIsBetter);
    if (!bloqueante) return;
    const r = bloqueiaRelease({ [bloqueante.key]: Number.POSITIVE_INFINITY });
    expect(r.bloqueado).toBe(true);
    expect(r.violacoes).toContain(bloqueante.label);
  });

  it("performance sem medição é nula, não zero", () => {
    expect(notaDePerformance({})).toBeNull();
  });

  it("operação com fila explodida derruba a nota sem sair da faixa", () => {
    const nota = notaDeOperacao({
      outboxPendente: 10_000,
      outboxFalhou: 5_000,
      cronExecucoes: 0,
      cronFalhas: 999,
    });
    expect(nota).toBeGreaterThanOrEqual(0);
    expect(nota).toBeLessThanOrEqual(100);
  });

  it("health score permanece na faixa 0–100 com entradas absurdas", () => {
    const dims = Object.keys(HEALTH_WEIGHTS) as HealthDimension[];
    for (const valor of [-500, 0, 50, 100, 5_000, Number.NaN]) {
      const notas = Object.fromEntries(dims.map((d) => [d, valor])) as Record<
        HealthDimension,
        number
      >;
      const { score } = calcularHealthScore(notas);
      if (Number.isNaN(valor)) {
        // NaN cai no clamp como 0: score degradado, nunca NaN.
        expect(score).toBe(0);
      } else {
        expect(Number.isFinite(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("tier é monotônico e sempre definido", () => {
    const ordem = ["action_required", "silver", "gold", "platinum"];
    let anterior = -1;
    for (const score of [0, 40, 60, 75, 85, 95, 100]) {
      const idx = ordem.indexOf(tierDoScore(score));
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeGreaterThanOrEqual(anterior);
      anterior = idx;
    }
  });
});