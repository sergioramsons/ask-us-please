-- Fix search path for generate_ticket_number function
CREATE OR REPLACE FUNCTION generate_ticket_number(org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_number INTEGER;
    ticket_number TEXT;
BEGIN
    -- Get the next ticket number for this organization
    SELECT COALESCE(MAX(
        CASE 
            WHEN ticket_number ~ '^TICKET-\d+$' 
            THEN CAST(SUBSTRING(ticket_number FROM 8) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO next_number
    FROM public.tickets
    WHERE organization_id = org_id;
    
    -- Format as TICKET-XXXXX (5 digits with leading zeros)
    ticket_number := 'TICKET-' || LPAD(next_number::TEXT, 5, '0');
    
    RETURN ticket_number;
END;
$$;