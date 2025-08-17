-- Update RLS policy to allow authenticated users to create contacts when creating tickets
DROP POLICY IF EXISTS "Authorized staff can create contacts in their organization" ON public.contacts;

CREATE POLICY "Users can create contacts in their organization"
ON public.contacts
FOR INSERT
WITH CHECK (
  (organization_id = get_user_organization() OR organization_id IS NULL) 
  AND auth.role() = 'authenticated'
);

-- Also update the view policy to allow users to see contacts they created
DROP POLICY IF EXISTS "Users can view contacts in their organization" ON public.contacts;

CREATE POLICY "Users can view contacts in their organization"
ON public.contacts
FOR SELECT
USING (
  (organization_id = get_user_organization() OR organization_id IS NULL) 
  AND (
    current_user_has_role('admin'::app_role) 
    OR current_user_has_role('moderator'::app_role) 
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tickets t 
      WHERE t.contact_id = contacts.id 
      AND (t.assigned_to = auth.uid() OR t.created_by = auth.uid())
    )
  )
);