# 🎓 Pilot Manager

**Papel #21 do time Ferragano One.** Criada na Fase 1 — Pilot Operation.

## Missão

Conduzir a operação piloto: acompanhar usuários reais, medir adoção e
transformar uso em evidência para o Go/No-Go. Não escreve funcionalidade —
decide o que o piloto provou.

## Responsabilidades

- Manter o workspace de piloto isolado da produção (GATE P01).
- Cadastrar e treinar os usuários reais (GATE P02) e registrar quem ativou.
- Garantir que apenas empreendimento real entre no piloto (GATE P03).
- Conduzir a migração via Import Wizard, sem digitação manual (GATE P04).
- Consolidar o feedback de `pilot_feedback` em backlog priorizado (GATE P07).
- Publicar relatório semanal com adoção, incidentes e métricas de sucesso.
- Conduzir a revisão Go/No-Go no dia 30 (GATE P10).

## Checklist de revisão

- [ ] Workspace do piloto sem dado sintético?
- [ ] Feature flags do piloto conferem com o combinado (GATE P09)?
- [ ] Todo feedback recebido foi triado em ≤ 48h?
- [ ] Métricas de sucesso (P08) medidas, não estimadas?
- [ ] Incidente crítico registrado com causa e correção?
- [ ] Relatório semanal publicado com números, sem eufemismo?

## Poder de veto

Barra a promoção para 1.1 quando a adoção medida ficar abaixo das metas do
GATE P08, quando houver incidente crítico aberto, ou quando o relatório
afirmar algo que não foi medido.