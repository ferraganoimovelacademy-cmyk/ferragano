# ADR-021 — Toda previsão deve ser explicável

## Contexto

Até a Sprint 22 a plataforma só afirmava o que havia medido. A Sprint 23
introduz a camada preditiva (Opportunity Score, Risk Detection, Next Best
Action, Forecast). Previsão é, por definição, um número que ainda não
aconteceu — é exatamente onde uma plataforma vira caixa-preta e perde a
confiança que as Sprints 18–22 construíram.

## Decisão

Nenhuma previsão pode ser exposta apenas como número. Toda saída da camada
preditiva usa o envelope `Previsao<T>` de `src/lib/platform/predictive.ts`:

| Campo | Obrigação |
|---|---|
| `valor` | O número/rótulo previsto, ou `null` quando falta evidência. |
| `fatores` | Quais sinais influenciaram, com detalhe numérico e direção. |
| `confianca` (0–100) e `nivel` | Mede a EVIDÊNCIA, nunca o próprio valor. |
| `base` | Origem exata dos dados (RPC/Read Model e janela). |
| `calculadoEm` | Instante do cálculo. |
| `motivoAusencia` | Obrigatório quando `valor` é `null`. |

Regras derivadas:

1. **Ausência de evidência devolve `null` e diz o motivo** — nunca zero.
   Zero é uma medição; ausência é outra coisa.
2. **Base medida antes de base configurada.** O Opportunity Score parte da
   conversão histórica da etapa quando há amostra (>= 20 fechamentos) e só cai
   para a probabilidade configurada declarando essa troca em um fator.
3. **Intervalo, não ponto.** Forecast usa Wilson (proporções) e run-rate com
   intervalo de Poisson (contagens). Número seco é proibido na tela.
4. **Lógica pura e testável.** O cálculo vive em `predictive.ts` (client-safe,
   sem I/O); o servidor (`predictive.functions.ts`) apenas lê a Query Layer.
5. **Sem LLM na previsão.** A camada preditiva é determinística — mesma
   entrada, mesma saída, auditável em teste.
6. **A tela renderiza o envelope**, não o número: `/app/radar` mostra fatores,
   confiança, base e horário em toda previsão.

## Consequências

- Toda nova previsão precisa nascer com fatores; o tipo impede o contrário.
- Modelos futuros (ML) só entram se conseguirem expor fatores e confiança.
- O score usa hoje `updated_at` como proxy de "dias na etapa": fica registrado
  como evolução um evento explícito de mudança de etapa, que daria precisão
  maior sem mudar o contrato.

## Status

Aceito — 2026-07-31.

## Referências

`src/lib/platform/predictive.ts` · `src/lib/platform/predictive.functions.ts` ·
`src/routes/app.radar.tsx` · `src/lib/platform/__tests__/predictive.test.ts` ·
RPCs `read_opportunity_signals`, `read_forecast_base` ·
`docs/blueprint/30-predictive-intelligence.md`
