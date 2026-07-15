-- Funções internas de gatilho/manutenção: nenhum usuário precisa executá-las diretamente.
-- Os gatilhos continuam disparando-as automaticamente independentemente de EXECUTE.
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_post_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_post_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_task_to_post() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_task_for_post(public.content_posts) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_trash() FROM PUBLIC, anon, authenticated;

-- Funções auxiliares usadas dentro das políticas de RLS.
-- Precisam permanecer executáveis por usuários autenticados (a política roda no contexto do usuário),
-- mas não devem ficar acessíveis a anônimos nem ao PUBLIC.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;