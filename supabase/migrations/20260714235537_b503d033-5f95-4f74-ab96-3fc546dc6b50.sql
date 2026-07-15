
-- 1) Estender content_posts para consolidar as três etapas em um único registro
ALTER TABLE public.content_posts
  ADD COLUMN IF NOT EXISTS titulo text,
  ADD COLUMN IF NOT EXISTS objetivo text,
  ADD COLUMN IF NOT EXISTS briefing text,
  ADD COLUMN IF NOT EXISTS roteiro text,
  ADD COLUMN IF NOT EXISTS referencias jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS data_gravacao date,
  ADD COLUMN IF NOT EXISTS data_edicao date,
  ADD COLUMN IF NOT EXISTS data_publicacao date,
  ADD COLUMN IF NOT EXISTS horario_publicacao text,
  ADD COLUMN IF NOT EXISTS plataformas text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS legenda text,
  ADD COLUMN IF NOT EXISTS editor_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS postador_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_producao text DEFAULT 'briefing',
  ADD COLUMN IF NOT EXISTS status_edicao text DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS status_postagem text DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS etapa_atual text DEFAULT 'producao';

-- Backfill: usa data_post como data_publicacao quando ausente
UPDATE public.content_posts
   SET data_publicacao = COALESCE(data_publicacao, data_post)
 WHERE data_publicacao IS NULL;

-- Backfill etapa_atual/statuses a partir dos campos legados
UPDATE public.content_posts SET
  etapa_atual = CASE
    WHEN entregue = true OR status = 'publicado' THEN 'publicado'
    WHEN status = 'agendado' OR status = 'aprovado' THEN 'postagem'
    WHEN status = 'validacao' OR fase IN ('edicao','revisao') THEN 'edicao'
    WHEN fase = 'gravado' THEN 'edicao'
    ELSE 'producao'
  END,
  status_producao = CASE
    WHEN fase = 'finalizado' OR entregue = true OR status IN ('publicado','agendado','aprovado','validacao') OR fase IN ('edicao','revisao','gravado') THEN 'gravado'
    WHEN fase = 'gravado' THEN 'gravado'
    WHEN fase = 'roteiro' THEN 'roteiro'
    ELSE 'briefing'
  END,
  status_edicao = CASE
    WHEN entregue = true OR status = 'publicado' OR status = 'aprovado' THEN 'aprovado'
    WHEN status = 'validacao' THEN 'validado'
    WHEN fase IN ('edicao','revisao') THEN 'edicao'
    ELSE 'pendente'
  END,
  status_postagem = CASE
    WHEN entregue = true OR status = 'publicado' THEN 'publicado'
    WHEN status = 'agendado' THEN 'agendado'
    ELSE 'pendente'
  END,
  titulo = COALESCE(titulo, atividade, tema);

-- 2) deliverables_plan (contrato de entregáveis por cliente/período)
CREATE TABLE IF NOT EXISTS public.deliverables_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  mes_referencia text,
  data_inicio date,
  data_fim date,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  dias_producao int[] NOT NULL DEFAULT '{}'::int[],
  dias_edicao int[] NOT NULL DEFAULT '{}'::int[],
  dias_publicacao int[] NOT NULL DEFAULT '{}'::int[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliverables_plan TO authenticated;
GRANT ALL ON public.deliverables_plan TO service_role;

ALTER TABLE public.deliverables_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage delivery plans"
  ON public.deliverables_plan FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_deliverables_plan_updated_at
  BEFORE UPDATE ON public.deliverables_plan
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS deliverables_plan_client_idx ON public.deliverables_plan(client_id);
CREATE INDEX IF NOT EXISTS content_posts_etapa_idx ON public.content_posts(etapa_atual);
