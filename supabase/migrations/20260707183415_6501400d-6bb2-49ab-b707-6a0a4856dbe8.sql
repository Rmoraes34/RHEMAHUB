-- 1. Novas colunas em content_posts (item de Cronograma = registro central)
ALTER TABLE public.content_posts
  ADD COLUMN IF NOT EXISTS atividade text,
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entregue boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_entregue date,
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

-- 2. Novas colunas em tasks (vínculo com o item de Cronograma)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS content_post_id uuid REFERENCES public.content_posts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS natureza text NOT NULL DEFAULT 'operacional';

-- 3. Função: criar Tarefa espelho quando o item de Cronograma tem responsável
CREATE OR REPLACE FUNCTION public.ensure_task_for_post(_post public.content_posts)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_client_name text;
  v_task_id uuid;
BEGIN
  SELECT razao_social INTO v_client_name FROM public.clients WHERE id = _post.client_id;
  INSERT INTO public.tasks (titulo, categoria, status, prioridade, data_prazo, client_id, assignee_id, natureza, content_post_id)
  VALUES (
    COALESCE(NULLIF(_post.atividade, ''), _post.tema) || ' — ' || COALESCE(v_client_name, 'Cliente'),
    _post.categoria, CASE WHEN _post.entregue THEN 'concluida' ELSE 'pendente' END,
    'media', _post.data_post, _post.client_id, _post.assignee_id, 'operacional', _post.id
  ) RETURNING id INTO v_task_id;
  RETURN v_task_id;
END; $$;

-- 4. Cronograma -> Tarefa (insert)
CREATE OR REPLACE FUNCTION public.sync_post_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_task_id uuid;
BEGIN
  IF NEW.assignee_id IS NOT NULL AND NEW.task_id IS NULL THEN
    v_task_id := public.ensure_task_for_post(NEW);
    UPDATE public.content_posts SET task_id = v_task_id WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_post_insert ON public.content_posts;
CREATE TRIGGER trg_sync_post_insert AFTER INSERT ON public.content_posts
FOR EACH ROW EXECUTE FUNCTION public.sync_post_insert();

-- 5. Cronograma (update) -> Tarefa: cria tarefa se ganhou responsável, sincroniza entregue/atribuição
CREATE OR REPLACE FUNCTION public.sync_post_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_task_id uuid;
BEGIN
  -- ganhou responsável e ainda não tem tarefa
  IF NEW.assignee_id IS NOT NULL AND NEW.task_id IS NULL THEN
    v_task_id := public.ensure_task_for_post(NEW);
    NEW.task_id := v_task_id;
  END IF;

  IF NEW.task_id IS NOT NULL THEN
    -- entregue -> conclui tarefa; desmarcado -> reabre
    IF NEW.entregue = true THEN
      UPDATE public.tasks SET status = 'concluida' WHERE id = NEW.task_id AND status <> 'concluida';
    ELSE
      UPDATE public.tasks SET status = 'pendente' WHERE id = NEW.task_id AND status = 'concluida';
    END IF;
    -- propaga responsável e prazo
    UPDATE public.tasks SET assignee_id = NEW.assignee_id
      WHERE id = NEW.task_id AND assignee_id IS DISTINCT FROM NEW.assignee_id;
    UPDATE public.tasks SET data_prazo = NEW.data_post
      WHERE id = NEW.task_id AND data_prazo IS DISTINCT FROM NEW.data_post;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_post_update ON public.content_posts;
CREATE TRIGGER trg_sync_post_update BEFORE UPDATE ON public.content_posts
FOR EACH ROW EXECUTE FUNCTION public.sync_post_update();

-- 6. Tarefa -> Cronograma: concluir/reabrir reflete no item; propaga responsável
CREATE OR REPLACE FUNCTION public.sync_task_to_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
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

DROP TRIGGER IF EXISTS trg_sync_task_to_post ON public.tasks;
CREATE TRIGGER trg_sync_task_to_post AFTER UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.sync_task_to_post();