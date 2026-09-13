# 23 — Advisor Decision Loop

**Fase 2 — Ferragano Advisor · Sprint 14**

## Problema

O briefing do Advisor era efêmero: gerado, lido e perdido. Sem registro não
existe medição de qualidade do conselho — só opinião.

## Solução

Todo briefing é persistido e cada recomendação vira uma ação decidível.

| Tabela | Papel |
| --- | --- |
| `advisor_briefings` | Snapshot do briefing: pergunta, resumo, prioridade, sinais medidos e riscos. |
| `advisor_acoes` | Uma linha por recomendação, com status `pendente → aceita → concluida` ou `descartada`. |

Acesso restrito à gestão do workspace (`is_workspace_admin`) em SELECT,
INSERT e UPDATE; UPDATE limitado por coluna via GRANT.

## Fluxo

```
Read Models 360 → derivarSinais() → prompt fechado → IA
  → advisor_briefings + advisor_acoes
  → decisão da gestão (aceitar / descartar / concluir)
  → resumirAceite() → taxa de aceite e taxa de execução
```

## Métricas

`resumirAceite()` (puro, em `advisor.ts`) mede:

- **Taxa de aceite** = (aceitas + concluídas) / decididas. Pendentes não contam.
- **Taxa de execução** = concluídas / (aceitas + concluídas).

Essas duas taxas são o insumo de Decision Accuracy do Advisor: conselho que
ninguém aceita é ruído, conselho aceito e não executado é problema de operação.

## Server functions

- `getAdvisorBriefing` — gera e persiste (persiste também quando a IA falha, para
  não perder os sinais medidos).
- `listAdvisorHistorico` — últimos 20 briefings com suas ações.
- `decidirAdvisorAcao` — registra status, quem decidiu e quando.

## Control Center (Sprint 15)

A aba **Decisão** de `/app/platform` passa a exibir o aceite do Advisor ao lado
da precisão das recomendações do Decision Center: taxa de aceite, taxa de
execução, pendentes (com destaque para prioridade alta) e total de briefings.
A fonte é `getAdvisorAceite`, que agrega `advisor_acoes` sob RLS de gestão —
sem número estimado.

## Sprint 16 — Ponte Advisor → Execução

O loop de decisão passou a gerar execução real:

- `advisor_acoes.task_id` liga a recomendação à tarefa criada (FK para `tasks`, `ON DELETE SET NULL`).
- `montarTarefaDaAcao()` (camada pura, `advisor.ts`) converte a recomendação em tarefa: título prefixado com `Advisor:`, descrição = conselho + sinal que o sustenta, prazo de `ADVISOR_PRAZO_DIAS` (7 dias) e prioridade normalizada.
- `decidirAdvisorAcao`:
  - `aceita` → cria a tarefa (`origem: sistema`, responsável = quem decidiu) e grava `task_id`. Idempotente: nunca cria segunda tarefa para a mesma ação.
  - `concluida` → fecha a tarefa vinculada (`status: concluida`, `concluida_em`).
  - Falha ao criar/fechar tarefa não bloqueia o registro da decisão (log + segue).
- `/app/advisor` mostra "Tarefa criada na agenda do responsável" nas ações já executáveis.

Efeito na medição: a taxa de execução deixa de ser autodeclarada — vira reflexo de tarefa concluída.
