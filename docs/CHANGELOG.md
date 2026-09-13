# Changelog — Ferragano One

Consolidado a partir de `docs/blueprint/11-roadmap-tecnico.md` (fonte viva do
roadmap). Cada entrada é um gate/sprint fechado, na ordem em que foi
construído. Data de fechamento de sprint não é rastreada por commit — a
versão marcada com data é o congelamento de release, não cada sprint
individual.

## [Não versionado] — Sprints de fundação

- **Gate 01** — Platform Shell (header, sidebar, workspace, footer).
- **Gate 02** — Arquitetura de informação e rotas públicas/privadas.
- **Gate 03** — Domínios e feature flags (`module_flags`).
- **Gate 03.5** — Serviços transversais: tags, comentários, arquivos,
  notificações, timeline.
- **Gate 04** — Fundação multi-tenant do banco: `workspaces`, `profiles`,
  `workspace_members`, RLS em toda tabela.
- **Gate 05** — RBAC de 9 papéis em `user_roles`, separado de `profiles`.
- **Gate 06** — Autenticação, ciclo de vida do workspace (`trial → ativo →
  suspenso → arquivado`) e convites.
- **Gate 07** — Auditoria append-only (`audit_log`) e observabilidade.
- **Gate 08** — Domínio Comercial e Imobiliário (fatia vertical): `people`,
  `opportunities`, `activities` substituindo `leads`/`clientes` como
  entidades canônicas (ver ADR-001).
- **Gate 08b** — Agenda e follow-up (`compromissos`, vínculo polimórfico).
- **Gate 08 (plataforma) — Decision Engine** — regras determinísticas, match
  de unidade, score de oportunidade e próxima ação (ver ADR-007).
- **Sprint 07 — Property Domain** — hierarquia Developer → Project → Release →
  Tower → Unit, price history append-only, inventário controlado por função,
  domain events versionados, outbox schema (ver ADR-002, ADR-003, ADR-006).
- **Sprint 09 — Automation Engine** — worker do outbox, idempotência,
  `SKIP LOCKED`, retry com backoff exponencial (ver ADR-003).
- **Sprint 10 — Decision Center** — cinco Read Models materializados
  (`customer_360`, `property_360`, `sales_360`, `executive_360`,
  `marketing_360`), Query Layer única, refresh via `pg_cron` (ver ADR-004).

## [Ferragano One Alpha 1.0] — 2026-07-31

Congelamento de schema e blueprint ao final da **Sprint 10.5 — Alpha
Readiness**. Ver `docs/blueprint/19-alpha-readiness.md` para o detalhamento
dos 10 gates desta sprint.

### Entra no congelamento

- Modelo de pessoa único (`people` + satélites), com deprecação formal de
  `leads`/`clientes` como entidades (ADR-001).
- Event bus interno (`domain_events`) com versionamento e correlação
  (ADR-002).
- Outbox pattern com worker idempotente em produção (ADR-003).
- Read Models 360 como única porta de leitura para painel de decisão
  (ADR-004).
- RBAC em tabela separada com funções `security definer` (ADR-005).
- Property Domain completo: hierarquia, price history, inventário
  controlado (ADR-006).
- Decision Engine determinístico como base do Decision Center, sem IA
  (ADR-007).
- Sete ADRs fundacionais documentados em `docs/adr/`.
- Revisão de RLS e fluxos ponta a ponta (Sprint 10.5, gates 01–10 — ver
  capítulo 19).

### Fica fora do congelamento (roadmap pós-Alpha)

- **CAC e ROI** no `executive_360` — dependem de lançamento de custo de
  mídia por canal, que ainda não existe no schema; incluir agora seria
  estimar investimento em painel de decisão.
- Telas legadas `/app/clientes` (e equivalente de leads) — não aposentadas
  nesta sprint; convivem com o modelo `people` até migração de interface.
- Captação pública gravando direto em `people` — landing pages ainda geram
  registro fora do modelo canônico.
- Provedor real de e-mail/WhatsApp para os executores do Automation Engine —
  hoje descartados com motivo explícito, sem envio real.
- Editor de regras de automação pela interface — hoje é ligar/desligar e
  seed, sem criação de regra nova pela UI.
- Teste automatizado de isolamento entre workspaces — verificação hoje é
  manual.
- Busca global (`tsvector` por workspace) e Knowledge Layer v1 — não
  iniciados.
- Módulo Financeiro (propostas, reservas, comissões) — não iniciado.

## Roadmap pós-Alpha

