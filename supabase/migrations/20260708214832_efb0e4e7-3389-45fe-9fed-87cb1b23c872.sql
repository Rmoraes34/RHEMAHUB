ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS fase text NOT NULL DEFAULT 'roteiro';

-- Backfill: itens já publicados/entregues ficam como finalizados
UPDATE public.content_posts SET fase = 'finalizado' WHERE (entregue = true OR status = 'publicado') AND fase = 'roteiro';