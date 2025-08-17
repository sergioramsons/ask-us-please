-- Backfill tickets without organization based on creator's profile organization
UPDATE public.tickets t
SET organization_id = p.organization_id,
    updated_at = now()
FROM public.profiles p
WHERE t.organization_id IS NULL
  AND t.created_by = p.user_id
  AND p.organization_id IS NOT NULL;