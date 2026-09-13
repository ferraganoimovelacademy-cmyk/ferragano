# Sprint UI 04.2 — Cury Media Experience

Status: 🟢 CERTIFIED · Backend de negócio congelado (só camada de ativos).

## Objetivo

Tirar a troca de imagens da mão do gestor. A mídia oficial da Cury passa a ser
um ativo governado: importada em lote, organizada automaticamente, com SEO
gerado, Health Score e propagação para todo o site.

## GATE 01 — Importador oficial

`src/components/admin/MediaImportWizard.tsx`. Aceita, por empreendimento e por
tipo (imagem, planta, vídeo, tour, PDF, outro):

- upload de arquivos (até 25 MB cada) para o bucket `cury-media`;
- URLs oficiais em lote (uma por linha).

Ao final, chama `importarMidiaLote` e em seguida `sincronizarVitrine`.

## GATE 02 — Organização automática

Convenção em `src/lib/platform/media.ts` (`caminhoMidia`):

```
<workspace_id>/cury/<slug-do-empreendimento>/<tipo>/<uuid>-<arquivo>
```

## GATE 03 — Otimização

`src/lib/site/imagem.ts` gera `srcset`/`sizes` com o transformador de imagem do
storage (WebP/AVIF negociados pelo navegador), `loading=lazy`, `decoding=async`
e `fetchPriority=high` só no ativo above-the-fold. `MidiaOficial` aplica
placeholder desfocado e fade-in. Dimensões são medidas no cliente no upload e
gravadas em `largura`/`altura` — evitam CLS.

## GATE 04 — SEO das imagens

`altAutomatico` e `tituloAutomatico` preenchem `alt` e `titulo_seo` quando a
equipe não informa. A edição fina fica em `atualizarMidia`. Capa alimenta
Open Graph e JSON-LD da página do empreendimento.

## GATE 05 — Experience

`sincronizarVitrine` recalcula `empreendimentos.capa_url` e `galeria` a partir
dos ativos publicados. Como hero, cards, comparador, mapa, Open Graph, JSON-LD,
compartilhamento e `sitemap.xml` leem essas duas colunas, a troca de capa se
propaga sem retrabalho. Adicionado `/sitemap-imagens.xml`.

## GATE 06 — Dashboard de ativos

`/app/midia` — Biblioteca de Mídia Cury. Filtros: todos, publicados, não
publicados, sem capa, sem galeria, SEO pendente, com vídeo, com planta, com
PDF. Indicadores: arquivos, peso total, sem capa, SEO pendente, Health Score
médio.

## GATE 07 — Qualidade (Health Score)

`avaliarMidia` (determinístico): capa 25 · galeria ≥ 4 imagens 25 · plantas 15
· vídeo 10 · tour 10 · PDF 5 · SEO completo 10. Retorna checklist, score,
estrelas e a lista de pendências em linguagem de negócio.

## GATE 08 — Futuro (DAM)

O modelo guarda `bucket`, `path`, `url`, `mime`, `bytes`, `largura`, `altura` e
`verificado_em`. Um sincronizador futuro (API oficial/DAM) só precisa fazer
upsert por `path`/`url` e chamar `sincronizarVitrine` — nada na UI muda.

## Observação operacional

A política do workspace bloqueia buckets públicos. Enquanto `cury-media`
permanecer privado, os arquivos enviados não são servidos por URL pública: use
URLs oficiais da Cury ou libere buckets públicos em Configurações → Privacidade
e Segurança.

## Skills em Execução

🖼 Media Asset Architect · 🏗 Property Experience Designer · 🎨 Lead Product
Designer · 🖥 Frontend Architect · 📈 SEO Specialist · ⚡ Performance Engineer ·
🧪 QA Frontend · 📚 Documentation Writer
