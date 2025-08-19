-- Fix the ambiguous column reference in delete_multiple_tickets function
CREATE OR REPLACE FUNCTION public.delete_multiple_tickets(ticket_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER := 0;
  current_ticket_id uuid;
BEGIN
  -- Loop through each ticket ID and delete safely
  FOREACH current_ticket_id IN ARRAY ticket_ids
  LOOP
    -- Detach related incoming emails to avoid FK violations
    UPDATE public.incoming_emails
    SET ticket_id = NULL
    WHERE ticket_id = current_ticket_id;

    -- Remove related comments
    DELETE FROM public.ticket_comments
    WHERE ticket_id = current_ticket_id;

    -- Delete the ticket
    DELETE FROM public.tickets
    WHERE id = current_ticket_id;
    
    IF FOUND THEN
      deleted_count := deleted_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'total_requested', array_length(ticket_ids, 1)
  );
END;
$function$;