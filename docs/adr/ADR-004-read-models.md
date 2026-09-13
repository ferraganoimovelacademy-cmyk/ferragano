# ADR-004 — Read Models materializados fora da API

## Contexto

Os painéis de decisão (Decision Center, capítulo 18) precisam agregar dados
de várias tabelas transacionais (`people`, `opportunities`, `sales`,
`unidades`) sob métricas como score, SLA e liquidez. Calcular essas métricas
em tempo real, a cada carregamento de tela, contra tabelas transacionais
tornaria a leitura cara e obrigaria a duplicar lógica de agregação em cada
consulta. Ao mesmo tempo, view materializada não suporta RLS por linha —
expor `customer_360` direto pela API PostgREST vazaria dado entre workspaces.

## Decisão

Cinco Read Models são views materializadas, recalculadas por rotina, nunca
atualizadas à mão: `customer_360`, `property_360`, `sales_360`,
`executive_360`, `marketing_360`. `refresh_read_models()` roda
`REFRESH MATERIALIZED VIEW CONCURRENTLY` nas cinco — por isso cada uma tem
índice único — agendado no `pg_cron` a cada 10 minutos, executável apenas
por `service_role`.

Nenhuma delas está exposta na API: `anon` e `authenticated` não têm `SELECT`
em view materializada nenhuma. Todo acesso passa por função `security
definer` que valida `workspace_id` e papel do chamador antes de devolver
linha (`read_customer_360`, `read_property_360`, `read_sales_360`,
`read_executive_360`, `read_marketing_360` — as três últimas restritas por
papel). No front, `src/lib/platform/insights.functions.ts` é a única porta:
nenhuma tela consulta tabela transacional para montar indicador de painel.

Consequência aceita: os painéis têm até 10 minutos de defasagem. Decisão
tática de minuto a minuto continua nas telas operacionais (Pipeline, Agenda,
Tarefas), que leem o Write Model direto.

## Alternativas descartadas

- **View comum (não materializada)**: descartada — recalcularia o agregado
  completo a cada leitura de painel, inviável com volume de produção.
- **Expor view materializada direto na API com `SELECT` liberado por RLS
  simulada em `security_invoker`**: descartado. View materializada não
  reavalia RLS por linha da mesma forma que tabela; o risco de vazamento
  entre workspaces não compensa a simplicidade.
- **Cache de aplicação (Redis) sobre query agregada**: descartado nesta fase
  — adicionaria peça de infraestrutura nova para o mesmo resultado que
  `REFRESH CONCURRENTLY` + `pg_cron` já entrega dentro do próprio Postgres.

## Consequências

- Todo indicador novo de painel nasce como coluna de Read Model, não como
  query ad-hoc na tela — se a agregação não está na view, ela não deveria
  estar na interface de decisão.
- CAC e ROI ficam fora do `executive_360` até existir lançamento de custo de
  mídia por canal — sem esse dado de entrada, o Read Model estimaria
  investimento, o que contraria o princípio de não inventar número em painel
  de decisão.
- `sales_360` agrupa por responsável, não por equipe — visão por equipe
  pendente de a hierarquia de `equipes` virar dimensão.
- Painel ainda não foi validado com volume real de dados (pendência de
  operação, não de código).

## Status

Aceito — 2026-07-31.

## Referências

- `docs/blueprint/18-decision-center.md`
- `src/lib/platform/insights.functions.ts`
- Views: `customer_360`, `property_360`, `sales_360`, `executive_360`, `marketing_360`
- Funções: `refresh_read_models`, `read_customer_360`, `read_property_360`,
  `read_sales_360`, `read_executive_360`, `read_marketing_360`
