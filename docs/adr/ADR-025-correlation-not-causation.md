# ADR-025 — Correlação é medida, causa nunca é afirmada

**Status:** aceito · Sprint 25.2 · Novo bounded context `Market Analytics`
**Depende de:** [ADR-023](ADR-023-market-provenance.md) (proveniência),
[ADR-024](ADR-024-market-context-interpretation.md) (interpretação por regra),
[ADR-011](ADR-011-everything-measured.md) (tudo é medido)

## Contexto

A Sprint 25.1 traduz indicador externo em consequência de negócio por **regra
publicada**. Falta a terceira base de conclusão: o que o histórico **deste**
workspace mostra sobre a relação entre mercado e resultado comercial.

Sem uma camada própria, essa leitura vazaria para dentro do Economic Impact
Engine e a plataforma passaria a afirmar comportamento interno com dado
externo — exatamente o que o ADR-023 proíbe.

## Decisão

1. Nasce o bounded context `Market Analytics`, com uma camada pura:
   `src/lib/platform/market-analytics.ts` (Correlation Engine).
2. `BaseConclusao` ganha o terceiro valor `evidencia_historica`:
   - `regra_negocio` — limiar publicado (ADR-024);
   - `dado_interno` — depende de medição própria, ainda não medida;
   - `evidencia_historica` — medida agora, no histórico deste workspace.
3. Dado externo e dado interno entram como **séries separadas**. Nenhum número
   é somado, subtraído ou combinado entre origens: a saída é coeficiente.
4. Defasagens obrigatórias: 0, 30, 60 e 90 dias, sempre externo(t) → interno(t+lag).
5. Amostra mínima de 12 competências pareadas. Abaixo disso, e para p > 0,05,
   a leitura é `sem_evidencia` com o motivo declarado.
6. Classificação: |r| < 0,3 fraca · < 0,7 moderada · ≥ 0,7 forte.
7. Correlação de nível é confrontada com a de variação mês a mês. Passando só
   a de nível, a leitura recebe `alertaTendencia` — tendência comum não é relação.
8. Nenhuma frase da camada usa verbo causal. O padrão é
   "se moveram no mesmo sentido … correlação medida no histórico deste
   workspace — não é causa".

## Consequências

- O Advisor pode dizer "a elevação da Selic está associada à redução da
  velocidade do seu funil" e abrir o painel: origem do indicador, base da
  conclusão, período, coeficiente, defasagem, amostra e confiança.
- Workspace novo simplesmente não tem correlação — e isso é dito, não estimado.
- Trocar limiar, amostra mínima ou classificação exige mudar este ADR: a
  mudança quebra teste.
