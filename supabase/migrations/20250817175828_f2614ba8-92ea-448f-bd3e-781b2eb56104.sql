-- Add DELETE policy for organizations
CREATE POLICY "Super admins can delete organizations" 
ON public.organizations 
FOR DELETE 
USING (is_super_admin());

-- Add a function to safely delete organizations with all related data
CREATE OR REPLACE FUNCTION public.delete_organization(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  can_delete boolean;
BEGIN
  -- Check if current user is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can delete organizations';
  END IF;

  -- Check if organization exists
  SELECT EXISTS(SELECT 1 FROM public.organizations WHERE id = org_id) INTO can_delete;
  
  IF NOT can_delete THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Delete all related data in correct order
  -- Delete auto dialer results first
  DELETE FROM public.auto_dialer_results 
  WHERE campaign_id IN (
    SELECT id FROM public.auto_dialer_campaigns WHERE organization_id = org_id
  );
  
  -- Delete auto dialer campaigns
  DELETE FROM public.auto_dialer_campaigns WHERE organization_id = org_id;
  
  -- Delete ticket comments for org tickets
  DELETE FROM public.ticket_comments 
  WHERE ticket_id IN (
    SELECT id FROM public.tickets WHERE organization_id = org_id
  );
  
  -- Delete tickets
  DELETE FROM public.tickets WHERE organization_id = org_id;
  
  -- Delete contacts
  DELETE FROM public.contacts WHERE organization_id = org_id;
  
  -- Delete assignment rules
  DELETE FROM public.assignment_rules WHERE organization_id = org_id;
  
  -- Delete agent availability
  DELETE FROM public.agent_availability WHERE organization_id = org_id;
  
  -- Delete email servers
  DELETE FROM public.email_servers WHERE organization_id = org_id;
  
  -- Delete incoming mail servers
  DELETE FROM public.incoming_mail_servers WHERE organization_id = org_id;
  
  -- Delete departments
  DELETE FROM public.departments WHERE organization_id = org_id;
  
  -- Update profiles to remove organization reference
  UPDATE public.profiles SET organization_id = NULL WHERE organization_id = org_id;
  
  -- Delete organization admins
  DELETE FROM public.organization_admins WHERE organization_id = org_id;
  
  -- Delete organization domains
  DELETE FROM public.organization_domains WHERE organization_id = org_id;
  
  -- Finally delete the organization
  DELETE FROM public.organizations WHERE id = org_id;
  
  RETURN TRUE;
END;
$function$;