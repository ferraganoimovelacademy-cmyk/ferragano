# Roadmap — correção da auditoria (P0/P1)

## P0 — banco e endpoints
- [ ] Revogar acesso direto de anon/authenticated às 5 materialized views (customer_360, executive_360, sales_360, property_360, marketing_360); leitura só por RPC validando workspace/role
- [ ] Policy pública de `unidades` sem colunas internas (comissao_percentual, score_liquidez, perfil_ideal, argumentos, objecoes, campanha) sem quebrar vitrine
- [ ] Revogar EXECUTE público de funções internas SECURITY DEFINER
- [ ] Fechar `public_form_hits` (RLS sem policy hoje)
- [ ] Hooks de cron/job usando `authenticateCronRequest`, incluindo `automation-rollup`

## P1
- [ ] Corrigir/adicionar testes de segurança e isolamento (regressão das barreiras acima)
- [ ] Unificar gate autenticado (app.tsx vs _authenticated), preservando onboarding/AppLayout; mover telemetria para o shell correto
- [ ] Estado de erro real em telemetria e no shell de sessão
- [ ] Feature-flags/ecosystem: identificar regra correta no código antes de alterar
- [ ] CI: typecheck, testes, lint (com baseline/escopo), E2E e security scan em PR/push

## Validação final
- [ ] typecheck, testes, security scan, E2E quando possível
