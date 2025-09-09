-- First, fix the RLS policies that could cause infinite recursion
DROP POLICY IF EXISTS "Members can view department tickets" ON public.tickets;

-- Create a simpler policy without recursive queries
-- This joins with profiles table directly in the policy without recursion
CREATE POLICY "Members can view department tickets"
ON public.tickets
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND (
    -- Admins can see all tickets in their org
    is_organization_admin(auth.uid(), organization_id)
    OR
    -- Non-admins can only see tickets from their department
    (
      department_id IS NOT NULL 
      AND department_id IN (
        SELECT department_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
);