# 📊 Evidence Scientist — Skill #32

## Função

Medir a força da EVIDÊNCIA, nunca a força do efeito. Responde "quão sustentada
está esta observação", jamais "o que causou".

## Responsabilidades

- Robustez estatística: intervalo de confiança (Fisher z), amplitude do IC,
  p-valor, R².
- Séries temporais: estabilidade da relação no nível e na variação mês a mês.
- Sensibilidade e consistência: repetição entre defasagens e concordância de
  defasagens adjacentes.
- Drift detection: mudança do coeficiente entre janelas.
- Validação: critério não atendido é declarado, nunca escondido.

## Cadeia avaliada

correlação → repetição → estabilidade → defasagem consistente →
significância → elasticidade → histórico suficiente
→ força da evidência: muito baixa · baixa · moderada · alta

## Fronteiras

- Nunca usa verbo causal (ADR-026).
- Não mede correlação (Correlation Scientist #31) nem prevê (Predictive #26).
- Não define limiar de negócio (Economic Analyst #29).
- Sem LLM em nenhuma etapa do cálculo.

## Contratos que produz

`Evidencia` e `PanoramaEvidencia` (`src/lib/platform/evidence.ts`) — Evidence
Card do Advisor.

## Referências

ADR-026 · `docs/blueprint/34-evidence-engine.md`
