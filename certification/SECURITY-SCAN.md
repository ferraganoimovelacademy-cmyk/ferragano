# 🛡 Relatório de Scan de Segurança

Gerado automaticamente por `bun run security:scan` em cada deploy.
Não edite à mão — a fonte das vulnerabilidades é `certification/security-findings.json`.

| | |
| --- | --- |
| Execução | 2026-09-13T19:43:44.745Z |
| Referência | `local` |
| Backend alcançável | sim |
| **Veredito** | **🔴 DEPLOY BLOQUEADO** |

## Vulnerabilidades selecionadas x resolvidas

| ID | Vulnerabilidade | Severidade | Selecionada em | Estado | Evidência medida |
| --- | --- | --- | --- | --- | --- |


Resolvidas: **0/0** · Regressões: **0** · Não verificadas: **0**

### Correção aplicada em cada item



## Barreiras automatizadas (ADR-012)

| Barreira | Resultado | Saída |
| --- | --- | --- |
| Isolamento de workspace | 🔴 FAIL | `FAIL  tests/isolation/workspace-isolation.test.ts > isolamento — chamador sem sessão > não executa funções internas de plataforma · AssertionError: expected 200 to be greater than or equal to 400 · FAIL  tests/isolation/` |
| Simulação de ataque | 🔴 FAIL | `FAIL  tests/security/attack-simulation.test.ts > ataque — extração de dado sensível pela vitrine > não expõe unidades.score_liquidez · FAIL  tests/security/attack-simulation.test.ts > ataque — extração de dado sensível p` |
| Caos e resiliência | 🟢 PASS | `Test Files  1 passed (1) · Tests  11 passed (11) · Duration  521ms (transform 77ms, setup 0ms, import 248ms, tests 44ms, environment 0ms)` |
| Dependências (audit) | ⚠️ INDISPONÍVEL | `error: audit request failed (status 404) · Command failed: bun audit --audit-level=high · error: audit request failed (status 404)` |

## Avisos aceitos com justificativa



## Pendência declarada

- Auditoria de dependências não pôde ser consultada neste ambiente (registro inacessível).
