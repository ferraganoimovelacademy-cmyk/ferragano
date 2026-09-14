# Auditoria técnica FERRAGANO — diagnóstico (sem alterações)

Legenda: **[F]** fato observado (comando, arquivo:linha ou consulta), **[I]** inferência, **[R]** recomendação.

## 1. Banco de dados vazio — impacto em quase tudo

- **[F]** Contagem real: `workspaces`, `empreendimentos`, `unidades`, `leads`, `people`, `academy_progress`, `platform_telemetry`, `platform_metrics`, `outbox_events`, `public_form_hits` = **0 linhas cada**.
- **[F]** As 5 materialized views dos Read Models (`customer_360`, `executive_360`, `sales_360`, `property_360`, `marketing_360`) nunca foram populadas: leitura devolve `55000 — has not been populated`.
- **[I]** Portanto: vitrine pública sem catálogo, painéis do `/app` em estado vazio, telemetria/observabilidade sem série histórica. Não é bug de código — é ausência de dados e de execução do `refresh_read_models`.

## 2. Segurança de dados (mais grave)

- **[F]** `anon` tem `SELECT` concedido em `customer_360`, `executive_360`, `sales_360`, `property_360`, `marketing_360`. Materialized view **não respeita RLS**. Hoje só falha porque não está populada; ao primeiro refresh, os Read Models de todos os workspaces ficam legíveis com a chave publicável.
- **[F]** Linter do banco: 5 “Materialized View in API”, 47 funções `SECURITY DEFINER` executáveis por `anon`, 47 por `authenticated`, 1 tabela com RLS e sem policy (`public_form_hits`).
- **[F]** Policy `unidades_publicas_select_anon` libera a **linha inteira** para `anon` quando o empreendimento é público — inclusive colunas internas (`comissao_percentual`, `score_liquidez`, `perfil_ideal`, `objecoes`, `argumentos`, `campanha`). É exatamente o que `tests/security/attack-simulation.test.ts` acusa (7 falhas).
- **[F]** `src/integrations/supabase/cron-auth.ts` (`authenticateCronRequest`, segredo próprio + comparação em tempo constante) **não tem nenhum call site**. Os hooks públicos usam igualdade de string contra a *chave publicável* (`api/public/hooks/advisor-watchdog.ts:14-24`, `market-collector.ts`, `outbox-worker.ts`), e `automation-rollup.ts` **não verifica nada**.
- **[I]** A chave publicável vai para o navegador; usá-la como segredo de cron significa que qualquer visitante pode disparar esses jobs.
- **[R]** Ordem: revogar `SELECT` de `anon`/`authenticated` nas 5 views e servi-las só por RPC validada; trocar a policy pública de `unidades` por view/RPC com projeção de colunas seguras; revogar `EXECUTE` de `anon` nas funções internas; ligar `authenticateCronRequest` nos 4 hooks; dar policy ou fechar `public_form_hits`.

## 3. Autenticação, rotas e navegação

- **[F]** Existem **dois gates de auth duplicados**: `src/routes/app.tsx:9-19` (com `redirect` preservado + checagem de onboarding + `AppLayout`) e `src/routes/_authenticated/route.tsx:24-33` (sem `redirect`, sem onboarding, sem `AppLayout`).
- **[F]** O único filho de `_authenticated` é `_authenticated/app/telemetria.tsx`, que resolve para `/app/telemetria` e renderiza `SiteLayout` (chrome público) em vez do shell autenticado.
- **[F]** Só um arquivo reivindica `/` (`index.tsx:55`); nenhum `Link`/`navigate` aponta para rota inexistente.
- **[F]** Logout está correto: `AppLayout.tsx:34-41` cancela queries, limpa cache, faz `signOut` e navega com `replace`.
- **[F]** `/auth` valida `redirect` com Zod e só aceita caminho same-origin (`auth.tsx:39`) — sem open redirect.
- **[F]** O header público (`SiteHeader.tsx:276-281`) mostra sempre “Entrar na plataforma”, sem refletir sessão ativa.
- **[R]** Mover telemetria para o subtree `app.*`, remover o gate duplicado e tornar o CTA do header sensível à sessão.

## 4. Módulos sem backend (o que falta conectar)

- **[F]** 9 rotas são só `ModulePlaceholder` (badge literal “Estrutura”, sem query nem server function): `app.crm`, `app.pessoas`, `app.erp`, `app.financeiro`, `app.analytics`, `app.marketing`, `app.conteudos`, `app.portal-cliente`, `app.ia`.
- **[I]** São casca de UI, não regressões — mas ocupam itens de navegação como se fossem funcionalidade pronta.

