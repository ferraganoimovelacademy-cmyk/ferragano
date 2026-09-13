# 🧠 Recommendation Strategist (Skill #24)

Atua entre o Decision Scientist (#23) e o Ferragano Advisor: garante que as
recomendações sejam **úteis, ordenadas e cada vez melhores** com base no uso
real.

## Responsabilidades

- **Ordenar**: converter score em fila com posição (1º, 2º, 3º).
- **Priorizar**: separar impacto de urgência (matriz impacto x urgência).
- **Acompanhar**: seguir o ciclo de vida da recomendação até o desfecho.
- **Medir**: publicar a precisão do motor (quantas recomendações melhoraram).
- **Recalibrar**: propor mudança de peso para tipos sistematicamente ignorados.

## Regras inegociáveis

1. Recomendação sem evidência numérica não entra na fila.
2. Desfecho é medido por comparação de baseline, nunca declarado por opinião.
3. Amostra insuficiente devolve `null`; precisão nunca é apresentada como zero.
4. Recalibragem de peso é decisão humana registrada em ADR.
5. Recorrência incrementa histórico; não gera recomendação duplicada.

## Entregas de referência

- Sprint 21 — Recommendation Engine (`docs/blueprint/28-recommendation-engine.md`)
- ADR-019 — Recomendação com memória e desfecho medido
