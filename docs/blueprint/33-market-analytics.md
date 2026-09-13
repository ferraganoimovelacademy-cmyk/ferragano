# 33 — Market Analytics (Sprint 25.2)

**Fase 2 — Market Intelligence · Bounded context novo: `Market Analytics`**
Princípio de governo: [ADR-025](../adr/ADR-025-correlation-not-causation.md) —
correlação é medida, causa nunca é afirmada.

## Por que existe

O Radar (Sprint 25) traz o indicador. O Context Engine (25.1) traduz o
indicador em consequência **por regra**. Faltava a pergunta que só o histórico
do próprio workspace responde:

> quando a Selic subiu, o que aconteceu com as MINHAS visitas, propostas,
> reservas e vendas?

## Cadeia

```text
Mercado (série externa)
        │
        ▼
Correlation Engine  ──  defasagem 0 / 30 / 60 / 90 dias
        │
        ▼
Coeficiente · amostra · confiança
        │
        ▼
Advisor  ──  base: evidencia_historica
```

## Séries

| Origem | Séries |
|---|---|
| externa | 8 séries do BCB coletadas no contexto `Market` |
| interna | visitas realizadas, propostas emitidas, reservas, vendas fechadas, ticket médio |

Cada série é mensal e independente: dado externo e dado interno nunca são
somados nem combinados — o único ponto de contato é o coeficiente.

## Regras da medição

| Regra | Valor |
|---|---|
| Amostra mínima pareada | 12 competências |
| Significância | p ≤ 0,05 (teste t bicaudal de Pearson) |
| Força | \|r\| < 0,3 fraca · < 0,7 moderada · ≥ 0,7 forte |
| Defasagens | 0, 30, 60 e 90 dias, sempre externo(t) → interno(t+lag) |
| Controle | correlação de variação mês a mês; falhando, marca `alertaTendencia` |
| Elasticidade | variação % da série interna por unidade da externa |

Sem amostra não existe leitura: a resposta é **sem evidência**, com o motivo.

## Query Layer

`src/lib/platform/market-analytics.functions.ts`:

| Server function | Quem pode | O que faz |
|---|---|---|
| `getMarketCorrelations` | membro | mede todos os pares na janela escolhida (12 a 60 meses) |

## Interface

`/app/mercado` → aba **Correlações**: seletor de janela, cobertura de pares com
evidência e, por par, coeficiente, confiança, amostra, defasagem escolhida e as
quatro defasagens medidas com o motivo de ausência quando não há evidência.

## Skills em Execução

| Skill | Papel |
|---|---|
| 📉 Correlation Scientist (#31) | base estatística, defasagem, elasticidade, sazonalidade |
| 📊 Data Scientist (#19) | amostra mínima e controle de tendência |
| 🧭 Executive Advisor (#25) | forma da frase sem verbo causal |
| Backend | leitura das séries sem cruzar origens |
| QA | 22 testes de estatística, pareamento e ausência de evidência |
| Documentation | ADR-025 e este blueprint |

## Estado

🟢 **CERTIFIED** — 594 testes passando.
