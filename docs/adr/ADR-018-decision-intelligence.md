# ADR-018 — Decision Intelligence: confiança antes de recomendação

**Status:** aceito · Sprint 20

## Contexto

A Sprint 19 passou a medir impacto (lift, tempo economizado, saúde da regra).
O lift, porém, é uma diferença de proporções: `+12%` com 20 execuções e `+12%`
com 8.000 execuções descrevem realidades diferentes, e o painel tratava as duas
igualmente. Sem qualificar a evidência, a plataforma recomendaria ações sobre
ruído amostral.

## Decisão

1. **Confiança é obrigatória para afirmar impacto.** Todo lift passa por um
   teste de duas proporções (regra × base do workspace) e recebe um percentual
   de confiança. Abaixo de 10 oportunidades tocadas, ou sem variância na base,
   o resultado é `null` — nunca zero.
2. **Recomendação tem prioridade numérica (0..100).** O score combina peso do
   tipo, evidência (parcela do volume da janela) e confiança. Uma evidência
   fraca nunca chega ao topo da lista.
3. **Toda recomendação carrega previsão.** Nenhuma sugestão aparece sem uma
   frase de impacto derivada de um número da própria linha (horas/mês, redução
   de fila, execuções duplicadas).
4. **Dependência entre regras é grafo, não lista.** O efeito `task` produz
   `task.created`; o grafo dessas arestas revela loops, gargalos e órfãs.
5. **Simulação é leitura, nunca escrita.** O simulador responde "e se eu
   desligar?" a partir do histórico materializado e não altera regra alguma.
6. **Tudo é lógica pura e client-safe.** Nenhuma tabela nova: a Sprint 20 lê o
   histórico da Sprint 19 (`automation_daily_metrics`, ADR-017) pela RPC
   `automation_intelligence`, que já valida papel de administrador.

## Consequências

- Gestor age primeiro no que é comprovado; o restante fica visível como
  "amostra insuficiente" em vez de virar número falso.
- Confiança e score são reprodutíveis e testáveis (18 testes unitários).
- Limite aceito: correlação continua não sendo causa. O teste diz que a
  diferença provavelmente não é ruído, não que a regra a causou.

## Evolução planejada (registrada, não implementada)

- `automation_action_profiles`: tempo economizado por ação **por workspace**,
  substituindo as constantes globais (120s/60s/30s) do ADR-017.
- **Baseline observado**: medir tempo médio antes e depois da automação para o
  ROI deixar de ser estimado e passar a ser observado.