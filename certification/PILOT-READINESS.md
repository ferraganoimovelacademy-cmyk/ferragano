# 🚀 GATE S06 — Pilot Readiness

## Checklist de entrada em operação piloto

### Plataforma
- [x] RLS em 100% das tabelas (`public`), 176 policies
- [x] Nenhuma função interna executável sem sessão
- [x] Vitrine pública sem coluna interna
- [x] Worker do Outbox agendado (1 min) e autenticado
- [x] Refresh dos Read Models agendado (10 min)
- [x] Avaliação de alertas ativa (`platform_alerts`)
- [x] Telemetria e métricas gravando (`platform_telemetry`, `platform_metrics`)
- [x] Health Score visível em `/app/platform`
- [x] Saúde operacional visível em `/app/admin/health`

### Operação
- [ ] Workspace do piloto criado com funil e permissões semeados
- [ ] Usuários reais convidados com papel correto (corretor/gerente)
- [ ] Dado sintético removido do workspace de piloto
- [ ] Empreendimentos e unidades reais cadastrados
- [ ] Canal de feedback definido (skill Customer Success)
- [ ] Responsável de plantão definido para a primeira semana

### Critérios de sucesso do piloto (30 dias)

| Indicador | Meta |
| --- | --- |
| Corretores ativos por semana | ≥ 80% dos convidados |
| Oportunidades criadas no sistema | 100% das reais |
| Eventos do Outbox em falha | 0 sustentado |
| Health Score | ≥ 90 (Gold) |
| Incidente de isolamento | 0 |
| Adesão à recomendação do Decision Engine | medida, sem meta no piloto |

### Registro de incidentes

| Data | Incidente | Impacto | Correção | Gate afetado |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |