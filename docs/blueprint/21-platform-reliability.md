# 21 — Platform Reliability (Sprint 11)

> Ferragano One v1.1. Alpha era "funciona". Reliability é "funciona sempre, e a
> gente sabe provar".

## Arquitetura da observabilidade

```text
Write Model → Domain Events → Read Models → Decision Engine → Dashboards
                    │                                 │
                    └─ platform_job_runs ─┐            │
                                          ▼            ▼
                                   platform_metrics → Control Center (/app/platform)
                                          │
                                          └─ Ferragano Health Score
```

## GATE A5 — Performance Budget

O orçamento é código: `src/lib/platform/metrics.ts`. Mudar meta exige ADR.

### Frontend

| Métrica | Meta | Bloqueia release |
| --- | ---: | :---: |
| First Contentful Paint | < 1,5 s | sim |
| Largest Contentful Paint | < 2,5 s | sim |
| Interaction to Next Paint | < 200 ms | sim |
| Bundle inicial (gzip) | < 300 KB | sim |
| Busca global | < 100 ms | sim |
| Board Kanban | ≥ 60 FPS | não |

### Backend

| Operação | Meta | Bloqueia release |
| --- | ---: | :---: |
| People 360 | < 200 ms | sim |
| Property 360 | < 250 ms | sim |
| Sales 360 | < 250 ms | sim |
| Executive 360 | < 300 ms | sim |
| Decision Center | < 300 ms | sim |
| Refresh Read Models | < 30 s | não |
| Worker Outbox (lote) | < 2 s | não |

Classificação: `dentro` (< 85% da meta), `atenção` (85–100%), `estourado` (> meta),
`sem_dado` (nenhuma coleta na janela — não pontua nem penaliza).

## GATE A6 — Platform Metrics

`platform_metrics` guarda **somente agregado**:

| Coluna | Uso |
| --- | --- |
| `metric_name` | chave estável, casada com o orçamento (`query.sales_360`) |
| `metric_type` | `latencia`, `contagem`, `taxa`, `erro`, `duracao` |
| `metric_value` | número |
| `entity_type` / `entity_id` | recorte opcional |
| `captured_at` | janela de análise |

- Escrita: `record_platform_metric` (membro do workspace).
- Leitura: `platform_metrics_summary` (proprietário/administrador), com média,
  p95, máximo e amostras por métrica.
- Retenção: 90 dias (`pg_cron`, 03:30).
- Tela nunca consulta a tabela: só `src/lib/platform/metrics.functions.ts`.

## Control Center — `/app/platform`

Quatro abas, restritas a proprietário/administrador:

- **Performance** — tabela do orçamento com p95 medido, semáforo e gate de release;
  jobs e refresh dos Read Models.
- **Produto** — ativos em 24 h / 7 dias, membros ativos, funções mais usadas.
- **Comercial** — conversão de fechadas, oportunidades criadas, tempo médio na
  etapa, follow-up atrasado, reservas ativas, vendas assinadas.
- **Sistema** — erros, cron, fila do Outbox, storage e latência da fila.

## Ferragano Health Score

| Dimensão | Peso | Origem |
| --- | ---: | --- |
| Arquitetura | 20 | certificação da sprint |
| Performance | 20 | `platform_metrics` (automática) |
| Segurança | 20 | certificação da sprint (RLS 100%) |
| UX | 15 | certificação da sprint |
| Qualidade | 15 | cobertura de testes |
| Operação | 10 | fila, cron e jobs (automática) |

Faixas: **Platinum** ≥ 96 · **Gold** ≥ 90 · **Silver** ≥ 80 · **Action Required** < 80.

## Referências

- ADR-010 — Métricas agregadas e Performance Budget como gate.
- Skill 18 — Platform Observability (`.skills/observability/SKILL.md`).
- Testes: `src/lib/platform/__tests__/metrics.test.ts`.