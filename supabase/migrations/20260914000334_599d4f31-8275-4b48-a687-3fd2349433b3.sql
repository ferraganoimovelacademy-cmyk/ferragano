-- 1) Zera privilégios diretos de `anon` em todo o schema public (tabelas, views, matviews).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p')
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', r.relname);
  END LOOP;
END $$;

-- 2) Read Models: nenhuma leitura direta (matview não aplica RLS).
--    A leitura acontece só pelas funções read_*_360, que validam workspace/papel.
REVOKE ALL ON public.customer_360 FROM anon, authenticated;
REVOKE ALL ON public.executive_360 FROM anon, authenticated;
REVOKE ALL ON public.sales_360 FROM anon, authenticated;
REVOKE ALL ON public.property_360 FROM anon, authenticated;
REVOKE ALL ON public.marketing_360 FROM anon, authenticated;
GRANT SELECT ON public.customer_360 TO service_role;
GRANT SELECT ON public.executive_360 TO service_role;
GRANT SELECT ON public.sales_360 TO service_role;
GRANT SELECT ON public.property_360 TO service_role;
GRANT SELECT ON public.marketing_360 TO service_role;

-- 3) Vitrine pública: somente leitura, nas tabelas que já têm policy para anon.
GRANT SELECT ON public.empreendimentos TO anon;
GRANT SELECT ON public.property_knowledge TO anon;
GRANT SELECT ON public.property_media TO anon;
GRANT SELECT ON public.landing_pages TO anon;

-- 4) `unidades`: projeção segura por coluna. Colunas internas (comissao_percentual,
--    perfil_ideal, argumentos, objecoes, score_liquidez, campanha, workspace_id,
--    criado_por, tower_id, release_id) ficam fora do alcance de `anon`.
GRANT SELECT (
  id,
  empreendimento_id,
  identificador,
  tipologia,
  dormitorios,
  suites,
  vagas,
  varanda,
  deposito,
  area_privativa,
  area_total,
  andar,
  final,
  preco,
  status,
  created_at,
  updated_at
) ON public.unidades TO anon;

-- 5) public_form_hits: RLS habilitada e sem policy = negado para anon/authenticated.
--    A escrita/leitura acontece apenas pelo service role (antispam server-side).
GRANT SELECT, INSERT ON public.public_form_hits TO service_role;
COMMENT ON TABLE public.public_form_hits IS
  'Rate limiting dos formulários públicos. Sem policy por decisão: acessível apenas pelo service role (antispam server-side). Nunca guarda IP em texto, só fingerprint.';

-- 6) Funções: remove EXECUTE de PUBLIC e de `anon`; mantém authenticated/service_role.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;

-- 7) O trigger de criação de perfil roda no contexto do Auth: preserva o EXECUTE.
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
