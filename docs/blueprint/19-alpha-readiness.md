# 19 — Alpha Readiness (Sprint 10.5)

Status: **fechado — 2026-07-31**. Congelamento correspondente:
**Ferragano One Alpha 1.0** (`docs/CHANGELOG.md`).

## 1. Objetivo

Sprint 10.5 não constrói módulo novo. Ela fecha a fundação construída nos
Gates 01–10 antes de expor o sistema a uma operação piloto: revisa RLS,
documenta decisão de arquitetura em ADR, consolida changelog e verifica os
fluxos ponta a ponta descritos nos capítulos 04 a 18. Onde a verificação é
operacional (rodar o fluxo com usuário real) e não código, este capítulo
registra isso explicitamente — não é gate de código fechado, é gate de
processo em andamento.

## 2. Os 10 gates

### Gate 01 — Documentação de decisão de arquitetura (ADR)
**Feito:** criado `docs/adr/` com 7 ADRs cobrindo modelo de pessoa, event
bus, outbox, read models, RBAC, property domain e decision engine.
**Critério de aceite:** cada decisão estrutural do blueprint tem um ADR que
explica o porquê, não só o quê. Estado: atendido.

### Gate 02 — Changelog consolidado
**Feito:** `docs/CHANGELOG.md` com todos os gates/sprints já entregues e a
versão `Ferragano One Alpha 1.0` marcada com o que entra e o que fica de
fora do congelamento.
**Critério de aceite:** qualquer pessoa nova no projeto lê um arquivo só e
sabe o que existe hoje. Estado: atendido.

### Gate 03 — Revisão de RLS e RBAC
**Feito nesta sprint:** leitura cruzada dos capítulos 04 e 05 e do arquivo
`src/lib/platform/roles.ts` confirmando que nenhuma tabela de negócio nova
foi introduzida sem `workspace_id` + policy, e que papel continua fora de
`profiles`.
**Pendente (verificação contínua, não código):** teste automatizado de
isolamento entre workspaces. Hoje a garantia é policy + revisão manual, não
suite de teste rodando em CI. Listado desde o capítulo 04 e reafirmado aqui
como dívida que não fecha nesta sprint.

### Gate 04 — Inventário de telas legadas
**Feito:** identificado que `/app/clientes` (`src/routes/app.clientes.tsx`)
ainda opera sobre o modelo antigo (`clientes.functions`), convivendo com
`people`/`opportunities` (capítulo 13). A tabela `leads` também continua
referenciada no schema (`src/integrations/supabase/types.ts`).
**Decisão desta sprint:** não remover a tela nem a tabela agora — aposentar
interface de produção antes da operação piloto valer o dado é risco maior
que a dívida de manter duas superfícies. Registrado como pendência explícita
no capítulo 13 e no changelog, não como "feito".

### Gate 05 — Verificação do Event Bus e Outbox em produção
**Feito:** confirmado por leitura de código
(`src/lib/platform/events.server.ts`, `automation.server.ts`) que
`publishEvent` é o único ponto de escrita em `domain_events`, que o outbox
usa `idempotency_key` único e que o worker roda via `pg_cron` com
`FOR UPDATE SKIP LOCKED`.
**Pendente (operação, não código):** rodar o fluxo ponta a ponta com tráfego
real do piloto e observar a fila de `outbox_events` por pelo menos um ciclo
de negócio completo (evento → automação → efeito) antes de considerar o
worker validado em produção.

### Gate 06 — Verificação do Decision Engine e Decision Center
**Feito:** confirmado que nenhuma tabela de score ou recomendação foi criada
(cálculo permanece em `decision.ts`, puro) e que os cinco Read Models têm
índice único e refresh concorrente agendado (capítulo 18).
**Pendente (operação, não código):** capítulo 18 já registra que o painel
não foi validado com volume real de dados — a base atual está vazia. Esta
sprint não fecha essa validação; ela só é possível com a operação piloto
rodando.

### Gate 07 — Consistência do Property Domain
**Feito:** confirmado que `changeUnitPrice` e `moveUnitInventory` são os
únicos caminhos de escrita para preço e status de unidade, e que
`unit_price_history` não aceita `UPDATE`/`DELETE` (capítulo 15).
**Pendente:** reserva do Sales Context ainda não chama `moveUnitInventory`
automaticamente — dívida já registrada no capítulo 15, mantida.

### Gate 08 — Congelamento de schema Alpha
**Feito:** todas as tabelas, enums e funções descritas nos capítulos 04, 13,
15, 16, 17 e 18 foram conferidas contra `src/integrations/supabase/types.ts`
para esta rodada de documentação. Nenhuma divergência de nome de tabela ou
coluna encontrada entre blueprint e schema real no momento do congelamento.
**Critério de aceite:** o schema descrito no blueprint e o schema do banco
são a mesma coisa na data do congelamento. Estado: atendido para a data
2026-07-31; qualquer migration futura reabre este gate implicitamente
através do princípio "blueprint muda no mesmo commit que o schema"
(capítulo 11).

