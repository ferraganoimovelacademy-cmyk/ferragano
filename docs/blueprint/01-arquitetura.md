# 01 — Arquitetura

## Decisão 1: o Core é uma camada de regras, não um serviço separado

O Ferragano Core é a camada de regras de negócio composta por:

- **RLS no banco** — a fronteira de segurança real, por workspace e por papel;
- **server functions** (`createServerFn`) — regras de negócio, orquestração e validação;
- **server routes** (`src/routes/api/public/*`) — apenas para chamadores externos (webhooks, cron, integrações).

Todos os consumidores (site público, `/app`, futuros apps, IA) atravessam essa mesma camada.
Nenhum consumidor fala com tabelas por caminho próprio.

**Descartado:** backend autônomo com API REST/GraphQL versionada.
Motivo: duplica autenticação, contrato e deploy sem ganho enquanto todos os
consumidores forem web. A migração continua possível — as regras já estão
concentradas na camada de server functions e podem ser expostas como API pública
quando existir um app nativo ou um integrador externo real.

```text
                consumidores
   site · /app · app cliente · app corretor · IA
                     │
        ┌────────────┴────────────┐
        │   FERRAGANO CORE        │
        │  server functions       │  regras, orquestração, validação
        │  RLS + funções SQL      │  fronteira de segurança
        └────────────┬────────────┘
                     │
                 PostgreSQL
```

## Decisão 2: Intelligence não são módulos, são camadas de leitura

Property / Customer / Sales Intelligence **não** ganham tabelas próprias de entidade.
São projeções sobre as mesmas entidades canônicas enriquecidas por eventos.

| Camada | Entidade canônica | Fonte do enriquecimento |
|---|---|---|
| Property Intelligence | `empreendimento` | eventos, documentos, conteúdo, dados de mercado |
| Customer Intelligence | `cliente` | eventos, interações, negociações |
| Sales Intelligence | `corretor` + `negociacao` | eventos agregados |

Motivo: tabelas paralelas fariam CRM e IA divergirem sobre o mesmo cliente.
O **Intelligence Hub** é a superfície de leitura dessas projeções, não um repositório.

Padrão: `entidade` + `entidade_evento` (append-only) + derivação (view/materialized view/função).

## Decisão 3: multi-tenant por workspace desde a primeira tabela

Toda tabela de negócio carrega `workspace_id` e uma policy que exige participação
no workspace. Isso inclui a Knowledge Layer — base de conhecimento de um
workspace nunca alcança outro, nem via IA.

## Decisão 4: feature flags no banco, não no código

`module_flags` controla por workspace quais módulos existem.
Todo módulo novo nasce desligado. O arquivo `src/lib/platform/feature-flags.ts`
permanece apenas como fallback de desenvolvimento até a leitura vir do banco.

## Decisão 5: auditoria append-only

`audit_log` não tem policy de escrita para usuários. Só o servidor grava,
e ninguém edita nem apaga. Leitura restrita a proprietário e administrador do workspace.

## Fronteiras que não podem ser cruzadas

- Nenhum consumidor acessa tabela sem passar por RLS de workspace.
- Papel nunca é armazenado em `profiles` — sempre em `user_roles`.
- Chave de serviço nunca decide se o chamador é admin; a verificação vem antes, pelo token do usuário.
- Contagens, versões e erros internos não vazam para usuário não-admin.
