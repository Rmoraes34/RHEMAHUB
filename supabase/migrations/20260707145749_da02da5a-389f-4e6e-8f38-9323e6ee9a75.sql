
-- SERVICE PACKAGES CATALOG
CREATE TABLE public.service_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outro',
  tipo TEXT NOT NULL DEFAULT 'recorrente',
  descricao TEXT,
  contrato_minimo TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_packages TO authenticated;
GRANT ALL ON public.service_packages TO service_role;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage packages" ON public.service_packages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_packages_updated BEFORE UPDATE ON public.service_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TEAM MEMBERS
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  funcao TEXT,
  email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage team" ON public.team_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_team_updated BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TASKS
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL DEFAULT 'Outro',
  status TEXT NOT NULL DEFAULT 'pendente',
  prioridade TEXT NOT NULL DEFAULT 'media',
  data_prazo DATE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage tasks" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TASK COMMENTS
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_nome TEXT,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage task comments" ON public.task_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CLIENT REPORTS (delivered to client)
CREATE TABLE public.client_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  periodo TEXT,
  data_envio DATE NOT NULL DEFAULT CURRENT_DATE,
  resumo TEXT,
  arquivo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_reports TO authenticated;
GRANT ALL ON public.client_reports TO service_role;
ALTER TABLE public.client_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage client reports" ON public.client_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_client_reports_updated BEFORE UPDATE ON public.client_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CLIENT PACKAGE HISTORY (upgrade/downgrade timeline)
CREATE TABLE public.client_package_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pacote_anterior TEXT,
  pacote_novo TEXT,
  observacao TEXT,
  data_mudanca DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_package_history TO authenticated;
GRANT ALL ON public.client_package_history TO service_role;
ALTER TABLE public.client_package_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage package history" ON public.client_package_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- NEW CLIENT COLUMNS
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS nicho TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS porte TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS data_inicio DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS pacote_atual TEXT;

-- CONTENT POSTS CATEGORY
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'Social Media';

-- CONTRACT PACKAGE LINK
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS service_package_id UUID REFERENCES public.service_packages(id) ON DELETE SET NULL;

-- COMPANY GOALS
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS meta_faturamento NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS meta_fechamentos INT NOT NULL DEFAULT 0;
