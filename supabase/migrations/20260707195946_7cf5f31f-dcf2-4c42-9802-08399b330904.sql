-- Helper: is the user part of the staff (has any assigned role)?
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;

-- Lock down trigger / maintenance SECURITY DEFINER functions from direct calls
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_post_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_post_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_task_to_post() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_task_for_post(content_posts) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_trash() FROM anon, authenticated;

-- Replace blanket USING(true) policies with staff-scoped access
DROP POLICY IF EXISTS "Auth manage app_links" ON public.app_links;
CREATE POLICY "Staff manage app_links" ON public.app_links FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage client_forms" ON public.client_forms;
CREATE POLICY "Staff manage client_forms" ON public.client_forms FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated manage client_knowledge" ON public.client_knowledge;
CREATE POLICY "Staff manage client_knowledge" ON public.client_knowledge FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage package history" ON public.client_package_history;
CREATE POLICY "Staff manage package history" ON public.client_package_history FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage client reports" ON public.client_reports;
CREATE POLICY "Staff manage client reports" ON public.client_reports FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage client_shortcuts" ON public.client_shortcuts;
CREATE POLICY "Staff manage client_shortcuts" ON public.client_shortcuts FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage client_socials" ON public.client_socials;
CREATE POLICY "Staff manage client_socials" ON public.client_socials FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage clients" ON public.clients;
CREATE POLICY "Staff manage clients" ON public.clients FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage content_posts" ON public.content_posts;
CREATE POLICY "Staff manage content_posts" ON public.content_posts FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage contract_deliveries" ON public.contract_deliveries;
CREATE POLICY "Staff manage contract_deliveries" ON public.contract_deliveries FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage contracts" ON public.contracts;
CREATE POLICY "Staff manage contracts" ON public.contracts FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage deliverables" ON public.deliverables;
CREATE POLICY "Staff manage deliverables" ON public.deliverables FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage form_templates" ON public.form_templates;
CREATE POLICY "Staff manage form_templates" ON public.form_templates FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage lead_interactions" ON public.lead_interactions;
CREATE POLICY "Staff manage lead_interactions" ON public.lead_interactions FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage leads" ON public.leads;
CREATE POLICY "Staff manage leads" ON public.leads FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage meetings" ON public.meetings;
CREATE POLICY "Staff manage meetings" ON public.meetings FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage nps" ON public.nps_records;
CREATE POLICY "Staff manage nps" ON public.nps_records FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage quotes" ON public.quotes;
CREATE POLICY "Staff manage quotes" ON public.quotes FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage packages" ON public.service_packages;
CREATE POLICY "Staff manage packages" ON public.service_packages FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage task comments" ON public.task_comments;
CREATE POLICY "Staff manage task comments" ON public.task_comments FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage tasks" ON public.tasks;
CREATE POLICY "Staff manage tasks" ON public.tasks FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage team" ON public.team_members;
CREATE POLICY "Staff manage team" ON public.team_members FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

-- Profiles: users see own; admins see all
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
CREATE POLICY "Users view own profile, admins view all" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Storage: restrict contracts bucket to staff only
DROP POLICY IF EXISTS "Authenticated read contracts" ON storage.objects;
CREATE POLICY "Staff read contracts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contracts' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated upload contracts" ON storage.objects;
CREATE POLICY "Staff upload contracts" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contracts' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated update contracts" ON storage.objects;
CREATE POLICY "Staff update contracts" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'contracts' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'contracts' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated delete contracts" ON storage.objects;
CREATE POLICY "Staff delete contracts" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contracts' AND public.is_staff(auth.uid()));