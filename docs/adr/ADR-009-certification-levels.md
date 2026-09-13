# ADR-009 — Níveis de certificação de entrega

## Contexto

Até a Sprint 10.5 as entregas eram aprovadas com `PASS` ou
`PASS COM PENDÊNCIAS`. Esse par não distingue pendência cosmética de
bloqueador de operação, o que permite acumular dívida silenciosa às portas do
piloto com corretores reais. A Sprint 10.6 fechou pendências de UX que já
haviam sido declaradas "não bloqueantes" — sinal de que a escala anterior
classificava mal o risco.

## Decisão

Toda entrega, a partir do Alpha, recebe um dos quatro níveis:

| Nível | Significado | Efeito |
|-------|-------------|--------|
| 🟢 CERTIFIED | Todos os gates verdes, evidência executada | Libera release |
| 🟡 CERTIFIED WITH WARNINGS | Gates verdes com pendência não bloqueante e prazo definido | Libera release com pendência registrada |
| 🟠 RELEASE BLOCKED | Gate obrigatório aberto (segurança, isolamento, fluxo crítico) | Não libera release |
| 🔴 REJECTED | Entrega quebra domínio, dado ou contrato existente | Reverter e refazer |

Regras:

1. O nível é atribuído pelo QA Engineer, homologado pelo Chief Architect e
   vetado pelo Security Officer quando houver risco de dado.
2. Gate sem evidência executada não conta como verde — vira `N/A` e rebaixa o
   nível para 🟠 quando o gate é obrigatório.
3. 🟡 exige prazo e responsável por pendência; sem isso vira 🟠.
4. Gates obrigatórios do Alpha: A1 (sem `window.prompt`), A2 (operação por
   teclado no Kanban), A3 (fluxo E2E), A4 (isolamento entre workspaces),
   Gate 03 (RLS/least privilege) e Gate 04 (observabilidade).

## Alternativas descartadas

- **Manter `PASS` / `PASS COM PENDÊNCIAS`**: não separa pendência cosmética de
  bloqueador; foi exatamente o que gerou dívida na 10.5.
- **Nota numérica (0–100) por sprint**: agrega demais e esconde qual gate
  falhou; a Saúde da Plataforma já cumpre o papel de indicador contínuo.
- **Bloquear release em qualquer pendência (só 🟢 ou 🔴)**: pararia a evolução
  por detalhe cosmético e incentivaria omitir pendência do relatório.

## Consequências

- O relatório de sprint comunica risco de release, não esforço.
- Pendência sem responsável deixa de existir.
- O pipeline do Gate A5 pode reprovar automaticamente com base no nível.
- Custo: cada gate precisa de evidência executável, o que alonga a sprint.

## Status

Aceito — 2026-07-31.

## Referências

- `docs/templates/relatorio-sprint.md`
- `docs/blueprint/20-alpha-certification.md`
- `.skills/qa/SKILL.md`, `.skills/architect/SKILL.md`, `.skills/security/SKILL.md`
- `tests/isolation/workspace-isolation.test.ts`, `tests/e2e/`