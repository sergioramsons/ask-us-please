-- Add missing columns to auto_dialer_campaigns table
ALTER TABLE public.auto_dialer_campaigns 
ADD COLUMN IF NOT EXISTS current_index INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_calls INTEGER NOT NULL DEFAULT 0;

-- Add missing columns to incoming_emails table  
ALTER TABLE public.incoming_emails
ADD COLUMN IF NOT EXISTS sender_email TEXT,
ADD COLUMN IF NOT EXISTS recipient_email TEXT;

-- Update existing data to populate new columns
UPDATE public.incoming_emails 
SET sender_email = from_email, recipient_email = to_email
WHERE sender_email IS NULL OR recipient_email IS NULL;

-- Add missing columns to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 10;

-- Create email_attachments table
CREATE TABLE IF NOT EXISTS public.email_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_domains table
CREATE TABLE IF NOT EXISTS public.organization_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  domain TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_domains ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_attachments
CREATE POLICY "Email attachments are viewable by organization members" 
ON public.email_attachments 
FOR SELECT 
USING (email_id IN (
  SELECT ie.id FROM incoming_emails ie
  JOIN profiles p ON p.organization_id = ie.organization_id
  WHERE p.user_id = auth.uid()
));

-- Create RLS policies for organization_domains
CREATE POLICY "Organization domains are viewable by organization members" 
ON public.organization_domains 
FOR SELECT 
USING (organization_id IN (
  SELECT profiles.organization_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Organization admins can manage domains" 
ON public.organization_domains 
FOR ALL 
USING (organization_id IN (
  SELECT user_roles.organization_id
  FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = ANY(ARRAY['admin','super_admin'])
));

-- Create delete_organization function
CREATE OR REPLACE FUNCTION public.delete_organization(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.organizations WHERE id = org_id;
  RETURN FOUND;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_organization_domains_updated_at
BEFORE UPDATE ON public.organization_domains
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();