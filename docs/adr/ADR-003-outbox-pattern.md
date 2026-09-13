# ADR-003 — Outbox Pattern para efeitos colaterais

## Contexto

Um evento de domínio frequentemente precisa gerar um efeito externo: tarefa
para o corretor, notificação, futuramente e-mail/WhatsApp/webhook. Disparar
esse efeito de forma síncrona, dentro da mesma chamada que gravou o evento,
acopla a operação de negócio à disponibilidade de um serviço externo — e um
provedor fora do ar não pode impedir a venda de ser registrada. Também é
preciso garantir que o mesmo efeito não execute duas vezes se o worker
reprocessar por falha parcial.

## Decisão

`outbox_events` grava o efeito desejado (canal, destino, payload, status,
tentativas, `disponivel_em`, `ultimo_erro`) na mesma operação que gravou o
evento de domínio, via `publishEvent` → `enqueueOutbox` /
`enqueueFromRules` (`src/lib/platform/events.server.ts`). Um worker separado
processa depois:

- **Idempotência**: `idempotency_key` única por workspace, derivada de
  `event_type:aggregate_id:canal:destino` quando não informada explicitamente.
  O mesmo evento nunca gera dois efeitos iguais.
- **Concorrência segura**: `claim_outbox_batch` usa `FOR UPDATE SKIP LOCKED`,
  então dois workers simultâneos não competem pela mesma linha.
- **Backoff exponencial**: nova tentativa em `2^tentativas` minutos até
  `max_tentativas`; estourado o limite, a linha vira `descartado` com o
  último erro preservado, nunca apagada.
- **Sem execução silenciosa**: canais sem provedor conectado (`email`,
  `whatsapp`, `push`) são descartados com motivo explícito — não existe
  simulação de envio bem-sucedido.
- **Disparo**: `pg_cron` a cada 1 minuto chama
  `/api/public/hooks/outbox-worker`, que executa `claim_outbox_batch` →
  executor (`task` | `notification` | `webhook`) → `complete_outbox_event`.
- Escrita em `outbox_events` restrita a `service_role`; leitura só via
  `list_outbox_queue`, que exige papel de administrador do workspace — a
  tabela não tem policy de `SELECT` direto.

## Alternativas descartadas

- **Chamar o provedor externo dentro da transação que grava o evento**:
  descartado — acopla disponibilidade externa à operação de negócio e não
  tem retry natural.
- **Fila externa (SQS/RabbitMQ)**: descartado nesta fase. O volume atual não
  justifica infraestrutura extra; `outbox_events` + `pg_cron` cobre o caso
  com o mesmo banco transacional, sem outro serviço no ar. Reavaliar se o
  volume de efeitos crescer a ponto de o cron de 1 minuto virar gargalo.

## Consequências

- O worker do outbox só existe desde a Sprint 09; código escrito antes disso
  (Property Domain, Sprint 07) já previa o padrão mas ainda não tinha quem
  processasse a fila — dívida fechada nesta sprint.
- Canal de e-mail/WhatsApp real ainda não está conectado: todo efeito desses
  canais é descartado com motivo, não entregue (pendente — ver capítulo 11).
- Regra de automação desligada não apaga o que já está na fila; histórico
  processado continua válido.

## Status

Aceito — 2026-07-31.

## Referências

- `src/lib/platform/events.server.ts`
- `src/lib/platform/automation.server.ts`
- `src/lib/platform/automation.functions.ts`
- `src/routes/api/public/hooks/outbox-worker.ts`
- `docs/blueprint/17-automation-engine.md`
- Tabelas: `outbox_events`, `automation_rules`
