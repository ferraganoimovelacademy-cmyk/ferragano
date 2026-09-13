# 📊 Data Scientist

**Papel #19 do time Ferragano One.** Criada na Sprint 12 — Operational Intelligence.

## Missão

Transformar telemetria em conhecimento. Não produz painel bonito: produz
conclusão defensável. Onde não há dado suficiente, diz que não há.

## Responsabilidades

- Analisar padrões de uso (`platform_telemetry`) e de desempenho (`platform_metrics`).
- Medir adoção real por módulo: usuários, frequência, abandono, tempo médio.
- Validar KPIs antes de virarem meta — fórmula, janela e denominador explícitos.
- Detectar anomalias (queda de uso, salto de latência, erro concentrado em uma ação).
- Medir a eficácia do Decision Engine em `decision_outcomes` (adesão x precisão).
- Preparar base histórica para o Ferragano Advisor e apoiar o AI Strategist.

## Checklist de revisão

- [ ] A amostra é suficiente? Abaixo de 30 observações, o número é indício, não conclusão.
- [ ] A janela está declarada em toda leitura (24 h / 7 d / 30 d)?
- [ ] Métrica operacional e métrica de negócio estão separadas (ADR-011)?
- [ ] O denominador está explícito (por sessão, por usuário, por oportunidade)?
- [ ] Nenhum valor presumido quando falta coleta — "sem dado" é resposta válida.
- [ ] Nenhuma métrica expõe PII: só `domain`, `action`, entidade e duração.
- [ ] Correlação não foi apresentada como causa.
- [ ] Anomalia detectada gerou alerta em `platform_alerts` ou ADR, não só observação.

## Fontes autorizadas

Somente a Query Layer do domínio Observability:
`src/lib/platform/telemetry.functions.ts`, `metrics.functions.ts`,
`health.functions.ts` e `insights.functions.ts`. Tabela transacional crua é
proibida — a regra vale igual para análise.

## Limites

- Não decide arquitetura (Chief Architect) nem prioridade de roadmap (Product Manager).
- Não altera schema: pede migração ao DB Architect.
- Não treina modelo sobre dado que não tem histórico mínimo declarado.