## 5. Estados de UX

- **[F]** Apenas `empreendimentos.$id.tsx` e `lp.$slug.tsx` definem `errorComponent`/`notFoundComponent`; as ~50 rotas `app.*` dependem só da fronteira do root.
- **[F]** `telemetria.tsx:158-161` trata loading e vazio, mas **não trata erro** — falha de leitura aparece como “nenhum evento encontrado”.
- **[F]** `app.tsx:31-37` tem spinner, mas nenhum estado de erro se `useSession()` falhar.
- **[F]** Cores literais fora de token: `components/site/cury/TourCinematografico.tsx` (vários) e overlays de `components/ui/{dialog,sheet,drawer,alert-dialog}.tsx`.

## 6. Formulários e leads

- **[F]** Funciona bem: `FormularioConsultoria.tsx` valida com Zod no cliente e `consultoria.functions.ts:18-42` revalida no servidor, com honeypot, tempo mínimo, captcha assinado e rate limit antes de gravar o lead. Erros por campo com `role="alert"`, sucesso com painel de confirmação.
- **[F]** `/contato` não tem formulário — só dois links diretos de WhatsApp (`contato.tsx:74-90`). O formulário real está embutido em outras páginas.

## 7. CI, testes e scan

- **[F]** `bun run typecheck` (tsc --noEmit): **passa**.
- **[F]** `bun run test`: **17 falhas / 825 passes (42 arquivos, 4 falhando)** — `tests/security/attack-simulation.test.ts` (7), `tests/isolation/workspace-isolation.test.ts` (5), `feature-flags.test.ts` (2), `ecosystem.test.ts` (2). As de segurança são reais (itens da seção 2); as de flags/ecossistema indicam divergência entre teste e regra atual de módulo/vertical.
- **[F]** `.github/workflows/ci.yml` roda apenas typecheck, test e `check-static-routes.ts` — **não roda lint, nem E2E, nem security scan**. O scan tem workflow próprio sem gatilho de pull request.
- **[F]** `check-static-routes.ts` só confere que dois arquivos existem e contêm `createFileRoute`.
- **[F]** `tests/e2e/*.spec.ts` existem mas nenhum workflow os executa.
- **[F]** Lint do repositório reporta milhares de divergências de formatação Prettier pré-existentes.

## 8. Observabilidade

- **[F]** `instrumented()` (`instrumentation.ts:22-58`) encadeia `requireSupabaseAuth`, mede duração e grava telemetria sem quebrar o handler; outbox em `events.server.ts:118,188`; execuções de job em `platform_job_runs`; alertas lidos por RPC. A malha existe e está coerente — falta apenas dado real e execução periódica.

## 9. Classificação e ordem segura de correção

**P0 — antes de qualquer publicação ou refresh de dados**
1. Revogar acesso `anon`/`authenticated` às 5 materialized views (hoje só um `REFRESH` separa isso de vazamento cross-workspace).
2. Fechar a exposição de colunas internas de `unidades` para `anon`.
3. Autenticar de verdade os 4 hooks públicos (`authenticateCronRequest`), incluindo `automation-rollup`.
4. Revogar `EXECUTE` de `anon` nas funções internas apontadas pelo linter; resolver `public_form_hits` sem policy.

**P1**
5. Verde nos testes de isolamento/ataque após 1–4; corrigir as 4 falhas de `feature-flags`/`ecosystem` (decidir qual lado é a regra correta).
6. Unificar o gate de auth: mover `telemetria` para `app.*` e eliminar `_authenticated` duplicado.
7. Tratamento de erro nas rotas do `/app` (a começar por telemetria e pelo shell).
8. CI: adicionar lint, E2E e security scan como gate de pull request.

**P2**
9. Popular dados mínimos e agendar `refresh_read_models` para os painéis deixarem de ser vazios.
10. CTA do header público sensível à sessão; formulário de lead em `/contato`.
11. Substituir cores literais por tokens.

**P3**
12. Plano explícito para os 9 módulos “Estrutura” (conectar ou esconder da navegação).
13. Normalizar formatação Prettier em commit isolado.

## Aviso honesto

Não avaliei o preview em navegador nesta rodada; com o banco vazio, qualquer conclusão visual seria sobre estados vazios, não sobre o comportamento real com dados. Índices, plano de consulta e performance também não foram medidos — sem volume de dados a medição não teria valor. Nada aqui foi alterado.
