-- Enforce department-level visibility for tickets while preserving org operations
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Replace broad org-wide policies with granular ones
DROP POLICY IF EXISTS "Organization members can manage tickets" ON public.tickets;
DROP POLICY IF EXISTS "Tickets are viewable by organization members" ON public.tickets;

-- Admins can fully manage tickets in their organization
CREATE POLICY "Admins can manage tickets"
ON public.tickets
FOR ALL
USING (is_organization_admin(auth.uid(), organization_id))
WITH CHECK (is_organization_admin(auth.uid(), organization_id));

-- Non-admin members: can only VIEW tickets from their own department
CREATE POLICY "Members can view department tickets"
ON public.tickets
FOR SELECT
USING (
  organization_id = get_current_user_organization_id()
  AND department_id IS NOT NULL
  AND department_id = (
    SELECT p.department_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
  )
);

-- Preserve ability for org members to create/update/delete within their org
CREATE POLICY "Members can insert tickets"
ON public.tickets
FOR INSERT
WITH CHECK (organization_id = get_current_user_organization_id());

CREATE POLICY "Members can update tickets"
ON public.tickets
FOR UPDATE
USING (organization_id = get_current_user_organization_id())
WITH CHECK (organization_id = get_current_user_organization_id());

CREATE POLICY "Members can delete tickets"
ON public.tickets
FOR DELETE
USING (organization_id = get_current_user_organization_id());