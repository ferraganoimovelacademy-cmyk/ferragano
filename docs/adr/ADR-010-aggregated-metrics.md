# ADR-010 — Métricas agregadas e Performance Budget como gate

- Status: aceito
- Data: 2026-07-31
- Sprint: 11 — Platform Reliability

## Contexto
O Alpha já tinha eventos de domínio (`domain_events`) e execuções de job
(`platform_job_runs`), mas nenhuma camada capaz de responder "isto está rápido?"
ou "isto piorou desde a semana passada?". Sem número, otimização vira palpite e
regressão passa sem ser vista.

## Decisão
1. Criar `platform_metrics` armazenando **apenas métricas agregadas**
   (`metric_name`, `metric_type`, `metric_value`, entidade opcional). Evento
   detalhado continua em `domain_events` / `platform_job_runs` — sem duplicação.
2. O Performance Budget vive em código (`src/lib/platform/metrics.ts`), não em
   documento. Alterar meta exige novo ADR.
3. Orçamento marcado `blocking` que estoura **bloqueia release**; não bloqueante
   apenas alerta.
4. Sem medição, a métrica é `sem_dado`: não pontua nem penaliza. Proibido
   presumir nota.
5. O Ferragano Health Score é média ponderada de seis dimensões com pesos fixos
   (arquitetura 20, performance 20, segurança 20, UX 15, qualidade 15, operação 10).
6. Leitura só pela Query Layer: `platform_metrics_summary` (security definer,
   restrita a proprietário/administrador). A tela nunca consulta a tabela.
7. Retenção de 90 dias via `pg_cron`.

## Consequências
- Positivas: regressão fica visível, decisão de performance passa a ser auditável
  e o gate de release é objetivo.
- Negativas: agregado não permite investigar um caso isolado; para isso é preciso
  correlacionar com `domain_events`.
- Risco aceito: a nota de arquitetura/segurança/UX/qualidade vem da certificação
  da sprint (revisão humana), não de coleta automática.