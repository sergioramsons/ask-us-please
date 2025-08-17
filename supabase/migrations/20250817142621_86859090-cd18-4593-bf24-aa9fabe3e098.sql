-- Fix the KA Technologies reply that was incorrectly created as a new ticket
-- First, delete the incorrectly created ticket
DELETE FROM tickets WHERE id = '59f0c795-3676-4293-8ab5-069f460be6c9';

-- Reset the email to be reprocessed
UPDATE incoming_emails 
SET processed = false, ticket_id = NULL 
WHERE id = 'a03f7ee4-aac3-48dd-b91b-e1d948d80c78';

-- Add the reply as a comment to the original ticket
INSERT INTO ticket_comments (ticket_id, content, email_id, is_internal)
SELECT 
  t.id,
  ie.body_text,
  ie.id,
  false
FROM tickets t, incoming_emails ie
WHERE t.ticket_number = 'BS00001' 
  AND ie.id = 'a03f7ee4-aac3-48dd-b91b-e1d948d80c78';

-- Update the email as processed and linked to the original ticket
UPDATE incoming_emails 
SET processed = true, 
    ticket_id = (SELECT id FROM tickets WHERE ticket_number = 'BS00001')
WHERE id = 'a03f7ee4-aac3-48dd-b91b-e1d948d80c78';

-- Update the original ticket's last activity
UPDATE tickets 
SET last_activity_at = NOW(), 
    updated_at = NOW()
WHERE ticket_number = 'BS00001';