# Roadmap — correção da auditoria (P0/P1)

## P0 — banco e endpoints (concluído)
- [x] Visitante sem sessão perdeu todo privilégio direto no banco; vitrine mantida (empreendimentos, conteúdo/mídia, landing pages)
- [x] Read Models 360 sem leitura direta (anon e logado) — só pelas funções que validam workspace/papel
- [x] `unidades`: leitura pública limitada às colunas de vitrine; colunas internas inacessíveis
- [x] Funções internas de infraestrutura restritas ao processo interno
- [x] `public_form_hits` fechado (apenas processo interno)
- [x] Hooks de cron/job com `authenticateCronRequest` (inclui automation-rollup)

## P1
- [x] Testes de segurança/isolamento verdes + regressão nova (grants e cron)
- [x] Gate autenticado unificado em `/app` (removida a duplicidade `_authenticated`)
- [x] Telemetria movida para o shell autenticado, com erro explícito e retry
- [x] Erro real de sessão no shell `/app` com retry
- [x] Verticais Intelligence e Capital voltaram a declarar bloqueio de governança (H12/LGPD)
- [x] CI: typecheck, lint com baseline (só arquivos alterados), testes, rotas estáticas, build, security scan e E2E
- [ ] BLOQUEADO — feature flags: código liga todos os módulos, comentário e teste dizem "nasce desligado, exceto CRM". Precisa da decisão do dono do produto antes de mudar.

## Pendências de ambiente
- [ ] `bun audit` indisponível neste ambiente (registro retorna 404)
