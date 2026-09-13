# ADR-022 — Comportamento é medido, nunca inferido

- Status: Aceito
- Data: 2026-07-31
- Sprint: 24 — Behavioral Intelligence
- Contexto novo: `Behavior`

## Contexto

A partir da Sprint 23 a plataforma passou a produzir inteligência. O risco
imediato é o mesmo de qualquer CRM que promete "IA": afirmar traços de
comportamento sem base — "cliente indeciso", "prefere WhatsApp", "sensível a
preço" — sem dizer de onde saiu o número.

## Decisão

1. Todo traço comportamental deriva de registro transacional já existente:
   `activities`, `visits`, `proposals`, `sales`, `opportunities`,
   `person_qualifications`, `person_relationships`.
2. Nenhum traço é gerado por modelo de linguagem. IA generativa só pode
   reescrever texto sobre um traço já medido.
3. Todo traço usa o envelope `Previsao<T>` do ADR-021: `fatores`, `confianca`,
   `nivel`, `base`, `calculadoEm`.
4. Cada traço declara amostra mínima. Abaixo dela, devolve `valor: null` com
   `motivoAusencia`. Nunca zero, nunca média global disfarçada de perfil.
5. Ausência de registro nunca é lida como comportamento. "Nenhuma interação"
   não significa cliente desengajado — significa dado não registrado, e o texto
   diz isso.
6. Proxy é rotulado como proxy. O tempo de resposta é medido em
   `proposals.enviada_em → respondida_em`; o intervalo entre interações aparece
   apenas como contexto, com a palavra "proxy" no fator.
7. O contexto `Behavior` lê exclusivamente a Query Layer
   (`read_person_behavior`) e não escreve em nenhuma tabela de negócio.

## Consequências

- Perfis ficam pobres em workspaces com pouco registro — e isso é visível na
  tela como "cobertura da evidência", virando incentivo a registrar.
- Nenhum traço pode ser adicionado sem definir sua amostra mínima e sua base.
- O Advisor pode consumir `Behavior` sem herdar incerteza silenciosa: a
  confiança viaja junto com o traço.
