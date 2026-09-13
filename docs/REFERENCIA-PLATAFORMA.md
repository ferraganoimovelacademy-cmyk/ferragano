# Ferragano One — Documentação de Referência

Ponto de entrada único para novos desenvolvedores. A filosofia, os princípios
e as regras imutáveis estão em [`MANIFESTO.md`](../MANIFESTO.md); a Fase III em
[`docs/programas/README.md`](./programas/README.md). Consolida o que está
distribuído em `docs/blueprint/` (capítulos), `docs/adr/` (decisões) e
`.skills/` (time de agentes). Atualizado na Sprint 30.

---

## 1. Visão geral da plataforma

Ferragano One é um sistema operacional para negócios imobiliários: CRM e ERP na
base, com camadas de conhecimento, memória e inteligência organizacional acima.

```text
Domínios de Negócio (People • Sales • Property • Market • Automation)
        ▼ Knowledge Layer
        ▼ Knowledge Orchestrator
        ▼ Intelligence Fabric
        ▼ Recommendation Engine
        ▼ Advisor / Advisory
        ▼ Enterprise Memory
        ▼ Organizational Intelligence
        ▼ Executive Operating System (Executive Twin)
```

Cada camada acrescenta capacidade sem assumir a responsabilidade da anterior.

**Stack:** TanStack Start (React 19, Vite 7), Tailwind v4, shadcn/ui, Lovable
Cloud (Postgres + Auth + Storage), server functions como única porta de backend.

---

## 2. Arquitetura dos bounded contexts

| Contexto | Módulo | Natureza |
| --- | --- | --- |
| People / Relationship | `pessoas.functions.ts`, `relacionamento.ts` | escrita + leitura |
| Sales | `sales.ts`, `oportunidades.functions.ts`, `pipelines.functions.ts` | escrita + leitura |
| Property | `property.ts`, `empreendimentos.functions.ts` | escrita + leitura |
| Market | `market.ts`, `market-context.ts`, `market-analytics.ts` | leitura externa |
| Automation | `automation.ts`, `watchdog.ts`, `automation-intelligence.ts` | execução |
| Decision | `decision.ts`, `decision-intelligence.ts` | leitura |
| Recommendation | `recommendation.ts` | leitura + histórico |
| Advisory | `advisory.ts`, `advisor.ts` | comunicação |
| Knowledge | `knowledge.ts`, `knowledge-quality.ts`, `orchestrator.ts` | leitura |
| Intelligence Fabric | `fabric.ts` | coordenação |
| Enterprise Memory | `memory.ts` | patrimônio |
| Organizational Intelligence | `organizational.ts` | evolução do conhecimento |
| Executive Twin | `executive-twin.ts` | leitura consolidada |

Regra estrutural: módulo puro (`*.ts`) calcula, `*.server.ts` agrega dados,
`*.functions.ts` é a porta única (server functions), rota apenas apresenta.

---

## 3. Fluxo de eventos

```text
Write Model (tabelas transacionais)
   ▼ triggers / domain_events
Domain Events
   ▼ outbox_events (padrão Outbox, ADR-003)
Automação (worker por pg_cron)
   ▼ read models (customer/property/sales/executive/marketing_360)
Decision Engine → Recommendation → Advisor → Memória → Executive Twin
```

- ADR-002 (Event Bus), ADR-003 (Outbox), ADR-004 (Read Models).
- Nenhuma tela consulta tabela transacional: sempre pela Query Layer.

---

## 4. Catálogo de skills

38 especialistas em `.skills/`. Índice completo em `.skills/README.md`.
Fluxo obrigatório: Product Manager propõe → Chief Architect valida →
Domain Guardian verifica ADRs → Security Officer revisa → implementação.

---

## 5. Índice de ADRs

Lista completa em `docs/adr/`. Decisões estruturais mais citadas:

