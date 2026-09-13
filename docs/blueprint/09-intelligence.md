# 09 — Camadas de leitura (Intelligence)

Status: **especificação** — nada implementado. Define o contrato antes de existir código.

## 1. Objetivo

Property Intelligence, Customer Intelligence e Sales Intelligence são
**camadas de leitura** sobre as entidades canônicas. Não são módulos, não têm
tabelas próprias de negócio e não duplicam dado. Se uma camada precisa de um
campo, o campo nasce na entidade — não numa tabela paralela.

## 2. Requisitos funcionais

- **Property Intelligence** — leitura sobre `empreendimentos` e `unidades`:
  estoque disponível, velocidade de venda, faixa de preço praticada, unidades
  paradas.
- **Customer Intelligence** — leitura sobre `leads` (e futuros `clientes`):
  perfil de demanda, origem que mais converte, tempo até o primeiro contato,
  leads sem interação há N dias.
- **Sales Intelligence** — leitura sobre `leads` + `lead_eventos`: conversão
  por estágio, gargalo do funil, motivo de perda, desempenho por responsável.

Toda camada responde três perguntas: **o que aconteceu**, **onde trava**,
**o que fazer agora**. Métrica sem ação recomendada não entra.

## 3. Requisitos não funcionais

- Sob RLS do usuário. Nenhuma agregação por service role.
- Cálculo no servidor (`createServerFn`), nunca no navegador sobre lista bruta.
- Nenhum número mágico na UI: toda métrica tem definição escrita neste capítulo.
- Custo controlado: consulta agregada no banco, não `select *` seguido de reduce.

## 4. Modelo de dados

Nenhuma tabela nova em v1. As camadas leem:

| Camada | Fontes |
|---|---|
| Property | `empreendimentos`, `unidades` |
| Customer | `leads`, `lead_eventos`, `comments` |
| Sales | `leads`, `lead_eventos`, `audit_log` |

Quando o volume exigir, entram **views** ou **materialized views** por
workspace — nunca tabelas de negócio duplicadas, e a materialização precisa
manter o filtro por `workspace_id`.

### Definições canônicas

- **Conversão de estágio** = leads que entraram no estágio seguinte ÷ leads que
  passaram pelo estágio, na janela.
- **Tempo de resposta** = primeiro `lead_evento` de contato − `created_at` do lead.
- **Lead parado** = sem evento há mais de 7 dias e estágio diferente de
  `fechado`/`perdido`.
- **Velocidade de venda** = unidades que mudaram para `vendida` ÷ mês.

## 5. Fluxos

Rota da camada → server function de agregação → resposta já calculada
(números + recomendações) → componente de leitura. O componente não recalcula.

## 6. Wireframes

`/app/inteligencia` com três abas (Portfólio, Clientes, Vendas). Cada aba:
faixa de indicadores, um gráfico, e uma lista de "atenção agora" acionável
que leva ao registro de origem.

## 7. Critérios de aceite

- [ ] Nenhuma tabela nova criada para servir Intelligence.
- [ ] Todo indicador definido na seção 4 antes de aparecer na tela.
- [ ] Agregação executada no banco, com filtro de workspace explícito.
- [ ] Cada bloco leva ao registro de origem em um clique.
- [ ] Workspace sem dado mostra estado vazio explicativo, não zeros.

## 8. Testes

1. Workspace recém-criado → todas as abas em estado vazio, sem erro.
2. Usuário do workspace A não vê número algum do workspace B.
3. Mover lead para `fechado` → conversão do estágio muda na atualização seguinte.
4. Corretor vê os indicadores do workspace sem acessar `audit_log`.

## 9. Prompt Lovable

> Intelligence é leitura. Ao implementar, proibido: criar tabela
> `property_intelligence`/`sales_metrics`, gravar métricas calculadas,
> agregar no cliente sobre lista completa, usar service role. Permitido:
> server function com agregação SQL sob RLS e, se necessário, view por workspace.

## 10. Roadmap

v1 com as três abas em SQL puro; v2 com materialized view e janela comparativa
(mês vs. mês anterior); v3 conectando as recomendações à IA (capítulo 10),
que passa a explicar o número em linguagem natural sobre o mesmo dado.
