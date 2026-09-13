# 04 — Modelo de dados: fundação

Status: **implementado** (Gates 04, 05 e 06). Este capítulo descreve o que existe no banco, não uma proposta.

## Enums

| Enum | Valores |
|---|---|
| `app_role` | `proprietario`, `administrador`, `diretor`, `gerente`, `corretor`, `marketing`, `financeiro`, `suporte`, `cliente` |
| `workspace_status` | `trial`, `ativo`, `suspenso`, `arquivado` |
| `module_key` | `crm`, `erp`, `academy`, `ia`, `analytics`, `financeiro`, `marketing`, `portal_cliente`, `intelligence_hub`, `knowledge` |

## Tabelas

### `workspaces` — o tenant
`slug` (único), `nome`, `status` (default `trial`), `plano` (default `trial`),
`trial_expira_em`, `criado_por`, `recursos` (jsonb). Raiz de todo dado do sistema.

**Workspace lifecycle:** `trial → ativo → suspenso → arquivado`. O bootstrap cria o
workspace em `trial` com 14 dias. A transição de estado é decisão administrativa
(ainda manual) e nunca apaga dado — `arquivado` é fim de linha lógico.

### `profiles` — identidade
`id` = id do usuário autenticado. `nome`, `email`, `telefone`, `avatar_url`.
Criado/garantido pela server function de sessão (não há trigger no schema `auth`).
**Não contém papel.**

### `workspace_members` — participação
`workspace_id` + `user_id` (único), `ativo`, `joined_at`.
Responde "esta pessoa pertence a este workspace?".

### `user_roles` — autorização
`workspace_id` + `user_id` + `role` (único). Uma pessoa pode ter mais de um papel
no mesmo workspace e papéis diferentes em workspaces diferentes.

### `workspace_invites` — convites
`workspace_id`, `email`, `role`, `status` (`pendente` | `aceito` | `expirado`),
`token`, `convidado_por`, `expira_em` (14 dias), `aceito_em`.
Índice único parcial impede dois convites pendentes para o mesmo e-mail no mesmo workspace.

### `module_flags` — feature flags
`workspace_id` + `module` (único), `enabled` (default `false`).
O bootstrap semeia as 10 chaves com apenas `crm` ligado.

### `audit_log` — trilha
`workspace_id`, `actor_id`, `action`, `entity`, `entity_id`, `metadata` (jsonb), `created_at`.
Append-only. Já registra `workspace.bootstrap` e `invite.accepted`.

## Funções de autorização (security definer, sem EXECUTE público)

| Função | Responde |
|---|---|
| `is_workspace_member(user, workspace)` | pertence e está ativo? |
| `has_role(user, workspace, role)` | tem este papel específico? |
| `is_workspace_admin(user, workspace)` | é proprietário ou administrador? |
| `shares_workspace(a, b)` | os dois dividem algum workspace? |

São `security definer` para não recursar dentro das próprias policies.
`EXECUTE` revogado de `public`, `anon` e `authenticated` — só o motor de RLS as usa.

`set_updated_at()` está ligada por trigger em `workspaces`, `profiles`,
`workspace_members`, `module_flags` e `workspace_invites`.

## Matriz de acesso

| Tabela | Leitura | Escrita |
|---|---|---|
| `workspaces` | membros | admin (update) / proprietário (delete) / servidor (insert) |
| `profiles` | próprio + colegas de workspace | próprio |
| `workspace_members` | membros do workspace | admin |
| `user_roles` | membros do workspace | admin |
| `workspace_invites` | admin | admin |
| `module_flags` | membros do workspace | admin |
| `audit_log` | admin | somente servidor |

Nada é acessível sem autenticação. `workspaces` não aceita `INSERT` pela API:
criar tenant é operação de servidor.

## Pendências desta fundação

- Transição automática de `trial → suspenso` no vencimento (job)
- Entidades de negócio: `empreendimento`, `unidade`, `cliente`, `lead`, `negociacao` e suas tabelas de evento
- Camadas de leitura (Intelligence) como views sobre essas entidades

## Critérios de aceitação

- [x] Nenhuma tabela pública sem RLS e sem GRANT
- [x] Papel fora de `profiles`
- [x] Toda tabela de fundação referencia `workspace_id`
- [x] Funções de permissão não executáveis pela API
- [x] Workspace nasce com ciclo de vida e plano
- [ ] Teste: usuário do workspace A não lê nenhuma linha do workspace B
