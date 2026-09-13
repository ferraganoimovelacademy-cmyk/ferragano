# 🛡 Relatório de Scan de Segurança

Gerado automaticamente por `bun run security:scan` em cada deploy.
Não edite à mão — a fonte das vulnerabilidades é `certification/security-findings.json`.

| | |
| --- | --- |
| Execução | 2026-08-03T00:25:36.396Z |
| Referência | `local` |
| Backend alcançável | sim |
| **Veredito** | **🟢 LIBERADO** |

## Vulnerabilidades selecionadas x resolvidas

| ID | Vulnerabilidade | Severidade | Selecionada em | Estado | Evidência medida |
| --- | --- | --- | --- | --- | --- |
| SEC-001 | Função public_form_rate_check executável por visitante anônimo | erro | 2026-08-02 | ✅ resolvida | POST /rpc/public_form_rate_check sem sessão → HTTP 404 (esperado ≥ 400) |
| SEC-002 | Valores de indicadores de mercado de séries inativas expostos a anon | aviso | 2026-08-02 | ✅ resolvida | séries inativas visíveis a anon: 0 (esperado 0) |
| SEC-003 | Bucket cury-media com leitura anônima ampla | aviso | 2026-08-02 | ✅ resolvida | objetos listados por anon: 0 (esperado 0) |
| SEC-004 | Colunas internas de unidades legíveis pela vitrine pública | erro | 2026-07-30 | ✅ resolvida | colunas negadas: 7/7 |

Resolvidas: **4/4** · Regressões: **0** · Não verificadas: **0**

### Correção aplicada em cada item

- **SEC-001** — REVOKE EXECUTE de anon/PUBLIC; chamada apenas pelo servidor via service_role.
- **SEC-002** — Policy de SELECT exige série com ativo = true.
- **SEC-003** — Leitura anônima restrita por internal.midia_cury_publica (mídia pública de empreendimento público).
- **SEC-004** — SELECT da tabela revogado; GRANT SELECT apenas nas colunas comerciais.

## Barreiras automatizadas (ADR-012)

| Barreira | Resultado | Saída |
| --- | --- | --- |
| Isolamento de workspace | 🟢 PASS | `Test Files  1 passed (1) · Tests  54 passed (54) · Duration  9.59s (transform 38ms, setup 0ms, import 54ms, tests 9.28s, environment 0ms)` |
| Simulação de ataque | 🟢 PASS | `Test Files  1 passed (1) · Tests  37 passed (37) · Duration  6.29s (transform 42ms, setup 0ms, import 60ms, tests 6.02s, environment 0ms)` |
| Caos e resiliência | 🟢 PASS | `Test Files  1 passed (1) · Tests  11 passed (11) · Duration  475ms (transform 53ms, setup 0ms, import 203ms, tests 42ms, environment 0ms)` |
| Dependências (audit) | ⚠️ INDISPONÍVEL | `error: audit request failed (status 404) · Command failed: bun audit --audit-level=high · error: audit request failed (status 404)` |

## Avisos aceitos com justificativa

- **LINT-0029** — Funções SECURITY DEFINER executáveis por usuário autenticado. É o mecanismo de isolamento multi-tenant (ADR-004/ADR-005): a primeira instrução valida vínculo com auth.uid() e levanta forbidden sem vínculo. Coberto por tests/security/attack-simulation.test.ts.

## Pendência declarada

- Auditoria de dependências não pôde ser consultada neste ambiente (registro inacessível).
