# 13 — Relationship Core

Status: **v1 implementado** (Sprint 05). Substitui a modelagem `leads` + `clientes`
como entidades independentes.

## 1. Objetivo
Uma pessoa é sempre a mesma pessoa. Lead, cliente, investidor e indicador são
**estados de uma jornada**, não tabelas diferentes. O processo comercial vira
entidade própria porque uma pessoa pode negociar dois imóveis ao mesmo tempo.

## 2. Requisitos funcionais
- Cadastro único por pessoa, com múltiplos contatos e endereços.
- Detecção de duplicidade no ato do cadastro (CPF/CNPJ, e-mail, telefone, nome).
- Unificação de registros sem perda de histórico.
- Grafo de relacionamentos entre pessoas (indicou, cônjuge, sócio...).
- Timeline única por pessoa, somando interações, auditoria, comentários e arquivos.

## 3. Requisitos não funcionais
- Tudo sob RLS por `workspace_id`; nenhum service role.
- `activities` é append-only.
- Estágio da jornada é **derivado**, nunca digitado (exceto proprietário,
  investidor e indicador, que não vêm de pipeline).

## 4. Modelo de dados

| Tabela | Papel |
|---|---|
| `people` | identidade: nome, tipo, documento, origem, estágio da jornada, responsável |
| `person_contacts` | canais (e-mail, telefone, WhatsApp...), com valor normalizado |
| `person_addresses` | endereços por tipo |
| `person_relationships` | grafo dirigido entre pessoas |
| `opportunities` | processo comercial: estágio, valor, probabilidade, próxima ação |
| `activities` | interações append-only, ligadas à pessoa e opcionalmente à oportunidade |

Enums: `person_tipo`, `person_estagio`, `contact_canal`, `address_tipo`,
`relationship_tipo`, `activity_tipo`. O pipeline reaproveita `lead_estagio`.

### Identity Resolution
`documento_norm` e `person_contacts.valor_norm` guardam a forma canônica.
`find_person_duplicates` (security invoker, roda sob a RLS de quem chama)
pontua candidatos por documento, contato e semelhança de nome.

### Derivação da jornada
`opportunities_sync_estagio` dispara em toda escrita de oportunidade e chama
`refresh_person_estagio`, que recalcula `people.estagio_jornada`:
oportunidade fechada → `cliente`; oportunidade aberta → `oportunidade`;
só cadastro → `lead`. Estágios manuais não são sobrescritos.

## 5. Fluxos
Cadastro → checagem de duplicidade → pessoa criada com contatos →
oportunidade aberta → movimentação de estágio grava atividade e auditoria →
fechamento promove a pessoa a cliente automaticamente.

Unificação: os satélites são repontados para a pessoa mantida e a absorvida
recebe `merged_into` — nada é apagado.

## 6. Wireframes
`/app/pessoas` (lista com jornada, contato, oportunidades em aberto) e
`/app/pessoas/:id` (visão 360 em abas: geral, oportunidades, rede, histórico).

## 7. Critérios de aceite
- [x] RLS + GRANT em todas as tabelas novas
- [x] Duplicidade sinalizada antes de gravar
- [x] Unificação preserva histórico
- [x] Estágio da jornada derivado de oportunidades
- [x] Busca global e timeline reconhecem pessoas
- [ ] Telas legadas `/app/leads` e `/app/clientes` aposentadas
- [ ] Captação pública gravando direto em `people`

## 8. Testes
1. Cadastrar duas pessoas com o mesmo CPF → segunda é bloqueada pelo índice único.
2. Digitar e-mail já existente → aviso de duplicidade com link para o cadastro.
3. Fechar oportunidade → pessoa vira `cliente` sem intervenção manual.
4. Unificar dois cadastros → contatos, oportunidades e histórico migram.
Pendente: usuário do workspace A não lê pessoa do workspace B.

## 10. Roadmap
Aposentar `leads`/`clientes` como telas, pipeline por oportunidade em kanban,
score preditivo sobre `activities`, visualização do grafo de indicações e
score de influência por pessoa.
