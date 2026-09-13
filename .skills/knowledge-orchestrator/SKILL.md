# Skill #34 — 🧩 Knowledge Orchestrator

## Responsabilidade

Garantir que o conhecimento derivado da plataforma seja recalculado na ordem
correta, apenas quando necessário, e que toda mudança de número seja explicável
até o evento que a originou.

## Escopo

- `src/lib/platform/orchestrator.ts` — grafo de dependências, impacto, plano de
  recálculo, cache por evento, diff, auditoria, executive story.
- `src/lib/platform/knowledge-quality.ts` — frescor e confiança do conhecimento.
- `src/routes/app.orquestracao.tsx` — Knowledge Orchestrator dashboard.

## Regras inegociáveis

1. O fluxo de conhecimento é acíclico. Ciclo detectado é bloqueio de entrega.
2. Invalidação é por evento de domínio. TTL/tempo nunca invalida conhecimento.
3. Recálculo segue ordem topológica; contexto não afetado é reaproveitado.
4. Toda tarefa de recálculo declara motivo, eventos e algoritmos.
5. Narrativa não usa verbo causal (ADR-026). Coincidência temporal é o limite.
6. Ausência de dado é `null` e vira lacuna declarada, nunca zero (ADR-019).
7. Toda dependência declara `algoritmo` e `adr`.

## Perguntas que a skill deve sempre responder

- O que precisa ser recalculado quando este dado mudar?
- O que **não** precisa ser recalculado?
- Por que este número mudou desde a última leitura?
- A cadeia de conhecimento está completa ou existe contexto pendente?
- O conhecimento que sustenta esta decisão está dentro do SLA de frescor?

## ADRs

- ADR-027 — Knowledge Provenance
- ADR-028 — Knowledge Freshness & Confidence
- ADR-029 — Knowledge Orchestration
