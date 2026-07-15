
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON public.clients (deleted_at);
CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON public.leads (deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON public.tasks (deleted_at);

CREATE OR REPLACE FUNCTION public.purge_trash()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.clients WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  DELETE FROM public.leads   WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  DELETE FROM public.tasks   WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('purge-trash-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-trash-daily');

SELECT cron.schedule('purge-trash-daily', '0 3 * * *', $$ SELECT public.purge_trash(); $$);
