-- Fix ambiguous column reference in transfer_ticket function
CREATE OR REPLACE FUNCTION public.transfer_ticket(ticket_id uuid, new_agent_id uuid, transfer_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  old_agent_id UUID;
BEGIN
  -- Get current assignment
  SELECT assigned_to INTO old_agent_id
  FROM public.tickets WHERE id = ticket_id;
  
  -- Update ticket assignment with qualified column names
  UPDATE public.tickets
  SET assigned_to = new_agent_id,
      assigned_at = NOW(),
      transferred_from = old_agent_id,
      transfer_reason = transfer_ticket.transfer_reason,  -- Qualify the parameter
      auto_assigned = FALSE,
      updated_at = NOW()
  WHERE id = ticket_id;
  
  -- Update agent availability counts
  IF old_agent_id IS NOT NULL THEN
    UPDATE public.agent_availability
    SET current_tickets = GREATEST(current_tickets - 1, 0),
        updated_at = NOW()
    WHERE user_id = old_agent_id;
  END IF;
  
  IF new_agent_id IS NOT NULL THEN
    UPDATE public.agent_availability
    SET current_tickets = current_tickets + 1,
        updated_at = NOW()
    WHERE user_id = new_agent_id;
  END IF;
  
  RETURN TRUE;
END;
$function$