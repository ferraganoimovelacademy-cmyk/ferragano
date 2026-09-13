# 20 — Alpha Certification (Sprint 10.6)

Objetivo: remover os bloqueadores restantes para a primeira operação real.
Nenhuma funcionalidade nova entrou nesta sprint.

## Gate A1 — Accessible Dialog

`window.prompt` foi eliminado do projeto. Toda captura de motivo passa por
`src/components/platform/ReasonDialog.tsx`:

- textarea com foco automático, contador `n/max` e limite rígido;
- motivo obrigatório com validação e mensagem em `role="alert"`;
- `Enter` confirma, `Shift+Enter` insere linha, `Esc` cancela (Radix Dialog);
- `aria-required`, `aria-invalid` e `aria-describedby` ligados ao campo;
- lista opcional de motivos anteriores (histórico).

Usos atuais: perda de oportunidade (arraste e teclado) e cancelamento de
reserva. O mesmo componente atende cancelamento de venda e alteração de preço
quando essas ações ganharem tela.

Evidência: `rg "window.prompt" src` retorna apenas o comentário do próprio
componente.

## Gate A2 — Keyboard First

Regras puras em `src/lib/platform/kanban.ts`, cobertas por 10 testes
(`src/lib/platform/__tests__/kanban.test.ts`):

| Atalho | Ação |
|--------|------|
| `Ctrl/Cmd + →` | avança para a próxima etapa do funil |
| `Ctrl/Cmd + ←` | volta uma etapa |
| `Ctrl/Cmd + ↑` | eleva prioridade (frio → morno → quente) |
| `Ctrl/Cmd + ↓` | arquiva (move para a etapa de perda, com motivo) |
| `Enter` | abre o painel de execução |
| `Espaço` | seleciona/desseleciona o card |

O card expõe `role="button"`, `tabIndex=0`, `aria-pressed` e rótulo com etapa
atual mais a lista de atalhos. Drag & drop continua disponível, mas deixou de
ser o único caminho. Movimento para etapa de perda abre o `ReasonDialog`.

## Gate A3 — E2E (Playwright)

- `playwright.config.ts` (`bun run test:e2e`), Chromium, trace e screenshot em
  falha. `E2E_CHROMIUM_PATH` reaproveita um Chromium local, `E2E_BASE_URL`
  aponta para preview ou produção.
- `tests/e2e/public-funnel.spec.ts` — vitrine (`/`, `/empreendimentos`,
  `/simulacao`, `/metodo`, `/contato`) com H1 visível, sem erro de console, e
  bloqueio de `/app/*` para visitante. **6 testes verdes.**
- `tests/e2e/pilot-flow.spec.ts` — fluxo Pessoa → Oportunidade → Visita →
  Proposta → Reserva → Venda → Decision Center → Health, incluindo avanço de
  etapa por teclado e cancelamento pelo `ReasonDialog`. Requer usuário real do
  workspace piloto (`E2E_EMAIL` / `E2E_PASSWORD`); sem essas variáveis o teste
  é ignorado em vez de gerar falso-positivo.

## Gate A4 — Workspace Isolation

`tests/isolation/workspace-isolation.test.ts` roda junto com `bun run test`
contra o backend real (38 asserções verdes):

- 17 tabelas transacionais: leitura vazia e escrita negada sem sessão;
- materialized views 360 inalcançáveis pela API REST;
- Query Layer (`read_*_360`) e funções internas (`claim_outbox_batch`,
  `refresh_read_models`, `log_job_run`, `platform_health`) negando execução;
- vitrine pública continua legível (regressão de over-blocking).

Limite honesto: o cruzamento entre dois usuários autenticados de workspaces
distintos exige dois usuários reais. O bloco fica pronto para receber
`E2E_A_*` / `E2E_B_*` na operação piloto — até lá o isolamento entre membros
está garantido por RLS (`is_workspace_member`) e revisado no Gate 03, mas não
automatizado.

## Próximos gates (planejados, não executados)

- **A5 — Performance Budget**: metas (dashboard < 300 ms, People 360 < 200 ms,
  busca < 100 ms, Kanban 60 FPS, refresh dos Read Models < 30 s, worker < 2 s)
  com falha de pipeline em regressão.
- **A6 — Telemetria**: tabela `platform_metrics` com tempo de página, tempo de
  query, erros, eventos, worker, cron e filas.