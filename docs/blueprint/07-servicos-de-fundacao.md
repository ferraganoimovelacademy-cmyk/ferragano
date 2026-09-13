# 07 — Serviços de fundação (Gate 03.5)

Status: **v1** — motores de Tags, Comentários, Arquivos e Notificações
implementados. Timeline e Busca global pendentes.

## 1. Objetivo

Nenhum módulo de negócio reimplementa etiquetas, comentários, anexos ou
notificações. Cada capacidade transversal existe **uma vez**, é polimórfica
(`entity` + `entity_id`) e vive isolada por workspace via RLS.

## 2. Contrato polimórfico

Toda tabela de serviço carrega `workspace_id`, `entity` (slug em minúsculas,
ex.: `lead`, `imovel`, `cliente`, `contrato`) e `entity_id` (uuid).
Não há foreign key para a entidade alvo — é o preço de ser genérico. A
integridade é responsabilidade da camada de serviço.

## 3. Motor de tags

- `tags` — catálogo por workspace. `slug` único por workspace, `cor` (token do
  design system), `escopo` opcional para restringir sugestões a um domínio.
- `taggings` — vínculo tag ↔ registro, único por `(tag_id, entity, entity_id)`.

Acesso: membro lê e cria; membro remove o vínculo que criou; admin altera e
remove tags do catálogo e qualquer vínculo.

Server functions: `src/lib/platform/tags.functions.ts`
(`listTags`, `upsertTag`, `listEntityTags`, `attachTag`, `detachTag`).
UI: `<EntityTags workspaceId entity entityId escopo? readOnly? />`.

`upsertTag` é idempotente por slug — criar "Investidor" duas vezes devolve a
mesma tag. `attachTag` engole `23505` (já vinculada) em vez de errar.

## 4. Motor de comentários

- `comments` — thread por registro, com `parent_id` para respostas,
  `editado_em`, `removido_em` (exclusão suave) e corpo de 1 a 5000 caracteres.

Acesso: membro lê e comenta; só o autor edita; autor ou admin remove.
Autoria é imposta pela policy (`autor_id = auth.uid()`), não pelo cliente.

Server functions: `src/lib/platform/comments.functions.ts`
(`listComments`, `addComment`, `editComment`, `removeComment`).
UI: `<EntityComments workspaceId entity entityId titulo? />`.

Exclusão suave preserva a coerência da thread; o admin cai na policy de
`DELETE` (exclusão definitiva) quando não é o autor.

## 5. Motor de arquivos

- Bucket **privado** `workspace-files`. Caminho:
  `<workspace_id>/<entity>/<entity_id|geral>/<uuid>-<arquivo>`.
  A policy de `storage.objects` valida a primeira pasta contra
  `is_workspace_member` — quem não é membro não lê nem grava.
- `files` — catálogo (nome original, mime, tamanho, `path` único, autor).
  O upload vai direto do navegador para o storage; o registro no catálogo
  passa por server function que rejeita `path` fora do workspace declarado.
- Download **sempre** por URL assinada de 5 minutos. Nunca há link público.
- Limite de 25 MB por arquivo. Remoção: autor ou admin, apagando linha e objeto.

Server functions: `src/lib/platform/files.functions.ts`
(`listFiles`, `registerFile`, `getFileUrl`, `deleteFile`).
UI: `<EntityFiles workspaceId entity entityId? readOnly? />`.

## 6. Motor de notificações

- `notifications` — caixa por usuário: `tipo` (info/sucesso/alerta/erro),
  `titulo`, `mensagem`, `link`, referência opcional à entidade, `lida_em`.
- Sem policy de `INSERT`: só o servidor cria aviso, via `notify` /
  `notifyWorkspace` em `src/lib/platform/notifications.server.ts`.
  Falha ao notificar nunca derruba a operação de negócio.
- O dono lê e marca como lida; ninguém enxerga a caixa alheia.
- UI: `<NotificationBell workspaceId />` no header do app, com badge de não
  lidas e revalidação a cada 60 s.

Primeiro produtor ligado: aceite de convite notifica os demais membros.

## 7. Motor de timeline

- **Não existe tabela `timeline`.** É uma projeção de leitura montada na hora
  sobre as fontes que já são a verdade: `audit_log`, `comments` e `files`.
  Evento nunca é duplicado; cada fonte responde pela própria RLS — quem não é
  admin simplesmente não recebe as linhas de auditoria, sem erro vazado.
- `listTimeline({ workspaceId, entity?, entityId?, limit })`
  (`src/lib/platform/timeline.functions.ts`). Sem `entity` devolve a atividade
  do workspace; com `entity`/`entityId` vira o histórico do registro.
- Ações de auditoria são traduzidas para linguagem de negócio
  (`invite.accepted` → "aceitou um convite"); ação sem tradução aparece crua.
- UI: `<EntityTimeline workspaceId entity? entityId? limit? />`, já na Dashboard.
- Fonte nova (ex.: mudança de etapa de lead) entra somando um bloco na função.

## 8. Critérios de aceite

- [x] Nenhuma tabela de negócio futura cria coluna `tags` ou tabela de comentários própria.
- [x] Todo acesso sob RLS, sem service role no caminho de leitura.
- [x] Entidade validada por regex (`^[a-z_]+$`) antes de chegar ao banco.
- [x] Nenhum arquivo em bucket público; download só por URL assinada.
- [x] Notificação só nasce no servidor.
- [x] Timeline é projeção, sem tabela de eventos duplicada.
- [ ] Auditoria de tag/comentário/arquivo em eventos sensíveis (falta decidir o que é ruído).

## 9. Testes

1. Criar tag pelo widget → aparece no catálogo e vinculada ao registro.
2. Vincular a mesma tag duas vezes → nada acontece, sem erro.
3. Comentar, editar (marca "editado") e remover (vira "Comentário removido").
4. Membro de outro workspace não enxerga tag, comentário, arquivo nem timeline.
5. Anexar arquivo → aparece na lista; baixar abre URL assinada; link expira em 5 min.
6. Forjar `path` de outro workspace no registro → erro "Caminho de arquivo inválido".
7. Aceitar convite → os demais membros recebem notificação no sino.
8. Corretor abre a Dashboard → vê comentários e arquivos, não vê auditoria.
9. Comentário removido não aparece na timeline.

## 10. Prompt Lovable

> Precisa de etiquetas, comentários, anexos ou histórico em uma entidade nova?
> Use `EntityTags`, `EntityComments`, `EntityFiles` e `EntityTimeline` com
> `entity="<slug>"`. Nunca criar tabela paralela de tags, coluna `tags text[]`,
> tabela `<entidade>_comments`, tabela de eventos/timeline, bucket por módulo,
> nem `INSERT` direto em `notifications` — use `notify`/`notifyWorkspace`.

## 11. Roadmap dos serviços restantes

- **Search Engine** — busca global com `tsvector` por workspace.
- Notificação por e-mail como segundo canal do mesmo motor.
- Limpeza de objetos órfãos no storage.
- Paginação por cursor na timeline quando o volume crescer.


