# 29 — Ferragano Advisor / Advisory (Sprint 22)

A plataforma já media, qualificava e priorizava. Aqui ela **conversa**: entrega
ao gestor o que importa, em linguagem executiva, sempre com o número que
sustenta a frase.

Bounded context novo: **Advisory** — comunicação, não medição.

## Camadas

| Camada | Arquivo | Papel |
| --- | --- | --- |
| Lógica pura | `src/lib/platform/advisory.ts` | briefing, semana, NLQ, timeline, confiança |
| Porta de leitura | `src/lib/platform/advisory.functions.ts` | `getAdvisoryContext` — só Query Layer |
| Interface | `src/components/platform/AdvisoryPanel.tsx` | montado em `/app/advisor` |

## Gates

| Gate | Entrega | Função |
| --- | --- | --- |
| 01 | Executive Briefing | `briefingExecutivo` — saudação, números medidos, atenções, próximo passo |
| 02 | Weekly Intelligence | `inteligenciaSemanal` — gargalos, oportunidades, riscos, melhores corretores, empreendimentos em alta, automações críticas |
| 03 | Natural Language Query | `classificarPergunta` + `responderPergunta` — 9 intenções determinísticas |
| 04 | Decision Timeline | `decisionTimeline` — gerada → vista → aceita → implementada → avaliada |
| 05 | Advisor Confidence | `advisorConfidence` — 0..100, níveis inicial/moderada/robusta |

## Fonte de cada afirmação

- Funil, ciclo, conversão, estoque: Read Models 360 (`executive_360`,
  `sales_360`, `marketing_360`).
- Giro por empreendimento (vendas 30/90d, visitas, pipeline): `property_360`.
- Falha, ROI e saúde de regra: `automation_intelligence` (ADR-017).
- Confiança estatística por regra: ADR-018.
- Fila priorizada e desfecho aprendido: memória da Sprint 21 (ADR-019).

## Perguntas que o Advisor responde hoje

conversão · follow-up perdido · melhor corretor · corretor em risco ·
estoque/VGV · empreendimento em alta ou encalhado · regras prejudicando vendas ·
tempo economizado · o que fazer primeiro. Fora dessa lista, ele declara que não tem evidência — por decisão de
projeto (ADR-020), não por limitação temporária.

## Limites honestos

- Sem IA generativa nestes cinco gates: nenhuma frase pode existir sem número.
- A "semana" usa a janela materializada disponível; comparação semana × semana
  anterior entra quando houver 14 dias de série.
- Correlação continua não sendo causa (ADR-018).

## Qualidade

`src/lib/platform/__tests__/advisory.test.ts` — 27 testes cobrindo os cinco
gates, incluindo ausência de dados, precisão baixa do motor e pergunta fora de
escopo.
