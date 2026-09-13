# ADR-029 — Knowledge Orchestration

- Status: aceito
- Sprint: 27
- Contexto: Orchestration
- Módulo: `src/lib/platform/orchestrator.ts`

## Contexto

Nove bounded contexts produzem conhecimento derivado (Domain, Behavior, Market,
Market Analytics, Evidence, Recommendation, Advisor, Knowledge, Executive).
Sem orquestração explícita, ninguém sabia o que recalcular quando um dado muda,
nem por que um número mudou de ontem para hoje.

## Decisão

### 1. O fluxo de conhecimento é um DAG declarado

`DEPENDENCIAS` declara cada aresta com algoritmo e ADR de origem.
`grafoDependencias` valida aciclicidade por ordenação topológica (Kahn) e
**retorna os ciclos** quando existirem, em vez de estourar. Ciclo no fluxo de
conhecimento é defeito de arquitetura, não condição de runtime.

Ordem garantida: `dominio | market → behavior | market_analytics → evidence →
recommendation → advisor → knowledge → executive`.

### 2. Invalidação é por evento, nunca por tempo

`invalidarPorEvento` invalida o contexto de origem do evento e todos os seus
dependentes transitivos. Toda entrada invalidada registra `invalidadaPor` com o
nome do evento. Uma entrada antiga sem evento correspondente **permanece válida**
— TTL não é critério de verdade; mudança de dado é.

### 3. Recálculo é seletivo e ordenado

`planoRecalculo` produz tarefas em ordem topológica, cada uma com motivo,
eventos disparadores e algoritmos envolvidos, mais a lista `reaproveitar` e a
`economia` percentual. Sem evento, não há recálculo.

### 4. Narrativa nunca afirma causa

`explainUpdate` e `executiveStory` usam exclusivamente "coincidiu com",
"no mesmo período", "acompanhou". Verbos causais (causou, gerou, provocou,
por causa de, devido a) são proibidos por teste automatizado, coerente com
ADR-026 (Correlation ≠ Causation).

Quando não há gatilho na cadeia, ou quando falta valor anterior, o módulo
**declara a lacuna** em `lacunas` em vez de inventar continuidade.

### 5. Diff e auditoria fecham o ciclo

`knowledgeDiff` compara dois momentos e associa cada alteração ao evento e
algoritmo responsáveis. `auditoriaConhecimento` cruza o plano com as execuções
reais (`platform_job_runs`) e responde se a cadeia foi propagada por completo,
expondo pendências e falhas.

## Consequências

- Recálculo custa proporcional ao impacto, não ao grafo inteiro.
- Toda mudança de número é rastreável até o evento de origem.
- Narrativas executivas são auditáveis e livres de causalidade inventada.
