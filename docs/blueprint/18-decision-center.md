# 18 — Decision Center (Sprint 10)

O objetivo do Decision Center não é mostrar dado: é **apoiar decisão**. Ele fecha
a cadeia da plataforma:

```text
Write Model → Domain Events → Read Models → Decision Engine → Dashboards
```

## 1. Separação Write / Read

Tabelas transacionais (`people`, `opportunities`, `sales`, `unidades`) continuam
sendo a única fonte de verdade e o único lugar onde se escreve. A leitura de
painel passou a viver em **Read Models** — views materializadas recalculadas por
rotina, nunca atualizadas à mão:

| Read Model | Chave | Pergunta que responde |
| --- | --- | --- |
| `customer_360` | workspace + pessoa | Quem merece atenção agora? Score, jornada, sinais, relacionamento, qualificação. |
| `property_360` | workspace + empreendimento | O produto gira? Liquidez, velocidade de venda, meses de estoque, perfil de comprador. |
| `sales_360` | workspace + responsável | Onde está o gargalo? SLA estourado, follow-up vencido, tempo médio, corretor sem atividade. |
| `executive_360` | workspace | Vamos bater a meta? Pipeline, receita prevista, realizado, ciclo, VGV disponível. |
| `marketing_360` | workspace + origem | De onde vem venda, não só lead? Conversão, ticket e ciclo por canal. |

Classificação de etapa é única: `stage_kind(stage_tipo, lead_estagio)` usa o tipo
do estágio do funil quando existe e cai no enum legado da oportunidade quando
não. Assim funil customizado e dado antigo somam no mesmo painel.

## 2. Recálculo

`refresh_read_models()` roda `REFRESH MATERIALIZED VIEW CONCURRENTLY` nas cinco
views — por isso cada uma tem índice único. Agendado no `pg_cron` a cada 10
minutos (job `refresh-read-models`) e executável apenas por `service_role`.

Consequência aceita: os painéis têm até 10 minutos de defasagem. Decisão tática
de minuto a minuto continua nas telas operacionais (Pipeline, Agenda, Tarefas).

## 3. Query Layer (InsightsService)

View materializada não aceita RLS. Então nenhuma delas está exposta na API:
`anon` e `authenticated` não têm `SELECT`. Todo acesso passa por funções
`security definer` que validam antes de devolver linha:

| Função | Quem pode ler |
| --- | --- |
| `read_customer_360(ws, person?, limit)` | qualquer membro do workspace |
| `read_property_360(ws, empreendimento?)` | qualquer membro do workspace |
| `read_sales_360(ws)` | proprietário, administrador, diretor, gerente |
| `read_executive_360(ws)` | proprietário, administrador |
| `read_marketing_360(ws)` | proprietário, administrador |

No front, `src/lib/platform/insights.functions.ts` é a única porta: server
functions autenticadas que chamam essas RPCs e devolvem o painel já normalizado
(camelCase, `numeric` convertido para número). **Tela nenhuma consulta tabela
transacional para montar indicador.**

## 4. Tela

`/app/decisoes` — abas por Read Model, com as de gestão e executivo escondidas
para quem não tem papel. Cada linha carrega semáforo de atenção (SLA, follow-up
vencido, dias sem contato, corretor parado) em vez de só número.

## 5. Limites conhecidos

- **CAC e ROI** ficam fora até existir lançamento de custo de mídia por canal.
  Estimar investimento seria inventar número em painel de decisão.
- `sales_360` agrupa por responsável; visão por equipe entra quando a hierarquia
  de `equipes` for usada como dimensão.
- Linhas sem responsável caem no agrupador nulo (`00000000-…`), rotulado como
  "Sem responsável" — é gargalo de atribuição, não erro de dado.

## 6. Critérios de aceite

- [x] Cinco Read Models criados com índice único e refresh concorrente.
- [x] Views fora da API; acesso só por função com verificação de papel.
- [x] Query Layer única (`insights.functions.ts`) consumida pela tela.
- [x] Cron de recálculo agendado.
- [ ] Painel validado com volume real de dados (base atual está vazia).
