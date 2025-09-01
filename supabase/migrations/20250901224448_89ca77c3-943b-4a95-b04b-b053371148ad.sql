-- Create RPC function to generate ticket numbers if it doesn't exist
CREATE OR REPLACE FUNCTION generate_ticket_number(org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
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
    FROM tickets
    WHERE organization_id = org_id;
    
    -- Format as TICKET-XXXXX (5 digits with leading zeros)
    ticket_number := 'TICKET-' || LPAD(next_number::TEXT, 5, '0');
    
    RETURN ticket_number;
END;
$$;

-- Add email_id column to ticket_comments if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ticket_comments' 
        AND column_name = 'email_id'
    ) THEN
        ALTER TABLE ticket_comments ADD COLUMN email_id UUID REFERENCES incoming_emails(id);
        CREATE INDEX IF NOT EXISTS idx_ticket_comments_email_id ON ticket_comments(email_id);
    END IF;
END
$$;