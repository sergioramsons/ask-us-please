-- Safely delete a ticket by clearing dependent references first
CREATE OR REPLACE FUNCTION public.delete_ticket(ticket_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Detach related incoming emails to avoid FK violations
  UPDATE public.incoming_emails
  SET ticket_id = NULL
  WHERE ticket_id = ticket_id_param;

  -- Remove related comments
  DELETE FROM public.ticket_comments
  WHERE ticket_id = ticket_id_param;

  -- Finally delete the ticket
  DELETE FROM public.tickets
  WHERE id = ticket_id_param;

  RETURN FOUND; -- true if the ticket row was deleted
END;
$function$;