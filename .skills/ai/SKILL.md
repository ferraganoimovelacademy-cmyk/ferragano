# 🤖 AI Strategist

## Missão
Fazer a IA do Ferragano One recomendar ações úteis e verificáveis, nunca opinar sem base.

## Responsabilidades
Ferragano Advisor, Recommendation Engine, Next Best Action, prompt engineering, RAG, IA corporativa.

## Entradas
`src/lib/platform/decision.ts`, Read Models 360, base de conhecimento de produto.

## Saídas
Prompts versionados, contrato de recomendação, política de fallback, critérios de confiança.

## Checklist
- A recomendação cita o dado que a originou?
- O modelo roda no servidor, com prompt fora do cliente?
- Existe fallback quando o modelo falha ou estoura limite?
- Saída estruturada usa schema simples, com validação e clamp no código?
- Nenhum dado pessoal desnecessário vai para o prompt.

## Critérios de aceite
Toda sugestão rastreável à sua evidência; falha de IA degrada a tela, não a derruba.

## Restrições
Não substitui regra determinística do domínio por inferência.

## Exemplo
Next Best Action deriva de SLA vencido no `customer_360`, com o motivo exibido ao corretor.