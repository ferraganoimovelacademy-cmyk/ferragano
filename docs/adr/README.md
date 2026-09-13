# ADR — Architecture Decision Records

Este diretório registra decisões de arquitetura que atravessam mais de um capítulo
do blueprint (`docs/blueprint/`) ou que fixam um padrão estrutural do banco/código
que não deve ser reaberto sem justificativa nova.

## Por que ADR além do blueprint

O blueprint (`docs/blueprint/`) descreve **o que existe hoje**, capítulo por
módulo, no formato fixo (objetivo, requisitos, modelo de dados, fluxos,
critérios de aceite). O ADR descreve **por que existe** — a decisão, as
alternativas descartadas e o que ela custa. Um capítulo de blueprint pode
mudar de conteúdo a cada sprint; um ADR só muda de status (nunca de texto)
quando a decisão é revista.

## Formato

Todo ADR segue exatamente esta estrutura:

1. **Contexto** — o problema e as restrições no momento da decisão.
2. **Decisão** — o que foi decidido, em termos concretos (tabela, função, padrão).
3. **Alternativas descartadas** — o que não foi feito e por quê.
4. **Consequências** — o que essa decisão custa e o que ela evita.
5. **Status** — `Proposto`, `Aceito` ou `Substituído por ADR-XXX`, com data.
6. **Referências** — arquivos reais do repositório que implementam a decisão.

Um ADR nunca é editado depois de `Aceito`, exceto para marcar substituição.
Se a decisão muda, nasce um ADR novo que referencia o anterior.

## Índice

| ADR | Título | Status |
|---|---|---|
| [001](./ADR-001-person-model.md) | People como entidade canônica | Aceito — 2026-07-31 |
| [002](./ADR-002-event-bus.md) | Event Sourcing Light (`domain_events`) | Aceito — 2026-07-31 |
| [003](./ADR-003-outbox-pattern.md) | Outbox Pattern para efeitos colaterais | Aceito — 2026-07-31 |
| [004](./ADR-004-read-models.md) | Read Models materializados fora da API | Aceito — 2026-07-31 |
| [005](./ADR-005-rbac.md) | RBAC em tabela separada, funções security definer | Aceito — 2026-07-31 |
| [006](./ADR-006-property-domain.md) | Hierarquia do Property Domain | Aceito — 2026-07-31 |
| [007](./ADR-007-decision-center.md) | Rule Engine determinístico antes de IA | Aceito — 2026-07-31 |
| [008](./ADR-008-agent-team.md) | Time de skills e fluxo de decisão obrigatório | Aceito — 2026-07-31 |
| [009](./ADR-009-certification-levels.md) | Níveis de certificação de entrega | Aceito — 2026-07-31 |
| [010](./ADR-010-aggregated-metrics.md) | Métricas agregadas e Performance Budget como gate | Aceito — 2026-07-31 |
| [011](./ADR-011-everything-measured.md) | Everything Important Must Be Measured (domínio Observability) | Aceito — 2026-07-31 |
| [017](./ADR-017-automation-history.md) | Histórico analítico de automação independe da fila | Aceito — 2026-07-31 |
| [018](./ADR-018-decision-intelligence.md) | Confiança estatística antes de recomendar | Aceito — 2026-07-31 |
| [019](./ADR-019-recommendation-engine.md) | Recomendação com memória e desfecho medido | Aceito — 2026-07-31 |
| [020](./ADR-020-advisory-context.md) | Advisory: comunicação é bounded context próprio | Aceito — 2026-07-31 |
| [021](./ADR-021-explainable-predictions.md) | Toda previsão deve ser explicável | Aceito — 2026-07-31 |
| [022](./ADR-022-behavior-is-measured.md) | Comportamento é medido, nunca inferido | Aceito — 2026-07-31 |
| [023](./ADR-023-market-provenance.md) | Dado externo nunca se mistura ao dado interno | Aceito |
| [026](./ADR-026-correlation-is-not-causation.md) | Correlação não é causa | Aceito |
| [027](./ADR-027-knowledge-provenance.md) | Knowledge provenance | Aceito |
| [030](./ADR-030-intelligence-fabric.md) | Intelligence Fabric coordena processamento | Aceito |
| [031](./ADR-031-enterprise-memory.md) | Memória exige contexto, evidência e proveniência | Aceito |
| [032](./ADR-032-organizational-intelligence.md) | Conhecimento versionado, nunca sobrescrito | Aceito |
| [033](./ADR-033-executive-digital-twin.md) | Executive Digital Twin: observação ≠ tendência ≠ simulação | Aceito — 2026-08-01 |
