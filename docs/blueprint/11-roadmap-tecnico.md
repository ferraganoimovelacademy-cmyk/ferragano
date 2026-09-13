# 11 — Roadmap técnico

Status: **vivo** — revisado a cada gate concluído.

## 1. Objetivo

Ordem de construção e critério de entrada de cada etapa. Nada entra na fila
sem fechar uma lacuna de jornada (capítulo 08b) ou uma dívida listada aqui.

## 2. Concluído

| Gate | Entrega |
|---|---|
| 01 | Platform Shell (header, sidebar, workspace, footer) |
| 02 | Arquitetura de informação e rotas públicas/privadas |
| 03 | Domínios, feature flags e endurecimento de permissões (visibilidade pública restrita) |
| 03.5 | Tags, comentários, arquivos, notificações e timeline |
| 04 | Fundação multi-tenant, RLS e Platform Health (`platform_job_runs`, `/app/admin/health`) |
| 05 | RBAC de 9 papéis em tabela separada |
| 06 | Auth, ciclo de vida do workspace e dataset sintético (workspace demo) |
| 07 | Auditoria append-only, observabilidade e 142 testes unitários (vitest) |
| 08 | Domínio Comercial e Imobiliário (fatia vertical) |
| 08b | Agenda e follow-up (`compromissos` com vínculo polimórfico) |
| 09 | Decision Engine — regras, match de unidade, score e próxima ação |
| 10 | Automation Engine — outbox worker e Decision Center (Read Models) |
| 10.5 | **Alpha Readiness (Sprint 10.5)** — Blueprint Freeze, ADRs e Changelog |

## 3. Fila e Visão Futura

### Fase 1.1 — Estabilização e Busca (Pós-Alpha)
- **Busca global**: Indexação de People, Units e Oportunidades em campo único de busca.
- **CRM Mobile**: Otimização de visualização para corretor em campo (PWA).
- **Correções do Piloto**: Feedback loop da primeira operação real.

### Fase 1.2 — Expansão de Inteligência
- **Análise de Transcrição**: IA para extrair sentimentos e dados de leads a partir de áudios/textos.
- **Automações Avançadas**: Gatilhos baseados em comportamento de leitura de mídias.

### Fase 2.0 — Escala e Ecossistema
- **Split de Pagamento**: Integração com gateways para repasse automático de comissão.
- **API Pública**: Acesso programático para parceiros e portais externos.
- **Multi-region**: Isolamento geográfico de dados para expansão internacional.

## 4. Dívida Técnica e Pendências Honestas

- **Financeiro (Executive 360)**: CAC e ROI permanecem zerados no painel por falta de módulo de lançamento de custo de mídia (investimento).
- **Testes de Integração**: Embora existam 142 testes unitários, a suite de integração (server functions e validação real de RLS no banco) ainda não foi escrita.
- **Isolamento de Workspaces**: Garantido por RLS e revisão de código, mas pendente de teste automatizado de "stress" (tentativa de bypass via API).
