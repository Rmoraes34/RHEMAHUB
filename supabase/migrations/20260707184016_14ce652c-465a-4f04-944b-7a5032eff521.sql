CREATE OR REPLACE FUNCTION public.sync_post_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_task_id uuid;
BEGIN
  -- só age em atualização iniciada pelo usuário (evita loop com o gatilho da tarefa)
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.assignee_id IS NOT NULL AND NEW.task_id IS NULL THEN
    v_task_id := public.ensure_task_for_post(NEW);
    NEW.task_id := v_task_id;
  END IF;

  IF NEW.task_id IS NOT NULL THEN
    IF NEW.entregue = true THEN
      UPDATE public.tasks SET status = 'concluida' WHERE id = NEW.task_id AND status <> 'concluida';
    ELSE
      UPDATE public.tasks SET status = 'pendente' WHERE id = NEW.task_id AND status = 'concluida';
    END IF;
    UPDATE public.tasks SET assignee_id = NEW.assignee_id
      WHERE id = NEW.task_id AND assignee_id IS DISTINCT FROM NEW.assignee_id;
    UPDATE public.tasks SET data_prazo = NEW.data_post
      WHERE id = NEW.task_id AND data_prazo IS DISTINCT FROM NEW.data_post;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_task_to_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- só age em atualização iniciada pelo usuário (evita loop com o gatilho do cronograma)
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.content_post_id IS NOT NULL THEN
    IF NEW.status = 'concluida' THEN
      UPDATE public.content_posts
        SET entregue = true, data_entregue = COALESCE(data_entregue, CURRENT_DATE)
        WHERE id = NEW.content_post_id AND entregue = false;
    ELSE
      UPDATE public.content_posts
        SET entregue = false, data_entregue = NULL
        WHERE id = NEW.content_post_id AND entregue = true;
    END IF;
    UPDATE public.content_posts SET assignee_id = NEW.assignee_id
      WHERE id = NEW.content_post_id AND assignee_id IS DISTINCT FROM NEW.assignee_id;
  END IF;
  RETURN NEW;
END; $$;