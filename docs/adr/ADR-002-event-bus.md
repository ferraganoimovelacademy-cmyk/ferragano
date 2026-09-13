# ADR-002 — Event Sourcing Light (`domain_events`)

## Contexto

Timeline, automações, futura IA e analytics precisam saber **o que aconteceu**
no sistema, não só o estado atual das tabelas. Sem um registro de fatos, cada
consumidor teria que inferir mudança comparando snapshots, o que é frágil e
não dá causalidade (por que a unidade mudou de status? qual jornada gerou
qual efeito?).

## Decisão

Todo caso de uso relevante publica um evento em `domain_events` através de
uma única função, `publishEvent` (`src/lib/platform/events.server.ts`).
Nenhum módulo escreve na tabela diretamente. `domain_events` é append-only,
carrega `workspace_id`, `event_type`, `aggregate`, `aggregate_id`, `person_id`,
`opportunity_id`, `actor_id`, `payload` (jsonb), e desde a Sprint 07:

- `event_version` e `schema_version` — o payload pode evoluir sem quebrar
  consumidor antigo, que lê pela versão que entende.
- `correlation_id` — amarra toda uma jornada de negócio (ex.: oportunidade →
  reserva → mudança de estoque) sob o mesmo identificador.
- `causation_id` — aponta o evento que causou este, formando uma cadeia
  auditável sem precisar reconstruir por timestamp.

A falha ao publicar um evento **nunca** derruba a operação de negócio que o
originou — é logada e a transação principal segue. O evento é subproduto,
não pré-condição.

## Alternativas descartadas

- **Event Sourcing completo (estado reconstruído só a partir de eventos)**:
  descartado. O Write Model (`people`, `opportunities`, `unidades`, etc.)
  continua sendo a fonte de verdade transacional; eventos são um log paralelo
  para leitura e reação, não o mecanismo de persistência do estado.
- **Publicar evento de dentro de trigger de banco**: descartado para os casos
  de uso de aplicação porque o `actor_id` e o contexto de negócio (motivo,
  correlação) só existem na camada de server function; trigger vê a linha,
  não a intenção. (Triggers de banco continuam usados para derivações
  internas, como `refresh_person_estagio`.)

## Consequências

- Qualquer novo caso de uso que precise aparecer na Timeline ou disparar
  automação precisa passar por `publishEvent` — esquecer essa chamada é o
  jeito de um efeito não acontecer.
- `domain_events` cresce sem limite (append-only); não há política de
  retenção definida — pendente.
- `SalesEvent` e `PropertyEvent` (`src/lib/platform/sales.ts`,
  `src/lib/platform/property.ts`) são a lista fechada de tipos de evento
  hoje; expandir para outros domínios (ex.: financeiro) é decisão futura, não
  automática.

## Status

Aceito — 2026-07-31.

## Referências

- `src/lib/platform/events.server.ts`
- `docs/blueprint/15-property-domain.md` (seção 7 — Domain Events versionados)
- `docs/blueprint/17-automation-engine.md`
- Tabela: `domain_events`
