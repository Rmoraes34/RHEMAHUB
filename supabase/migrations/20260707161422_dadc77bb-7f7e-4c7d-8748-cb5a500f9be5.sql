-- 1. Vendedor no CRM + perfil no membro de equipe
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS perfil text NOT NULL DEFAULT 'atendimento';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS vendedor_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL;

-- 2. Permissões granulares por usuário (override do padrão do perfil)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS modulos jsonb;

-- 3. Logo do cliente (armazenado como data URL)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS logo_url text;

-- 4. Base de Dados do Cliente (feed de conhecimento)
CREATE TABLE IF NOT EXISTS public.client_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  data_registro date NOT NULL DEFAULT current_date,
  resumo text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  autor text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_knowledge TO authenticated;
GRANT ALL ON public.client_knowledge TO service_role;
ALTER TABLE public.client_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage client_knowledge" ON public.client_knowledge
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_client_knowledge_updated_at BEFORE UPDATE ON public.client_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Integrações de IA (chaves de API, somente admin)
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id integer PRIMARY KEY DEFAULT 1,
  default_provider text NOT NULL DEFAULT 'gemini',
  gemini_key text,
  openai_key text,
  anthropic_key text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_settings_singleton CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE ON public.ai_settings TO authenticated;
GRANT ALL ON public.ai_settings TO service_role;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai_settings" ON public.ai_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.ai_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;