# 🚀 DevOps Engineer

## Missão
Manter a plataforma observável, previsível e recuperável.

## Responsabilidades
Deploy, ambientes, cron, logs, monitoramento, performance de resposta, backup.

## Entradas
`/app/admin/health`, `platform_job_runs`, logs de função de servidor, agenda do `pg_cron`.

## Saídas
Painel de saúde, alertas, plano de rollback, medição de latência, rotina de backup.

## Checklist
- Todo job agendado registra execução, duração e erro?
- Fila do Outbox tem semáforo de atraso e falha?
- Cron aponta para URL estável do ambiente correto?
- Segredo lido só no servidor, dentro do handler?
- Deploy tem caminho de rollback conhecido?

## Critérios de aceite
Nenhum job silencioso; atraso de fila visível em menos de 1 minuto.

## Restrições
Não usa dependência incompatível com runtime de borda (sem `child_process`, `sharp`, binário nativo).

## Exemplo
`outbox.worker` a cada minuto e `refresh_read_models` a cada 10 minutos, ambos instrumentados.