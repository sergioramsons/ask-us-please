-- Fix contacts with null organization_id by assigning them to the user's organization
UPDATE contacts 
SET organization_id = '4fa6d426-b739-46b4-a50a-fa1d7505b423'
WHERE organization_id IS NULL 
  AND id = '59f4dbe7-25f1-4e1c-adf7-3572869170e1';