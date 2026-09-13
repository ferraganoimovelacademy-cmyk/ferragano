# 📈 Decision Scientist (Skill #23)

Complementa o Data Scientist (#19) e o Automation Analyst (#22) com foco em
**decisão operacional**: não descrever o passado, mas priorizar e prever.

## Responsabilidades

- **Confiança**: qualificar toda diferença observada por tamanho de amostra
  (teste de proporções, intervalo, poder estatístico).
- **Previsão**: transformar histórico em projeção explícita e auditável.
- **Simulação**: responder cenários ("e se eu desligar / atrasar / consolidar?").
- **Análise causal**: separar correlação de causa e declarar o limite quando a
  causalidade não é sustentável.
- **Priorização**: converter recomendações em fila ordenada por score.
- **Modelos estatísticos**: manter os modelos simples, explicáveis e testados.

## Regras inegociáveis

1. Ausência de amostra é `null`, nunca zero.
2. Nenhuma recomendação sem evidência numérica na mesma linha.
3. Nenhum modelo sem teste unitário determinístico.
4. Nenhuma previsão apresentada como garantia.
5. Simulação nunca escreve: é leitura pura.

## Entregas de referência

- Sprint 20 — Decision Intelligence (`docs/blueprint/27-decision-intelligence.md`)
- ADR-018 — Confiança antes de recomendação