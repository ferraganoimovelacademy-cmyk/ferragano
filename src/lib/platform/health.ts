/** GATE 04 — Contrato das métricas de observabilidade da plataforma. */

export type PlatformHealth = {
  eventos: {
    total: number;
    ultimas24h: number;
    ultimos7d: number;
    porTipo: Record<string, number>;
  };
  outbox: {
    total: number;
    pendente: number;
    processando: number;
    entregue: number;
    falhou: number;
    descartado: number;
    atrasados: number;
    tentativasMedia: number;
    latenciaMediaSegundos: number;
    ultimoErro: { event_type: string; erro: string; em: string } | null;
  };
  regras: { total: number; ativas: number };
  jobs: {
    job: string;
    ultimo_em: string | null;
    duracao_media_ms: number | null;
    duracao_max_ms: number | null;
    execucoes: number;
    falhas: number;
  }[];
  volumes: {
    pessoas: number;
    oportunidades: number;
    oportunidadesAbertas: number;
    unidades: number;
    propostas: number;
    reservas: number;
    vendas: number;
  };
  geradoEm: string;
};

export type HealthSeveridade = "ok" | "atencao" | "critico";

export const severidadeCores: Record<HealthSeveridade, string> = {
  ok: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  atencao: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  critico: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export const severidadeLabels: Record<HealthSeveridade, string> = {
  ok: "Saudável",
  atencao: "Atenção",
  critico: "Crítico",
};

/** Fila saudável = nada atrasado e nenhuma falha definitiva. */
export function severidadeDaFila(outbox: PlatformHealth["outbox"]): HealthSeveridade {
  if (outbox.falhou > 0) return "critico";
  if (outbox.atrasados > 0 || outbox.processando > 20) return "atencao";
  return "ok";
}

/** Job saudável = rodou nas últimas 2h (o cron é de minutos) e sem falha. */
export function severidadeDoJob(
  job: PlatformHealth["jobs"][number],
  agora: Date = new Date(),
): HealthSeveridade {
  if (job.falhas > 0) return "critico";
  if (!job.ultimo_em) return "critico";
  const minutos = (agora.getTime() - new Date(job.ultimo_em).getTime()) / 60_000;
  return minutos > 120 ? "atencao" : "ok";
}

export function formatDuracao(ms: number | null): string {
  if (ms === null || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export const jobLabels: Record<string, string> = {
  "read_models.refresh": "Recálculo dos painéis 360",
  "outbox.worker": "Processador de automações",
};