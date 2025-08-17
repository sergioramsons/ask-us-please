-- Update the comment to include sender information at the top
UPDATE ticket_comments 
SET content = 'From: r.akusung@bernsergsolutions.com (KA Technologies)

Hello Team,

All is fine now

BR

************************************************************************************

This e-mail is confidential. It may also be legally privileged. If you are not the addressee you may not 

copy, forward, disclose or use any part of it. If you have received this message in error, please delete 

it and all copies from your system and notify the sender immediately by return e-mail.

************************************************************************************

From: Support Team <3cxlicense@bernsersolutions.com> 
Sent: Sunday, August 17, 2025 1:29 PM
To: r.akusung@bernsersolutions.com
Subject: [Ticket #BS00001] Testing 

Update on your support ticket'
WHERE email_id = 'a03f7ee4-aac3-48dd-b91b-e1d948d80c78';