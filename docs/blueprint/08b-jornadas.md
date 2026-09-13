# 08b — Jornadas dos usuários

Status: **v1** — jornadas mapeadas sobre o que já existe; lacunas marcadas como pendência.

## 1. Objetivo

Descrever o caminho real de cada papel dentro do Ferragano OS, do primeiro
acesso à tarefa do dia. Serve de critério para decidir o que falta construir:
se um passo da jornada não tem tela, não tem produto.

## 2. Papéis considerados

Dos 9 papéis de `user_roles`, quatro concentram uso diário nesta fase:

| Papel | Jornada principal |
|---|---|
| `proprietario` | abre o workspace, convida time, acompanha resultado |
| `administrador` | configura módulos, gere membros, audita |
| `gerente` | distribui e cobra o funil |
| `corretor` | trabalha os próprios leads |

Os demais (`diretor`, `marketing`, `financeiro`, `suporte`, `cliente`) entram
quando os respectivos domínios saírem do estado desligado por feature flag.

## 3. Jornada — Proprietário (primeiro acesso)

1. `/auth` → cadastro com e-mail e senha.
2. Sem workspace, é levado a `/onboarding`.
3. `bootstrapWorkspace` cria o workspace em `trial`, o perfil, o vínculo em
   `workspace_members` e o papel `proprietario`.
4. Cai em `/app` com a Dashboard vazia e a timeline mostrando a criação.
5. Convida o time (`workspace_invites`) informando papel por convidado.

Regra: nenhum passo desta jornada pode exigir suporte humano.

## 4. Jornada — Convidado

1. Recebe o convite e se cadastra em `/auth` **com o mesmo e-mail**.
2. `getSessionContext` só consome o convite com comparação exata de e-mail e
   `email_verified = true` no token.
3. Entra direto no workspace com o papel do convite; os administradores
   recebem notificação no sino.
4. Convite para papel `proprietario` só é criado por quem já é proprietário.

## 5. Jornada — Corretor (dia de trabalho)

1. Abre `/app` → vê notificações e atividade recente.
2. `/app/leads` → cadastra o lead que chegou por WhatsApp; o score nasce no
   servidor a partir de origem, temperatura e completude do contato.
3. `/app/pipeline` → arrasta o card conforme a conversa evolui; cada
   movimentação grava `lead_eventos` + `audit_log`.
4. Anexa documento e comenta no lead pelos widgets polimórficos.
5. Perde o lead → estágio `perdido` exige motivo.

Lacuna: não há agenda nem lembrete de follow-up. É a próxima dor real.

## 6. Jornada — Gerente comercial

1. `/app/pipeline` → lê o funil inteiro do workspace (RLS dá acesso a todos os
   leads do workspace, não só aos próprios).
2. Reatribui responsável quando o lead esfria.
3. `/app/empreendimentos` → confere estoque antes de prometer unidade.

Lacunas: distribuição automática de leads, painel de conversão por corretor,
alerta de lead parado há N dias.

## 7. Jornada — Administrador

1. Liga e desliga módulos por `module_flags`.
2. Gere membros, papéis e convites — sem poder se promover a proprietário nem
   alterar o próprio papel.
3. `/app/auditoria` → filtra o histórico append-only.

## 8. Critérios de aceite

- [x] Proprietário chega ao workspace sem intervenção manual.
- [x] Convidado entra com o papel correto e o time é notificado.
- [x] Corretor cadastra, pontua e movimenta lead sem sair do app.
- [x] Gerente enxerga o funil completo do workspace.
- [ ] Corretor tem compromisso e lembrete de follow-up.
- [ ] Gerente reatribui responsável pela interface.
- [ ] Papel `cliente` tem visão restrita, sem qualquer ação de escrita, validada.

## 9. Testes

1. Cadastro novo sem convite → cai em `/onboarding`, não em `/app`.
2. Cadastro com e-mail parecido com o do convite → **não** entra no workspace.
3. Corretor do workspace A não encontra lead do workspace B em nenhuma tela.
4. Movimentar card no kanban → evento no lead e linha na auditoria.
5. Admin tenta se dar papel `proprietario` → recusado pela policy.

## 10. Roadmap

Agenda e follow-up (fecha a jornada do corretor), reatribuição em massa,
onboarding guiado com checklist no primeiro acesso, jornada do papel
`marketing` quando as landing pages gravarem direto em `leads`.
