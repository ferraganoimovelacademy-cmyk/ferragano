-- 1) Superfície pública/logada -------------------------------------------------
REVOKE ALL ON public.public_form_hits FROM authenticated;
GRANT ALL ON public.public_form_hits TO service_role;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.opportunities_sync_estagio() FROM authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.memory_validate_decision() FROM authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.memory_validate_lesson() FROM authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.org_validate_usage() FROM authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.org_validate_version() FROM authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_person_estagio(uuid) FROM authenticated, PUBLIC;

-- 2) Rastreamento real do lead -------------------------------------------------
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS campanha text,
  ADD COLUMN IF NOT EXISTS utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rota_origem text,
  ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE UNIQUE INDEX IF NOT EXISTS opportunities_dedupe_uidx
  ON public.opportunities (workspace_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS opportunities_origem_idx
  ON public.opportunities (workspace_id, origem, created_at DESC);

-- 3) Histórico de etapa --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.opportunity_stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  de_estagio text,
  para_estagio text NOT NULL,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS opportunity_stage_events_op_idx
  ON public.opportunity_stage_events (opportunity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS opportunity_stage_events_ws_idx
  ON public.opportunity_stage_events (workspace_id, created_at DESC);

GRANT SELECT ON public.opportunity_stage_events TO authenticated;
GRANT ALL ON public.opportunity_stage_events TO service_role;

ALTER TABLE public.opportunity_stage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stage events visiveis ao workspace" ON public.opportunity_stage_events;
CREATE POLICY "stage events visiveis ao workspace"
  ON public.opportunity_stage_events
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE OR REPLACE FUNCTION public.opportunities_log_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.opportunity_stage_events
      (workspace_id, opportunity_id, de_estagio, para_estagio, actor_id)
    VALUES (NEW.workspace_id, NEW.id, NULL, NEW.estagio::text, NEW.criado_por);
    RETURN NEW;
  END IF;

  IF NEW.estagio IS DISTINCT FROM OLD.estagio THEN
    INSERT INTO public.opportunity_stage_events
      (workspace_id, opportunity_id, de_estagio, para_estagio, actor_id)
    VALUES (NEW.workspace_id, NEW.id, OLD.estagio::text, NEW.estagio::text, auth.uid());
    NEW.stage_entrou_em := now();
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.opportunities_log_stage() FROM authenticated, PUBLIC;

DROP TRIGGER IF EXISTS trg_opportunities_log_stage_ins ON public.opportunities;
CREATE TRIGGER trg_opportunities_log_stage_ins
  AFTER INSERT ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.opportunities_log_stage();

DROP TRIGGER IF EXISTS trg_opportunities_log_stage_upd ON public.opportunities;
CREATE TRIGGER trg_opportunities_log_stage_upd
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.opportunities_log_stage();

-- 4) Funil dos leads do site ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.site_lead_funnel(_workspace_id uuid, _dias integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _desde timestamptz := now() - make_interval(days => greatest(_dias, 1));
  _resultado jsonb;
BEGIN
  IF NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'acesso negado ao workspace';
  END IF;

  SELECT jsonb_build_object(
    'total', (
      SELECT count(*) FROM public.opportunities o
      WHERE o.workspace_id = _workspace_id AND o.created_at >= _desde
        AND o.origem IN ('site', 'landing_page')
    ),
    'ganhos', (
      SELECT count(*) FROM public.opportunities o
      WHERE o.workspace_id = _workspace_id AND o.created_at >= _desde
        AND o.origem IN ('site', 'landing_page') AND o.estagio::text = 'ganho'
    ),
    'perdidos', (
      SELECT count(*) FROM public.opportunities o
      WHERE o.workspace_id = _workspace_id AND o.created_at >= _desde
        AND o.origem IN ('site', 'landing_page') AND o.estagio::text = 'perdido'
    ),
    'etapas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('estagio', t.estagio, 'total', t.total) ORDER BY t.total DESC)
      FROM (
        SELECT o.estagio::text AS estagio, count(*) AS total
        FROM public.opportunities o
        WHERE o.workspace_id = _workspace_id AND o.created_at >= _desde
          AND o.origem IN ('site', 'landing_page')
        GROUP BY 1
      ) t
    ), '[]'::jsonb),
    'leads', COALESCE((
      SELECT jsonb_agg(l ORDER BY l->>'created_at' DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', o.id,
          'titulo', o.titulo,
          'pessoa', p.nome,
          'estagio', o.estagio::text,
          'origem', o.origem::text,
          'campanha', o.campanha,
          'rota_origem', o.rota_origem,
          'utm', o.utm,
          'score', o.score,
          'temperatura', o.temperatura::text,
          'empreendimento', e.nome,
          'unidade', u.identificador,
          'created_at', o.created_at,
          'stage_entrou_em', o.stage_entrou_em,
          'eventos', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'de', se.de_estagio, 'para', se.para_estagio, 'em', se.created_at
            ) ORDER BY se.created_at)
            FROM public.opportunity_stage_events se
            WHERE se.opportunity_id = o.id
          ), '[]'::jsonb)
        ) AS l
        FROM public.opportunities o
        LEFT JOIN public.people p ON p.id = o.person_id
        LEFT JOIN public.empreendimentos e ON e.id = o.empreendimento_id
        LEFT JOIN public.unidades u ON u.id = o.unidade_id
        WHERE o.workspace_id = _workspace_id AND o.created_at >= _desde
          AND o.origem IN ('site', 'landing_page')
        ORDER BY o.created_at DESC
        LIMIT 50
      ) s
    ), '[]'::jsonb)
  ) INTO _resultado;

  RETURN _resultado;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.site_lead_funnel(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_lead_funnel(uuid, integer) TO authenticated, service_role;