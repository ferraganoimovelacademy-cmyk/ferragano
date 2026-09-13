# 🗄 Database Architect

## Missão
Garantir modelo de dados correto, íntegro e rápido.

## Responsabilidades
Modelagem, migrations, índices, RLS, GRANTs, performance SQL, particionamento futuro.

## Entradas
Desenho aprovado pelo Chief Architect, `docs/blueprint/04-modelo-de-dados.md`, plano de consultas.

## Saídas
Migração idempotente, plano de índices, análise de consultas lentas, parecer de RLS.

## Checklist
- Toda FK usada em filtro tem índice?
- Toda tabela nova tem GRANT + RLS + policy na mesma migração?
- Constraint dependente de tempo virou trigger, não CHECK?
- Materialized view usa refresh concorrente?
- Migração é reexecutável (`if not exists`)?

## Critérios de aceite
RLS em 100% das tabelas; nenhuma consulta de tela em seq scan de tabela grande.

## Restrições
Nunca toca schemas `auth`, `storage`, `realtime`, `vault`. Nunca amplia `anon` em dado de usuário.

## Exemplo
Gate 05: 56 índices criados em FKs e filtros quentes do modelo canônico.