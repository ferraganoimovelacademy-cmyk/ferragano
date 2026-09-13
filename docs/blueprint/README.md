# Ferragano Business Blueprint

Documento mestre do projeto. Fonte única: os arquivos markdown desta pasta.
Versionados junto com o código — quando o schema ou uma regra muda, o capítulo muda no mesmo commit.
PDF é gerado a partir daqui apenas quando houver necessidade de apresentar a terceiros.

## Princípio

Blueprint registra **decisões**, não prosa. Se um parágrafo não fecha uma decisão,
não define um dado ou não estabelece um critério de aceite, ele sai.
Alvo: ~3 páginas por módulo. O banco é a verdade; o documento descreve a verdade.

## Estrutura fixa de cada capítulo

1. Objetivo
2. Requisitos funcionais
3. Requisitos não funcionais
4. Modelo de dados
5. Fluxos
6. Wireframes
7. Critérios de aceite
8. Testes
9. Prompt Lovable
10. Roadmap

## Índice

| # | Capítulo | Status |
|---|----------|--------|
| 01 | [Arquitetura](./01-arquitetura.md) | v1 |
| 02 | [Constituição da marca](./02-constituicao-da-marca.md) | v1 |
| 03 | [Design System](./03-design-system.md) | v1 |
| 04 | [Modelo de dados — fundação](./04-modelo-de-dados.md) | v1 |
| 05 | [Autenticação, RBAC e workspace lifecycle](./05-autenticacao.md) | v1 |
| 06 | [Auditoria e observabilidade](./06-auditoria.md) | v1 |
| 07 | [Serviços de fundação](./07-servicos-de-fundacao.md) | v1 |
| 08 | [Domínio Comercial e Imobiliário](./08-dominio-comercial.md) | v1 |
| 08b | [Jornadas dos usuários](./08b-jornadas.md) | v1 |
| 09 | [Camadas de leitura (Intelligence)](./09-intelligence.md) | v1 |
| 10 | [Knowledge Layer](./10-knowledge-layer.md) | v1 |
| 11 | [Roadmap técnico](./11-roadmap-tecnico.md) | vivo |
| 12 | [Branding & UX](./12-branding-ux.md) | v1 |
| 13 | [Sales Context — Leads & People](./13-sales-context-leads.md) | v1 |
| 14 | [Marketing Context — Campanhas](./14-marketing-context.md) | v1 |
| 15 | [Inventory Context — Imóveis](./15-inventory-context.md) | v1 |
| 16 | [Decision Engine](./16-decision-engine.md) | v1 |
| 17 | [Automation Engine](./17-automation-engine.md) | v1 |
| 18 | [Decision Center (Painéis)](./18-decision-center.md) | v1 |
| 19 | [Alpha Readiness (Sprint 10.5)](./19-alpha-readiness.md) | fechado |
| 20 | [Alpha Certification (Sprint 10.6)](./20-alpha-certification.md) | v1 |
| 21 | [Platform Reliability (Sprint 11)](./21-platform-reliability.md) | v1.1 |
| 22 | [Operational Intelligence (Sprint 12)](./22-operational-intelligence.md) | v1.2 |
| 27 | [Decision Intelligence (Sprint 20)](./27-decision-intelligence.md) | v1.3 |
| 28 | [Recommendation Engine (Sprint 21)](./28-recommendation-engine.md) | v1.3 |

## Arquitetura e Decisões (ADR)

Decisões de design estrutural estão documentadas em [docs/adr/](../adr/README.md):

- [ADR-001 — People como entidade canônica](../adr/ADR-001-person-model.md)
- [ADR-002 — Event Sourcing Light (domain_events)](../adr/ADR-002-event-bus.md)
- [ADR-003 — Outbox Pattern para efeitos colaterais](../adr/ADR-003-outbox-pattern.md)
- [ADR-004 — Read Models materializados fora da API](../adr/ADR-004-read-models.md)
- [ADR-005 — RBAC em tabela separada, funções security definer](../adr/ADR-005-rbac.md)
- [ADR-006 — Hierarquia do Property Domain](../adr/ADR-006-property-domain.md)
- [ADR-007 — Rule Engine determinístico antes de IA](../adr/ADR-007-decision-center.md)
- [ADR-011 — Everything Important Must Be Measured](../adr/ADR-011-everything-measured.md)
- [26 — Automation Intelligence (Sprint 19)](./26-automation-intelligence.md)
- [ADR-017 — Histórico analítico de automação independe da fila](../adr/ADR-017-automation-history.md)
- [27 — Decision Intelligence (Sprint 20)](./27-decision-intelligence.md)
- [ADR-018 — Confiança estatística antes de recomendar](../adr/ADR-018-decision-intelligence.md)
- [28 — Recommendation Engine (Sprint 21)](./28-recommendation-engine.md)
- [ADR-019 — Recomendação com memória e desfecho medido](../adr/ADR-019-recommendation-engine.md)
- [29 — Ferragano Advisor / Advisory (Sprint 22)](./29-ferragano-advisor.md)
- [ADR-020 — Advisory: comunicação é bounded context próprio](../adr/ADR-020-advisory-context.md)
- [30 — Predictive Intelligence (Sprint 23)](./30-predictive-intelligence.md)
- [ADR-021 — Toda previsão deve ser explicável](../adr/ADR-021-explainable-predictions.md)
- [31 — Behavioral Intelligence (Sprint 24)](./31-behavioral-intelligence.md)
- [ADR-022 — Comportamento é medido, nunca inferido](../adr/ADR-022-behavior-is-measured.md)
- [32 — Market Intelligence, Analytics e Evidence (Sprints 25–25.4)](./32-market-intelligence.md)
- [35 — Knowledge Graph e Provenance (Sprint 26)](./35-knowledge-graph.md)
- [36 — Executive Digital Twin (Sprint 30)](./36-executive-digital-twin.md)
- [ADR-033 — Observação, tendência e simulação são coisas distintas](../adr/ADR-033-executive-digital-twin.md)
- [Documentação de referência da plataforma](../REFERENCIA-PLATAFORMA.md)
