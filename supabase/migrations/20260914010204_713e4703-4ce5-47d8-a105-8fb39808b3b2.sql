REVOKE EXECUTE ON FUNCTION public.opportunities_log_stage() FROM anon;
REVOKE EXECUTE ON FUNCTION public.site_lead_funnel(uuid, integer) FROM anon;

DROP POLICY IF EXISTS "public_form_hits sem acesso direto" ON public.public_form_hits;
CREATE POLICY "public_form_hits sem acesso direto"
  ON public.public_form_hits
  FOR SELECT
  TO authenticated
  USING (false);