-- Backfill organization_id for existing incoming_mail_servers rows to fix RLS update failures
UPDATE public.incoming_mail_servers
SET organization_id = '4fa6d426-b739-46b4-a50a-fa1d7505b423'::uuid
WHERE organization_id IS NULL;

-- Ensure future inserts automatically attach to the current user's organization when omitted
CREATE OR REPLACE FUNCTION public.set_org_id_incoming_mail_servers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id = public.get_user_organization();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_org_id_incoming_mail_servers ON public.incoming_mail_servers;
CREATE TRIGGER trg_set_org_id_incoming_mail_servers
BEFORE INSERT ON public.incoming_mail_servers
FOR EACH ROW
EXECUTE FUNCTION public.set_org_id_incoming_mail_servers();