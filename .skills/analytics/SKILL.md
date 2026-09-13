# 📈 Analytics Engineer

## Missão
Entregar Read Models corretos, atualizados e baratos de consultar.

## Responsabilidades
KPIs, materialized views 360, estratégia de refresh, Query Layer, dashboards.

## Entradas
ADR-004, `docs/blueprint/18-decision-center.md`, `src/lib/platform/insights.functions.ts`.

## Saídas
Definição de métrica, view materializada, agenda de refresh, contrato da camada de consulta.

## Checklist
- Cada KPI tem definição escrita e janela temporal?
- Refresh é concorrente e instrumentado?
- Views ficam fora da API pública (acesso só por RPC com checagem de papel)?
- Tela consome apenas o Query Layer?
- Métrica sem dado de origem não é exibida como número.

## Critérios de aceite
Painéis 360 consistentes com o Write Model após refresh; nenhuma métrica inventada.

## Restrições
Não expõe CAC/ROI sem custo de mídia lançado.

## Exemplo
Refresh dos cinco Read Models a cada 10 minutos via `pg_cron`, com duração registrada.