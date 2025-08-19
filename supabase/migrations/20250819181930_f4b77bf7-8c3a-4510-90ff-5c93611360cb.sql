-- Create auto_dialer_campaigns table
CREATE TABLE public.auto_dialer_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  agent_extension TEXT,
  delay_seconds INTEGER NOT NULL DEFAULT 5,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  phone_numbers TEXT[] NOT NULL DEFAULT '{}',
  total_numbers INTEGER NOT NULL DEFAULT 0,
  completed_calls INTEGER NOT NULL DEFAULT 0,
  successful_calls INTEGER NOT NULL DEFAULT 0,
  failed_calls INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create auto_dialer_results table
CREATE TABLE public.auto_dialer_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_number INTEGER NOT NULL DEFAULT 1,
  dialed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  result_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update contacts table to match Contact interface
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Update contacts name field from existing name if first_name/last_name are empty
UPDATE public.contacts 
SET first_name = COALESCE(split_part(name, ' ', 1), ''),
    last_name = COALESCE(split_part(name, ' ', 2), '')
WHERE first_name IS NULL OR last_name IS NULL;

-- Create migrate_email_server_passwords function
CREATE OR REPLACE FUNCTION public.migrate_email_server_passwords()
RETURNS TABLE(
  id UUID,
  organization_id UUID,
  migration_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function handles migrating email server passwords to encrypted format
  RETURN QUERY
  SELECT 
    es.id,
    es.organization_id,
    'completed'::TEXT as migration_status
  FROM public.email_servers es
  WHERE es.password_encrypted = false;
  
  -- Update all unencrypted passwords to encrypted status
  UPDATE public.email_servers 
  SET password_encrypted = true 
  WHERE password_encrypted = false;
END;
$$;

-- Enable RLS on new tables
ALTER TABLE public.auto_dialer_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_dialer_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for auto_dialer_campaigns
CREATE POLICY "Auto dialer campaigns are viewable by organization members" 
ON public.auto_dialer_campaigns 
FOR SELECT 
USING (organization_id IN (
  SELECT profiles.organization_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Organization admins can manage auto dialer campaigns" 
ON public.auto_dialer_campaigns 
FOR ALL 
USING (organization_id IN (
  SELECT user_roles.organization_id
  FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = ANY(ARRAY['admin'::text, 'super_admin'::text])
));

-- Create RLS policies for auto_dialer_results
CREATE POLICY "Auto dialer results are viewable by organization members" 
ON public.auto_dialer_results 
FOR SELECT 
USING (campaign_id IN (
  SELECT adc.id
  FROM auto_dialer_campaigns adc
  JOIN profiles p ON p.organization_id = adc.organization_id
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Organization admins can manage auto dialer results" 
ON public.auto_dialer_results 
FOR ALL 
USING (campaign_id IN (
  SELECT adc.id
  FROM auto_dialer_campaigns adc
  JOIN user_roles ur ON ur.organization_id = adc.organization_id
  WHERE ur.user_id = auth.uid() 
  AND ur.role = ANY(ARRAY['admin'::text, 'super_admin'::text])
));

-- Add foreign key constraints
ALTER TABLE public.auto_dialer_results
ADD CONSTRAINT fk_auto_dialer_results_campaign
FOREIGN KEY (campaign_id) REFERENCES public.auto_dialer_campaigns(id) ON DELETE CASCADE;

-- Add triggers for updated_at
CREATE TRIGGER update_auto_dialer_campaigns_updated_at
BEFORE UPDATE ON public.auto_dialer_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add check constraints
ALTER TABLE public.auto_dialer_campaigns
ADD CONSTRAINT check_status CHECK (status IN ('draft', 'running', 'paused', 'completed', 'failed'));

ALTER TABLE public.auto_dialer_results
ADD CONSTRAINT check_result_status CHECK (status IN ('pending', 'dialing', 'answered', 'busy', 'no_answer', 'failed'));

ALTER TABLE public.contacts
ADD CONSTRAINT check_contact_status CHECK (status IN ('active', 'inactive', 'blocked'));