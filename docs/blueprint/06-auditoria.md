# 06 — Auditoria e observabilidade

Status: **implementado** (Gate 07).

## 1. Objetivo

Responder, para qualquer alteração no workspace: quem fez, o quê, quando, em qual
entidade e com quais dados. Sem depender de log de aplicação volátil.

## 2. Requisitos funcionais

- Registro de todo evento relevante em `audit_log`.
- Consulta filtrável por ação e entidade, ordenada do mais recente.
- Paginação de 50 em 50 com total.
- Visível apenas para proprietário e administrador.

## 3. Requisitos não funcionais

- Append-only: não há policy de `INSERT`, `UPDATE` ou `DELETE` na API. Só o servidor escreve.
- Falha ao auditar não derruba a operação de negócio (loga no servidor e segue).
- Leitura sob RLS — nada de service role na consulta.

## 4. Modelo de dados

`audit_log`: `workspace_id`, `actor_id`, `action`, `entity`, `entity_id`,
`metadata` (jsonb), `created_at`. Ver capítulo 04.

Convenção de `action`: `<entidade>.<verbo no passado>` em minúsculas —
`workspace.bootstrap`, `invite.created`, `invite.accepted`.

## 5. Fluxos

```text
server function (já autorizada)
→ recordAudit(supabaseAdmin, { workspaceId, actorId, action, entity, entityId, metadata })
→ audit_log

/app/auditoria → listAuditLog() [RLS: admin] → tabela filtrável
```

## 6. Wireframes

`/app/auditoria`: cabeçalho, barra de filtros (ação, entidade, limpar),
tabela (Quando · Ação · Entidade · Autor · Detalhes), rodapé com total e paginação.
Não-admin vê um card de acesso restrito.

## 7. Critérios de aceite

- [x] Ponto único de escrita: `src/lib/platform/audit.server.ts`.
- [x] Bootstrap e convites já geram evento.
- [x] Não-admin não lê a trilha (policy + UI).
- [ ] Toda entidade de negócio futura escreve auditoria em criação, alteração e exclusão.

## 8. Testes

1. Criar workspace → evento `workspace.bootstrap` aparece na trilha.
2. Convidar e-mail → `invite.created`; aceitar → `invite.accepted`.
3. Membro comum abre `/app/auditoria` → card de acesso restrito, nenhuma linha.
4. Filtro por entidade inexistente → lista vazia, sem erro.

## 9. Prompt Lovable

> Toda server function que altera dado do workspace chama `recordAudit` depois
> de a operação ter êxito. Nunca inserir direto em `audit_log`. Nunca ler a
> trilha com service role. `action` segue `<entidade>.<verbo>`.

## 10. Roadmap

- Retenção e arquivamento da trilha.
- Exportação CSV.
- Métricas de uso (observabilidade) derivadas dos mesmos eventos.
- Diff de campos alterados em `metadata`.
