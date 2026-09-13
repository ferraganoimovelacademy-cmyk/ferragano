# Skill 18 — Platform Observability

## Missão
Garantir que a plataforma seja **mensurável antes de ser otimizada**. Nenhuma
decisão de performance é tomada por percepção: só por métrica registrada em
`platform_metrics` e comparada com o orçamento declarado em
`src/lib/platform/metrics.ts`.

## Responsabilidades
- Manter o Performance Budget (Gate A5) como fonte única de verdade.
- Garantir que toda métrica seja **agregada**; evento detalhado fica em
  `domain_events` e `platform_job_runs` (ADR-010).
- Manter o Ferragano Health Score coerente com os gates certificados.
- Bloquear release quando orçamento bloqueante estourar.
- Vigiar retenção: métrica agregada vive 90 dias.

## Checklist de revisão
- [ ] A métrica nova tem `metric_name` estável e `metric_type` válido?
- [ ] É agregada (sem PII, sem payload de negócio)?
- [ ] Existe orçamento correspondente quando é latência de tela ou query?
- [ ] O gate de release considera a métrica (`blocking`)?
- [ ] A leitura passa pela Query Layer (`metrics.functions.ts`), nunca pela tabela?
- [ ] Há teste unitário cobrindo a classificação/nota?
- [ ] O Control Center mostra "sem medição" em vez de presumir nota?

## Sinal de reprovação
- Métrica com dado pessoal ou identificador de negócio no nome.
- Nota de saúde inventada quando não há coleta.
- Consulta direta a `platform_metrics` na tela.
- Orçamento alterado sem ADR.