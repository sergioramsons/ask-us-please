-- Create organizations/tenants table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
  max_users INTEGER DEFAULT 10,
  max_tickets INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Add tenant_id to existing tables
ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.tickets ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.contacts ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.departments ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.email_servers ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.incoming_mail_servers ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Create organization admins table (separate from user_roles for tenant management)
CREATE TABLE public.organization_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS on organization_admins
ALTER TABLE public.organization_admins ENABLE ROW LEVEL SECURITY;

-- Create function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization()
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE user_id = auth.uid()
$$;

-- Create function to check if user is organization admin
CREATE OR REPLACE FUNCTION public.is_organization_admin(org_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_admins oa
    WHERE oa.user_id = auth.uid()
    AND (org_id IS NULL OR oa.organization_id = org_id)
  )
$$;

-- Create function to check if user is super admin (can manage all organizations)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_admins oa
    WHERE oa.user_id = auth.uid()
    AND oa.role = 'super_admin'
  )
$$;

-- RLS Policies for organizations
CREATE POLICY "Super admins can view all organizations"
ON public.organizations
FOR SELECT
USING (public.is_super_admin());

CREATE POLICY "Organization admins can view their organization"
ON public.organizations
FOR SELECT
USING (public.is_organization_admin(id));

CREATE POLICY "Super admins can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update organizations"
ON public.organizations
FOR UPDATE
USING (public.is_super_admin());

-- RLS Policies for organization_admins
CREATE POLICY "Super admins can manage all organization admins"
ON public.organization_admins
FOR ALL
USING (public.is_super_admin());

CREATE POLICY "Organization admins can view admins in their organization"
ON public.organization_admins
FOR SELECT
USING (public.is_organization_admin(organization_id));

-- Update existing RLS policies to include tenant isolation

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Assigned users can update their tickets" ON public.tickets;

-- Create new tenant-aware policies for tickets
CREATE POLICY "Users can view tickets in their organization"
ON public.tickets
FOR SELECT
USING (
  organization_id = public.get_user_organization() AND
  (current_user_has_role('admin'::app_role) OR 
   auth.uid() = assigned_to OR 
   auth.uid() = created_by)
);

CREATE POLICY "Users can create tickets in their organization"
ON public.tickets
FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization() AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update tickets in their organization"
ON public.tickets
FOR UPDATE
USING (
  organization_id = public.get_user_organization() AND
  (current_user_has_role('admin'::app_role) OR auth.uid() = assigned_to)
);

-- Update contacts policies
DROP POLICY IF EXISTS "Admins have full contact access" ON public.contacts;
DROP POLICY IF EXISTS "Authorized staff can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authorized staff can create contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authorized staff can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins can delete contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can view contacts for assigned tickets" ON public.contacts;

CREATE POLICY "Users can view contacts in their organization"
ON public.contacts
FOR SELECT
USING (
  organization_id = public.get_user_organization() AND
  (current_user_has_role('admin'::app_role) OR 
   current_user_has_role('moderator'::app_role) OR
   EXISTS (
     SELECT 1 FROM public.tickets t 
     WHERE t.contact_id = contacts.id AND t.assigned_to = auth.uid()
   ))
);

CREATE POLICY "Authorized staff can create contacts in their organization"
ON public.contacts
FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization() AND
  (current_user_has_role('admin'::app_role) OR current_user_has_role('moderator'::app_role))
);

CREATE POLICY "Authorized staff can update contacts in their organization"
ON public.contacts
FOR UPDATE
USING (
  organization_id = public.get_user_organization() AND
  (current_user_has_role('admin'::app_role) OR current_user_has_role('moderator'::app_role))
);

CREATE POLICY "Admins can delete contacts in their organization"
ON public.contacts
FOR DELETE
USING (
  organization_id = public.get_user_organization() AND
  current_user_has_role('admin'::app_role)
);

-- Update departments policies
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;

CREATE POLICY "Users can view departments in their organization"
ON public.departments
FOR SELECT
USING (
  organization_id = public.get_user_organization() AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Admins can manage departments in their organization"
ON public.departments
FOR ALL
USING (
  organization_id = public.get_user_organization() AND
  current_user_has_role('admin'::app_role)
)
WITH CHECK (
  organization_id = public.get_user_organization() AND
  current_user_has_role('admin'::app_role)
);

-- Update profiles policies to include organization context
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "HR can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id OR current_user_has_role('admin'::app_role));

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view profiles in their organization"
ON public.profiles
FOR SELECT
USING (
  organization_id = public.get_user_organization() AND
  (current_user_has_role('admin'::app_role) OR current_user_has_role('moderator'::app_role))
);

-- Email servers should be organization-specific
DROP POLICY IF EXISTS "Only admins can view email servers" ON public.email_servers;
DROP POLICY IF EXISTS "Only admins can create email servers" ON public.email_servers;
DROP POLICY IF EXISTS "Only admins can update email servers" ON public.email_servers;
DROP POLICY IF EXISTS "Only admins can delete email servers" ON public.email_servers;
DROP POLICY IF EXISTS "Admins can view email server configs" ON public.email_servers;

CREATE POLICY "Admins can manage email servers in their organization"
ON public.email_servers
FOR ALL
USING (
  organization_id = public.get_user_organization() AND
  current_user_has_role('admin'::app_role)
)
WITH CHECK (
  organization_id = public.get_user_organization() AND
  current_user_has_role('admin'::app_role)
);

-- Incoming mail servers should be organization-specific
DROP POLICY IF EXISTS "Only admins can view incoming mail servers" ON public.incoming_mail_servers;
DROP POLICY IF EXISTS "Only admins can create incoming mail servers" ON public.incoming_mail_servers;
DROP POLICY IF EXISTS "Only admins can update incoming mail servers" ON public.incoming_mail_servers;
DROP POLICY IF EXISTS "Only admins can delete incoming mail servers" ON public.incoming_mail_servers;
DROP POLICY IF EXISTS "Admins can view incoming mail server configs" ON public.incoming_mail_servers;

CREATE POLICY "Admins can manage incoming mail servers in their organization"
ON public.incoming_mail_servers
FOR ALL
USING (
  organization_id = public.get_user_organization() AND
  current_user_has_role('admin'::app_role)
)
WITH CHECK (
  organization_id = public.get_user_organization() AND
  current_user_has_role('admin'::app_role)
);

-- Create trigger to update updated_at for organizations
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX idx_tickets_organization_id ON public.tickets(organization_id);
CREATE INDEX idx_contacts_organization_id ON public.contacts(organization_id);
CREATE INDEX idx_departments_organization_id ON public.departments(organization_id);
CREATE INDEX idx_organization_admins_user_id ON public.organization_admins(user_id);
CREATE INDEX idx_organization_admins_organization_id ON public.organization_admins(organization_id);