-- Secure ticket deletion function that respects permissions and bypasses RLS safely
CREATE OR REPLACE FUNCTION public.delete_ticket(ticket_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  can_delete boolean;
BEGIN
  -- Check permission: org admin of the ticket's org OR creator OR assignee
  SELECT (
           (current_user_has_role('admin'::app_role) AND t.organization_id = get_user_organization())
        )
        OR (t.created_by = auth.uid())
        OR (t.assigned_to = auth.uid())
  INTO can_delete
  FROM public.tickets t
  WHERE t.id = delete_ticket.ticket_id;  -- qualify param name

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  IF NOT can_delete THEN
    RAISE EXCEPTION 'Not authorized to delete this ticket';
  END IF;

  -- Delete child records first
  DELETE FROM public.ticket_comments WHERE ticket_id = delete_ticket.ticket_id;

  -- Delete the ticket itself
  DELETE FROM public.tickets WHERE id = delete_ticket.ticket_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_ticket(uuid) TO authenticated;