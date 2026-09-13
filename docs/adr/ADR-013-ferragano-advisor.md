# ADR-013 — A IA aconselha, o sistema calcula

- Status: aceito
- Data: 2026-07-31
- Sprint: Fase 2 — Ferragano Advisor

## Contexto

A Fase 2 pede conselho sobre a operação. A tentação é entregar o banco a um
modelo e pedir análise. Isso produz número inventado, resposta instável entre
execuções e risco de vazamento entre workspaces.

## Decisão

O Advisor separa medição de interpretação:

1. A medição é código puro e testado (`derivarSinais` em `advisor.ts`), com
   limites explícitos em `ADVISOR_LIMITES`.
2. O prompt recebe apenas os sinais já medidos — nunca linhas de tabela, nunca
   SQL, nunca acesso a ferramenta de leitura.
3. A saída é validada por Zod (`Output.object`) e cortada em 4 recomendações e
   3 riscos.
4. Sem chave ou com gateway indisponível, a tela entrega os sinais medidos e
   informa a falha — o Advisor degrada, não mente.

## Consequências

- Mudança de critério de negócio é mudança de teste, não de prompt.
- Auditável: cada recomendação aponta o sinal de origem.
- O modelo pode ser trocado sem afetar diagnóstico.
- Custo previsível: uma chamada por briefing, payload pequeno.