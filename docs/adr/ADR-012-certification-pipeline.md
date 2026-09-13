# ADR-012 — Pipeline de certificação antes do deploy

**Status:** aceito (Sprint 12.5)
**Contexto:** Sprint 12.5 — Security & Production Certification

## Contexto

O Ferragano One passou a ter usuários reais em vista. Arquitetura e
funcionalidade já eram revisadas por skills, mas nada impedia tecnicamente um
deploy com regressão de segurança ou de performance. A Sprint 12 encontrou um
vazamento de privilégio em observabilidade e a 12.5 encontrou nove funções
internas executáveis sem sessão — ambos por auditoria manual, não por processo.

## Decisão

Todo release passa por um pipeline de certificação com quatro barreiras
automáticas, nesta ordem:

1. **Isolamento** — `tests/isolation/` precisa passar integralmente.
2. **Ataque** — `tests/security/` precisa passar integralmente.
3. **Caos** — `tests/chaos/` precisa passar integralmente.
4. **Budget** — `bloqueiaRelease()` não pode apontar violação bloqueante.

Além disso, quatro invariantes de banco são verificadas por consulta: tabela em
`public` sem RLS = 0; função em `public` executável por `anon` = 0;
materialized view legível por `anon` = 0; bucket público = 0.

Aviso do linter só é aceito quando pertence a uma classe justificada em
`certification/SECURITY.md`. Aviso novo bloqueia.

## Consequências

- Nenhuma função `SECURITY DEFINER` nova entra sem checagem de vínculo na
  primeira instrução e sem teste de negação correspondente.
- Nenhuma coluna nova de tabela da vitrine é exposta por padrão: o `GRANT` é por
  coluna, então coluna nova nasce privada.
- O custo é tempo de suíte (~10 s). Aceito.
- A skill **Release Manager** (#20) é dona deste pipeline.