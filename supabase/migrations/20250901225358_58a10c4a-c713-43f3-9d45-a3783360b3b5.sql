-- Fix customer replies that weren't properly linked to TICKET-00012
-- Link the reply emails to the correct ticket
UPDATE incoming_emails 
SET ticket_id = 'f7a63a11-6fc4-4168-a67c-2f31dbba867e'
WHERE id IN ('f9cd2b29-4b55-400a-a8c1-5003bf5f3721', '40122833-0b17-408f-9da2-d3af039021e5');

-- Create ticket comments for these customer replies using the correct column name 'content'
INSERT INTO ticket_comments (ticket_id, content, is_internal, contact_id, email_id, created_at)
VALUES 
(
  'f7a63a11-6fc4-4168-a67c-2f31dbba867e',
  'Hello Support,

Any update?

BR, George',
  false,
  'b4ff2c92-1f9e-4b9e-928e-d7c1bab4024f',
  '40122833-0b17-408f-9da2-d3af039021e5',
  '2025-09-01 22:36:09.81959+00'
),
(
  'f7a63a11-6fc4-4168-a67c-2f31dbba867e',
  'Hello Team,

Can we test to see if everything works fine.

BR, George',
  false,
  'b4ff2c92-1f9e-4b9e-928e-d7c1bab4024f',
  'f9cd2b29-4b55-400a-a8c1-5003bf5f3721',
  '2025-09-01 22:49:09.508531+00'
);

-- Update the ticket's updated_at timestamp to reflect the latest activity
UPDATE tickets 
SET updated_at = '2025-09-01 22:49:09.508531+00'
WHERE id = 'f7a63a11-6fc4-4168-a67c-2f31dbba867e';

-- Create indexes for better email processing performance
CREATE INDEX IF NOT EXISTS idx_incoming_emails_subject ON incoming_emails(subject);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_from_email ON incoming_emails(from_email);