# 17 — Automation Engine (Sprint 09)

Status: **implementado**.

## 1. Objetivo

Transformar evento de domínio em efeito colateral confiável, sem acoplar o
caso de uso ao canal. O caso de uso publica um evento; quem reage é regra de
configuração, não código novo.

## 2. Fluxo

```text
caso de uso -> publishEvent -> domain_events (fato, imutável)
                            -> automation_rules (match por event_type + condições)
                            -> outbox_events (efeito desejado, com idempotency_key)
pg_cron (1 min) -> /api/public/hooks/outbox-worker
                -> claim_outbox_batch  (FOR UPDATE SKIP LOCKED)
                -> executor (task | notification | webhook)
                -> complete_outbox_event (entregue | falhou + backoff | descartado)
```

## 3. Garantias

- **Idempotência de enfileiramento**: `idempotency_key` única por workspace.
  O mesmo evento nunca gera dois efeitos iguais.
- **Concorrência segura**: o claim usa `FOR UPDATE SKIP LOCKED`, então dois
  workers simultâneos não pegam a mesma linha.
- **Retry com espera crescente**: 2^tentativas minutos, até `max_tentativas`.
  Estourado o limite, a linha vira `descartado` com o último erro preservado.
- **Sem provedor, sem fingimento**: `email`, `whatsapp` e `push` são
  descartados com motivo explícito enquanto não houver provedor conectado.
  Não existe execução silenciosa.

## 4. Superfícies

| Peça | Arquivo |
|---|---|
| Contratos client-safe | `src/lib/platform/automation.ts` |
| Worker e executores | `src/lib/platform/automation.server.ts` |
| Enfileiramento por regra | `src/lib/platform/events.server.ts` |
| Leitura e configuração | `src/lib/platform/automation.functions.ts` |
| Rota do cron | `src/routes/api/public/hooks/outbox-worker.ts` |
| Tela | `src/routes/app.automacoes.tsx` |

## 5. Invariantes

- O executor nunca decide regra de negócio; ele só cumpre o efeito gravado.
- A fila (`outbox_events`) não tem policy de SELECT: leitura só via
  `list_outbox_queue`, que exige papel de admin.
- Regra desligada não apaga histórico; a fila já enfileirada continua válida.
- Novo canal entra como executor novo, sem tocar em `publishEvent`.

## 6. Critérios de aceite

- [x] Evento de domínio dispara regra sem código novo no caso de uso.
- [x] Efeito repetido não executa duas vezes.
- [x] Falha volta para a fila com espera crescente e erro visível.
- [x] Admin vê a fila, filtra por status e reprocessa manualmente.
- [ ] Provedor real de e-mail/WhatsApp conectado (Sprint 11).
