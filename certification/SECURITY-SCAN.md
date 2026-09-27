# 🛡 Relatório de Scan de Segurança

Gerado automaticamente por `bun run security:scan` em cada deploy.
Não edite à mão — a fonte das vulnerabilidades é `certification/security-findings.json`.

| | |
| --- | --- |
| Execução | 2026-09-27T18:57:53.327Z |
| Referência | `local` |
| Backend alcançável | sim |
| **Veredito** | **🟢 LIBERADO** |

## Vulnerabilidades selecionadas x resolvidas

| ID | Vulnerabilidade | Severidade | Selecionada em | Estado | Evidência medida |
| --- | --- | --- | --- | --- | --- |


Resolvidas: **0/0** · Regressões: **0** · Não verificadas: **0**

### Correção aplicada em cada item



## Barreiras automatizadas (ADR-012)

| Barreira | Resultado | Saída |
| --- | --- | --- |
| Isolamento de workspace | 🟢 PASS | `Test Files  1 passed (1) · Tests  54 passed (54) · Duration  13.68s (transform 36ms, setup 0ms, import 51ms, tests 13.44s, environment 0ms)` |
| Simulação de ataque | 🟢 PASS | `Test Files  3 passed (3) · Tests  70 passed (70) · Duration  12.07s (transform 85ms, setup 0ms, import 135ms, tests 11.41s, environment 0ms)` |
| Caos e resiliência | 🟢 PASS | `✓ tests/chaos/resilience.test.ts (11 tests | 4 skipped) 6ms · Test Files  1 passed (1) · Tests  7 passed | 4 skipped (11) · Duration  292ms (transform 56ms, setup 0ms, import 115ms, tests 6ms, environment 0ms)` |
| Dependências (audit) | 🟢 PASS | `No vulnerabilities found (checked 498 packages) [120.00ms]` |

## Avisos aceitos com justificativa


