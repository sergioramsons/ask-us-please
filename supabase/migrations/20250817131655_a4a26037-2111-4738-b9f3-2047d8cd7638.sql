-- Update the ticket number generation function to use BS prefix with 5 digits
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  next_number integer;
  new_ticket_number text;
BEGIN
  -- Use a table alias to avoid ambiguity with variable names
  SELECT COALESCE(MAX(CAST(SUBSTRING(t.ticket_number FROM 3) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.tickets AS t
  WHERE t.ticket_number ~ '^BS[0-9]+$';

  -- Format as BS00001 (5 digits)
  new_ticket_number := 'BS' || LPAD(next_number::TEXT, 5, '0');
  RETURN new_ticket_number;
END;
$function$