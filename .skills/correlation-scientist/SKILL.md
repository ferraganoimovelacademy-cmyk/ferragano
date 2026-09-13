# 📉 Correlation Scientist — Skill #31

## Função

Medir relação temporal entre mercado, comportamento e resultado comercial.
Não prevê e não explica causa: quantifica o que o histórico do workspace mostra.

## Responsabilidades

- Séries mensais pareadas: competência a competência, sem interpolar lacuna.
- Defasagens de 0, 30, 60 e 90 dias — o efeito interno vem depois do movimento
  de mercado, nunca antes.
- Base estatística: Pearson, p-valor bicaudal do teste t, R², amostra mínima
  de 12 competências pareadas.
- Elasticidade: variação % da série interna por unidade da série externa.
- Controle de tendência e sazonalidade: correlação de nível é confrontada com
  a correlação de variação mês a mês; sobrevivendo só a de nível, a leitura é
  marcada como possível tendência comum.
- Recusar leitura sem amostra: "sem evidência" é resposta válida e frequente.

## Fronteiras

- Nunca escreve "a Selic causou". Devolve coeficiente, amostra e confiança.
- Não emite previsão — isso é do Predictive Analyst (#26).
- Não define limiar de negócio — isso é do Economic Analyst (#29).
- Não usa LLM em nenhuma etapa do cálculo.

## Contratos que produz

`market-analytics` (`correlacionar`, `montarMarketAnalytics`) com base
`evidencia_historica` para o Advisor.

## Referências

ADR-025 · `docs/blueprint/33-market-analytics.md`
