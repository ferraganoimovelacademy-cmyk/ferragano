# ADR-011 — Everything Important Must Be Measured

- **Status:** aceito
- **Data:** 2026-07-31
- **Sprint:** 12 — Operational Intelligence
- **Decide:** Chief Architect, Platform Observability, Data Scientist, Domain Guardian

## Contexto

Até a Sprint 11 a plataforma tinha infraestrutura de métricas (`platform_metrics`,
Performance Budget, Health Score) sem coleta. O resultado era um painel honesto,
mas vazio: quatro das seis dimensões do Health Score vinham da certificação da
sprint, não da operação. Sem evidência, não há como priorizar roadmap, medir o
Recommendation Engine nem provar regressão de performance.

## Decisão

1. **Instrumentação é camada transversal, não código de tela.** Server functions
   instrumentadas trocam `requireSupabaseAuth` por
   `instrumented(domain, action)`. O middleware mede duração, marca sucesso/erro
   e grava telemetria + métrica agregada. Nenhum handler tem `try/catch` de
   telemetria.
2. **Catálogo fechado.** `TELEMETRY_CATALOG` (`src/lib/platform/telemetry.ts`) é
   a única fonte de `domain` + `action`. Ação fora do catálogo não é medida em
   painel: aparece como "sem coleta".
3. **Duas categorias separadas.** `operacional` (latência, jobs, cache, erros) e
   `negocio` (conversão, reservas, vendas, follow-up) nunca se misturam no mesmo
   gráfico nem no mesmo cálculo.
4. **Sexto bounded context: Observability.** `platform_metrics`,
   `platform_telemetry`, `platform_alerts`, `decision_outcomes`, Health Score,
   Performance Budget e release quality pertencem a ele. Leitura só pela Query
   Layer (`telemetry.functions.ts`), como nos demais domínios.
5. **Definição de pronto.** Uma funcionalidade só está completa quando responde:
   quanto tempo levou, quantas vezes foi usada, quantos erros ocorreu, qual o
   impacto no negócio e qual o impacto na experiência.
6. **Sem medição não gera nota.** Mantém a regra da Sprint 11: dimensão sem
   coleta entra com 0 e a tela diz por quê. Nada é presumido.

## Consequências

**Positivas**
- Health Score passa a refletir operação real (performance e operação medidas,
  alertas abertos derrubam a nota).
- Base histórica de comportamento e desempenho pronta para o Ferragano Advisor.
- Regressão de performance vira alerta automático a cada 5 minutos, não
  descoberta em produção.

**Negativas / custos aceitos**
- Cada função instrumentada faz um roundtrip extra de gravação. Aceito de forma
  consciente: a medição é gravada **depois** do trabalho útil e o valor medido
  não inclui a própria telemetria. Falha de telemetria só loga.
- `platform_telemetry` cresce rápido — retenção de 30 dias por cron; agregados
  ficam em `platform_metrics` (90 dias).

## Alternativas descartadas

- **Instrumentar tela por tela:** esquece casos, duplica código e mede o que o
  desenvolvedor lembrou de medir.
- **Ferramenta externa de APM:** vazaria dados do workspace e não cruzaria
  telemetria com o modelo de domínio (oportunidade, unidade, pessoa).
- **Reaproveitar `audit_log` como telemetria:** auditoria responde "quem fez",
  telemetria responde "quanto custou e quantas vezes". Misturar corrompe as duas.