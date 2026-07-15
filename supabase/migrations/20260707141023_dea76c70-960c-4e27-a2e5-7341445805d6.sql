
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'comercial', 'atendimento', 'financeiro');

CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- new user -> profile + default role
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE first_user BOOLEAN;
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT COUNT(*) = 0 INTO first_user FROM public.user_roles;
  IF first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'atendimento'))
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CLIENTS
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  razao_social TEXT NOT NULL,
  documento TEXT,
  contato_responsavel TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  tipo TEXT NOT NULL DEFAULT 'recorrente',
  drive_url TEXT,
  notion_url TEXT,
  ai_notes TEXT,
  observacoes_internas TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage clients" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.client_socials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plataforma TEXT NOT NULL,
  link TEXT,
  login TEXT,
  senha TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_socials TO authenticated;
GRANT ALL ON public.client_socials TO service_role;
ALTER TABLE public.client_socials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage client_socials" ON public.client_socials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FUNNEL STAGES
CREATE TABLE public.funnel_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  is_won BOOLEAN NOT NULL DEFAULT false,
  is_lost BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_stages TO authenticated;
GRANT ALL ON public.funnel_stages TO service_role;
ALTER TABLE public.funnel_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view stages" ON public.funnel_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage stages" ON public.funnel_stages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.funnel_stages (nome, ordem, is_won, is_lost) VALUES
('Novo lead',0,false,false),
('Contato realizado',1,false,false),
('Reunião marcada',2,false,false),
('Proposta enviada',3,false,false),
('Negociação',4,false,false),
('Fechado (ganho)',5,true,false),
('Perdido',6,false,true);

-- LEADS
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  empresa TEXT,
  contato TEXT,
  origem TEXT,
  responsavel TEXT,
  stage_id UUID REFERENCES public.funnel_stages(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'recorrente',
  valor NUMERIC NOT NULL DEFAULT 0,
  proposta_url TEXT,
  converted_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage leads" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.lead_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'nota',
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_interactions TO authenticated;
GRANT ALL ON public.lead_interactions TO service_role;
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage lead_interactions" ON public.lead_interactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CONTRACTS
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'contrato',
  valor NUMERIC NOT NULL DEFAULT 0,
  data_inicio DATE,
  data_fim DATE,
  forma_pagamento TEXT,
  recorrencia TEXT NOT NULL DEFAULT 'mensal',
  status TEXT NOT NULL DEFAULT 'rascunho',
  arquivo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage contracts" ON public.contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_contracts_updated BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FINANCE
CREATE TABLE public.finance_settings (
  id INT PRIMARY KEY DEFAULT 1,
  pct_imposto NUMERIC NOT NULL DEFAULT 15,
  pct_caixa NUMERIC NOT NULL DEFAULT 60,
  pct_comissao NUMERIC NOT NULL DEFAULT 10,
  pct_ferramentas NUMERIC NOT NULL DEFAULT 15,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_settings TO authenticated;
GRANT ALL ON public.finance_settings TO service_role;
ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fin view settings" ON public.finance_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Fin manage settings" ON public.finance_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'admin'));
INSERT INTO public.finance_settings (id) VALUES (1);

CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  descricao TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  data_pagamento DATE,
  data_vencimento DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  responsavel_comissao TEXT,
  pct_imposto NUMERIC NOT NULL DEFAULT 15,
  pct_caixa NUMERIC NOT NULL DEFAULT 60,
  pct_comissao NUMERIC NOT NULL DEFAULT 10,
  pct_ferramentas NUMERIC NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fin manage payments" ON public.payments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DELIVERABLES
CREATE TABLE public.deliverable_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliverable_categories TO authenticated;
GRANT ALL ON public.deliverable_categories TO service_role;
ALTER TABLE public.deliverable_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view dcat" ON public.deliverable_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage dcat" ON public.deliverable_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.deliverable_categories (nome) VALUES ('Post'),('Arte'),('Relatório'),('Vídeo');

CREATE TABLE public.deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  categoria TEXT,
  data_entrega DATE,
  data_prazo DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliverables TO authenticated;
GRANT ALL ON public.deliverables TO service_role;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage deliverables" ON public.deliverables FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_deliverables_updated BEFORE UPDATE ON public.deliverables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CONTENT POSTS
CREATE TABLE public.content_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  data_post DATE NOT NULL,
  tema TEXT NOT NULL,
  pauta TEXT,
  status TEXT NOT NULL DEFAULT 'em producao',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_posts TO authenticated;
GRANT ALL ON public.content_posts TO service_role;
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage content_posts" ON public.content_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.content_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MEETINGS
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'alinhamento',
  data_evento TIMESTAMPTZ NOT NULL,
  gravacao_url TEXT,
  participantes TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage meetings" ON public.meetings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_meetings_updated BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- NPS
CREATE TABLE public.nps_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  nota INT NOT NULL,
  comentario TEXT,
  data_avaliacao DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nps_records TO authenticated;
GRANT ALL ON public.nps_records TO service_role;
ALTER TABLE public.nps_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage nps" ON public.nps_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- COMPANY SETTINGS
CREATE TABLE public.company_settings (
  id INT PRIMARY KEY DEFAULT 1,
  nome TEXT NOT NULL DEFAULT 'Rhema Estratégia',
  logo_url TEXT,
  cnpj TEXT,
  info_fiscal TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_company CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view company" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage company" ON public.company_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.company_settings (id) VALUES (1);
