-- Add CC functionality to tickets
ALTER TABLE public.tickets 
ADD COLUMN cc_recipients jsonb DEFAULT '[]'::jsonb;

-- Add index for better performance on CC searches
CREATE INDEX idx_tickets_cc_recipients ON public.tickets USING GIN(cc_recipients);

-- Add comment to explain the structure
COMMENT ON COLUMN public.tickets.cc_recipients IS 'Array of objects with contact info: [{"id": "uuid", "email": "email", "name": "name"}]';