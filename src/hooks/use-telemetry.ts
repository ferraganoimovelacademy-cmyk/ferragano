import { useCallback, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { trackEvent } from "@/lib/platform/telemetry.functions";
import type { TelemetryDomain } from "@/lib/platform/telemetry";

/**
 * SPRINT 12 — GATE 02: jornada real de uso.
 *
 * A sessão de navegação recebe um id próprio (sessionStorage), sem relação com
 * o token de autenticação, para reconstruir o caminho do usuário:
 * entrou → abriu pessoa → abriu unidade → criou visita → saiu.
 *
 * Regras: nunca envia PII (só domínio/ação/entidade), nunca bloqueia a UI e
 * nunca lança erro para a tela.
 */
const CHAVE_SESSAO = "fg1.telemetry.session";

function sessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const atual = window.sessionStorage.getItem(CHAVE_SESSAO);
    if (atual) return atual;
    const novo = crypto.randomUUID();
    window.sessionStorage.setItem(CHAVE_SESSAO, novo);
    return novo;
  } catch {
    return null;
  }
}

export type TrackInput = {
  domain: TelemetryDomain;
  action: string;
  duracaoMs?: number | null;
  ok?: boolean;
  surface?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metric?: string | null;
  erro?: string | null;
};

export function useTelemetry() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const enviar = useServerFn(trackEvent);

  const track = useCallback(
    (input: TrackInput) => {
      if (!workspaceId) return;
      void enviar({
        data: {
          workspaceId,
          domain: input.domain,
          action: input.action,
          duracaoMs: input.duracaoMs ?? null,
          ok: input.ok ?? true,
          surface: input.surface ?? null,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          sessionId: sessionId(),
          erro: input.erro ?? null,
          metric: input.metric ?? null,
        },
      }).catch(() => {
        // telemetria é best-effort
      });
    },
    [enviar, workspaceId],
  );

  return { track, sessionId: sessionId(), pronto: Boolean(workspaceId) };
}

/** Marca uma vez a entrada em uma tela (jornada + latência percebida). */
export function useTrackScreen(
  domain: TelemetryDomain,
  action: string,
  options: { surface?: string; entityId?: string | null; ativo?: boolean } = {},
) {
  const { track, pronto } = useTelemetry();
  const enviado = useRef<string | null>(null);
  const ativo = options.ativo ?? true;
  const chave = `${domain}.${action}.${options.entityId ?? ""}`;

  useEffect(() => {
    if (!pronto || !ativo || enviado.current === chave) return;
    enviado.current = chave;
    track({
      domain,
      action,
      surface: options.surface ?? null,
      entityId: options.entityId ?? null,
      duracaoMs: Math.round(performance.now()),
    });
  }, [pronto, ativo, chave, domain, action, options.surface, options.entityId, track]);
}

/**
 * GATE 01 — Web Vitals reais (FCP, LCP, INP) alimentando o Performance Budget.
 * Monta uma vez, no shell autenticado.
 */
export function useTrackLogin() {
  const { track, pronto } = useTelemetry();

  useEffect(() => {
    if (!pronto || typeof window === "undefined") return;
    const chave = "fg1.telemetry.login";
    try {
      if (window.sessionStorage.getItem(chave)) return;
      window.sessionStorage.setItem(chave, "1");
    } catch {
      return;
    }
    track({ domain: "platform", action: "login", surface: "app.shell" });
  }, [pronto, track]);
}

export function useWebVitals() {
  const { track, pronto } = useTelemetry();
  const enviado = useRef(false);

  useEffect(() => {
    if (!pronto || enviado.current || typeof PerformanceObserver === "undefined") return;
    enviado.current = true;

    const observers: PerformanceObserver[] = [];
    const observar = (
      type: string,
      metric: string,
      pegar: (entries: PerformanceEntryList) => number | null,
    ) => {
      try {
        const obs = new PerformanceObserver((list) => {
          const valor = pegar(list.getEntries());
          if (valor == null) return;
          track({
            domain: "platform",
            action: "web_vitals",
            surface: metric,
            metric,
            duracaoMs: Math.round(valor),
          });
        });
        obs.observe({ type, buffered: true } as PerformanceObserverInit);
        observers.push(obs);
      } catch {
        // navegador sem suporte à métrica
      }
    };

    observar("paint", "web.fcp", (entries) => {
      const fcp = entries.find((e) => e.name === "first-contentful-paint");
      return fcp ? fcp.startTime : null;
    });
    observar("largest-contentful-paint", "web.lcp", (entries) => {
      const last = entries[entries.length - 1];
      return last ? last.startTime : null;
    });
    observar("event", "web.inp", (entries) => {
      const durations = entries
        .map((e) => (e as PerformanceEntry & { duration: number }).duration)
        .filter((d) => d > 0);
      return durations.length ? Math.max(...durations) : null;
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [pronto, track]);
}
