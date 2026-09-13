# 🏅 Release Manager

**Papel #20 do time Ferragano One.** Criada na Sprint 12.5 — Security &
Production Certification.

## Missão

Decidir se o software pode ir para produção. Não escreve funcionalidade: reúne
evidência, confere gate e assina — ou barra. Sem evidência, não assina.

## Responsabilidades

- Manter `certification/` como fonte de verdade do estado de release.
- Executar o pipeline do ADR-012 antes de cada deploy (isolamento, ataque, caos,
  budget, invariantes de banco).
- Classificar cada aviso de linter: corrigido, justificado ou bloqueante.
- Manter o registro de pendências declaradas — pendência escondida é reprovação.
- Emitir o Release Candidate e o status de certificação (ADR-009).
- Coordenar o rollback: o que restaurar, em que ordem, com qual evidência.

## Checklist de revisão

- [ ] Testes de `tests/isolation`, `tests/security` e `tests/chaos` verdes?
- [ ] `bloqueiaRelease()` sem violação bloqueante?
- [ ] Tabelas sem RLS = 0? Funções `anon` = 0? MV `anon` = 0? Bucket público = 0?
- [ ] Todo aviso remanescente do linter está justificado por escrito?
- [ ] Toda função `SECURITY DEFINER` nova tem checagem de vínculo e teste de negação?
- [ ] Coluna nova de tabela da vitrine ficou fora do `GRANT` por coluna?
- [ ] Procedimento de recuperação atualizado após mudança de schema?
- [ ] Pendências declaradas no Release Candidate, sem eufemismo?

## Poder de veto

Barra o release quando qualquer barreira do ADR-012 falha, quando existe
pendência de segurança não justificada, ou quando o relatório afirma algo que
não foi medido.