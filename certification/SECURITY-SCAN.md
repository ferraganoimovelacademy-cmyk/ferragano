# 🛡 Relatório de Scan de Segurança

Gerado automaticamente por `bun run security:scan` em cada deploy.
Não edite à mão — a fonte das vulnerabilidades é `certification/security-findings.json`.

| | |
| --- | --- |
| Execução | 2026-09-14T00:12:21.961Z |
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
| Isolamento de workspace | 🟢 PASS | `Test Files  1 passed (1) · Tests  54 passed (54) · Duration  15.63s (transform 38ms, setup 0ms, import 64ms, tests 15.33s, environment 0ms)` |
| Simulação de ataque | 🟢 PASS | `Test Files  3 passed (3) · Tests  70 passed (70) · Duration  9.92s (transform 102ms, setup 0ms, import 208ms, tests 16.07s, environment 0ms)` |
| Caos e resiliência | 🟢 PASS | `Test Files  1 passed (1) · Tests  11 passed (11) · Duration  529ms (transform 59ms, setup 0ms, import 237ms, tests 47ms, environment 0ms)` |
| Dependências (audit) | ⚠️ INDISPONÍVEL | `error: audit request failed (status 404) · Command failed: bun audit --audit-level=high · error: audit request failed (status 404)` |

## Avisos aceitos com justificativa



## Pendência declarada

- Auditoria de dependências não pôde ser consultada neste ambiente (registro inacessível).
