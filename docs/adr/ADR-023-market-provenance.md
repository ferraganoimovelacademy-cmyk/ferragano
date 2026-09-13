# ADR-023 — Dado externo nunca se mistura ao dado interno

- **Status:** aceito
- **Sprint:** 25 — Market Intelligence
- **Contexto novo:** `Market` (bounded context)

## Contexto

O contexto `Market` traz, pela primeira vez, dados que a plataforma **não produz**:
indicadores macroeconômicos (Selic, IPCA, IGP-M, INCC, TR, CDI, juros de
financiamento) e leituras de mercado regional (preço/m², liquidez, vacância).

Esse dado tem propriedades opostas ao dado interno:

| | Dado interno | Dado externo |
|---|---|---|
| Origem | operação do workspace | terceiro (BCB, Secovi, pesquisa própria) |
| Confiabilidade | auditável linha a linha | depende da fonte e da metodologia |
| Atualidade | tempo real | defasada e revisável |
| Escopo | por workspace | nacional (indicadores) ou regional |

Misturar os dois destrói a auditabilidade: um KPI que soma pipeline real com
preço médio de boletim de mercado deixa de ser fato e passa a ser palpite.

## Decisão

1. **Separação física.** Dado externo vive em tabelas próprias
   (`market_indicator_series`, `market_indicator_values`, `market_regions`,
   `market_region_snapshots`). Nenhuma FK liga dado externo a `people`,
   `opportunities`, `sales` ou aos Read Models `*_360`.
2. **Proveniência obrigatória.** Toda leitura externa carrega o envelope
   `Proveniencia`: fonte, URL, identificador na fonte, competência, momento da
   coleta e versão. Sem proveniência, o dado não é exibido.
3. **Sem valor inventado.** Fonte fora do ar ou campo não coletado resulta em
   `null` com `motivoAusencia` — nunca `0`, nunca estimativa, nunca média
   silenciosa. Cobertura é medida e exibida.
4. **Revisão não sobrescreve.** Correção da fonte entra como nova `versao` da
   mesma competência. O histórico do que a plataforma viu é imutável.
5. **Frescor explícito.** Cada leitura é classificada em `atual`, `defasado`,
   `obsoleto` ou `sem_coleta` a partir da periodicidade declarada da série.
6. **Classificação determinística.** Ambientes (crédito, custo de obra,
   correção contratual) saem de limiares publicados no código, não de LLM.
   Segue a mesma regra de ADR-021 (previsão explicável) e ADR-022
   (comportamento medido, nunca inferido).
7. **Escrita restrita.** Indicadores nacionais são gravados só pelo coletor
   (service role). Regiões e snapshots são escopados por workspace e graváveis
   apenas por admin, com fonte e metodologia declaradas.

## Consequências

- O Radar de Mercado pode aparecer parcialmente vazio no início — é o
  comportamento correto e preferível a um número inventado.
- Qualquer número de mercado é rastreável até a fonte e a data da coleta.
- Contextos futuros (Competitor, Neighborhood, Investment) herdam o envelope
  `Proveniencia` sem redesenho.
