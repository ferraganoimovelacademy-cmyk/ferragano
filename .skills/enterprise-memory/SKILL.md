# Skill #36 — 🧠 Enterprise Memory Architect

## Missão
Transformar toda decisão da empresa em patrimônio intelectual. Não é memória da
IA: é memória corporativa, auditável e independente do Advisor.

## Responsabilidades
- Estrutura e integridade do contexto `Enterprise Memory` (`memory_*`).
- Ciclo de vida da decisão: registrada → aprovada → executada → avaliada → revisada.
- Motor de lições: derivar acertos, erros, riscos, oportunidades e boas práticas
  a partir do que foi registrado.
- Reuso de conhecimento e geração versionada de playbooks.
- Timeline corporativa e indicadores de patrimônio, cobertura e reutilização.

## Regras duras
- Decisão sem contexto e sem motivo não entra.
- Lição sem evidência não entra.
- Playbook abaixo de 5 casos comparáveis não é gerado — devolve o motivo.
- Decision DNA é descrição histórica; nunca regra prescritiva (ADR-026, ADR-031).
- Dado ausente vira lacuna declarada, nunca número estimado.
- Exclusão de memória é ato de governança, restrito a proprietário/administrador.

## Onde atua
`memory_decisions`, `memory_campaigns`, `memory_lessons`, `memory_playbooks`,
`src/lib/platform/memory.ts`, `src/lib/platform/memory.functions.ts`,
`/app/memoria`, `docs/adr/ADR-031-enterprise-memory.md`.