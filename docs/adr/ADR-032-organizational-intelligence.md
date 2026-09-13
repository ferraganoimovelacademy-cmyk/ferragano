# ADR-032 — Organizational Intelligence: conhecimento versionado e auditável

Status: aceito (Sprint 29)
Contextos: `Organizational Intelligence` (novo), `Enterprise Memory`, `Knowledge`

## Contexto

A Enterprise Memory (ADR-031) registra o que a empresa decidiu, executou e aprendeu.
Ela não registra **como o conhecimento evoluiu**: um playbook na versão 3 não explica
por que deixou de ser a versão 1. Sem esse registro, o conhecimento institucional é
substituído silenciosamente e perde auditabilidade.

## Decisão

1. **Conhecimento é versionado, nunca sobrescrito.** Cada nova versão nasce como um
   registro novo em `org_knowledge_versions`; a anterior recebe `substituida_em` e
   permanece legível. Nenhuma rotina apaga versão.
2. **Toda versão declara quatro coisas**: o que mudou, por que mudou, qual evidência
   motivou a mudança e quem aprovou. Sem evidência, o registro é rejeitado — no banco,
   por trigger, e não apenas no formulário.
3. **Vigência é critério objetivo, não opinião.** `SLA_VIGENCIA_DIAS` define por
   entidade quando um conhecimento entra em revisão e quando é considerado
   potencialmente desatualizado. Cada avaliação devolve os critérios que a
   produziram.
4. **Linhagem só liga o que está ligado.** Lição → decisão/campanha de origem →
   playbooks do mesmo tema → reusos registrados. Elo ausente vira lacuna declarada;
   nunca é preenchido por semelhança presumida.
5. **A crônica executiva descreve sequência, nunca causa.** Herda ADR-026: o texto
   sempre acompanha `AVISO_SEM_CAUSALIDADE`.
6. **Indicador sem medição fica sem valor.** `scoreInstitucional` devolve `null` na
   dimensão não medida e renormaliza os pesos das dimensões existentes; não há
   substituição por zero, média ou estimativa.
7. **Registrar evolução é ato de governança**: restrito a proprietário/administrador.
   Registrar reuso é ato de operação, aberto a membros do workspace.

## Consequências

- É possível responder "por que hoje operamos assim?" navegando de v3 até v1.
- A curva de aprendizado passa a ser medida (completude das decisões e intervalo
  entre decisão e lição), não afirmada.
- Custo aceito: registrar evolução exige esforço humano — evidência e aprovador não
  são gerados automaticamente. Essa fricção é intencional.

## Onde vive

`org_knowledge_versions`, `org_knowledge_usage`,
`src/lib/platform/organizational.ts`, `src/lib/platform/organizational.functions.ts`,
`/app/institucional`.