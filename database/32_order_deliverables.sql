-- Private deliverables attached to paid orders.
CREATE TABLE IF NOT EXISTS public.order_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  file_path TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 4194304),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 500),
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_deliverables_order_created
  ON public.order_deliverables (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_deliverables_uploaded_by
  ON public.order_deliverables (uploaded_by);

ALTER TABLE public.order_deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view own order deliverables" ON public.order_deliverables;
DROP POLICY IF EXISTS "Admins can view all order deliverables" ON public.order_deliverables;
DROP POLICY IF EXISTS "Authorized users can view order deliverables" ON public.order_deliverables;
CREATE POLICY "Authorized users can view order deliverables"
  ON public.order_deliverables FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_deliverables.order_id
        AND orders.user_id = (SELECT auth.uid())
    )
    OR public.get_user_role((SELECT auth.uid())) IN ('admin', 'owner')
  );

GRANT SELECT ON public.order_deliverables TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-deliverables',
  'order-deliverables',
  FALSE,
  4194304,
  ARRAY[
    'application/pdf', 'application/zip', 'application/x-zip-compressed',
    'image/png', 'image/jpeg', 'image/webp', 'text/plain',
    'application/json', 'video/mp4'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
