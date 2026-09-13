# 30 — Predictive Intelligence (Sprint 23)

Sexta camada da plataforma: depois de executar (Automation), medir impacto
(Automation Intelligence), priorizar (Decision Intelligence), recomendar
(Recommendation Engine) e comunicar (Advisory), o sistema passa a **antecipar**.

Regra que governa a camada: **ADR-021 — toda previsão deve ser explicável.**

## Arquitetura

```text
Write Model → Query Layer (RPC security definer) → predictive.ts (puro) → /app/radar
```

- `read_opportunity_signals(workspace, limit)` — fatos por oportunidade aberta:
  dias na etapa, dias desde a criação, interações 30d, dias sem interação,
  visitas realizadas, propostas (total e enviadas), tarefas atrasadas, próxima
  ação, conversão histórica da etapa + amostra, giro do empreendimento.
  Gestão vê o workspace; corretor vê só as próprias oportunidades.
- `read_forecast_base(workspace)` — realizado do mês, dias corridos, histórico
  de 90 dias, pipeline aberto, ticket médio e ciclo. Restrita à gestão.
- Zero tabela nova. Nenhuma tela consulta tabela transacional.

## Gates

| Gate | Entrega | Onde |
|---|---|---|
| 01 | Opportunity Score 0–100 com faixa e fatores | `pontuarOportunidade` |
| 02 | Risk Detection (oportunidade, empreendimento, corretor) | `detectarRiscos*` |
| 03 | Next Best Action determinística | `proximaMelhorAcao` |
| 04 | Forecast com intervalo de confiança | `projetarForecast`, `wilson`, `runRate` |
| 05 | Executive Radar | `/app/radar` |

## Opportunity Score

Base = conversão histórica MEDIDA da etapa (amostra >= 20 fechamentos); sem
amostra, cai para a probabilidade configurada e declara a troca num fator.
Ajustes observados: proposta enviada (+14), proposta em rascunho (+6), visita
realizada (+10), cliente engajado (+8), sem interação (-12), contato frio
(-15) ou esfriando (-8), SLA estourado (-12), tarefas atrasadas (-6), sem
próxima ação (-5), empreendimento com giro (+5). Resultado limitado a 0–100.

A confiança mede a evidência (amostra da etapa e rastros do funil), nunca o
score. Oportunidade criada há menos de 2 dias perde confiança.

## Forecast

- Vendas do mês: run-rate sobre o realizado, com intervalo de Poisson 95%; o
  piso nunca fica abaixo do que já foi ganho.
- Receita: vendas projetadas × ticket médio medido. Sem ticket medido, devolve
  `null` com motivo — não estima.
- Conversão: intervalo de Wilson 95% sobre criadas × ganhas em 90 dias.
- Gargalo previsto: risco crítico mais recorrente do período.

## Evoluções registradas

1. `automation_action_profiles` — substituir tempo economizado estimado por
   tempo observado por workspace (afeta ROI das Sprints 19–21).
2. Baseline observado — ROI medido, não estimado.
3. Evento explícito de mudança de etapa, para não usar `updated_at` como proxy
   de "dias na etapa".

## Testes

`src/lib/platform/__tests__/predictive.test.ts` — 29 casos cobrindo base
medida vs. configurada, limites do score, cada código de risco, cada ramo da
próxima melhor ação, intervalos e degradação sem evidência.
