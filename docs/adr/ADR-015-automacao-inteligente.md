# ADR-015 — Automação Inteligente (sinais do Advisor como gatilho)

- Status: aceito
- Sprint: 17
- Contexto: os sinais do Advisor eram derivados sob demanda, apenas quando um
  gestor abria `/app/advisor`. Um sinal crítico podia existir por dias sem que
  ninguém fosse avisado, e a Automation Engine só reagia a eventos de escrita.

## Decisão
1. O snapshot dos Read Models virou função pura compartilhada
   (`montarSnapshotAdvisor`), usada pelo briefing (RLS do usuário) e pelo
   watchdog do cron (service_role). Sem duplicação de mapeamento.
2. O watchdog **não executa** efeito: publica em `outbox_events`. Quem executa
   continua o worker do Sprint 09, com retry, backoff e descarte explícito.
3. Sinais do Advisor entram como eventos de domínio nomeados
   (`advisor.signal.<codigo>` + curinga `advisor.signal.any`), de modo que a
   configuração de resposta fica em `automation_rules` — não no código.
4. Sem regra configurada, apenas o `critico` gera notificação padrão. Evita
   ruído em workspaces que ainda não configuraram automação.
5. Idempotência por sinal + severidade + regra + dia (UTC): o cron é seguro para
   reexecução e para overlapping de instâncias.

## Consequências
- Aceito: latência de até 1 hora entre o sinal aparecer e o efeito ser criado —
  suficiente para sinais de tendência (conversão, ciclo, liquidez).
- Aceito: o watchdog roda com service_role e por isso lê as matviews direto; as
  RPCs `read_*_360` seguem exigindo `auth.uid()` para acesso de usuário.
- Rejeitado: disparar e-mail/WhatsApp direto no watchdog. Canal sem provedor
  conectado continua sendo descartado pelo worker, com motivo registrado.
