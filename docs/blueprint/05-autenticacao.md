# 05 — Autenticação, RBAC e ciclo de vida do workspace

Status: **implementado** (Gate 06).

## 1. Objetivo

Dar acesso à plataforma com identidade real, isolar cada operação em um workspace
e resolver o problema do ovo e da galinha: as policies exigem um admin para conceder
papéis, mas no primeiro acesso não existe admin algum.

## 2. Requisitos funcionais

- Login por e-mail e senha.
- Cadastro de novos usuários.
- Guarda de todas as rotas `/app`.
- Bootstrap do primeiro proprietário via server function.
- Convite de membros por administradores, com papel definido no convite.
- Aceite automático do convite no primeiro login com o e-mail convidado,
  desde que o e-mail da conta esteja confirmado.
- Sair da conta limpando o cache de dados protegidos.

## 3. Requisitos não funcionais

- Autorização decidida no banco (RLS), nunca no cliente.
- Service role usado apenas onde a policy é intencionalmente inviável (bootstrap
  e aceite de convite), sempre depois de validar o token do chamador.
- Rota `/app` com `ssr: false`: a sessão vive no `localStorage` e o servidor não a lê.
- Convites expiram em 14 dias.
- Identidade do convite: comparação **exata** do e-mail (`eq`, nunca `ilike` —
  `_` e `%` de um endereço seriam coringas) e exigência de e-mail confirmado.
- Escalonamento de papel: administrador não concede `proprietario` nem altera o
  próprio papel; só um proprietário promove outro proprietário. Imposto por policy.

## 4. Modelo de dados

Ver capítulo 04. Envolvidas: `workspaces`, `profiles`, `workspace_members`,
`user_roles`, `workspace_invites`, `module_flags`, `audit_log`.

## 5. Fluxos

**Cadastro → workspace**
```text
/auth (signup) → sessão → /app → sem workspace → /onboarding
→ bootstrapWorkspace() [service role]
→ workspace (trial, 14d) + member + role proprietario + 10 module_flags + audit_log
→ /app
```

**Convite → acesso**
```text
admin em /app/configuracoes → inviteMember() [RLS: is_workspace_admin]
→ workspace_invites (pendente)
→ convidado faz login → getSessionContext() casa o e-mail
→ member + user_role + invite=aceito + audit_log
```

**Guarda**
```text
/app beforeLoad → supabase.auth.getUser() → sem usuário → /auth?redirect=…
```

## 6. Wireframes

- `/auth`: card único, alterna login/cadastro.
- `/onboarding`: um campo (nome da empresa) + explicação do trial.
- `/app/configuracoes`: bloco Workspace (status, plano, trial), bloco Convidar,
  lista de Equipe com papéis, lista de Convites pendentes.
- Header do app: menu de conta com papéis e "Sair".

## 7. Critérios de aceite

- [x] Usuário anônimo em `/app` é redirecionado para `/auth`.
- [x] Após login sem workspace, o usuário cai em `/onboarding`.
- [x] O criador recebe `proprietario` e o workspace nasce em `trial`.
- [x] Sidebar respeita `module_flags` do banco.
- [x] Não-admin não vê gestão de equipe.
- [ ] Teste automatizado do isolamento entre workspaces.

## 8. Testes

1. Anônimo acessa `/app` → `/auth`.
2. Cadastro novo → `/onboarding` → workspace criado uma única vez (chamada repetida é idempotente).
3. Admin convida e-mail → convite pendente → login desse e-mail → vira membro com o papel correto.
4. Membro comum abre `/app/configuracoes` → não vê convites nem lista de equipe.
5. Convite duplicado → erro tratado, não 500.

## 9. Prompt Lovable

> Não recriar `/auth`, `/onboarding` nem a guarda de `/app`. Ao criar novas rotas
> privadas, colocá-las sob `/app` e ler `useSession()` para papéis e flags.
> Toda escrita nova passa por policy do workspace; service role só com justificativa.

## 10. Roadmap

- Recuperação de senha (`/reset-password`).
- Login social (Google) via broker.
- Transição automática do trial vencido.
- Troca de workspace (multiempresa) no header.
