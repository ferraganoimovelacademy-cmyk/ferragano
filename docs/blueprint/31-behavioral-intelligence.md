# 31 — Behavioral Intelligence (Sprint 24)

Contexto `Behavior`. Responde uma pergunta que o CRM não respondia: **como esta
pessoa se comporta e, portanto, como abordá-la.**

## Arquitetura

```text
activities / visits / proposals / sales / opportunities / qualifications
                         │
                read_person_behavior   (Query Layer, security definer)
                         │
                 behavior.functions.ts (única porta, sem cálculo)
                         │
                    behavior.ts        (camada pura, testável)
                         │
                /app/comportamento     (apresentação)
```

Nenhuma tabela nova. Nenhum job. Nenhum custo de IA.

## Gates

| Gate | Traço | Base medida | Amostra mínima |
| --- | --- | --- | --- |
| 01 | Canal favorito | `activities.tipo` | 5 interações |
| 01b | Melhor horário e dia | `activities.ocorreu_em` (hora local) | 6 interações |
| 02 | Tempo de resposta | `proposals.enviada_em → respondida_em` | 2 respostas |
| 03 | Velocidade de decisão | criação → proposta enviada → assinatura | 1 proposta ou venda |
| 04 | Sensibilidade a preço | `sales.valor_final ÷ proposals.valor`, versões, recusas | 1 evidência |
| 05 | Perfil de compra | `person_qualifications.perfil` × recorrência | qualificação ou 1 venda |
| 06 | Objeções | `opportunities.perdido_motivo` | 1 motivo preenchido |
| 07 | Valor realizado e propensão a indicar | `sales`, `person_relationships` | 1 venda ou indicação |
| 08 | Engajamento (0–100) | interações 90d, visitas, último contato | 1 interação |

## Regras de honestidade (ADR-022)

- Sem amostra, o traço devolve `null` + `motivoAusencia`.
- Ausência de registro nunca vira "cliente frio".
- Tempo de resposta é medido em proposta; o ritmo de interação é rotulado como
  proxy.
- `cobertura` (0–100) mostra quanto do perfil pôde ser medido — é o indicador de
  qualidade de registro do workspace.

## Segurança

`read_person_behavior` é `security definer` com verificação interna:
`is_workspace_member` obrigatório; gestão vê o workspace inteiro, corretor vê
apenas as pessoas sob sua responsabilidade. `EXECUTE` revogado de `anon`.

## Saída

`/app/comportamento`: cobertura da carteira, canal predominante, tempo médio de
resposta, valor realizado, distribuição de engajamento, melhor faixa de contato,
objeções mais registradas e, por pessoa, o bloco "Como abordar" seguido dos dez
traços com fatores, confiança e base.
