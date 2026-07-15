-- Tipo do item de cronograma: define em qual seção (edição ou postagem) ele aparece
ALTER TABLE public.content_posts
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'postagem';

-- Preenche o tipo dos itens existentes com base na categoria (audiovisual => edição)
UPDATE public.content_posts
  SET tipo = CASE WHEN lower(categoria) LIKE '%audiovisual%' THEN 'edicao' ELSE 'postagem' END
  WHERE tipo = 'postagem';

-- Cor de identificação do cliente na visão geral de cronogramas
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cor text;