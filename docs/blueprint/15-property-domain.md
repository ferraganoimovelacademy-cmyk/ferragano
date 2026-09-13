# Capítulo 15 — Property Domain

> Sprint 07. Segundo Bounded Context de negócio. Aqui não existe pessoa nem
> oportunidade: existe **imóvel**. A hierarquia é física e comercial, nunca
> conversacional.

## 1. Objetivo

Modelar o portfólio imobiliário com profundidade suficiente para sustentar
estoque, precificação histórica, conhecimento comercial e, depois, a IA —
sem duplicar empreendimento a cada nova fase lançada pela construtora.

## 2. Modelo

```text
Developer (developers)
  ↓
Project (empreendimentos)
  ↓
Release (releases)        ← fases: Fase 1, Fase 2, Fase 3
  ↓
Tower (towers)
  ↓
Floor (derivado de unidades.andar — não tem tabela)
  ↓
Unit (unidades)
  ↓
Price History (unit_price_history)
```

Complementos do projeto: `property_knowledge` (FAQ, script, diferencial,
objeção, concorrente, bairro, nota) e `property_media` (imagem, vídeo, PDF,
tour, planta).

`empreendimentos` permanece como a tabela do Project — renomear custaria mais
do que entrega. `developer_id` liga o projeto à construtora.

## 3. Unit

- **Físico**: `tower_id`, `andar`, `final`, `area_privativa`, `area_total`,
  `dormitorios`, `suites`, `vagas`, `varanda`, `deposito`.
- **Comercial**: `preco`, `comissao_percentual`, `status`, `campanha`,
  `release_id` e histórico em `unit_price_history`.
- **Inteligente**: `perfil_ideal`, `argumentos` (jsonb), `objecoes` (jsonb),
  `score_liquidez`.

## 4. Price History

Preço nunca é sobrescrito em silêncio. `changeUnitPrice` executa em conjunto:
atualiza `unidades.preco`, grava `unit_price_history` (anterior, novo,
variação %, motivo, autor) e publica `UnitPriceChanged`. A tabela só aceita
leitura e inserção — não há UPDATE nem DELETE.

## 5. Inventory Engine

Estados: `disponivel → reservada → vendida → bloqueada → em_analise`.

Transição só por `moveUnitInventory`, que audita e publica
`UnitStatusChanged`. A UI nunca escreve direto na coluna `status`; qualquer
integração futura (reserva do Sales Context) chama a mesma função com
`correlationId` do fluxo.

## 6. Eventos

`DeveloperCreated`, `ProjectLaunched`, `ReleaseCreated`,
`ReleaseStatusChanged`, `TowerCreated`, `UnitPriceChanged`,
`UnitStatusChanged`, `PropertyKnowledgeAdded`, `PropertyMediaAdded`.

Todos passam por `publishEvent` (`src/lib/platform/events.server.ts`) e
aparecem na Timeline Universal sem código adicional.

## 7. Domain Events versionados

`domain_events` ganhou `event_version`, `schema_version`, `correlation_id` e
`causation_id`. Consumidores antigos continuam válidos quando o payload
evoluir; `correlation_id` amarra a jornada inteira (oportunidade → reserva →
mudança de estoque) e `causation_id` aponta o evento pai.

## 8. Outbox Pattern

`outbox_events` (canal, destino, payload, status, tentativas, `disponivel_em`,
`ultimo_erro`). O evento de domínio e o efeito colateral são gravados juntos;
um worker processa depois. Escrita restrita ao `service_role`; leitura apenas
para administradores do workspace. Nenhuma automação se perde por falha de
serviço externo.

## 9. Segurança

RLS por `workspace_id` em todas as tabelas via `is_workspace_member`.
Remoção de construtora, fase, torre, conhecimento e mídia exige
`is_workspace_admin`. `property_knowledge` e `property_media` marcados como
`publico` são legíveis por `anon` **apenas** quando o empreendimento também é
público — é o que alimenta a vitrine sem expor material interno.

## 10. Testes de aceitação

1. Criar construtora e vincular a um empreendimento existente.
2. Criar Fase 1 e Fase 2 no mesmo empreendimento sem duplicá-lo.
3. Mudar o status de uma fase e ver o evento na Timeline.
4. Criar torre vinculada a uma fase.
5. Alterar o preço de uma unidade com motivo e conferir o histórico.
6. Reverter o preço e verificar duas linhas no histórico com variação inversa.
7. Mudar o estoque de uma unidade e conferir auditoria + evento.
8. Cadastrar FAQ público e confirmar leitura anônima só com projeto público.
9. Cadastrar material privado e confirmar que `anon` não lê.
10. Confirmar que `outbox_events` não é gravável por usuário autenticado.

## 11. Dívida consciente

- Worker do outbox ainda não existe (chega na Sprint 10 — Automation Engine).
- `score_liquidez` é calculado por heurística em `property.ts`, ainda não
  persistido em lote.
- Reserva do Sales Context ainda não chama `moveUnitInventory`
  automaticamente.
