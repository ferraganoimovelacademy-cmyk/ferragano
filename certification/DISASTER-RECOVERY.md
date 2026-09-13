# 🧯 GATE S04 — Disaster Recovery

## Objetivos declarados

| Indicador | Meta Alpha | Origem |
| --- | --- | --- |
| RPO (perda máxima aceitável) | 24 h | backup diário automático do ambiente gerenciado |
| RTO (tempo máximo de retomada) | 4 h | restauração de backup + revalidação dos gates |

## O que é recuperável

| Ativo | Estratégia |
| --- | --- |
| Schema e dados transacionais | backup automático do banco gerenciado |
| Read Models (`*_360`) | descartáveis: reconstruídos por `refresh_read_models()` |
| Fila do Outbox | durável em tabela; retomada pelo worker no minuto seguinte |
| Eventos de domínio | `domain_events` é fonte de verdade auditável |
| Arquivos | bucket privado `workspace-files` |
| Segredos | armazenados fora do repositório, reprovisionados no ambiente |

## Procedimento de restauração

1. Restaurar o backup mais recente do banco.
2. Rodar `select public.refresh_read_models();` (os 5 Read Models não dependem
   de backup próprio).
3. Conferir o agendador: worker do Outbox (1 min), refresh (10 min), alertas.
4. Rodar `bunx vitest run` — 272 testes, incluindo isolamento e ataque.
5. Abrir `/app/admin/health` e `/app/platform`: fila, jobs e Health Score.
6. Registrar o incidente em `certification/PILOT-READINESS.md`.

## Pendência declarada

Restauração completa em ambiente espelho ainda **não foi executada** nesta
sprint. Enquanto não houver ensaio real com cronômetro, o RTO de 4 h é meta,
não evidência. Bloqueia certificação Platinum, não o piloto controlado.