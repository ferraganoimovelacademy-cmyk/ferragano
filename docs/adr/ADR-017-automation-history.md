# ADR-017 — Histórico analítico de automação independe da fila

- **Status:** aceito (Sprint 19)
- **Contexto:** a Sprint 18 (ADR-016) media efetividade lendo `outbox_events`.
  A ressalva ficou documentada: a janela histórica depende da retenção da fila.
  Documentar não protege — quando a purga do Outbox entrar, a série morre.
- **Decisão:** a métrica analítica passa a ser **materializada**, não derivada
  da fila:
  - `public.automation_daily_metrics` (workspace × regra × dia) guarda
    execuções, entregues, falhas, descartes, pendentes, tentativas, latência
    média, tempo economizado, oportunidades tocadas e conversões.
  - `rollup_automation_daily_metrics(_dias)` consolida a janela recente e é
    idempotente (`ON CONFLICT DO UPDATE`), rodando pelo cron antes de qualquer
    purga. Registra execução em `platform_job_runs`.
  - `automation_intelligence(_workspace_id, _dias)` lê **somente** o histórico
    materializado e devolve também a base de conversão do workspace.
  - Purga do Outbox só é permitida depois do rollup do dia — requisito de
    arquitetura, não recomendação.
- **Tempo economizado** é uma constante por ação (`automation_tempo_economizado`):
  tarefa 120 s, e-mail 60 s, notificação/WhatsApp 30 s, push 15 s, webhook 5 s.
  É estimativa declarada, não medição de relógio.
- **Conversion Lift** compara a conversão das oportunidades tocadas pela regra
  com a base do workspace. É correlação: exige amostra mínima de 10
  oportunidades e nunca é apresentado como causa.
- **Consequências:** o relatório anual deixa de depender da fila operacional;
  em troca, a métrica só existe a partir da primeira execução do rollup —
  não há reconstrução retroativa além da retenção atual do Outbox.
