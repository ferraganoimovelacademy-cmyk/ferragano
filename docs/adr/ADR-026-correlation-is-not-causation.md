# ADR-026 — Correlation ≠ Causation

**Status:** aceito · Sprint 25.3 · Contexto `Market Analytics`
**Depende de:** [ADR-025](ADR-025-correlation-not-causation.md) (correlação medida),
[ADR-021](ADR-021-explainable-predictions.md) (explicabilidade)

## Contexto

A Sprint 25.2 mediu correlação com rigor. O risco seguinte não é estatístico,
é linguístico: basta uma frase com verbo causal para a plataforma perder a
auditabilidade construída desde as Sprints 18–25.

Falta também a resposta à pergunta que o gestor faz depois do coeficiente:
"isso é robusto ou instável?"

## Decisão

1. **Proibição de verbo causal.** Nenhum componente do Ferragano One pode usar
   "causou", "provocou", "gerou", "por causa de", "devido a" ou "resultou em"
   quando a conclusão vier exclusivamente da Correlation Engine. O padrão é
   "se moveram no mesmo sentido … não é causa".
2. **Intervalo de confiança obrigatório.** Todo coeficiente exposto carrega
   IC95% (transformação z de Fisher). Coeficiente sem intervalo não vai à tela.
3. **Nasce o Causal Evidence Engine** (`src/lib/platform/evidence.ts`), camada
   pura entre Correlation Engine e Advisor. Ele não afirma causa: mede
   sustentação em 7 critérios encadeados —
   correlação · repetição · estabilidade · defasagem consistente ·
   significância · elasticidade · histórico suficiente.
4. **Força da evidência**, não força do efeito:
   ≤ 2 critérios muito baixa · 3–4 baixa · 5 moderada · 6–7 alta.
5. **Critério não atendido é exibido com o motivo.** Ausência de sustentação é
   informação, não defeito.
6. **Evidence Card.** Toda leitura histórica na interface abre coeficiente,
   IC95%, defasagem, R², p-valor, amostra, base e a ressalva
   "Nenhuma relação causal foi estabelecida."
7. **Sem LLM.** A avaliação é determinística e coberta por teste.

## Limiares publicados

| Critério | Regra |
|---|---|
| Significância | p ≤ 0,05 **e** IC95% não cruza zero |
| Repetição | ≥ 2 defasagens com evidência no mesmo sentido |
| Estabilidade | sobrevive ao controle de tendência (sem `alertaTendencia`) |
| Defasagem consistente | defasagem adjacente com o mesmo sentido |
| Histórico suficiente | amostra ≥ 24 meses e amplitude do IC95% ≤ 0,50 |
| Consistência externa (informativo) | referência de mercado no mesmo sentido |
| Drift | variação de coeficiente > 0,30, inversão de sentido ou perda da relação |

## Adendo 25.4 — consistência externa e drift

8. **Oitavo critério informativo: consistência externa.** Quando existe
   referência de mercado para o mesmo indicador, a plataforma declara se o
   padrão do workspace também aparece fora dele (`confirmada`,
   `nao_confirmada`, `sem_referencia`). O critério é marcado `informativo` e
   **nunca entra no cálculo da força** — a força continua sobre os 7 critérios
   decisivos.
9. **Drift Detection.** A mesma defasagem é medida na janela anterior e na
   janela recente. Sentido invertido, coeficiente afastado em mais de 0,30 ou
   relação que deixou de aparecer resultam em `em_drift`; amostra insuficiente
   resulta em `indefinido`. O Advisor não pode sustentar recomendação em padrão
   marcado como drift sem declarar isso.

## Consequências

- O Advisor passa a informar não só o que foi observado, mas quão sólida é a
  evidência que sustenta a observação.
- Mudar limiar ou vocabulário é mudança de ADR e quebra teste.
- Cadeia oficial da plataforma: Market → Market Analytics → Evidence Engine →
  Behavior → Predictive → Advisor → Recommendation.
