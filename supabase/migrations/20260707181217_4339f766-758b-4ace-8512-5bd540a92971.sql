
-- 1. Identidade de Marca: novas colunas em clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS brand_historia text,
  ADD COLUMN IF NOT EXISTS brand_objetivo text,
  ADD COLUMN IF NOT EXISTS brand_publico text,
  ADD COLUMN IF NOT EXISTS brand_tom_voz text,
  ADD COLUMN IF NOT EXISTS brand_valores text,
  ADD COLUMN IF NOT EXISTS brand_logo_url text,
  ADD COLUMN IF NOT EXISTS brand_fontes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_paleta text[] NOT NULL DEFAULT '{}';

-- 2. Notion na reunião
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS notion_url text;

-- 3. Capacidade editável na equipe
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS capacidade text;

-- 4. Token do Notion (integração)
ALTER TABLE public.ai_settings ADD COLUMN IF NOT EXISTS notion_token text;

-- 5. Catálogo geral de formulários
CREATE TABLE IF NOT EXISTS public.form_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  categoria text,
  url text,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_templates TO authenticated;
GRANT ALL ON public.form_templates TO service_role;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage form_templates" ON public.form_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_form_templates_updated_at BEFORE UPDATE ON public.form_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Formulários enviados a um cliente
CREATE TABLE IF NOT EXISTS public.client_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.form_templates(id) ON DELETE SET NULL,
  nome text,
  data_envio date NOT NULL DEFAULT current_date,
  resposta_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_forms TO authenticated;
GRANT ALL ON public.client_forms TO service_role;
ALTER TABLE public.client_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage client_forms" ON public.client_forms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_client_forms_updated_at BEFORE UPDATE ON public.client_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Atalhos (subpastas nomeadas) do cliente — aceita qualquer URL
CREATE TABLE IF NOT EXISTS public.client_shortcuts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  nome text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_shortcuts TO authenticated;
GRANT ALL ON public.client_shortcuts TO service_role;
ALTER TABLE public.client_shortcuts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage client_shortcuts" ON public.client_shortcuts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_client_shortcuts_updated_at BEFORE UPDATE ON public.client_shortcuts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