| ADR | Decisão |
| --- | --- |
| 001–006 | Modelo de pessoa, event bus, outbox, read models, RBAC, property |
| 007 | Rule engine determinístico antes de IA |
| 009 | Níveis de certificação |
| 011 | Everything important must be measured |
| 021 | Toda previsão é explicável |
| 022 | Comportamento é medido, nunca inferido |
| 023 | Dado externo nunca se mistura ao interno |
| 026 | Correlação não é causa |
| 027 | Knowledge provenance |
| 028–029 | Frescor do conhecimento e orquestração |
| 030 | Intelligence Fabric |
| 031 | Enterprise Memory (contexto, evidência, proveniência) |
| 032 | Conhecimento versionado, nunca sobrescrito |
| 033 | Executive Digital Twin (observação ≠ tendência ≠ simulação) |

---

## 6. Modelo de dados

Detalhe em `docs/blueprint/04-modelo-de-dados.md`. Agrupamentos:

- **Núcleo:** `workspaces`, `workspace_members`, `user_roles`, `role_permissions`.
- **Comercial:** `people`, `person_*`, `opportunities`, `pipelines`,
  `pipeline_stages`, `proposals`, `visits`, `sales`, `tasks`, `activities`.
- **Imobiliário:** `empreendimentos`, `towers`, `unidades`, `property_media`,
  `unit_price_history`, `reservations`.
- **Automação/observabilidade:** `automation_rules`, `outbox_events`,
  `automation_daily_metrics`, `platform_metrics`, `platform_telemetry`,
  `platform_alerts`, `platform_job_runs`.
- **Inteligência:** `recommendation_history`, `decision_outcomes`,
  `advisor_briefings`, `advisor_acoes`.
- **Mercado:** `market_regions`, `market_region_snapshots`,
  `market_indicator_series`, `market_indicator_values`.
- **Memória e conhecimento:** `memory_decisions`, `memory_campaigns`,
  `memory_lessons`, `memory_playbooks`, `org_knowledge_versions`,
  `org_knowledge_usage`, `property_knowledge`.

Todo `workspace_id` é obrigatório em tabelas multi-tenant.

---

## 7. Segurança (RLS / RBAC)

- RLS habilitada em 100% das tabelas públicas; `GRANT` explícito por papel.
- Isolamento por `is_workspace_member` / `is_workspace_admin`;
  papéis em `user_roles` (nunca em `profiles`), com `has_role` security definer.
- Permissão por módulo via `has_permission` + `role_permissions` (ADR-005).
- Funções internas de plataforma são security definer com verificação de vínculo.
- Testes em `tests/isolation/workspace-isolation.test.ts` cobrem acesso anônimo
  e cruzado para todas as famílias de tabelas.

---

## 8. Query Layer

Única forma de leitura de painéis: `insights.functions.ts` sobre as funções
`read_*_360`. Contextos analíticos expõem porta própria (`*.functions.ts`) e
nunca são consultados diretamente pelas telas. Toda função de leitura declara
janela, amostra e fontes indisponíveis em vez de estimar.

---

## 9. Observabilidade

- `instrumented(domain, action)` envolve toda server function relevante
  (`telemetry.ts`), gravando duração, sucesso e superfície.
- `platform_metrics` + Performance Budget (`metrics.ts`, ADR-010).
- Health Score, adoção de features e acurácia de decisão em `/app/platform`.
- Jobs registram execução em `platform_job_runs`; alertas em `platform_alerts`.

---

## 10. Guia de extensão

Para acrescentar um novo contexto analítico:

1. Criar o módulo puro `src/lib/platform/<contexto>.ts` — funções sem I/O,
   com janela, amostra e `null` quando faltar evidência.
2. Criar `<contexto>.server.ts` para agregação de leitura (server-only).
3. Criar `<contexto>.functions.ts` com server functions instrumentadas —
   somente imports e declarações no escopo do módulo.
4. Criar a rota `src/routes/app.<contexto>.tsx` com `head()` próprio e estados
   de carregamento, vazio e erro.
5. Registrar a rota em `src/lib/platform/navigation.ts`.
6. Escrever testes em `src/lib/platform/__tests__/<contexto>.test.ts`, cobrindo
   amostra insuficiente e fonte indisponível.
7. Migração com `GRANT` + RLS quando houver tabela nova, e teste de isolamento.
8. Registrar a decisão em `docs/adr/`, o capítulo em `docs/blueprint/` e a skill
   responsável em `.skills/`.
