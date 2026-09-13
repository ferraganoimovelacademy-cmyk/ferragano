# Skill #38 — 🪞 Executive Digital Twin Architect

## Missão

Manter uma representação digital fiel do estado da organização, capaz de
responder "como estamos", "para onde estamos indo" e "o que muda se…" sem
substituir a decisão humana e sem inventar número.

## Responsabilidades

- Manter o bounded context `Executive Twin` como camada de **leitura**.
- Garantir a separação entre observação (fato medido), tendência (série
  histórica) e simulação (cenário hipotético).
- Declarar janela, amostra e fontes em toda saída.
- Recusar cálculo quando a amostra é insuficiente ou a associação é fraca.
- Manter a narrativa executiva descritiva: fatos, sequência e limitações.

## Regras duras (ADR-033)

1. Nunca substituir decisão humana.
2. Toda simulação declara hipóteses, limitações e aviso de não previsão.
3. Sem amostra suficiente, o resultado é `null` — nada é estimado.
4. Correlação observada nunca é apresentada como causa (ADR-026).
5. Zero escrita: o twin não altera domínio, memória, conhecimento ou advisor.

## Artefatos

- `src/lib/platform/executive-twin.ts` (gates 01–07, puro)
- `src/lib/platform/executive-twin.server.ts` (agregação de leitura)
- `src/lib/platform/executive-twin.functions.ts` (porta única)
- `src/routes/app.executive.tsx` (Executive OS Dashboard, gate 08)
- `src/lib/platform/__tests__/executive-twin.test.ts`
- `docs/adr/ADR-033-executive-digital-twin.md`
