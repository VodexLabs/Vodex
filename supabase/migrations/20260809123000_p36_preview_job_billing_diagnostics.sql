-- P3.6 — preview job billing fields live in diagnostics jsonb (documentation only)

comment on column public.preview_build_jobs.diagnostics is
  'Includes estimated_action_credits, charged_action_credits, charge_status, previewBilling for ZIP imports.';

notify pgrst, 'reload schema';
