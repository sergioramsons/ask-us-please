-- Make the role system flexible to support custom roles

-- First, let's see what roles currently exist
-- We'll keep the existing roles but remove the enum constraint to allow custom roles

-- Drop the enum constraint if it exists and make role a simple text field
-- This allows for dynamic custom roles while keeping existing ones

-- Update user_roles table to remove enum constraint (if any)
-- The role column should just be text to allow any custom role
ALTER TABLE public.user_roles 
ALTER COLUMN role TYPE text;

-- Create a new table to store available roles for the organization
CREATE TABLE IF NOT EXISTS public.organization_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  role_name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(organization_id, role_name)
);

-- Enable RLS
ALTER TABLE public.organization_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for organization_roles
CREATE POLICY "Organization members can view roles in their org" 
ON public.organization_roles 
FOR SELECT 
USING (
  organization_id IN (
    SELECT p.organization_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage roles" 
ON public.organization_roles 
FOR ALL 
USING (
  public.is_organization_admin(auth.uid(), organization_id)
);

-- Insert default roles for existing organizations
INSERT INTO public.organization_roles (organization_id, role_name, description, is_default)
SELECT DISTINCT o.id, 'agent', 'Standard support agent', true
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_roles r 
  WHERE r.organization_id = o.id AND r.role_name = 'agent'
);

INSERT INTO public.organization_roles (organization_id, role_name, description, is_default)
SELECT DISTINCT o.id, 'supervisor', 'Team supervisor', true
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_roles r 
  WHERE r.organization_id = o.id AND r.role_name = 'supervisor'
);

INSERT INTO public.organization_roles (organization_id, role_name, description, is_default)
SELECT DISTINCT o.id, 'admin', 'Organization administrator', true
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_roles r 
  WHERE r.organization_id = o.id AND r.role_name = 'admin'
);

INSERT INTO public.organization_roles (organization_id, role_name, description, is_default)
SELECT DISTINCT o.id, 'account_admin', 'Account administrator', true
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_roles r 
  WHERE r.organization_id = o.id AND r.role_name = 'account_admin'
);

-- Add trigger for updated_at
CREATE TRIGGER update_organization_roles_updated_at
  BEFORE UPDATE ON public.organization_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();