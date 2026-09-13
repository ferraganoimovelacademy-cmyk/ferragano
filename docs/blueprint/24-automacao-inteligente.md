# 24 — Automação Inteligente (Sprint 17)

## Objetivo
Fechar o ciclo `Read Models → Advisor → Automation Engine`: os sinais medidos do
Advisor deixam de ser apenas leitura de painel e passam a disparar efeitos reais
(tarefa, notificação, webhook) quando cruzam o limite.

## Fluxo
```
executive_360 / sales_360 / marketing_360
        → montarSnapshotAdvisor()        (puro, compartilhado com o briefing)
        → derivarSinais()                (puro, ADVISOR_LIMITES)
        → montarEfeitosDeSinais()        (puro, casa sinal × automation_rules)
        → outbox_events                  (efeito enfileirado, idempotente)
        → outbox worker (Sprint 09)      (executa no canal)
```

## Camadas
| Arquivo | Papel |
| --- | --- |
| `src/lib/platform/watchdog.ts` | Decide QUAIS efeitos enfileirar. Sem I/O, 100% testável. |
| `src/lib/platform/watchdog.server.ts` | Lê os Read Models com service_role, casa regras e insere no Outbox. |
| `src/routes/api/public/hooks/advisor-watchdog.ts` | Endpoint do cron (apikey do projeto, resposta só com contadores). |

## Regras de disparo
- Só sinais `atencao` ou `critico` geram efeito; `ok` é ignorado.
- Uma regra ativa de `automation_rules` casa por `event_type`:
  - `advisor.signal.<codigo>` — sinal específico (`conversao`, `ciclo`, `liquidez`,
    `forecast`, `followup`, `inatividade`, `origem`);
  - `advisor.signal.any` — curinga para qualquer sinal fora do limite.
- Sem regra casando, apenas o sinal `critico` gera o efeito padrão: notificação
  interna para a gestão, com link para `/app/advisor`.
- A `config` da regra sobrescreve o payload padrão (ex.: `responsavelId`), e a
  `acao` da regra define o executor no worker.

## Idempotência
`idempotency_key = advisor.signal.<codigo>:<severidade>:<ruleId|padrao>:<YYYY-MM-DD>`

O cron roda de hora em hora (`10 * * * *`). A chave diária garante no máximo um
efeito por sinal, por regra, por dia — colisão é contada como `duplicados`, nunca
como erro do lote.

## Observabilidade
Cada execução grava em `platform_job_runs` com o job `advisor.watchdog` e o
detalhe `{ workspaces, sinaisAcionaveis, efeitosEnfileirados, duplicados }`,
visível em `/app/admin/health` e no Control Center.

## Testes
`src/lib/platform/__tests__/watchdog.test.ts` — 7 testes cobrindo severidade,
fallback do crítico, regra inativa, curinga, delay e chave de idempotência.
