ALTER TABLE public.deliverables
  ADD COLUMN IF NOT EXISTS quantidade integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS periodicidade text NOT NULL DEFAULT 'mensal';