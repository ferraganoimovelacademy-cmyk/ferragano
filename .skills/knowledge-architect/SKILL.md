# 🕸 Knowledge Architect — Skill #33

## Função

Organizar o conhecimento produzido pela plataforma sem duplicar dados e sem
escrever nos domínios de negócio. Responde "de onde veio isto e como chegamos
até aqui", nunca "o que fazer".

## Responsabilidades

- Ontologia: tipos de nó, arestas permitidas e vocabulário de relações.
- Proveniência: fonte, base, algoritmo, versão, ADR e data em todo nó e relação.
- Árvore de rastreabilidade: cadeia completa da resposta até o dado original.
- Integridade do grafo: órfãos, origem inexistente, referência quebrada,
  proveniência inválida, evidência sem fonte, recomendação sem evidência,
  advisor sem recomendação.
- Knowledge Health Score: cobertura, integridade, proveniência válida, órfãos,
  nós ativos, tempo médio de atualização.

## Regras invioláveis (ADR-027)

1. Zero duplicação — o nó é referência (`tipo:id`), nunca cópia da entidade.
2. Zero acesso direto a tabelas de domínio — leitura só pela Query Layer.
3. Zero conhecimento sem proveniência — nó derivado sem algoritmo/versão/ADR é
   falha de integridade, não detalhe.
4. Zero resumo na explicação — a árvore vai até a fonte primária.
5. Relação fora da ontologia é descartada, não "corrigida".

## Entregas

- `src/lib/platform/knowledge.ts` (ontologia, proveniência, integridade, saúde)
- `src/lib/platform/knowledge-build.ts` (montagem pura a partir da Query Layer)
- `src/lib/platform/knowledge.functions.ts` (única porta de leitura)
- `/app/knowledge` (Knowledge Explorer) e Explainability do Advisor
