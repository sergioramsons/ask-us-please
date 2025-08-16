-- Temporarily assign your user to Macaw Comm organization for testing

UPDATE public.profiles 
SET organization_id = '4fa6d426-b739-46b4-a50a-fa1d7505b423'
WHERE user_id = '8e41a122-621b-4351-947d-bf08e1e51d84';