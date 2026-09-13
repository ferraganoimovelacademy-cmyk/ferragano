# 27 — Decision Intelligence (Sprint 20)

Até a Sprint 18 a plataforma respondia "a automação funciona?".
Na Sprint 19, "a automação gera resultado?".
Aqui ela responde **"quanta confiança esse resultado merece, o que fazer
primeiro e o que acontece se eu mudar isso?"**.

Sem IA generativa: aprendizado estatístico sobre o histórico materializado.

## Camada

`src/lib/platform/decision-intelligence.ts` — funções puras, client-safe,
alimentadas pela RPC `automation_intelligence` (admin-only, ADR-017).

## Gates

| Gate | Entrega | Função |
| --- | --- | --- |
| 01 | Automation Confidence | `automationConfidence` — teste de duas proporções; amostra mínima 10; sustentado ≥ 90% |
| 02 | Recommendation Score | `priorizarRecomendacoes` — score 0..100 por tipo, evidência e confiança |
| 03 | Impact Forecast | `forecast` em cada recomendação: horas/mês, redução de fila, execuções duplicadas |
| 04 | Rule Dependencies | `grafoDeRegras` — arestas por efeito produzido; detecta loop, gargalo e órfã |
| 05 | Automation Simulator | `simularDesligarRegra` — veredito NÃO DESLIGAR / AVALIAR / PODE DESLIGAR |

## Tipos de recomendação

`eliminar`, `revisar_gatilho`, `alterar_delay`, `consolidar`, `ampliar`.
Cada tipo tem peso base; o score final é ponderado pela parcela de volume da
regra na janela e pela confiança da evidência.

## Grafo de dependências

Hoje apenas a ação `task` produz evento de domínio (`task.created`). O grafo é
construído sobre esse mapa e cresce quando novas ações passarem a emitir
eventos — a detecção de ciclos por DFS já é genérica.

## Interface

`/app/platform` → aba **Automação** → cartão **Decision Intelligence**:
confiança por regra, fila priorizada com previsão, dependências e simulador.

## Limites honestos

- Correlação não é causa; o teste apenas descarta ruído amostral.
- Tempo economizado ainda usa constantes por ação (ADR-017). A evolução
  registrada é `automation_action_profiles` + baseline observado (ADR-018).
- A série começa na primeira execução do rollup diário: não há reconstrução
  retroativa.

## Qualidade

`src/lib/platform/__tests__/decision-intelligence.test.ts` — 18 testes
cobrindo confiança por amostra, ordenação por score, previsão, loops, órfãs,
gargalos e os quatro vereditos do simulador.