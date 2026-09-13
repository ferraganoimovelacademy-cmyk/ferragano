# 19 — Ferragano Advisor (Fase 2)

## Objetivo

Transformar os Read Models 360 em conselho acionável para a gestão comercial,
sem que a IA participe do cálculo.

## Arquitetura

```text
Read Models 360 (RLS) → derivarSinais() → montarPromptAdvisor() → Lovable AI → briefing
```

- `src/lib/platform/advisor.ts` (puro): tipos do snapshot, `ADVISOR_LIMITES`,
  `derivarSinais`, `classificarPrioridade`, `ADVISOR_SYSTEM_PROMPT` e
  `montarPromptAdvisor`. Todos os números e severidades nascem aqui — 12 testes.
- `src/lib/platform/advisor.functions.ts`: `getAdvisorBriefing` com
  `requireSupabaseAuth`, lendo `read_executive_360`, `read_sales_360` e
  `read_marketing_360` sob RLS. Chama a Lovable AI com `Output.object` validado
  por Zod e degrada para "só sinais" em 429, 402 ou falha do gateway.
- `src/lib/ai-gateway.server.ts`: provider único; `LOVABLE_API_KEY` é lida dentro
  do handler e nunca cruza para o cliente.
- `src/routes/app.advisor.tsx`: rota de gestão (`isGestaoRole`), pergunta opcional,
  briefing com recomendações priorizadas, riscos e o bloco de sinais medidos.

## Sinais medidos

| Código | Área | Evidência |
| --- | --- | --- |
| `conversao` | vendas | conversão do funil, ganhas no mês, novas em 30 dias |
| `ciclo` | vendas | tempo médio entre criação e ganho |
| `forecast` | vendas | receita ponderada sobre pipeline aberto |
| `liquidez` | estoque | unidades disponíveis sobre total |
| `followup` | operação | follow-up vencido, sem próxima ação, SLA estourado |
| `inatividade` | operação | corretores sem atividade registrada |
| `origem` | marketing | melhor e pior origem com volume mínimo |

## Regras invioláveis

1. A IA nunca calcula: recebe evidência fechada e só interpreta.
2. Toda recomendação cita o sinal que a sustenta.
3. Sem chave ou com gateway fora, a tela ainda entrega os sinais medidos.
4. Nenhum dado de outro workspace entra no prompt: a leitura é RLS pura.