# ADR-014 — Persistir o conselho do Advisor e medir aceite

- **Status:** aceito
- **Data:** 2026-07-31
- **Sprint:** 14 (Fase 2 — Ferragano Advisor)

## Contexto

O Advisor produzia briefings sem rastro. Não era possível saber se o conselho
era bom, se a gestão concordava, nem se algo virava execução.

## Decisão

1. Persistir cada briefing (`advisor_briefings`) com os sinais medidos que
   sustentaram o conselho — evidência auditável, não só o texto da IA.
2. Materializar cada recomendação como ação (`advisor_acoes`) com ciclo de
   decisão explícito: `pendente`, `aceita`, `descartada`, `concluida`.
3. Manter a medição de aceite em função pura (`resumirAceite`), fora do banco e
   fora da UI, para ser testável e reutilizável pelo Decision Center.
4. Persistir também quando a IA falha: os sinais são determinísticos e valem por
   si; perder a leitura por indisponibilidade do modelo seria regressão.

## Consequências

- Decision Accuracy do Advisor passa a ter fonte de verdade.
- Acesso restrito à gestão do workspace; UPDATE limitado por coluna.
- Custo: duas tabelas novas e uma escrita por briefing gerado.
