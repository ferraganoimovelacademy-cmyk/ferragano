# ADR-016 — Efetividade de automação medida a partir da fila

- **Status:** Aceito
- **Data:** 2026-07-31
- **Sprint:** 18 — Automation Effectiveness
- **Contexto:** ADR-003 (Outbox), ADR-010 (métricas agregadas), ADR-011 (tudo é medido)

## Contexto

Precisávamos medir efetividade por regra de automação. Duas opções:

1. Nova tabela de execuções por regra, escrita pelo worker.
2. Agregação derivada da fila existente (`outbox_events.rule_id`).

## Decisão

Opção 2: uma função `security definer` agrega a fila sob demanda.

## Consequências

**Positivas**

- Zero escrita nova no caminho quente do worker.
- Nenhum risco de divergência entre "fila" e "histórico de execução":
  existe uma única fonte da verdade.
- Retenção da fila define automaticamente a retenção da métrica.

**Negativas**

- A janela de análise é limitada pela retenção de `outbox_events`. Quando
  a purga da fila entrar (Sprint 19+), a métrica histórica precisará ser
  materializada antes do descarte — não depois.
- Agregação é calculada a cada leitura. Aceitável no volume atual
  (índice `idx_outbox_rule`); se passar do orçamento de performance,
  vira métrica agregada no padrão do ADR-010.

## Regras de interpretação

- `descartado` conta como **não entregue**. Descarte é decisão do worker
  (canal sem provedor), mas do ponto de vista da regra o efeito não ocorreu.
- Sem nenhum desfecho na janela, a taxa é `null`. Não exibimos 0%:
  ausência de evidência não é evidência de falha.
- Regra ativa sem execução é `sem_dados`, não erro — é sinal de gatilho que
  nunca ocorreu.
