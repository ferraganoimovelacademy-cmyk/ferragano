# ADR-019 — Recomendação com memória e desfecho medido

**Status**: aceito (Sprint 21)

**Contexto**: a Sprint 20 (ADR-018) entregou confiança estatística e score de
prioridade. A fila, porém, era efêmera: recalculada a cada leitura, sem
posição, sem urgência e sem registro de que alguém agiu — logo, sem como saber
se a recomendação era boa.

## Decisão

1. **Prioridade tem duas dimensões.** Impacto (tamanho do ganho, medido em
   horas/mês ou fração de volume, ponderado pela confiança) e urgência (quanto
   o problema piora sozinho, derivada do tipo). Matriz Eisenhower:
   `agir_agora`, `planejar`, `delegar`, `monitorar`. A fila é ordenada por
   `impacto x 0,6 + urgência x 0,4`, ainda modulada pela confiança.
2. **Recomendação passa a ter memória.** `recommendation_history` guarda uma
   linha por chave `tipo:regra` com ciclo de vida explícito:
   `gerada -> vista -> aceita -> implementada -> resultado -> arquivada`.
   Recorrência incrementa `ocorrencias`; nunca duplica (índice único parcial
   sobre `closed_at IS NULL`).
3. **Desfecho é medido, não declarado.** No momento da implementação gravamos
   `score_na_implementacao`. Ao avaliar, comparamos com o score atual da mesma
   chave: caiu 10 pontos ou mais -> `melhorou`; subiu 10 ou mais -> `piorou`;
   entre os dois -> `neutro`. Sem baseline, `indefinido` — nunca zero.
4. **O motor é auditado por um KPI próprio.** Precisão =
   `melhoraram / avaliadas`, publicada só com amostra >= 5. Aceitação e
   implementação usam denominadores distintos (geradas e aceitas) para separar
   intenção de execução.
5. **Aprendizado alimenta recalibragem.** Tipos com aceitação abaixo de 20% em
   amostra >= 5 aparecem como candidatos a redução de peso. A recalibragem é
   decisão humana registrada, não ajuste automático oculto.
6. **Acesso.** A tabela não aceita escrita direta do cliente. Escrita e leitura
   só por RPC `security definer` que exige papel de administrador do workspace:
   `upsert_recommendation`, `advance_recommendation`, `evaluate_recommendation`,
   `recommendation_quality`, `list_recommendations`.

## Consequências

- A fila deixa de ser uma lista e passa a ser um processo rastreável.
- O produto responde "quais recomendações são aceitas?", "quais geram impacto?",
  "quais são ignoradas?".
- Custo: uma tabela nova e a exigência de o gestor marcar a implementação. Sem
  essa marcação a precisão fica `null` — limitação assumida conscientemente.

## Evolução planejada (Sprints 22–23)

- `automation_action_profiles`: tempo por ação **por workspace**, substituindo
  as constantes 120s/60s/30s do ADR-017.
- **Baseline observado** antes e depois da implementação: move o ROI de
  estimado para medido, sem usar o score como proxy.
