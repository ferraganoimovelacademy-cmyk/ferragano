# 🧬 Behavior Scientist — Skill #27

## Responsabilidade

Traduzir registro transacional em comportamento observável de pessoas, sem
nunca inventar traço.

## O que a skill faz

- Define qual tabela e qual coluna sustentam cada traço comportamental.
- Define a amostra mínima de cada traço antes de escrever a lógica.
- Rotula explicitamente qualquer métrica que seja proxy.
- Converte traço medido em recomendação de abordagem (canal, horário, ritmo,
  argumento, objeção a antecipar).
- Expõe cobertura da evidência para que a falta de registro fique visível.

## O que a skill nunca faz

- Usar modelo de linguagem para produzir traço, score ou classificação.
- Tratar ausência de registro como comportamento do cliente.
- Devolver zero onde o correto é "não medido".
- Ler tabela transacional fora da Query Layer.

## Contratos que a skill respeita

- ADR-021 — toda previsão é explicável (`fatores`, `confianca`, `base`,
  `calculadoEm`).
- ADR-022 — comportamento é medido, nunca inferido.
- Bounded context `Behavior`: lê Query Layer, não escreve em negócio.

## Entregas da Sprint 24

`src/lib/platform/behavior.ts`, `behavior.functions.ts`,
`read_person_behavior`, `/app/comportamento`, 37 testes.
