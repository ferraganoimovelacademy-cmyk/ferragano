# 28 — Recommendation Engine (Sprint 21)

Da lista de sugestões para uma fila de trabalho com memória e desfecho medido.

## Camadas

```
automation_daily_metrics  (histórico materializado, ADR-017)
        ↓
decision-intelligence.ts  (confiança + score, ADR-018)
        ↓
recommendation.ts         (impacto, urgência, ranking — lógica pura)
        ↓
recommendation_history    (ciclo de vida + desfecho, ADR-019)
        ↓
Control Center → Automação
```

## GATE 01 — Recommendation Ranking

Cada recomendação recebe posição. A ordenação usa
`impacto x 0,6 + urgência x 0,4`, modulada pela confiança estatística.

## GATE 02 — Business Priority

| | Urgência baixa | Urgência alta |
| --- | --- | --- |
| **Impacto alto** | Planejar | Agir agora |
| **Impacto baixo** | Monitorar | Delegar |

Impacto vem de horas/mês afetadas ou fração de volume reduzida; urgência, do
tipo de problema (falha e fila pioram sozinhas, consolidação não).

## GATE 03 — Learning Feedback

Ao marcar **implementada**, o sistema guarda o score do momento. Ao **medir
resultado**, compara com o score atual da mesma chave:

- caiu 10 pontos ou mais: `melhorou`
- subiu 10 ou mais: `piorou`
- entre os dois: `neutro`
- sem baseline: `indefinido`

## GATE 04 — Recommendation History

`gerada -> vista -> aceita -> implementada -> resultado -> arquivada`.
Uma linha aberta por chave `tipo:regra`; recorrência soma `ocorrencias`.

## GATE 05 — Recommendation Quality

- **Precisão**: `melhoraram / avaliadas` (mínimo 5 desfechos).
- **Aceitação**: `aceitas / geradas`.
- **Implementação**: `implementadas / aceitas`.
- Tipos com aceitação abaixo de 20% aparecem como candidatos a recalibragem.

## Segurança

Nenhum acesso direto à tabela: cinco RPCs `security definer` exigem papel de
administrador do workspace. O cliente só enxerga o que a RPC devolve.
