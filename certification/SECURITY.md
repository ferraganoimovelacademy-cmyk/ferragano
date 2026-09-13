# 🛡 GATE S01/S02 — Security Certification

Data da auditoria: Sprint 12.5.
Evidência automatizada: `tests/isolation/workspace-isolation.test.ts` (40),
`tests/security/attack-simulation.test.ts` (37).

## S01 — Estado do banco (medido, não presumido)

| Verificação | Resultado |
| --- | --- |
| Tabelas em `public` sem RLS | **0** |
| Policies ativas | **176** |
| Funções em `public` executáveis por `anon` | **0** |
| Materialized views legíveis por `anon` | **0** |
| Buckets de storage públicos | **0** |
| Tabelas com leitura `anon` | **5** (somente vitrine) |

### Correções aplicadas nesta sprint

1. **Funções internas fechadas para visitante.** `record_telemetry`,
   `record_platform_metric`, `record_decision_outcome`, `ack_platform_alert`,
   `feature_adoption`, `decision_accuracy`, `platform_metrics_summary`,
   `find_person_duplicates` e `set_updated_at` eram executáveis por `anon`.
   `EXECUTE` revogado de `PUBLIC`/`anon`; mantido para `authenticated` (todas
   validam vínculo internamente) e `service_role`.
2. **Rotinas de sistema isoladas em `service_role`:** `evaluate_platform_alerts`,
   `upsert_platform_alert`, `seed_default_pipeline`, `seed_role_permissions`,
   `refresh_person_estagio`. Os chamadores do app já usavam client admin depois
   de checar papel de administrador — nenhuma tela quebrou.
3. **Vitrine com projeção de colunas.** `unidades` expunha a visitante
   `comissao_percentual`, `score_liquidez`, `perfil_ideal`, `argumentos`,
   `objecoes`, `campanha` e `created_by`. `SELECT` da tabela revogado e
   substituído por `GRANT SELECT (colunas de venda)`.

Redução do linter: **37 → 23 avisos**.

## Avisos remanescentes (23) — aceitos com justificativa

Todos são `0029_authenticated_security_definer_function_executable`: função
`SECURITY DEFINER` chamável por usuário logado. É intencional e é o próprio
mecanismo de isolamento do produto (ADR-004/ADR-005): a função roda com
privilégio do dono para ler Read Model ou registrar telemetria, mas a **primeira
instrução** é `is_workspace_member` / `is_workspace_admin` / `has_role` com
`auth.uid()`, e sem vínculo levanta `forbidden`.

Regra de manutenção: nenhuma função `SECURITY DEFINER` nova entra sem checagem
de vínculo na primeira instrução e sem teste correspondente em
`tests/security/attack-simulation.test.ts`.

## S02 — Simulações executadas

| Ataque | Resultado |
| --- | --- |
| Workspace A lendo dado de B (sem sessão) | negado em 17 tabelas |
| Escrita anônima em tabelas transacionais | negado |
| Auto concessão de papel (`user_roles`) | negado |
| Alteração da matriz `role_permissions` | negado (POST/PATCH/DELETE) |
| Criação de workspace / auto convite | negado |
| Bootstrap de permissões e funil por anônimo | negado |
| 23 RPCs internas chamadas sem sessão | negado |
| Read Models via REST e via Query Layer | negado |
| Extração de colunas internas da vitrine | negado (7 colunas) |
| Embed de `people`/`opportunities` pela vitrine | negado |
| Vazamento de empreendimento privado | nenhuma linha com `publico = false` |

## Pendência declarada

Cobertura autenticada A→B (dois usuários reais, sessão válida) roda no piloto
com `E2E_A_*` / `E2E_B_*` definidos. Sem esses usuários, o bloco é ignorado —
não é considerado aprovado.