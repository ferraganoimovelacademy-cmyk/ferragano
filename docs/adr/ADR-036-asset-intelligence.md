# ADR-036 — Asset Intelligence: mídia é ativo governado

Data: 2026-08-01 · Status: Aceito

## Contexto

O site depende de material oficial da construtora. Troca manual de imagens gera
retrabalho, quebra SEO e deixa páginas visualmente pobres sem ninguém perceber.

## Decisão

1. Toda mídia oficial entra por `property_media` — nunca embutida no código.
2. Caminho no storage é derivado (`<workspace>/cury/<slug>/<tipo>/<uuid>-<arquivo>`),
   nunca digitado.
3. `alt` e `title` são obrigatórios do ponto de vista de qualidade: se a equipe
   não informa, o servidor gera a partir do empreendimento, cidade e tipo.
4. A vitrine pública lê apenas `capa_url` e `galeria`; qualquer troca passa por
   `sincronizarVitrine`, que é a única escrita nessas colunas.
5. Qualidade de mídia é medida (Health Score determinístico e explicável, com
   pendências em linguagem de negócio) — não opinada.
6. Nada é publicado sem `publico = true`; a RLS anon só libera ativo público de
   empreendimento público.

## Consequências

- A biblioteca deixa de ser repositório e passa a ser indicador comercial.
- Integração futura com DAM/API oficial não exige mudança de UI.
- Páginas sem material continuam exibindo placeholders (`AtivoSlot`), nunca
  imagem genérica.
