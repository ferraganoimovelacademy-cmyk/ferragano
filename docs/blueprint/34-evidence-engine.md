# 34 — Causal Evidence Engine (Sprint 25.3)

**Fase 2 — Market Intelligence · Contexto `Market Analytics`**
Princípio de governo: [ADR-026](../adr/ADR-026-correlation-is-not-causation.md) —
correlação ≠ causalidade; o que se mede é a força da evidência.

## Por que existe

A Correlation Engine (25.2) responde "os indicadores se moveram juntos?".
Faltava a pergunta do gestor: "isso é sólido?".

## Cadeia

```text
Market → Market Analytics → Evidence Engine → Behavior → Predictive → Advisor → Recommendation
```

## Critérios avaliados

| # | Critério | Atendido quando |
|---|---|---|
| 1 | Correlação | há coeficiente medido com amostra mínima |
| 2 | Repetição | outra defasagem aponta o mesmo sentido |
| 3 | Estabilidade | sobrevive ao controle de tendência |
| 4 | Defasagem consistente | defasagem adjacente concorda |
| 5 | Significância | p ≤ 0,05 e IC95% não cruza zero |
| 6 | Elasticidade | variação % mensurável e diferente de zero |
| 7 | Histórico suficiente | amostra ≥ 24 meses e IC95% ≤ 0,50 de amplitude |

| 8 | Consistência externa | referência de mercado aponta o mesmo sentido — **informativo**, fora do cálculo |

Força: ≤ 2 muito baixa · 3–4 baixa · 5 moderada · 6–7 alta (7 critérios decisivos).

## Drift Detection (25.4)

A mesma defasagem é medida em duas janelas — anterior e recente:

| Estado | Quando |
|---|---|
| Padrão estável | coeficiente mantém sentido e varia ≤ 0,30 |
| Modelo em drift | inversão de sentido, variação > 0,30, ou relação que deixou de aparecer |
| Drift indeterminado | amostra insuficiente em uma das janelas |

O card de correlação exibe o estado do padrão junto da força da evidência: o
Advisor não continua usando relação que parou de aparecer.

## Evidence Card

Aberto em `/app/mercado` → aba **Correlações**: coeficiente, IC95%, defasagem,
R², p-valor, amostra, base (fonte externa + histórico do workspace), critérios
atendidos e não atendidos com motivo, e a ressalva fixa
"Nenhuma relação causal foi estabelecida."

## Skills em Execução

| Skill | Papel |
|---|---|
| 📊 Evidence Scientist (#32) | robustez, IC95%, estabilidade, consistência |
| 📉 Correlation Scientist (#31) | coeficiente, defasagem, elasticidade |
| 🧭 Executive Advisor (#25) | forma da frase sem verbo causal |
| UX | Evidence Card progressivo e acessível |
| QA | testes de critérios, limiares e ausência de evidência |
| Documentation | ADR-026 e este blueprint |
