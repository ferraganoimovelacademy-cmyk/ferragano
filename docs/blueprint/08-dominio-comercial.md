# 08 — Domínio Comercial e Imobiliário

Status: **v1 implementado** (leads, pipeline, empreendimentos, unidades).

## 1. Objetivo
Fatia vertical que faz o funil existir de ponta a ponta: um lead entra, é pontuado,
avança por estágios e se liga a um empreendimento do portfólio.

## 2. Requisitos funcionais
- Cadastro e busca de leads (nome, e-mail, telefone).
- Score calculado no servidor; o cliente nunca define score.
- Kanban de pipeline com drag-and-drop e menu de estágio.
- Portfólio de empreendimentos com contagem de unidades disponíveis.

## 3. Requisitos não funcionais
- Toda leitura/escrita sob RLS do workspace; nenhum uso de service role.
- Mudança de estágio gera evento em `lead_eventos` e linha em `audit_log`.

## 4. Modelo de dados

| Tabela | Papel |
|---|---|
| `empreendimentos` | portfólio: nome, construtora, local, status, segmento, faixa de preço |
| `unidades` | estoque por empreendimento: identificador, tipologia, área, preço, situação |
| `leads` | demanda: contato, origem, estágio, score, temperatura, responsável, interesse |
| `lead_eventos` | histórico append-only por lead |
| `compromissos` | agenda: título, tipo, situação, início/fim, responsável, vínculo polimórfico |

Enums: `empreendimento_status`, `empreendimento_segmento`, `unidade_status`,
`lead_origem`, `lead_estagio`, `lead_temperatura`, `compromisso_tipo`,
`compromisso_status`.

### Acesso
- Leitura: membros do workspace.
- Criação: qualquer membro (`criado_por = auth.uid()` imposto pela policy).
- Empreendimentos/unidades: alteração e exclusão só por admin.
- Lead: alteração pelo responsável, autor ou admin; exclusão só por admin.
- `lead_eventos`: insere, nunca edita nem apaga.
- Compromisso: altera o responsável, o autor ou admin; exclui o autor ou admin.

## 5. Fluxos
`novo → contato → qualificado → visita → proposta → negociação → fechado`
com `perdido` como desfecho paralelo (exige motivo).

**Agenda:** compromisso criado (opcionalmente vinculado a um lead pelo contrato
polimórfico `entity`+`entity_id`) → responsável diferente do autor recebe
notificação → conclusão grava `lead_eventos` e atualiza `ultimo_contato_em` do
lead. Pendente com horário vencido aparece como atrasado. Não há tabela de
agenda por entidade: o vínculo é polimórfico, como tags e comentários.

## 6. Wireframes
`/app/leads` (tabela + diálogo), `/app/pipeline` (kanban),
`/app/empreendimentos` (grid), `/app/agenda` (lista agrupada por dia com
filtros de situação e "só meus").

## 7. Critérios de aceite
- [x] RLS + GRANT em todas as tabelas novas
- [x] Score no servidor
- [x] Movimentação registra evento e auditoria
- [x] Compromisso vinculado a lead alimenta o histórico e o último contato
- [ ] Lembrete efetivo (`lembrete_em` existe, ainda sem disparo)
- [ ] Distribuição automática de lead entre corretores
- [ ] Unidades editáveis pela interface

## 8. Testes
1. Criar compromisso para outro membro → ele recebe notificação no sino.
2. Concluir compromisso de lead → evento no lead e `ultimo_contato_em` atualizado.
3. Compromisso pendente com hora passada → marcado como atrasado.
4. Fim antes do início → recusado (validação no servidor e no banco).
Pendente: usuário do workspace A não lê lead nem compromisso do workspace B.

## 10. Roadmap
Disparo de lembrete (`lembrete_em`) pelo motor de notificações, visão de
calendário semanal, propostas e reservas de unidade, comissões (domínio
Financeiro), captação via landing page gravando direto em `leads`.
