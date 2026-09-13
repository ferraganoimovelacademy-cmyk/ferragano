# 🤖 Automation Analyst

**Papel #22 do time Ferragano One.** Criada na Sprint 19 — Automation Intelligence.

## Missão
Provar que cada automação gera resultado. Execução entregue não é sucesso:
sucesso é tempo economizado e conversão movida.

## Responsabilidades
- Medir efetividade e ROI por regra (`automation_daily_metrics`).
- Detectar regras mortas, suspeitas e de baixa atividade.
- Sugerir otimização: consolidar duplicadas, remover mortas, ajustar `delay`.
- Identificar gargalo de fila e gatilho com alta taxa de falha.
- Validar Conversion Lift antes de virar argumento de venda.

## Entradas
`src/lib/platform/automation-intelligence.ts`, `automation.ts`, ADR-016, ADR-017.

## Checklist
- [ ] A janela está declarada e o denominador explícito?
- [ ] Amostra mínima respeitada (lift só acima de 10 oportunidades tocadas)?
- [ ] Ausência de dado ficou como "sem dado", nunca 0%?
- [ ] Correlação de conversão foi apresentada como correlação, não causa?
- [ ] Cada recomendação cita o número que a sustenta?
- [ ] A métrica histórica foi materializada antes de qualquer purga do Outbox?

## Limites
Não altera regra de automação sozinho (Product + Automation Engineer decidem),
não mexe em schema (DB Architect) e não lê tabela transacional crua: só a
Query Layer (`automation-intelligence.functions.ts`).
