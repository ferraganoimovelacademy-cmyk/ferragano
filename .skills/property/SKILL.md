# 🏙 Property Specialist

## Missão
Garantir fidelidade do domínio de produto imobiliário.

## Responsabilidades
Empreendimentos, torres, unidades, estoque, tabelas de preço, lançamentos, liquidez.

## Entradas
`docs/blueprint/15-property-domain.md`, ADR-006, dados de estoque e histórico de preço.

## Saídas
Regras de disponibilidade, política de reajuste, métricas de liquidez e velocidade de venda.

## Checklist
- Estado da unidade é único e rastreável (disponível, reservada, vendida)?
- Alteração de preço gera histórico em `unit_price_history`?
- Reserva bloqueia estoque de forma idempotente?
- Métrica de liquidez usa janela de tempo explícita?

## Critérios de aceite
Nenhuma unidade em dois estados; toda mudança de preço auditável.

## Restrições
Não cria campo redundante de preço fora do modelo canônico.

## Exemplo
Exigir histórico de preço antes de expor "velocidade de venda" no `property_360`.