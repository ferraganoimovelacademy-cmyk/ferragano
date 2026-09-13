# ADR-030 — Intelligence Fabric

- Status: aceito
- Sprint: 27.1
- Contexto: Fabric (camada acima do Orchestrator)
- Módulos: `src/lib/platform/fabric.ts`, `fabric.functions.ts`, `fabric-map.ts`

## Contexto

A Sprint 27 entregou o Orchestrator: quem depende de quem e o que recalcular.
Faltava a pergunta de engenharia: **quanto custa** operar esses motores, onde
está o gargalo, qual versão do pipeline está ativa e o que para de funcionar se
um motor cair. Sem isso, evolução futura é feita no escuro.

## Decisão

Criar o **Intelligence Fabric**, camada acima do Orchestrator e abaixo do
Advisor. O Fabric **não calcula inteligência e não decide negócio**: ele
coordena, mede e versiona.

### 1. Nada de estimativa inventada

Toda medição vem de dado já registrado (`platform_job_runs`,
`platform_telemetry`). Contexto sem duração medida devolve `null`, entra em
`semMedicao` e vira lacuna declarada (ADR-019/ADR-021). Tempo economizado só é
reportado sobre duração efetivamente medida.

### 2. CPU e memória são lacuna declarada, não estimativa

O runtime serverless não expõe CPU nem memória por execução. O Cost Engine
reporta **tempo medido** e **chamadas contadas**, e sempre publica
`LACUNA_RECURSOS` explicando o que não é observável. Inventar um número de CPU
seria quebrar a filosofia de auditabilidade da plataforma.

### 3. O Fabric não altera a semântica do fluxo

O Dependency Optimizer apenas agrupa a ordem topológica do Orchestrator em
níveis paralelizáveis e compara execução serial × caminho crítico. Ciclo
detectado suspende a otimização em vez de "resolver" o grafo (ADR-029).

### 4. Versão de pipeline é assinatura determinística

`assinaturaPipeline` gera hash djb2 sobre etapas + arestas + algoritmos, sem
relógio nem aleatoriedade. `HISTORICO_PIPELINES` é declarado em código: mudar
uma dependência torna a assinatura divergente e **exige** nova versão
(`v1.0 → v1.1`), com as arestas adicionadas e removidas explicitadas. Não há
edição silenciosa de pipeline.

### 5. Custo, calor e simulação usam o mesmo DAG

Profiler, Cost Engine, Heat Map e Simulator derivam de `PIPELINES` e
`DEPENDENCIAS` — uma única fonte de verdade. O Simulator responde
"se X falhar, o que para?" pela árvore de impacto real, informando as etapas
preservadas antes da interrupção e a severidade pelo número de entregáveis
atingidos.

### 6. Grafo vivo = plano × execução observada

`grafoRuntime` cruza o plano de recálculo com as execuções registradas e
classifica cada contexto: recalculado, aguardando, reaproveitado, falhou ou
ocioso. `vivo` só é `true` quando nada aguarda e nada falhou.

## Consequências

- O custo de cada entregável (Advisor, Radar, Forecast, Recommendation) passa a
  ser um número auditável, não uma percepção.
- Gargalos são identificados por medição + número de dependentes, não por palpite.
- Alterações no fluxo de inteligência ficam rastreáveis por versão de pipeline.
- O preço é rigor: dado não medido nunca aparece como zero.
