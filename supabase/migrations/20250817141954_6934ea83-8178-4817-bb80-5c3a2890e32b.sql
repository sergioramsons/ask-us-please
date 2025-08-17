-- Fix tickets created from emails that don't have organization_id set
UPDATE public.tickets 
SET organization_id = '4fa6d426-b739-46b4-a50a-fa1d7505b423'::uuid
WHERE organization_id IS NULL 
  AND created_at >= '2025-08-17'::date;

-- Also fix any contacts that don't have organization_id
UPDATE public.contacts 
SET organization_id = '4fa6d426-b739-46b4-a50a-fa1d7505b423'::uuid
WHERE organization_id IS NULL 
  AND created_at >= '2025-08-17'::date;