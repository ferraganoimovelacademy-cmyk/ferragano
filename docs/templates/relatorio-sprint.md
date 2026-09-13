# Modelo de relatório de sprint — Ferragano One

```text
──────────────────────────────────────
FERRAGANO ONE • SPRINT XX
──────────────────────────────────────

STATUS
🟢 CERTIFIED | 🟡 CERTIFIED WITH WARNINGS | 🟠 RELEASE BLOCKED | 🔴 REJECTED

GATES
✅ Gate XX — nome

SKILLS EM EXECUÇÃO

🧠 Chief Architect
Status: PASS
Validação:
• item

(repetir para cada skill que participou; skill que não participou aparece como N/A)

PENDÊNCIAS
• item — responsável (skill) — bloqueia/não bloqueia Alpha

──────────────────────────────
SAÚDE DA PLATAFORMA
──────────────────────────────

Arquitetura ............. 🟢 00%
Segurança ............... 🟢 00%
Performance ............. 🟡 00%
UX ...................... 🟡 00%
Cobertura de Testes ..... 🟡 00%
Blueprint ............... 🟢 000%
ADRs .................... 🟢 000%
Dívida Técnica .......... 🟢 Baixa
Prontidão Alpha ......... 🟢 00%
```

## Regras

- Skill sem evidência não recebe PASS. Sem validação executada = N/A.
- Percentual da Saúde da Plataforma sempre justificado por evidência
  (teste, migração, linter, medição), nunca por impressão.
- Pendência não pode ser removida do relatório sem ADR ou entrega.
- Níveis de certificação e regra de promoção/bloqueio: `docs/adr/ADR-009-certification-levels.md`.