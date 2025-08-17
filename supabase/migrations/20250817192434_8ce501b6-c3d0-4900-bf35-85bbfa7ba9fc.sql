-- Step 1: Add new enum values (must be committed before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor'; 
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'account_admin';