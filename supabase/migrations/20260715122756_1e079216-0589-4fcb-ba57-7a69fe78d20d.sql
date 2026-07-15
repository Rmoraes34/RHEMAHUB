
-- Vincular deliverables_plan a um contrato específico e guardar equipe padrão
ALTER TABLE public.deliverables_plan
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS equipe jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS deliverables_plan_contract_idx ON public.deliverables_plan(contract_id);

-- Campo de observações no contrato
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS observacoes text;

-- Repositório de notas fiscais dentro do contrato
ALTER TABLE public.contract_deliveries
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS arquivo_url text,
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'entrega';

-- Tipos de conteúdo configuráveis (Vídeo, Carrossel, Story, Foto...)
INSERT INTO public.list_options (list_key, value, label, ordem)
SELECT * FROM (VALUES
  ('tipo_conteudo', 'Vídeo', 'Vídeo', 1),
  ('tipo_conteudo', 'Carrossel', 'Carrossel', 2),
  ('tipo_conteudo', 'Story', 'Story', 3),
  ('tipo_conteudo', 'Foto', 'Foto', 4),
  ('tipo_conteudo', 'Reels', 'Reels', 5)
) AS v(list_key, value, label, ordem)
WHERE NOT EXISTS (SELECT 1 FROM public.list_options WHERE list_key = 'tipo_conteudo');

-- Backfill: posts existentes recebem o contrato quando o cliente tem apenas um contrato "de operação"
UPDATE public.content_posts p
SET contract_id = (
  SELECT c.id FROM public.contracts c
  WHERE c.client_id = p.client_id
    AND COALESCE(c.tipo, 'contrato') <> 'nf'
  LIMIT 1
)
WHERE p.contract_id IS NULL
  AND (
    SELECT COUNT(*) FROM public.contracts c2
    WHERE c2.client_id = p.client_id AND COALESCE(c2.tipo, 'contrato') <> 'nf'
  ) = 1;
