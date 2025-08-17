-- Add signature field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN signature TEXT;