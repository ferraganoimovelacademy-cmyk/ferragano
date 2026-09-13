# ADR-006 — Hierarquia do Property Domain

## Contexto

O portfólio imobiliário precisa sustentar estoque, precificação histórica e
conhecimento comercial sem duplicar o empreendimento a cada nova fase
lançada pela construtora, e sem permitir que preço ou status de unidade
mude "em silêncio" — mudança de preço e de estoque são eventos de negócio
com consequência (comissão, disponibilidade, histórico de negociação).

## Decisão

A hierarquia é física e comercial, nunca conversacional:

```text
Developer (developers) → Project (empreendimentos) → Release (releases, fases)
  → Tower (towers) → Floor (derivado de unidades.andar, sem tabela própria)
  → Unit (unidades) → Price History (unit_price_history)
```

`empreendimentos` permanece o nome da tabela de Project — renomear custaria
mais do que entrega; `developer_id` liga o projeto à construtora.

Preço de unidade só muda por `changeUnitPrice`, que em uma operação: atualiza
`unidades.preco`, grava `unit_price_history` (anterior, novo, variação %,
motivo, autor) e publica `UnitPriceChanged`. A tabela de histórico só aceita
`SELECT` e `INSERT` — sem `UPDATE` nem `DELETE`.

Status de unidade (`disponivel → reservada → vendida → bloqueada →
em_analise`) só muda por `moveUnitInventory`, que audita e publica
`UnitStatusChanged`. A UI nunca escreve direto na coluna `status`.

`property_knowledge` e `property_media`, quando marcados `publico`, são
legíveis por `anon` **apenas** quando o empreendimento também é público —
é o que alimenta a vitrine pública sem expor material interno.

## Alternativas descartadas

- **Nova tabela de empreendimento a cada fase lançada**: descartado —
  duplicaria conhecimento comercial e mídia já associados ao projeto;
  `releases` resolve fases sem duplicar o projeto.
- **UPDATE direto em `unidades.preco` e `unidades.status` pela UI**:
  descartado — perde histórico auditável e trilha de motivo, e impede
  publicar evento de domínio de forma confiável (a escrita direta não
  garante que o evento seja publicado).
- **Renomear `empreendimentos` para `projects`**: descartado nesta fase —
  custo de migração maior que o ganho de nomenclatura; `developer_id` já
  resolve a relação sem renomear.

## Consequências

- Toda integração futura que precise reservar ou vender uma unidade (Sales
  Context) deve chamar `moveUnitInventory`, nunca escrever a coluna
  diretamente — inclusive quando o gatilho vier de outro Bounded Context.
- `score_liquidez` é heurística calculada em `property.ts`, ainda não
  persistida em lote (pendente).
- O worker que processa o outbox gerado pelos eventos deste domínio só
  passou a existir na Sprint 09 (ver ADR-003); antes disso os eventos eram
  publicados mas o efeito colateral não era consumido.

## Status

Aceito — 2026-07-31.

## Referências

- `docs/blueprint/15-property-domain.md`
- Tabelas: `developers`, `empreendimentos`, `releases`, `towers`, `unidades`,
  `unit_price_history`, `property_knowledge`, `property_media`
- Funções: `changeUnitPrice`, `moveUnitInventory`
