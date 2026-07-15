CREATE TABLE public.list_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_key TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.list_options TO authenticated;
GRANT ALL ON public.list_options TO service_role;

ALTER TABLE public.list_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read list options" ON public.list_options
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage list options" ON public.list_options
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.list_options (list_key, value, label, ordem) VALUES
  ('service_categories', 'Social Media', 'Social Media', 0),
  ('service_categories', 'Identidade Visual / Branding', 'Identidade Visual / Branding', 1),
  ('service_categories', 'Site / Landing Page', 'Site / Landing Page', 2),
  ('service_categories', 'Estratégia / Consultoria', 'Estratégia / Consultoria', 3),
  ('service_categories', 'Audiovisual', 'Audiovisual', 4),
  ('service_categories', 'Tráfego Pago', 'Tráfego Pago', 5),
  ('service_categories', 'Outro', 'Outro', 6),
  ('edition_statuses', 'pendente', 'Em edição', 0),
  ('edition_statuses', 'agendado', 'Agendado', 1),
  ('edition_statuses', 'publicado', 'Publicado', 2);