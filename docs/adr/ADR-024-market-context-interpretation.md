# ADR-024 — Interpretação de indicador é regra publicada, não opinião

**Status:** aceito · Sprint 25.1 · Contexto `Market`
**Depende de:** [ADR-023](ADR-023-market-provenance.md) (proveniência),
[ADR-021](ADR-021-explainable-predictions.md) (explicabilidade)

## Contexto

A Sprint 25 passou a coletar 8 séries do Banco Central com proveniência
completa. O gestor, porém, não decide com `Selic 14,25% a.a.`: decide com
"crédito mais caro, investidor mais conservador, condição pesa mais que preço".

O risco é atribuir consequência sem base — a plataforma soar como analista de
opinião, ou pior, cruzar dado externo com dado interno para "provar" efeito.

## Decisão

1. Existe uma camada de interpretação separada da coleta e da leitura:
   `src/lib/platform/market-context.ts` (pura, determinística, sem LLM).
2. Todo impacto declara **público** (comprador, investidor, construtora,
   velocidade de vendas, negociação), **direção** e **base da conclusão**:
   - `regra_negocio` — decorre do limiar publicado nesta camada;
   - `dado_interno` — só se confirma contra medição própria do workspace.
3. Efeito sobre ciclo e velocidade de venda é **sempre** `dado_interno`. A
   camada nunca afirma que o funil mudou por causa de um indicador externo.
4. Indicador sem regra publicada não é interpretado: devolve o motivo.
   Indicador sem coleta não gera impacto nenhum.
5. A confiança da interpretação é função do frescor e do tamanho da série:
   obsoleto → baixa · uma competência ou defasado → média · atual com 6+
   competências → alta · sem coleta → indefinida.
6. Narrativa para o Advisor só é emitida quando houve **movimento** contra a
   competência anterior, e sempre carrega fonte, base e confiança no texto.

## Limiares publicados

| Família | Séries | Limiar |
|---|---|---|
| Juro básico | `selic_meta`, `selic_12m`, `cdi` | 13% restritivo · 10% apertado · 8% neutro |
| Financiamento PF | `financiamento_imob_pf` | ≥ 12% a.a. compostos encarece a parcela |
| Custo de obra | `incc` | 12m: 9% restritivo · 6% apertado · 3% neutro |
| Correção contratual | `igpm`, `ipca`, `tr` | 12m: 8% restritivo · 5% apertado · 2% neutro |

Sem 12 competências, o acumulado é substituído por proxy (mês × 12) e o proxy
é declarado na própria regra.

## Consequências

- O gestor lê consequência de negócio, não número cru.
- Qualquer mudança de limiar é mudança de ADR e quebra teste — não é ajuste
  silencioso de código.
- O Advisor recebe frase pronta com base declarada, mantendo ADR-013 (LLM não
  produz número).
