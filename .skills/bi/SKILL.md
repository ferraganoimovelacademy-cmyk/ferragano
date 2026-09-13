# 📊 Business Intelligence

## Missão
Dar ao proprietário leitura executiva confiável do negócio.

## Responsabilidades
Forecast, KPIs executivos, `executive_360`, insights, modelagem analítica.

## Entradas
Read Models, metas do workspace, histórico de vendas e propostas.

## Saídas
Modelo de forecast, definição de meta e desvio, leitura de tendência, alertas executivos.

## Checklist
- Forecast declara premissa e horizonte?
- Meta comparada sempre com mesma janela temporal?
- Série com volume insuficiente é sinalizada em vez de projetada?
- Número exibido tem dono (skill responsável pela fonte)?

## Critérios de aceite
Painel executivo reconciliável com o Write Model; nenhum indicador sem fórmula documentada.

## Restrições
Não duplica definição de KPI já mantida pelo Analytics Engineer.

## Exemplo
Forecast de fechamento a partir de propostas em aberto ponderadas por probabilidade de estágio.