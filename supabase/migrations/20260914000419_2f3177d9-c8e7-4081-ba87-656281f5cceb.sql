-- Funções chamadas exclusivamente pelo service role (jobs/cron/bootstrap).
-- Usuário autenticado não tem motivo para executá-las diretamente.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname IN (
        'claim_outbox_batch',
        'complete_outbox_event',
        'log_job_run',
        'rollup_automation_daily_metrics',
        'refresh_read_models',
        'evaluate_platform_alerts',
        'upsert_platform_alert',
        'seed_role_permissions',
        'seed_admin_module_access',
        'seed_default_pipeline',
        'seed_automation_rules',
        'public_form_rate_check',
        'handle_new_user',
        'record_platform_metric'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
