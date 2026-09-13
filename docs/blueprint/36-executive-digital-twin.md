# 36 — Executive Digital Twin (Sprint 30)

Bounded context `Executive Twin`. Representação digital do estado da empresa,
somente leitura, sobre as camadas já existentes.

## Gates

| Gate | Entrega | Função |
| --- | --- | --- |
| 01 | Organization Snapshot | `organizationSnapshot` |
| 02 | Organizational Pulse | `pulsoOrganizacional` |
| 03 | Scenario Comparison | `compararCenarios` |
| 04 | Organizational Balance | `balancoOrganizacional` |
| 05 | Strategic Drift | `desvioEstrategico` |
| 06 | Executive Simulation | `simulacaoExecutiva` |
| 07 | Executive Narrative | `narrativaExecutiva` |
| 08 | Executive OS Dashboard | `/app/executive` |

## Fluxo

```text
Domínios (People • Sales • Property • Market • Automation)
        │
        ▼  agregação mensal + estado atual (executive-twin.server.ts)
   EntradaTwin (série 12 meses, esforço por área, pipeline, riscos)
        │
        ▼  módulo puro (executive-twin.ts)
 Snapshot • Pulso • Comparação • Balanço • Desvio • Simulação • Narrativa
        │
        ▼  porta única (executive-twin.functions.ts)
        Executive OS  →  /app/executive
```

## Semântica das saídas

- `observacao` — fato medido na última leitura.
- `tendencia` — comportamento na janela declarada (mínimo 3 meses).
- `simulacao` — cenário hipotético com hipóteses e limitações explícitas
  (mínimo 6 meses e |r| ≥ 0,5).

## Classificação de tendência

Comparação entre a primeira e a segunda metade da janela:
variação > +5% → crescimento; < −5% → desaceleração; entre os dois →
estabilidade. Quando a entrada cresce sem crescimento proporcional de ganhos,
a métrica de ganhos é marcada como **saturação**.

## Desvio estratégico

z-score do último mês contra média e desvio-padrão dos meses anteriores da
janela. |z| > 1,5 é sinalizado como desvio, sempre sem julgamento de valor.
Desvio-padrão zero produz z indisponível.

## Limites

- Nenhuma escrita em tabelas de domínio, memória ou conhecimento.
- Ausência de fonte gera lacuna declarada, não estimativa.
- Nenhuma saída afirma relação de causa e efeito (ADR-026, ADR-033).