Ver seção "Roadmap pós-Alpha" em `docs/blueprint/11-roadmap-tecnico.md`:
**1.1 Inteligência Comercial**, **1.2 Ecossistema Digital**, **2.0 Plataforma
SaaS**.

## Sprint 22 — Ferragano Advisor (Advisory) 🟢 CERTIFIED

- **Gate 01** — Executive Briefing: saudação, números medidos, atenções e
  próximo passo derivado da fila priorizada.
- **Gate 02** — Weekly Intelligence: gargalos, oportunidades, riscos, melhores
  corretores, empreendimentos em alta (giro medido em `property_360`) e
  automações críticas na janela materializada.
- **Gate 03** — Natural Language Query determinística: 9 intenções de domínio,
  respondidas com número medido; fora de escopo, o Advisor declara ausência de
  evidência.
- **Gate 04** — Decision Timeline: gerada → vista → aceita → implementada →
  avaliada, com tempo médio até implementação e ciclos fechados.
- **Gate 05** — Advisor Confidence: 0..100 com níveis inicial/moderada/robusta,
  ponderando funil, amostra de automação, confiança estatística e precisão
  histórica do motor de recomendação.
- **Arquitetura** — bounded context `Advisory` (ADR-020): `advisory.ts` (lógica
  pura), `advisory.functions.ts` (única porta, só Query Layer) e
  `AdvisoryPanel.tsx` em `/app/advisor`. Nenhuma tabela nova.
- **Qualidade** — 446 testes passando (27 novos em `advisory.test.ts`).

## Sprint 23 — Predictive Intelligence 🟢 CERTIFIED

- **Gate 01** — Opportunity Score 0–100 partindo da conversão histórica MEDIDA
  da etapa (amostra >= 20) e ajustando por proposta, visita, engajamento,
  contato frio, SLA, tarefas atrasadas, próxima ação e giro do empreendimento.
- **Gate 02** — Risk Detection em três escopos (oportunidade, empreendimento,
  corretor), cada risco com motivo numérico e base de dados citada.
- **Gate 03** — Next Best Action determinística derivada do estado do funil,
  com os fatores que a produziram e confiança herdada do score.
- **Gate 04** — Forecast do mês com intervalo de confiança: run-rate/Poisson
  para vendas e receita, Wilson 95% para conversão, gargalo previsto a partir
  dos riscos críticos recorrentes.
- **Gate 05** — Executive Radar (`/app/radar`): críticas, próxima melhor ação,
  riscos emergentes, empreendimentos em aceleração, corretores em destaque,
  forecast e tendências da semana.
- **Query Layer** — RPCs `read_opportunity_signals` e `read_forecast_base`
  (security definer, gestão vê o workspace, corretor vê só as próprias).
  Zero tabela nova, zero custo de IA.
- **Governança** — ADR-021 (toda previsão deve ser explicável),
  `docs/blueprint/30-predictive-intelligence.md`, Skill #26 Predictive Analyst.

## Sprint 24 — Behavioral Intelligence 🟢 CERTIFIED

- **Contexto novo** `Behavior` (ADR-022): comportamento é MEDIDO a partir de
  `activities`, `visits`, `proposals`, `sales`, `opportunities`,
  `person_qualifications` e `person_relationships` — nunca inferido por IA.
- **Gate 01** — Canal favorito (mín. 5 interações) e melhor horário/dia em hora
  local (mín. 6), com participação percentual e aviso quando a preferência é
  fraca.
- **Gate 02** — Tempo médio de resposta medido entre proposta enviada e
  respondida; ritmo de interação aparece só como proxy rotulado.
- **Gate 03** — Velocidade de decisão: criação → proposta → assinatura, com
  confiança degradada quando não há venda.
- **Gate 04** — Sensibilidade a preço por desconto real, versões de proposta e
  recusas; comprar acima do teto declarado reduz a classificação.
- **Gate 05/06** — Perfil de compra declarado × observado e objeções recorrentes
  a partir de `perdido_motivo`.
- **Gate 07/08** — Valor realizado, propensão a indicar e engajamento 0–100.
- **Query Layer** — `read_person_behavior` (security definer, gestão vê o
  workspace, corretor vê só as suas pessoas, `anon` revogado). Zero tabela nova.
- **UI** — `/app/comportamento`: cobertura da evidência, panorama da carteira e
  bloco "Como abordar" por pessoa, sempre com fatores, confiança e base.
- **Governança** — ADR-022, `docs/blueprint/31-behavioral-intelligence.md`,
  Skill #27 Behavior Scientist. 512 testes passando (37 novos).
