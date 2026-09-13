# 10 — Knowledge Layer (Ferragano IA)

Status: **especificação** — nada implementado.

## 1. Objetivo

Dar à IA memória do negócio **isolada por workspace**. A IA responde sobre o
que aquele workspace sabe: portfólio, políticas comerciais, materiais de
treinamento, histórico de negociação. Nunca sobre dado de outro workspace.

## 2. Requisitos funcionais

- Ingestão de conteúdo: documento anexado (`files`), texto colado, e registros
  canônicos (empreendimento, unidade, lead).
- Fragmentação em trechos e geração de embeddings.
- Busca semântica por workspace, com filtro adicional por `entity`.
- Resposta sempre com **fonte citada** (registro ou arquivo de origem).
- Reindexação quando a fonte muda; remoção quando a fonte é apagada.

## 3. Requisitos não funcionais

- `workspace_id` obrigatório em toda linha e em **toda** consulta vetorial.
  Vazamento entre workspaces é falha crítica, não bug.
- RLS ativa na tabela de conhecimento; escrita só por servidor.
- Chave de IA nunca no cliente — chamada via server function pelo gateway.
- Custo e latência monitorados; ingestão é assíncrona, resposta é síncrona.
- Conteúdo sensível (dado pessoal de lead) só entra no índice com decisão
  explícita registrada aqui — em v1, **não entra**.

## 4. Modelo de dados (proposto)

| Tabela | Papel |
|---|---|
| `knowledge_sources` | fonte: workspace, tipo (arquivo/texto/registro), `entity`+`entity_id`, status de indexação |
| `knowledge_chunks` | trecho: workspace, `source_id`, ordem, texto, `embedding` (pgvector), tokens |
| `ai_conversations` | conversa por usuário e workspace |
| `ai_messages` | turno: papel, conteúdo, fontes citadas, custo |

Índice vetorial por workspace. Acesso: membro lê o próprio conhecimento do
workspace; ingestão e escrita exclusivas do servidor; admin remove fonte.

## 5. Fluxos

**Ingestão:** fonte registrada → status `pendente` → server function extrai
texto, fragmenta, gera embeddings → status `indexado` (ou `erro` com motivo).

**Pergunta:** pergunta → embedding → busca vetorial filtrada por
`workspace_id` (+ `entity` quando houver contexto) → prompt com os trechos →
resposta com citações → turno gravado em `ai_messages`.

Sem trecho relevante: a IA diz que não sabe. Proibido responder por memória
do modelo sobre fato do negócio.

## 6. Wireframes

`/app/ia` — conversa com histórico lateral e citações clicáveis.
`/app/ia/conhecimento` — fontes indexadas, status e reindexação (admin).
Widget de contexto: perguntar sobre o registro aberto.

## 7. Critérios de aceite

- [ ] Toda consulta vetorial carrega `workspace_id` no `WHERE`.
- [ ] Nenhuma resposta sem citação de fonte.
- [ ] Chave de IA só no servidor.
- [ ] Falha de indexação visível e reprocessável, nunca silenciosa.
- [ ] Remover a fonte remove os trechos.
- [ ] Dado pessoal de lead fora do índice em v1.

## 8. Testes

1. Indexar documento no workspace A → workspace B não o recupera em nenhuma pergunta.
2. Pergunta sem base no índice → "não sei", sem invenção.
3. Apagar arquivo → trechos somem e deixam de ser citados.
4. Arquivo corrompido → fonte em `erro` com mensagem, sem derrubar a fila.
5. Inspecionar o bundle do navegador → nenhuma chave de IA.

## 9. Prompt Lovable

> Ao implementar o Knowledge Layer: pgvector, filtro por `workspace_id` em
> toda busca, ingestão e chamada de modelo apenas em server function, resposta
> com citação obrigatória. Proibido: índice global, embedding gerado no
> cliente, chave de IA no front, indexar dado pessoal de lead em v1.

## 10. Roadmap

v1: ingestão de arquivos e texto + chat com citação.
v2: registros canônicos indexados e pergunta contextual no registro aberto.
v3: IA propõe ação (criar tarefa, mover estágio) sempre com confirmação humana.
