-- Cancellation feedback (required reason when user cancels via billing)
CREATE TABLE IF NOT EXISTS public.subscription_cancellation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(trim(reason)) >= 10),
  previous_plan_id text,
  paddle_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_cancellation_feedback_created_at_idx
  ON public.subscription_cancellation_feedback (created_at DESC);

CREATE INDEX IF NOT EXISTS subscription_cancellation_feedback_user_id_idx
  ON public.subscription_cancellation_feedback (user_id);

ALTER TABLE public.subscription_cancellation_feedback ENABLE ROW LEVEL SECURITY;

-- Users may insert their own feedback only
CREATE POLICY subscription_cancellation_feedback_insert_own
  ON public.subscription_cancellation_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role / admin reads via service key in admin API
GRANT SELECT, INSERT ON public.subscription_cancellation_feedback TO service_role;
GRANT INSERT ON public.subscription_cancellation_feedback TO authenticated;
