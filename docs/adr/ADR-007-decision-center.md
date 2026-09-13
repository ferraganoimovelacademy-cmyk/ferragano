# ADR-007 — Rule Engine determinístico antes de IA

## Contexto

Combinar People + Sales + Property em recomendação e score de oportunidade é
exatamente o tipo de problema onde é tentador começar por um modelo de IA.
Mas nesta fase do produto não há volume de dado histórico para treinar nada
com confiança, e uma recomendação de imóvel que erra por "caixa-preta" perde
a confiança do corretor imediatamente. Era preciso decidir a fronteira entre
o que é regra e o que, no futuro, pode ser IA.

## Decisão

O Decision Engine é **leitura derivada**, não entidade de negócio nova: não
cria tabela de score nem de recomendação. Todo cálculo é determinístico e
puro em `src/lib/platform/decision.ts` (client-safe, testável sem banco);
a leitura roda sob RLS do usuário em `decision.functions.ts`, sem
`service_role`.

Regras duras bloqueiam **antes** de qualquer ranqueamento (unidade fora de
`disponivel`, sem preço, acima do teto aplicado, abaixo do mínimo de
dormitórios/vagas/área nunca aparece) — e toda unidade descartada aparece na
tela com o motivo. Score e aderência são somas de pesos explícitos e
documentados (capítulo 16), nunca um número sem explicação.

A decisão explícita de arquitetura: **Rules Engine antes da IA**. Quando IA
entrar (fase futura), ela consulta este motor — não decide sozinha nem
substitui a regra dura. Isso mantém a explicabilidade como requisito não
negociável mesmo depois que IA existir.

Read Models 360 (ADR-004) e Decision Center consomem o mesmo motor: os
semáforos de atenção nos painéis (`/app/decisoes`) são a mesma lógica de
regra, agregada, não um segundo cálculo paralelo.

## Alternativas descartadas

- **IA generativa decidindo recomendação e score diretamente**: descartado
  nesta fase — sem volume de dado para treinar com confiança e sem
  capacidade de explicar decisão em produção regulada (crédito imobiliário
  tem implicação real para o comprador).
- **Persistir score em tabela, recalculado por job**: descartado — score
  digitado ou cacheado diverge do estado real assim que qualificação ou
  oportunidade muda; calcular a cada leitura elimina essa classe de bug ao
  custo de reprocessar em toda consulta (aceitável no volume atual).
- **Regra de negócio na interface (React) em vez de `decision.ts`**:
  descartado — duplicaria lógica entre tela e qualquer futuro consumidor
  (app corretor, IA) e tornaria a regra não testável isoladamente do banco.

## Consequências

- Toda nova regra de bloqueio ou peso de score entra em `decision.ts`, nunca
  em componente de tela.
- Pessoa sem qualificação de crédito não recebe lista vazia silenciosa — a
  interface pede a qualificação explicitamente.
- IA ainda não existe no sistema — este ADR fixa a fronteira que ela vai
  respeitar quando entrar, mas não implementa nada de IA hoje.

## Status

Aceito — 2026-07-31.

## Referências

- `docs/blueprint/16-decision-engine.md`
- `docs/blueprint/18-decision-center.md`
- `src/lib/platform/decision.ts`
- `src/lib/platform/decision.functions.ts`
- `src/lib/platform/insights.functions.ts`
- Tabela: `person_qualifications`
