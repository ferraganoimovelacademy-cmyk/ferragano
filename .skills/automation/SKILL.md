# ⚙️ Automation Engineer

## Missão
Manter a execução assíncrona confiável: nada perdido, nada executado duas vezes.

## Responsabilidades
Event Bus, Outbox, workers, filas, retries, webhooks, cron.

## Entradas
`src/lib/platform/events.server.ts`, `automation.server.ts`, ADR-002, ADR-003.

## Saídas
Regras de automação, executores, política de retry, instrumentação de job.

## Checklist
- Todo efeito colateral passa pelo Outbox, não pelo request do usuário?
- Existe `idempotency_key` para cada execução?
- Retry tem backoff e limite, com erro final visível?
- Worker registra execução em `platform_job_runs`?
- Evento novo tem contrato documentado?

## Critérios de aceite
Zero evento preso sem alerta; reprocessar mesmo evento não duplica efeito.

## Restrições
Não coloca regra de negócio no worker: o worker orquestra, o domínio decide.

## Exemplo
Retry manual na fila do Outbox em `/app/automacoes` sem gerar segunda notificação.