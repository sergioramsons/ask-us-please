-- Fix contacts table security - restrict access to authorized personnel only

-- Drop the existing overly permissive policy that allows any authenticated user to view contacts they created
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;

-- Create more restrictive policies for contacts access

-- Only admins and moderators can view contacts (managers and support staff)
CREATE POLICY "Authorized staff can view contacts" 
ON public.contacts 
FOR SELECT 
USING (
  current_user_has_role('admin'::app_role) OR 
  current_user_has_role('moderator'::app_role)
);

-- Users can view contacts only when they're working on a ticket with that contact
CREATE POLICY "Users can view contacts for assigned tickets" 
ON public.contacts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.tickets t 
    WHERE t.contact_id = contacts.id 
    AND t.assigned_to = auth.uid()
  )
);

-- Restrict contact creation to authorized staff only (remove general authenticated user access)
DROP POLICY IF EXISTS "Authenticated users can create contacts" ON public.contacts;

CREATE POLICY "Authorized staff can create contacts" 
ON public.contacts 
FOR INSERT 
WITH CHECK (
  current_user_has_role('admin'::app_role) OR 
  current_user_has_role('moderator'::app_role)
);

-- Restrict contact updates to authorized staff only
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.contacts;

CREATE POLICY "Authorized staff can update contacts" 
ON public.contacts 
FOR UPDATE 
USING (
  current_user_has_role('admin'::app_role) OR 
  current_user_has_role('moderator'::app_role)
);