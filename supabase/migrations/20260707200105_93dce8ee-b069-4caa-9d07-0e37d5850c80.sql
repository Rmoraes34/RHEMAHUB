REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_post_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_post_insert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_task_to_post() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_task_for_post(content_posts) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_trash() FROM PUBLIC;

-- Role-check helpers must stay callable by authenticated for RLS policy evaluation
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;