-- Fix security warnings for function search paths
CREATE OR REPLACE FUNCTION public.generate_ticket_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  ticket_num TEXT;
BEGIN
  -- Get the next ticket number for this organization
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM '[0-9]+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.tickets
  WHERE organization_id = org_id;
  
  -- Format as TICKET-XXXXX
  ticket_num := 'TICKET-' || LPAD(next_number::TEXT, 5, '0');
  
  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix security warnings for function search paths
CREATE OR REPLACE FUNCTION public.delete_ticket(ticket_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.tickets WHERE id = ticket_id_param;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;