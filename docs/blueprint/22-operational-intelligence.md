# 22 — Operational Intelligence (Sprint 12)

> Status: v1.2 · Domínio: **Observability** (sexto bounded context)
> Decisão: [ADR-011 — Everything Important Must Be Measured](../adr/ADR-011-everything-measured.md)

A Sprint 11 entregou o painel; a Sprint 12 entrega a evidência. A partir daqui a
plataforma mede a si mesma: latência, uso, jornada, adoção, erro e eficácia de
recomendação.

## Arquitetura

```text
Ação do usuário / worker
        ↓
instrumented(domain, action)      ← middleware transversal (server functions)
useTelemetry / useTrackScreen     ← jornada e Web Vitals (cliente)
        ↓
record_telemetry (security definer, exige vínculo no workspace)
        ↓
platform_telemetry (evento, 30 dias)  +  platform_metrics (agregado, 90 dias)
        ↓
feature_adoption · decision_accuracy · platform_metrics_summary · evaluate_platform_alerts
        ↓
Query Layer (telemetry.functions.ts)
        ↓
/app/platform — Performance · Produto · Jornada · Decisão · Comercial · Sistema · Alertas
```

## Modelo de dados

| Tabela | Papel | Retenção |
|---|---|---|
| `platform_telemetry` | evento instrumentado: domínio, ação, superfície, duração, ok, sessão, entidade | 30 dias (cron 03:45) |
| `platform_metrics` | agregado por métrica (latência, duração, erro, contagem) | 90 dias (cron 03:30) |
| `decision_outcomes` | recomendou → aceitou? → vendeu? | permanente |
| `platform_alerts` | violação de orçamento e anomalia, com reconhecimento | permanente |

Nenhuma delas duplica `domain_events` ou `platform_job_runs`, que continuam
donos do histórico de domínio e de execução de job.

## GATE 01 — Instrumentação completa

O catálogo em `src/lib/platform/telemetry.ts` fecha o contrato: 38 ações em
People, Sales, Property, Platform, Automation, Marketing e Observability. Cada
ação declara categoria (`operacional` | `negocio`) e, quando existe meta, a
chave do Performance Budget.

Instrumentar uma server function é uma linha:

```ts
.middleware([instrumented("sales", "mover_etapa")])   // em vez de [requireSupabaseAuth]
```

O contexto (`supabase`, `userId`, `claims`) é idêntico, então nenhum handler
mudou. O worker do Outbox grava direto (service_role não tem `auth.uid()`) e
marca a origem em `surface`.

**Cobertura atual:** 5 queries 360, busca global, Decision Center, ciclo de
pessoas (criar/editar/merge/dedup/pesquisa/abrir), ciclo comercial
(abrir/mover/visita/proposta/reserva/venda), Property (abrir/preço/estoque),
login/logout, Web Vitals reais e o worker/automação (processado, retry, erro).

## GATE 02 — Jornada

A navegação recebe um `session_id` próprio em `sessionStorage`, sem relação com
o token. Isso permite reconstruir o caminho real:

```text
João → entrou → abriu pessoa → abriu unidade → criou visita → saiu
```

A aba **Jornada** mostra uso por domínio e as sessões recentes com o caminho
percorrido passo a passo.

## GATE 03 — Feature Adoption

`feature_adoption` responde, por ação: quantos usos, quantos usuários, quantas
sessões, taxa de erro, duração média e último uso. A aba **Produto** separa
métricas de negócio e operacionais e mostra a **cobertura do catálogo** — o que
ainda não tem evidência de uso aparece nominalmente como "sem coleta".

## GATE 04 — Decision Accuracy

`decision_outcomes` registra a recomendação, a decisão do corretor
(aceita/ignorada/rejeitada) e o desfecho comercial. A precisão é calculada como
acerto do sistema: **aceitou e ganhou** ou **ignorou e perdeu**. Sem desfecho,
a tela informa "sem desfecho" — não há número inventado. É a base de avaliação
do Ferragano Advisor antes de qualquer modelo entrar em produção.

## GATE 05 — Operacional x negócio

Separação declarada no catálogo e aplicada na leitura (`separarPorCategoria`).
Latência, jobs, cache e erro nunca dividem gráfico com conversão, reserva,
venda, ticket, comissão e follow-up.

## GATE 06 — Observability Dashboard

`/app/platform` passa a ter sete abas: Performance, Produto, Jornada, Decisão,
Comercial, Sistema e Alertas (com contador). O Health Score agora usa dado real
em Performance e Operação, e **alertas abertos derrubam a nota de operação**
(`min(operação, notaDeAlertas)`): crítico −25, atenção −10, informativo −3.

`evaluate_platform_alerts` roda por cron a cada 5 minutos comparando as métricas
coletadas com o Performance Budget e o estado das filas. Alertas são
reconhecidos ou resolvidos na própria tela, com autor e horário registrados.

## Segurança

- RLS em todas as tabelas novas; leitura de telemetria só para proprietário e administrador.
- Escrita de telemetria exige vínculo ativo no workspace (`is_workspace_member`).
- `REVOKE ALL ... FROM PUBLIC` em todas as funções; `upsert_platform_alert` e
  `evaluate_platform_alerts` são exclusivas de `service_role`.
- Nenhum payload de telemetria carrega PII: apenas domínio, ação, superfície,
  duração e id de entidade.

## Definição de pronto (ADR-011)

Funcionalidade nova só está concluída quando responde: quanto tempo levou,
quantas vezes foi usada, quantos erros ocorreram, qual o impacto no negócio e
qual o impacto na experiência. Se não é possível medir, não está pronta.