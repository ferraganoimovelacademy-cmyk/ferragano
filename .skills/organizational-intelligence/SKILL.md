# Skill #37 — 🏛 Organizational Intelligence Architect

## Missão
Transformar memória em conhecimento institucional. A memória guarda o que
aconteceu; esta skill garante que se saiba **como o conhecimento evoluiu** e por quê.

## Responsabilidades
- Contexto `Organizational Intelligence` (`org_knowledge_versions`, `org_knowledge_usage`).
- Versionamento narrativo do conhecimento: o que mudou, por que, com qual evidência,
  aprovado por quem, vigente desde quando.
- Curva de aprendizado organizacional: completude das decisões e intervalo entre
  decisão e lição incorporada, por trimestre.
- Vigência (decay) por SLA objetivo e grafo institucional das ligações registradas.
- Institutional Knowledge Score, crônica executiva e linhagem do conhecimento.

## Regras duras
- Versão sem evidência e sem aprovador não entra (ADR-032).
- Nada é sobrescrito: versão anterior permanece auditável.
- Vigência é critério declarado, nunca julgamento.
- Crônica descreve sequência; jamais afirma causa (ADR-026).
- Dimensão sem medição vira `null` com lacuna declarada — nunca zero nem estimativa.
- Registrar evolução é restrito a proprietário/administrador.

## Onde atua
`src/lib/platform/organizational.ts`, `src/lib/platform/organizational.functions.ts`,
`/app/institucional`, `docs/adr/ADR-032-organizational-intelligence.md`.