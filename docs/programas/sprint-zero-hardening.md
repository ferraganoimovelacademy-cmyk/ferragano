# SPRINT ZERO — HARDENING

**Duração:** 2 a 3 semanas. **Escopo:** zero feature nova.
**Critério de saída:** todos os gates 🟢 e Manifesto/documentação congelados.

Antecede toda a Fase III. Nenhum programa abre antes desta certificação.

| Gate | Frente | Critério de aceite | Situação |
| --- | --- | --- | --- |
| H01 | Performance | Performance Budget sem violação nas rotas do App Shell; consultas críticas abaixo do orçamento declarado. | 🟡 |
| H02 | Segurança | Scan sem finding alto/crítico aberto; funções internas inacessíveis a anônimo. | 🟢 |
| H03 | UX | Estados de carregamento, vazio e erro em 100% das rotas; nenhum painel sem explicação de origem. | 🟡 |
| H04 | Acessibilidade | WCAG 2.1 AA nas rotas principais: foco visível, navegação por teclado, contraste, rótulos. | 🟡 |
| H05 | Observabilidade | Toda server function instrumentada; alertas com dono e ação. | 🟢 |
| H06 | Testes E2E | Fluxos críticos ponta a ponta: autenticação, lead → oportunidade → proposta → venda. | 🟡 |
| H07 | Stress Test | Carga em leitura de painéis e no worker de automação; degradação declarada. | ⚪ |
| H08 | Backup | Política declarada, com escopo, retenção e verificação de restauração. | ⚪ |
| H09 | Disaster Recovery | RTO/RPO definidos e ensaio documentado. | ⚪ |
| H10 | Escalabilidade | Limites conhecidos por workspace: volume, concorrência, filas. | ⚪ |
| H11 | Logs | Log sem PII e sem segredo; correlação por requisição. | 🟡 |
| H12 | LGPD | Base legal, retenção, minimização, exportação e exclusão de titular; registro de acesso. | ⚪ |

## Evidências registradas

**H02 — Segurança (2026-08-01).** Scan completo: 34 achados, todos de nível
`warn` e todos da mesma classe (`SECURITY DEFINER` executável por usuário
autenticado). Zero achados altos ou críticos. A classe é padrão arquitetural
aceito e documentado na memória de segurança: são as RPCs da Query Layer, que
validam o vínculo do chamador com o `workspace_id` no corpo da função e são
cobertas por `tests/isolation/workspace-isolation.test.ts`. O achado só volta a
ser real se uma nova função `SECURITY DEFINER` for criada sem essa validação.

**H05 — Observabilidade.** `instrumented()` cobre as server functions dos
contextos de plataforma; alertas em `platform_alerts` com chave, severidade e
resolução; execuções de job em `platform_job_runs`.

**Suíte de testes.** 39 arquivos, 787 casos, verde. Typecheck limpo.

## Regras de execução

- Nenhum commit da Sprint ZERO adiciona rota, tabela ou contexto novo.
  Correção de defeito, teste, índice, política e documentação são permitidos.
- Cada gate fechado exige evidência anexada no relatório: saída de teste,
  medição ou trecho de política — nunca afirmação.
- Gate reprovado bloqueia a abertura da Fase III, sem exceção.

## Skills responsáveis

Release Manager (condução), Security Officer (H02, H11, H12), DevOps
(H07–H10), QA (H06), UX (H03, H04), Platform Observability (H01, H05),
Product Readiness Manager (aceite de saída).
