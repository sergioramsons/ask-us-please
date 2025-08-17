-- Update new user profiles to have the same organization as the current admin
UPDATE public.profiles 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE user_id IN ('2fc81e8c-40a4-422c-bbbd-4c92da7e4661', '6ade7a00-7bb9-4faf-a277-a42cb5a8d959');