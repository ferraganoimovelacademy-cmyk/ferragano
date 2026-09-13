# 12 — Business Core (Sprint 04)

## 1. Objetivo

Estabelecer o núcleo administrativo do Ferragano OS antes de qualquer nova
funcionalidade comercial: quem é a empresa, quem são as pessoas, como elas se
organizam e o que cada papel pode fazer — tudo configurável pela interface,
sem SQL.

## 2. Escopo

| Módulo | Rota | Acesso |
| --- | --- | --- |
| Organização | `/app/organizacao` | leitura para membros, escrita para admin |
| Usuários | `/app/usuarios` | leitura para membros, escrita para admin |
| Equipes | `/app/equipes` | leitura para membros, escrita para admin |
| Permissões | `/app/permissoes` | leitura para membros, escrita para admin |
| Busca global | header (⌘K) | qualquer membro, sob RLS |
| Timeline lateral | `<TimelinePanel />` | qualquer membro |

Fora de escopo: qualquer entidade comercial (leads, propostas, unidades).

## 3. Modelo de dados

### `workspaces` (estendida)
Identidade (`nome_fantasia`, `razao_social`, `cnpj`, `inscricao_estadual`,
`logo_url`), contato (`email`, `site`, `telefone`, `whatsapp`), endereço
(`endereco_*`) e configuração regional (`timezone`, `moeda`,
`horario_comercial` em JSONB por dia da semana).

### `profiles` (estendida)
`cargo` e `whatsapp`. Continua sendo o dado **global** da pessoa — não do
vínculo com uma empresa.

### `workspace_members` (estendida)
`equipe_id`, `gestor_id`, `status` (`ativo` | `inativo` | `suspenso`) e
`ultimo_acesso_em`. Aqui mora tudo que é **relativo ao workspace**, porque a
mesma pessoa pode ter equipes e gestores diferentes em workspaces diferentes.

### `equipes` (nova)
`nome`, `slug`, `descricao`, `cor`, `gerente_id`, `parent_id` (hierarquia) e
`ativa`. Únicas por `workspace_id + slug`.

### `role_permissions` (nova)
Uma linha por `workspace_id + role + module` com `nivel` no enum
`permission_level` (`nenhum` | `leitura` | `escrita` | `total`). Preenchida
automaticamente por `seed_role_permissions(workspace_id)` com o padrão dos 9
papéis.

## 4. Segurança

- RLS em `equipes` e `role_permissions`: SELECT para membro ativo, escrita
  apenas via `is_workspace_admin`.
- `has_permission(user, workspace, module, nivel_minimo)` — SECURITY DEFINER,
  executável apenas por usuários autenticados. Descreve acesso; **não
  substitui** as policies existentes.
- `seed_role_permissions` é exclusiva do `service_role`.
- `updateMembro` revalida `is_workspace_admin` no servidor e impede rebaixar o
  último proprietário do workspace.
- `setPermissao` trava o papel `proprietario` em `total`.
- Toda escrita administrativa grava em `audit_log` via `recordAudit`.

## 5. Server functions

| Arquivo | Funções |
| --- | --- |
| `organizacao.functions.ts` | `getOrganizacao`, `updateOrganizacao` |
| `usuarios.functions.ts` | `listUsuarios`, `updateMembro`, `updateMeuPerfil` |
| `equipes.functions.ts` | `listEquipes`, `upsertEquipe`, `deleteEquipe` |
| `permissoes.functions.ts` | `listPermissoes`, `setPermissao`, `setModuleFlag` |
| `search.functions.ts` | `globalSearch` |

## 6. Busca global

`globalSearch` consulta leads, clientes, empreendimentos, unidades, propostas,
landing pages e perfis **sob RLS como o próprio usuário** — nenhum resultado
vaza entre workspaces. Limite de 5 por entidade, debounce de 250 ms no cliente.
Novas entidades entram adicionando um bloco ao mesmo handler.

## 7. Timeline universal

`<TimelinePanel />` embrulha `<EntityTimeline />` num painel lateral acionável
em qualquer tela. Recebe `entity` e `entityId` opcionais; sem eles mostra o
histórico do workspace inteiro.

## 8. Interface

Sidebar ganhou `Usuários` e `Equipes` no domínio Pessoas, e `Organização` e
`Permissões` no domínio Plataforma (ambos `adminOnly`).

## 9. Nomenclatura

- **Ferragano** — marca.
- **Ferragano One** — produto usado por equipe, clientes e parceiros (é o que
  aparece na interface e nos metadados).
- **Ferragano OS** — arquitetura e núcleo técnico (é o que aparece neste
  Blueprint).

## 10. Roadmap

Próximo: Sprint 05 — CRM baseado em **Pessoas** (`Person → Contact →
Opportunity → Visit → Proposal → Sale → Relationship`), com o Relationship
Graph como camada de leitura sobre as entidades canônicas. `leads` e `clientes`
passam a ser projeções de `person`, não tabelas independentes.

Dívidas conhecidas:
- `has_permission` ainda não é usada nas policies das entidades comerciais.
- Busca global não tem índices GIN/trigram; revisar quando passar de ~50k
  registros por workspace.
