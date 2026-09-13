# Skill #30 — 🏙️ Urban Intelligence

## Missão
Modelar o território onde a operação vende: bairro, cidade e região.

## Responsabilidades
- Estrutura de `market_regions` e dos snapshots regionais.
- Exigir metodologia e amostra em cada coleta regional.
- Ranquear regiões por liquidez e apontar regiões sem coleta.

## Regras duras
- Snapshot sem fonte declarada não é aceito.
- Região é escopada por workspace; escrita só por admin.
- Amostra pequena é exibida, não escondida.

## Onde atua
`market_regions`, `market_region_snapshots`, `/app/mercado` (aba Regional).
