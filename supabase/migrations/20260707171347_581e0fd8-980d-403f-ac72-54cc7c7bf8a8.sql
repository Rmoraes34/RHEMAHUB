
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS servico text,
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS drive_url text,
  ADD COLUMN IF NOT EXISTS qtd_por_periodo integer,
  ADD COLUMN IF NOT EXISTS duracao_meses integer,
  ADD COLUMN IF NOT EXISTS resumo_final text;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS pauta text,
  ADD COLUMN IF NOT EXISTS meet_url text,
  ADD COLUMN IF NOT EXISTS google_event_id text,
  ADD COLUMN IF NOT EXISTS criar_meet boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_email text;

CREATE TABLE IF NOT EXISTS public.contract_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  quantidade integer NOT NULL DEFAULT 0,
  data_entrega date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_deliveries TO authenticated;
GRANT ALL ON public.contract_deliveries TO service_role;
ALTER TABLE public.contract_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage contract_deliveries" ON public.contract_deliveries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.app_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  url text NOT NULL,
  categoria text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_links TO authenticated;
GRANT ALL ON public.app_links TO service_role;
ALTER TABLE public.app_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage app_links" ON public.app_links
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_app_links_updated BEFORE UPDATE ON public.app_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
