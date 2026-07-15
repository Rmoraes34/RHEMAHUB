-- Novos usuários entram como PENDENTES (sem cargo). Apenas o primeiro vira admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE first_user BOOLEAN;
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT COUNT(*) = 0 INTO first_user FROM public.user_roles;
  IF first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  -- Demais usuários NÃO recebem cargo: ficam aguardando aprovação de um admin.
  RETURN NEW;
END; $function$;