-- Fix policy creation (no IF NOT EXISTS supported)
DROP POLICY IF EXISTS "Users can view their own org admin links" ON public.organization_admins;
CREATE POLICY "Users can view their own org admin links"
ON public.organization_admins
FOR SELECT
USING (auth.uid() = user_id);
