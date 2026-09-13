# ADR-008 — Time de agentes especializados e governança de decisão

- Status: aceito
- Data: 2026-07-31
- Contexto: Sprint 10.5 (Alpha Readiness)

## Contexto

A plataforma cresceu para múltiplos contextos (pessoas, vendas, imóveis,
automação, decisão). Entregas conduzidas como "tarefas" produziam erosão de
arquitetura: regras de domínio vazando para a interface, duplicação de dados e
decisões sem registro.

## Decisão

1. Instituir 16 skills especializadas em `.skills/<skill>/SKILL.md`, cada uma
   com missão, entradas, saídas, checklist, critérios de aceite e restrições.
2. Toda decisão arquitetural segue o fluxo Product Manager → Chief Architect →
   Domain Guardian → Security Officer → implementação.
3. Todo relatório de sprint traz as seções fixas **Skills em Execução** e
   **Saúde da Plataforma** (modelo em `docs/templates/relatorio-sprint.md`).
4. Security Officer e Domain Guardian não implementam: apenas validam e podem
   reprovar a entrega.

## Consequências

- Positivas: responsabilidade explícita, rastreabilidade das validações,
  paralelismo com regras compartilhadas, defesa contra erosão do domínio.
- Negativas: overhead de processo em mudanças triviais — mitigado permitindo
  fast-track (PM + Domain Guardian) para correções sem impacto de schema,
  permissão ou contrato de evento.