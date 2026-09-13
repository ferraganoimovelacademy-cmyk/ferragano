# 🔮 Predictive Analyst — Skill #26

## Função

Prever comportamento do funil com evidência observável e devolver a previsão
sempre explicada. Não substitui medição: começa onde a medição termina.

## Responsabilidades

- Opportunity Score: escolher e pesar sinais observáveis da oportunidade.
- Risk Detection: detectar esfriamento, SLA estourado, perda de tração e queda
  de produtividade — sempre com o motivo numérico.
- Next Best Action: derivar a ação do estado real do funil, não de intuição.
- Forecast: projetar mês e conversão com intervalo de confiança (Wilson,
  run-rate/Poisson).
- Validar previsão contra o realizado e recalibrar pesos quando errar.

## Contratos que consome

`read_opportunity_signals` · `read_forecast_base` · `property_360` ·
`sales_360` · Decision Intelligence (#23) para significância.

## Fronteiras

- Não cria tabela nem escreve dado: previsão é leitura.
- Não expõe número sem `fatores`, `confianca`, `base` e `calculadoEm` (ADR-021).
- Não usa LLM: a camada preditiva é determinística e testável.
- Não converte estimativa em medição — se falta amostra, devolve `null`.

## Referências

ADR-021 · `docs/blueprint/30-predictive-intelligence.md` ·
`src/lib/platform/predictive.ts`
