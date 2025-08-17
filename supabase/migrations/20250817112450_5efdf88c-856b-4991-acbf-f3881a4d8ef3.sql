-- Fix ambiguous column reference in generate_ticket_number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number integer;
  new_ticket_number text;
BEGIN
  -- Use a table alias to avoid ambiguity with variable names
  SELECT COALESCE(MAX(CAST(SPLIT_PART(t.ticket_number, '-', 2) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.tickets AS t
  WHERE t.ticket_number ~ '^TKT-[0-9]+$';

  -- Format as TKT-000001
  new_ticket_number := 'TKT-' || LPAD(next_number::TEXT, 6, '0');
  RETURN new_ticket_number;
END;
$$;