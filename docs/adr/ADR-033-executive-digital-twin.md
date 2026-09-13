# ADR-033 — Executive Digital Twin

**Status:** aceito (Sprint 30)
**Contexto:** `Executive Twin` (novo bounded context, somente leitura)

## Contexto

A plataforma já mede domínios (People, Sales, Property, Market, Automation),
consolida conhecimento (Knowledge, Orchestrator, Fabric), recomenda
(Recommendation, Advisor) e preserva histórico (Enterprise Memory,
Organizational Intelligence). Faltava uma representação única do estado da
organização — não um dashboard a mais, mas a leitura integrada de pipeline,
pessoas, execução, mercado, memória, conhecimento e risco.

## Decisão

Criar o bounded context `Executive Twin`:

- `src/lib/platform/executive-twin.ts` — módulo puro (gates 01–07);
- `src/lib/platform/executive-twin.server.ts` — agregação de leitura;
- `src/lib/platform/executive-twin.functions.ts` — porta única (server fns);
- rota `/app/executive` — Executive OS Dashboard (gate 08).

## Princípios (não negociáveis)

1. **Nunca substitui decisão humana.** O twin descreve; não decide, não aprova,
   não executa. Nenhuma saída é imperativa.
2. **Observação, tendência e simulação são tipos distintos.** Todo valor sai com
   `natureza` (`observacao | tendencia | simulacao`) e nunca aparece misturado.
3. **Janela e amostra declaradas.** Todo número informa a janela usada e o
   tamanho da amostra. Série com menos de 3 meses não gera tendência; com menos
   de 6 meses não gera simulação.
4. **Sem estimativa silenciosa.** Ausência de medição resulta em `null` e vira
   lacuna explícita — nunca um valor inferido.
5. **Simulação declara hipóteses e limitações.** Cada cenário lista as hipóteses
   assumidas, as limitações conhecidas e o aviso de que não é previsão garantida.
   Correlação histórica fraca (|r| < 0,5) não gera cenário.
6. **Correlação não é causa (ADR-026).** Nenhuma saída afirma causalidade.
7. **Rastreabilidade.** Cada parágrafo da narrativa declara as fontes usadas.
8. **Somente leitura.** O contexto não escreve em nenhuma tabela de domínio,
   memória, conhecimento, fabric ou advisor.

## Consequências

- O Executive OS pode divergir de dashboards operacionais quando uma fonte está
  indisponível: por decisão, o twin prefere lacuna a número aproximado.
- Workspaces novos verão a maior parte das tendências e simulações
  indisponíveis até acumularem série histórica — comportamento desejado.
- Séries constantes produzem z-score indisponível (desvio-padrão zero), e não
  "dentro do padrão" por conveniência.
