# ADR-005 — RBAC em tabela separada, funções security definer

## Contexto

Um sistema multi-tenant com 9 papéis (`proprietario`, `administrador`,
`diretor`, `gerente`, `corretor`, `marketing`, `financeiro`, `suporte`,
`cliente`) e workspaces independentes precisa responder duas perguntas sem
recursão nem vazamento: "esta pessoa pertence a este workspace?" e "com que
papel?". Guardar o papel dentro de `profiles` é o erro clássico que abre
escalonamento de privilégio: qualquer policy de `UPDATE` em `profiles` vira
superfície para o próprio usuário se promover.

## Decisão

Papel nunca é armazenado em `profiles`. `user_roles` é tabela própria
(`workspace_id` + `user_id` + `role`, único), permitindo múltiplos papéis por
pessoa no mesmo workspace e papéis diferentes em workspaces diferentes.
`workspace_members` responde só participação (`ativo`), separado de
autorização.

Toda decisão de policy passa por função `security definer` sem `EXECUTE`
público (revogado de `public`, `anon`, `authenticated` — só o motor de RLS
as invoca): `is_workspace_member`, `has_role`, `is_workspace_admin`,
`shares_workspace`. Serem `security definer` evita recursão de policy dentro
da própria policy.

`role_permissions` (`workspace_id` + `role` + `module` + `nivel`) permite
granularidade por módulo além do binário admin/não-admin usado hoje na
maior parte da interface (`isAdminRole` em `src/lib/platform/roles.ts`).
Escalonamento de papel é imposto por policy, não por código de aplicação:
administrador não concede `proprietario` nem altera o próprio papel; só um
proprietário promove outro proprietário.

Workspace é sempre multi-tenant desde a primeira tabela: toda tabela de
negócio carrega `workspace_id` e policy que exige `is_workspace_member`.

## Alternativas descartadas

- **Papel como coluna em `profiles`**: descartado — abre escalonamento de
  privilégio via `UPDATE` na própria linha e não suporta múltiplos papéis
  por workspace.
- **Checagem de papel no cliente (React) como fronteira de segurança**:
  descartado — o cliente decide o que mostrar, nunca o que autorizar; toda
  autorização real está em RLS.
- **RBAC hierárquico com herança automática de papel (ex.: diretor herda
  tudo de gerente)**: descartado nesta fase. `role_permissions` existe para
  granularidade por módulo, mas a hierarquia de herança não foi modelada —
  cada papel tem sua concessão explícita.

## Consequências

- Toda tabela nova de negócio nasce com RLS por `workspace_id` e `GRANT` na
  mesma migration — não existe tabela pública sem essa dupla.
- `role_permissions` está no schema mas o uso granular por módulo na
  interface ainda é binário (`isAdminRole`) na maior parte das telas —
  pendente evoluir para checagem por `nivel` e `module` onde fizer sentido.
- Teste automatizado de isolamento entre workspaces ainda não existe (hoje é
  verificação manual) — pendência registrada desde o capítulo 04.

## Status

Aceito — 2026-07-31.

## Referências

- `docs/blueprint/04-modelo-de-dados.md`
- `docs/blueprint/05-autenticacao.md`
- `src/lib/platform/roles.ts`
- Tabelas: `user_roles`, `workspace_members`, `role_permissions`
- Funções: `is_workspace_member`, `has_role`, `is_workspace_admin`, `shares_workspace`
