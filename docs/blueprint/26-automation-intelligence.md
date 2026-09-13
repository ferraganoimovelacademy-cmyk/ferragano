# 26 — Automation Intelligence (Sprint 19)

## Problema

A Sprint 18 respondeu "a regra executou?". Faltava a pergunta do gestor:
**a automação melhorou o negócio?** E a medição vivia na fila operacional,
que precisa ser enxuta.

## Solução

### Banco (ADR-017)

- `automation_daily_metrics` — histórico diário por regra. RLS: só admin lê.
- `rollup_automation_daily_metrics(_dias)` — consolidação idempotente,
  executada pelo cron via `/api/public/hooks/automation-rollup`.
- `automation_intelligence(_workspace_id, _dias)` — leitura analítica
  (`security definer`, valida admin) com a base de conversão do workspace.

### Indicadores

| Gate | Indicador | Regra |
| --- | --- | --- |
| 01 | Automation ROI | execuções, horas economizadas, conversões da janela |
| 02 | Conversion Lift | conversão das oportunidades tocadas − base do workspace (amostra ≥ 10) |
| 03 | Time Saved | segundos por ação entregue → horas na janela |
| 04 | Rule Health | 🟢 saudável · 🟡 baixa atividade · 🟠 suspeita · 🔴 morta |
| 05 | Recommendations | frases derivadas de números da própria linha |
| 06 | Optimization | consolidar duplicadas, remover mortas, ajustar `delay` |

Critérios de saúde: sem execução na janela = morta; falha ≥ 10% ou volume
> 50/dia = suspeita; menos de 3 execuções = baixa atividade.

### Leitura

`getAutomationIntelligence` (`automation-intelligence.functions.ts`) é a única
porta. Contratos puros em `src/lib/platform/automation-intelligence.ts`.

### UI

Aba **Automação** do Control Center (`/app/platform`) ganha o bloco de
impacto (ROI, lift, horas economizadas), a coluna de saúde por regra e a
lista de recomendações.

## Testes

`src/lib/platform/__tests__/automation-intelligence.test.ts` — 15 casos
(baseline nula, amostra mínima, lift negativo, quatro níveis de saúde,
recomendações e agregado).

## Fora de escopo

- Grupo de controle real (A/B) para causalidade — hoje é correlação declarada.
- Purga automática do Outbox: habilitada pela Sprint 19, agendada na próxima.
