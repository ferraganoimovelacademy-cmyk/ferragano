# 14 — Sales Engine

> Capítulo vivo. Substitui a parte comercial do capítulo 08 (`leads` e `propostas` legadas permanecem apenas como ponte).

## 1. Objetivo

Separar definitivamente **identidade** de **processo comercial**. A pessoa é imutável no tempo; a venda é um processo com etapas, prazos e desfecho. Misturar os dois é o erro que trava CRMs imobiliários no terceiro ano de uso.

## 2. Escopo

Dentro: oportunidade, funil, etapa, tarefa, visita, proposta, reserva, venda e eventos de domínio.
Fora: dados da pessoa (contexto People), catálogo de imóveis (contexto Property), comissionamento financeiro (contexto Financeiro).

## 3. Modelo de dados

```text
Person → Opportunity → Property → Negotiation → Reservation → Sale
```

| Tabela | Papel |
| --- | --- |
| `pipelines` | funil configurável por workspace; `padrao` marca o inicial |
| `pipeline_stages` | etapa: ordem, cor, tipo (aberto/ganho/perdido), probabilidade, `sla_horas`, `checklist`, `criterios_saida`, `automacoes` |
| `opportunities` | processo comercial; agora com `pipeline_id`, `stage_id`, `stage_entrou_em`, `ganho_motivo` |
| `tasks` | Task Engine: status, prioridade, origem, responsável, prazo |
| `visits` | visita: data, empreendimento, unidade, comparecimento, feedback, nota, fotos, acompanhantes |
| `proposals` | proposta versionada: valor, entrada, banco, prazo, condições, validade, arquivo |
| `reservations` | reserva com validade obrigatória, motivo e cancelamento |
| `sales` | venda: valor final, comissão, banco, assinatura, distrato |
| `domain_events` | Event Bus append-only |

Nenhuma tabela nova de tags, comentários ou arquivos: os motores polimórficos do capítulo 07 atendem todas as entidades acima (`entity = 'opportunity' | 'visit' | 'proposal' | ...`).

## 4. Stage Engine

A etapa é configuração, não código. Cada etapa carrega:

- **Ordem e cor** — posição e leitura visual no board.
- **Tipo** — `aberto`, `ganho` ou `perdido`. Só o tipo decide desfecho; o nome é livre.
- **Probabilidade** — aplicada à oportunidade ao entrar na etapa.
- **SLA (horas)** — comparado a `stage_entrou_em`; o card acusa estouro no board.
- **Checklist e critérios de saída** — listas declarativas, base das obrigatoriedades ("não entra em Reserva sem documentos, renda e simulação").

Exemplos de funil coexistindo no mesmo workspace: MCMV (Novo → Diagnóstico → Documentação → Simulação → Visita → Proposta → Reserva → Contrato) e Investidor (Lead → Perfil → Análise → Portfólio → Negociação → Compra).

## 5. Fluxos

1. Oportunidade nasce ligada a uma pessoa e a um funil.
2. Movimentação entre etapas grava `stage_entrou_em`, recalcula probabilidade e exige motivo quando o destino é do tipo `perdido`.
3. Reserva ativa marca a unidade como `reservada`; cancelamento ou expiração devolve `disponivel`.
4. Venda marca a unidade como `vendida` e converte a reserva.

## 6. Eventos (Event Sourcing Light)

Publicados por `publishEvent` (`src/lib/platform/events.server.ts`), nunca por INSERT direto:

`OpportunityCreated`, `OpportunityMoved`, `OpportunityWon`, `OpportunityLost`, `TaskCreated`, `TaskCompleted`, `VisitScheduled`, `VisitCompleted`, `VisitNoShow`, `ProposalCreated`, `ProposalSent`, `ProposalAccepted`, `ProposalRejected`, `ReservationCreated`, `ReservationCancelled`, `SaleCompleted`.

Consumidores: Timeline Universal, Analytics, IA e (futuro) automações. O evento é a única fonte de histórico do processo — nada de tabela paralela por módulo.

## 7. Segurança

- RLS por `workspace_id` em todas as tabelas, com GRANT explícito para `authenticated` e `service_role`.
- Leitura para membros; escrita para responsável, autor ou administrador.
- `domain_events` aceita apenas INSERT com `actor_id = auth.uid()`; não há UPDATE nem DELETE.
- `seed_default_pipeline` é SECURITY DEFINER com execução restrita ao service role; a server function confere `is_workspace_admin` antes de chamar.
- Validação de entrada com zod em todas as server functions; erro de banco nunca vaza para o cliente.

## 8. Interface

- `/app/oportunidades` — board por etapa configurável, SLA visível no card, painel lateral com Tarefas, Visitas, Propostas, Reserva/Venda e Histórico.
- `/app/funis` — Stage Engine (admin): criar funil, editar etapas, SLA, checklist e critérios.

## 9. Testes de aceitação

1. Workspace sem funil oferece "criar funil padrão"; usuário não administrador recebe recusa.
2. Criar etapa com SLA de 24h e ver o card acusar atraso após esse prazo.
3. Mover oportunidade para etapa do tipo `perdido` sem motivo → bloqueado.
4. Mover para etapa `ganho` → oportunidade fecha e evento `OpportunityWon` aparece na timeline.
5. Excluir etapa com oportunidades dentro → bloqueado com mensagem clara.
6. Criar duas propostas na mesma oportunidade → versões 1 e 2.
7. Reserva com data passada → recusada; reserva válida marca a unidade como reservada.
8. Cancelar reserva sem motivo → bloqueado; com motivo, unidade volta a disponível.
9. Registrar venda → unidade vendida, reserva convertida, evento `SaleCompleted` na timeline.
10. Usuário de outro workspace não enxerga nenhum registro (RLS).

## 10. Roadmap

- Automações declarativas por etapa (criar tarefa, notificar gestor, agendar follow-up).
- Expiração automática de reservas por job.
- PDF versionado de proposta no bucket `workspace-files`.
- Migração das telas legadas (`/app/leads`, `/app/pipeline`, `/app/propostas`) para este contexto e remoção das tabelas antigas.
- Contexto Property (Developer → Project → Tower → Floor → Unit → Price History).