### Gate 09 — Blueprint Freeze (este gate)
**Feito:** este capítulo, os 7 ADRs, o `docs/CHANGELOG.md` e a atualização
do índice (`README.md`) e do roadmap (capítulo 11) com o fechamento da
Sprint 10.5 e a fila pós-Alpha.
**Critério de aceite:** blueprint e ADRs publicados, roadmap técnico
reaberto com a fase seguinte descrita em nível de decisão, não de tarefa.
Estado: atendido.

### Gate 10 — Operação piloto (verificação contínua)
**Não é código.** É o critério de aceite final da sprint: rodar a operação
com usuário real sobre o schema congelado e usar os capítulos 04–18 como
roteiro de verificação manual (cadastro de pessoa, qualificação, decisão,
automação, painel). Este gate permanece **aberto por natureza** — não fecha
com commit, fecha com operação sustentada sem incidente de isolamento de
dado ou perda de evento. A Sprint 10.5 entrega a fundação e a documentação
para que essa operação comece; não entrega a operação em si.

## 3. Critérios de aceite da sprint

- [x] Todas as decisões estruturais têm ADR.
- [x] Changelog reflete o estado real do código, sem funcionalidade
  inventada.
- [x] Toda pendência identificada nos capítulos 04–18 está listada em algum
  lugar (aqui, no changelog ou no capítulo 11) — nenhuma foi omitida por
  conveniência.
- [x] Índice do blueprint (`README.md`) e roadmap técnico (capítulo 11)
  atualizados com o fechamento desta sprint e a fila pós-Alpha.
- [ ] Teste automatizado de isolamento entre workspaces (dívida que
  atravessa a sprint, não fecha aqui).
- [ ] Operação piloto rodando sem incidente (Gate 10 — verificação
  contínua, não código).

## 3.1 Gates de performance e UX (2026-07-31)

### Gate 05 — Performance & escalabilidade
**Feito:** varredura de chaves estrangeiras sem índice (61 achados) e criação
de 56 índices no modelo canônico — FKs de `opportunities`, `proposals`,
`reservations`, `sales`, `visits`, `activities`, `unidades`, `towers`,
`property_media`, `outbox_events`, `platform_job_runs` — mais índices compostos
para os filtros quentes (`workspace_id, estagio`, `workspace_id, ocorreu_em`,
`workspace_id, responsavel_id`, `workspace_id, status`). `ANALYZE` nas quatro
tabelas maiores.
**Evidência:** `explain analyze` do join oportunidades × atividades (4.000 ×
21.440 linhas) usa `idx_opportunities_ws_estagio` e `Index Only Scan` em
`idx_activities_opportunity`, com 10 ms de execução e zero heap fetch.
`pg_stat_statements` não aponta consulta lenta de aplicação — as únicas acima
de 200 ms são os inserts de carga sintética do Gate 06.
**Aberto:** particionamento de `activities`/`domain_events` por tempo só se
justifica acima de ~10 M linhas; decisão registrada como gatilho, não como
trabalho pendente. Tabelas legadas (`leads`, `clientes`, `propostas`,
`lead_eventos`) ficaram sem índice de propósito: entram no drop pós-Alpha.

### Gate 08 — UX & acessibilidade
**Feito:** auditoria WCAG 2.1 AA das telas do app e correção dos achados de
teclado e leitor de tela: card de oportunidade no Kanban virou alvo focável
(`role="button"`, `tabIndex`, Enter/Space, anel de foco); ações só com ícone e
campos sem rótulo ganharam nome acessível (`aria-label` na tarefa de
follow-up, na busca de pessoas e em cada célula da matriz de permissões);
todas as tabelas cruas receberam `caption` em `sr-only` (Decision Center,
Outbox, auditoria, permissões, pessoas); auditoria trocou `overflow-hidden`
por `overflow-x-auto`; estados vazios explícitos em tarefas, visitas,
propostas, reservas e funil sem etapa.
**Aberto:** (a) `window.prompt` para motivo de perda e de cancelamento de
reserva — precisa virar `Dialog` com `Textarea` rotulado; (b) alternativa por
teclado para mover oportunidade de etapa (hoje só drag-and-drop); (c) teste de
regressão visual automatizado. Overlay `bg-black/80` do shadcn foi avaliado e
mantido: é scrim intencional, legível nos dois temas.

## 4. O que este capítulo não é

Não é auditoria de segurança externa. Não é suite de teste automatizado
nova. É a checagem de que a documentação (blueprint + ADR + changelog)
corresponde ao código que existe hoje, e o registro honesto do que ainda
depende de operação real para ser considerado provado.
