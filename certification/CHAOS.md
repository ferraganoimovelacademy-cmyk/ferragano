# 💥 GATE S03 — Chaos Tests

Evidência: `tests/chaos/resilience.test.ts` (11 testes).

## Cenários

| Cenário | Comportamento esperado | Resultado |
| --- | --- | --- |
| Worker do Outbox chamado sem credencial | 401, nada processado | ✅ |
| Worker com credencial inválida | 401 | ✅ |
| `GET` no endpoint do worker | não executa a fila | ✅ |
| Corpo de erro do worker | zero PII, só contadores | ✅ |
| Budget sem coleta | `sem_dado`, não bloqueia release | ✅ |
| Budget bloqueante estourado | release bloqueado com violação nomeada | ✅ |
| Fila explodida (10k pendentes, 5k falhos, cron parado) | nota de operação despenca dentro de 0–100 | ✅ |
| Health Score com entrada absurda (−500, 5000, NaN) | permanece 0–100, nunca `NaN` | ✅ |
| Tier do score | monotônico e sempre definido | ✅ |

## Bug encontrado pelo caos

`calcularHealthScore` propagava `NaN` quando uma dimensão vinha sem número
finito (`Math.max/min` com `NaN` retorna `NaN`), o que renderizaria "NaN" no
Control Center. Corrigido em `src/lib/platform/metrics.ts`: valor não finito é
tratado como 0 — o score degrada e evidencia a falta de coleta em vez de mentir.

## Resiliência já garantida por desenho

- **Retry com backoff exponencial** em `complete_outbox_event`
  (`now() + 1min * 2^tentativas`), com `max_tentativas` e status `falhou`.
- **`FOR UPDATE SKIP LOCKED`** em `claim_outbox_batch`: dois workers simultâneos
  nunca entregam o mesmo evento.
- **Observabilidade nunca derruba o fluxo**: falha ao registrar `log_job_run` é
  capturada e logada, o worker segue.
- **Alerta automático** quando a fila atrasa (`outbox.atrasado`), quando há
  evento em falha (`outbox.falhou`) e quando o cron para (`cron.parado`).

## Pendência declarada

Injeção de latência real no banco (timeout de conexão) não é executável no
ambiente gerenciado atual. Fica como teste de piloto, com o alerta `cron.parado`
como detector de referência.