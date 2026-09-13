# 32 — Market Intelligence (Sprint 25)

**Fase 2 — Market Intelligence · Bounded context novo: `Market`**
Princípio de governo: [ADR-023](../adr/ADR-023-market-provenance.md) — dado
externo nunca se mistura ao dado interno.

## Por que existe

Até a Sprint 24 o Ferragano One só sabia o que acontecia **dentro** da
operação: pipeline, comportamento, previsão. Faltava o contexto que explica
parte do resultado — juros, inflação, custo de obra, liquidez do bairro.

O contexto `Market` responde a duas perguntas:

1. **Radar Econômico** — o ambiente macro está ajudando ou atrapalhando a venda?
2. **Radar Regional** — como está o mercado onde a empresa opera?

## Modelo de dados

| Tabela | Escopo | Escrita |
|---|---|---|
| `market_indicator_series` | plataforma (nacional) | coletor |
| `market_indicator_values` | plataforma (nacional) | coletor |
| `market_regions` | workspace | admin do workspace |
| `market_region_snapshots` | workspace | admin do workspace |

Chave de integridade: `(series_id, referencia, versao)` e
`(region_id, referencia, versao)`. Revisão da fonte entra como nova versão;
a leitura sempre usa a maior versão de cada competência.

## Coleta

`src/lib/platform/market.server.ts` lê o **SGS do Banco Central**
(`api.bcb.gov.br`) para 8 séries:

| Código | Série SGS | Leitura |
|---|---|---|
| `selic_meta` | 432 | ambiente de crédito |
| `selic_12m` | 4189 | ambiente de crédito |
| `cdi` | 12 | custo de capital |
| `ipca` | 433 | inflação |
| `igpm` | 189 | correção contratual |
| `incc` | 192 | custo de obra |
| `tr` | 226 | correção de saldo |
| `financiamento_imob_pf` | 25497 | juros ao comprador |

Regras do coletor:

- fonte fora do ar → nada é gravado e a falha é reportada por série;
- valor idêntico ao já coletado → ignorado (idempotência);
- valor diferente para a mesma competência → nova `versao` com observação;
- competência repetida no mesmo payload (caso da TR) → a última leitura vence,
  garantindo uma linha por competência por coleta.

Agendamento: `pg_cron` `market-collector-diario`, 09:00, chamando
`/api/public/hooks/market-collector`.

## Camada de leitura

`src/lib/platform/market.ts` é puro e determinístico:

- `lerIndicador` — último valor, variação em p.p., acumulado 12m (só com 12
  competências), frescor e proveniência;
- `lerAmbienteCredito` — Selic ≥ 13 restritivo · ≥ 10 apertado · ≥ 8 neutro ·
  abaixo estimulante; juros PF são anualizados de forma composta;
- `lerCustoObra` — INCC 12m (ou proxy declarado do mês × 12);
- `lerCorrecaoContratual` — maior índice entre IGP-M, IPCA e TR;
- `analisarRegiao` — liquidez 0-100 pela média dos sinais coletados (tempo de
  venda, absorção, vacância) e aquecimento em 4 faixas;
- `montarRadarEconomico` / `montarRadarRegional` — cobertura, séries obsoletas,
  destaques e alertas de lacuna.

Nenhuma função devolve `0` para dado ausente: devolve `null` +
`motivoAusencia`.

## Query Layer

`src/lib/platform/market.functions.ts`:

| Server function | Quem pode | O que faz |
|---|---|---|
| `getMarketRadar` | membro | radar econômico + regional |
| `salvarRegiao` | admin | cria/edita região do workspace |
| `salvarColetaRegional` | admin | grava snapshot com fonte e metodologia |
| `coletarIndicadoresAgora` | admin | dispara coleta manual |

## Interface

`/app/mercado` — abas Econômico e Regional, com selo de proveniência e frescor
em cada leitura, medidor de cobertura e formulários de coleta regional
visíveis apenas para admin.

## Skills em Execução

| Skill | Papel na entrega |
|---|---|
| 📉 Market Analyst (#28) | leituras de mercado e faixas de liquidez |
| 🏦 Economic Analyst (#29) | escolha das séries e limiares macro |
| 🏙️ Urban Intelligence (#30) | modelo de região e snapshot regional |
| Backend | schema, RLS, coletor idempotente |
| Security Officer | isolamento por workspace e escrita restrita |
| QA | 30 testes de unidade + isolamento anônimo |
| Documentation | ADR-023 e este blueprint |

## Estado

🟢 **CERTIFIED** — 8 séries coletadas do BCB, 542 testes passando.

## Sprint 25.1 — Market Context Engine e Economic Impact Engine

Coletar indicador não é suficiente: o gestor decide com consequência, não com
número cru. `src/lib/platform/market-context.ts` traduz cada leitura em impacto
de negócio por público, sob [ADR-024](../adr/ADR-024-market-context-interpretation.md).

| Entrada | Saída de negócio |
|---|---|
| Selic / CDI ≥ 10% a.a. | crédito mais caro · investidor conservador · condição pesa mais que preço |
| Juros PF ≥ 12% a.a. | parcela pressionada · trabalhar pré-aprovação antes da visita |
| INCC 12m ≥ 6% | custo de obra subindo · revisar tabela de lançamento · estoque pronto valoriza |
| IGP-M / IPCA / TR 12m ≥ 5% | saldo devedor corrigido acima · indexador entra em negociação |

Regras duras da camada:

- cada impacto declara a base: `regra_negocio` (limiar publicado) ou
  `dado_interno` (só se confirma contra o ciclo medido do workspace);
- efeito em velocidade de venda é sempre `dado_interno` — dado externo não
  prova movimento do funil;
- indicador sem coleta, ou sem regra publicada, não gera impacto: devolve motivo;
- confiança sai do frescor e do tamanho da série (alta / média / baixa / sem base);
- narrativa para o Advisor só é emitida quando o indicador se moveu.

Interface: `/app/mercado` ganha a aba **Impacto no negócio** — frases prontas
para o Advisor e as consequências por público, cada uma com regra, base,
confiança e proveniência visíveis.

### Skills em Execução

| Skill | Papel |
|---|---|
| 🏦 Economic Analyst (#29) | limiares e anualização composta |
| 📉 Market Analyst (#28) | tradução do indicador em consequência comercial |
| 🧭 Executive Advisor (#25) | forma da narrativa e vocabulário do gestor |
| QA | 22 testes de regra e ausência de dado |
| Documentation | ADR-024 e este blueprint |
