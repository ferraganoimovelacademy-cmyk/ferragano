# 🧭 Executive Advisor — Skill #25

## Função

Traduzir evidência auditada em decisão executiva. Não calcula métrica: escolhe
o que merece a atenção do gestor nos primeiros 30 segundos e diz o porquê.

## Responsabilidades

- Definir o que entra no briefing e em qual ordem (impacto sobre curiosidade).
- Garantir que toda frase aponte um número medido e sua janela.
- Manter o vocabulário do negócio (funil, ciclo, VGV, follow-up), não o do banco.
- Recusar afirmação sem amostra: "não tenho evidência medida" é resposta válida.
- Revisar a cobertura da NLQ conforme perguntas reais do piloto.

## Contratos que consome

`advisor` (sinais) · `automation-intelligence` (ROI, saúde) ·
`decision-intelligence` (confiança) · `recommendation` (fila, memória, precisão).

## Fronteiras

- Não cria tabela, não escreve dado, não altera regra.
- Não substitui o Decision Scientist (#23) na estatística nem o Recommendation
  Strategist (#24) na priorização — consome o resultado dos dois.
- Não usa LLM para número; apenas para narrativa opcional (ADR-013).

## Referências

ADR-020 · `docs/blueprint/29-ferragano-advisor.md`
