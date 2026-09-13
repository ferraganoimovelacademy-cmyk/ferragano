# Skill #35 — 🧠 Intelligence Fabric Architect

## Responsabilidade

Não calcula. **Conecta.** Coordena todos os motores de inteligência da
plataforma: mede custo computacional, versiona pipelines, detecta conflitos e
redundâncias e otimiza a ordem de execução.

## Escopo

- `src/lib/platform/fabric.ts` — otimizador, profiler, versionamento, custo,
  mapa de calor, simulador, grafo vivo e saúde do Fabric.
- `src/lib/platform/fabric.functions.ts` / `fabric-map.ts` — leitura das medições.
- `src/routes/app.fabric.tsx` — Executive Fabric Dashboard (8 abas).

## Regras inegociáveis

1. Sem medição, o número é `null` e a lacuna é declarada. Zero nunca substitui
   ausência (ADR-019/ADR-021/ADR-030).
2. CPU e memória não são observáveis: reportar tempo e chamadas, jamais estimar.
3. O Fabric não muda a semântica do fluxo — só agrupa a ordem topológica do
   Orchestrator (ADR-029).
4. Mudança de dependência = nova versão de pipeline, com arestas adicionadas e
   removidas explicitadas.
5. Uma única fonte de verdade para o DAG: `DEPENDENCIAS` e `PIPELINES`.
6. Gargalo exige lentidão medida **e** dependentes — não é opinião.

## Perguntas que a skill deve sempre responder

- Quanto custa gerar Advisor, Radar, Forecast e Recommendation?
- Onde está o gargalo do pipeline e quanto ele consome do total?
- Quanto processamento o cache economizou nesta janela?
- Qual versão de pipeline está ativa e o que mudou desde a anterior?
- Se este motor falhar, quais entregáveis param e o que continua funcionando?
- Qual contexto está aguardando, qual falhou e qual foi reaproveitado agora?

## ADRs

- ADR-029 — Knowledge Orchestration
- ADR-030 — Intelligence Fabric
