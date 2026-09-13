# 35 — Knowledge Graph (Sprint 26)

Bounded context **Knowledge**: organiza, relaciona e explica a inteligência
produzida pela plataforma. Não cria dado de negócio e não escreve em domínio.

```text
Query Layer / Read Models ─┐
Market Intelligence ───────┼─→ knowledge-build (puro) → Grafo → Árvore de proveniência
Recommendation / Advisor ──┘                                  ├─→ Knowledge Explorer
                                                              ├─→ Advisor Explainability
                                                              └─→ Knowledge Health Score
```

## GATE 01 — Ontologia

Pessoa → Corretor → Equipe · Pessoa → Oportunidade → Empreendimento →
Construtora / Bairro → Mercado → Indicador → Evidência → Recomendação →
Advisor → Resultado.

Toda relação carrega origem, destino, tipo, proveniência e data. Aresta fora de
`ONTOLOGIA` é descartada na montagem.

## GATE 02 — Proveniência (ADR-027)

`arvoreProveniencia(grafo, no)` sobe pelas relações de entrada até as fontes
primárias. Cadeias típicas:

```text
Recomendação → Evidência → automation_daily_metrics
Empreendimento → Bairro → Mercado → Indicador → Banco Central
```

## GATE 03 — Knowledge Explorer (`/app/knowledge`)

Abas: Lista (busca + filtro por domínio), Árvore, Relações, Timeline,
Integridade. Nós selecionáveis por teclado (`aria-pressed`).

## GATE 04/05 — Explainability e Evidence Trace

Botão "Por que recebi esta recomendação?" no Advisor abre a árvore inteira.
O trace declara origem, data, algoritmo, critérios, força, confiança, base,
fonte, versão do algoritmo e ADR; campo ausente aparece em `faltando`.

## GATE 06 — Timeline

Nós datados em ordem decrescente, com camada e fonte. Nó sem data fica fora.

## GATE 07 — Integridade

relacionamento órfão · origem inexistente · referência quebrada · proveniência
inválida · evidência sem fonte · recomendação sem evidência · advisor sem
recomendação.

## GATE 08 — Knowledge Health Score

Cobertura do grafo, integridade, relações quebradas, proveniência válida, nós
órfãos, nós ativos (30 d) e tempo médio de atualização. Aba **Conhecimento** no
Platform Center. Sem nós, o score é `null`.
