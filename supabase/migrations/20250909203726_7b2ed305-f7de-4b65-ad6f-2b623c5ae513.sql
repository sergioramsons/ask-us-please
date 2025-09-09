-- Convert from multi-tenant to single-tenant application
-- Remove organization_id requirement from RLS policies and update schema

-- First, let's update RLS policies to remove organization filtering

-- Update profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by organization members only" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Update tickets policies
DROP POLICY IF EXISTS "Admins can manage tickets" ON public.tickets;
DROP POLICY IF EXISTS "Members can delete tickets" ON public.tickets;
DROP POLICY IF EXISTS "Members can insert tickets" ON public.tickets;
DROP POLICY IF EXISTS "Members can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Members can view department tickets" ON public.tickets;

CREATE POLICY "Authenticated users can manage tickets"
ON public.tickets FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Update contacts policies
DROP POLICY IF EXISTS "Contacts are viewable by organization members" ON public.contacts;
DROP POLICY IF EXISTS "Organization members can manage contacts" ON public.contacts;

CREATE POLICY "Authenticated users can view contacts"
ON public.contacts FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage contacts"
ON public.contacts FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Update companies policies
DROP POLICY IF EXISTS "Companies are viewable by organization members" ON public.companies;
DROP POLICY IF EXISTS "Organization members can manage companies" ON public.companies;

CREATE POLICY "Authenticated users can view companies"
ON public.companies FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage companies"
ON public.companies FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Update departments policies
DROP POLICY IF EXISTS "departments_select_policy" ON public.departments;
DROP POLICY IF EXISTS "departments_insert_policy" ON public.departments;
DROP POLICY IF EXISTS "departments_update_policy" ON public.departments;
DROP POLICY IF EXISTS "departments_delete_policy" ON public.departments;
DROP POLICY IF EXISTS "Organization members can create departments" ON public.departments;
DROP POLICY IF EXISTS "Organization admins can create departments" ON public.departments;
DROP POLICY IF EXISTS "Organization admins can update departments" ON public.departments;
DROP POLICY IF EXISTS "Organization admins can delete departments" ON public.departments;

CREATE POLICY "Authenticated users can view departments"
ON public.departments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage departments"
ON public.departments FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Update groups policies
DROP POLICY IF EXISTS "Groups are viewable by organization members" ON public.groups;
DROP POLICY IF EXISTS "Organization admins can manage groups" ON public.groups;

CREATE POLICY "Authenticated users can view groups"
ON public.groups FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage groups"
ON public.groups FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Update tags policies
DROP POLICY IF EXISTS "Tags are viewable by organization members" ON public.tags;
DROP POLICY IF EXISTS "Organization admins can manage tags" ON public.tags;

CREATE POLICY "Authenticated users can view tags"
ON public.tags FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage tags"
ON public.tags FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Update tag_categories policies
DROP POLICY IF EXISTS "Tag categories are viewable by organization members" ON public.tag_categories;
DROP POLICY IF EXISTS "Organization admins can manage tag categories" ON public.tag_categories;

CREATE POLICY "Authenticated users can view tag categories"
ON public.tag_categories FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage tag categories"
ON public.tag_categories FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Update entity_tags policies
DROP POLICY IF EXISTS "Entity tags are viewable by organization members" ON public.entity_tags;
DROP POLICY IF EXISTS "Organization members can manage entity tags" ON public.entity_tags;

CREATE POLICY "Authenticated users can view entity tags"
ON public.entity_tags FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage entity tags"
ON public.entity_tags FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Update email_servers policies
DROP POLICY IF EXISTS "Email servers are viewable by organization members" ON public.email_servers;
DROP POLICY IF EXISTS "Organization admins can manage email servers" ON public.email_servers;

CREATE POLICY "Authenticated users can view email servers"
ON public.email_servers FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage email servers"
ON public.email_servers FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Update incoming_emails policies
DROP POLICY IF EXISTS "Incoming emails are viewable by organization members" ON public.incoming_emails;
DROP POLICY IF EXISTS "Organization members can manage incoming emails" ON public.incoming_emails;

CREATE POLICY "Authenticated users can view incoming emails"
ON public.incoming_emails FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage incoming emails"
ON public.incoming_emails FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Update agent_availability policies
DROP POLICY IF EXISTS "Agent availability is viewable by organization members" ON public.agent_availability;
DROP POLICY IF EXISTS "Organization admins can manage agent availability" ON public.agent_availability;
DROP POLICY IF EXISTS "Users can manage their own availability" ON public.agent_availability;

CREATE POLICY "Authenticated users can view agent availability"
ON public.agent_availability FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage agent availability"
ON public.agent_availability FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Update agent_skills policies
DROP POLICY IF EXISTS "Agent skills are viewable by organization members" ON public.agent_skills;
DROP POLICY IF EXISTS "Organization admins can manage agent skills" ON public.agent_skills;
DROP POLICY IF EXISTS "Users can manage their own skills" ON public.agent_skills;

CREATE POLICY "Authenticated users can view agent skills"
ON public.agent_skills FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage agent skills"
ON public.agent_skills FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Set default organization_id for existing records to a single value
-- This ensures existing data remains accessible
UPDATE public.profiles SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.tickets SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.contacts SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.companies SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.departments SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.groups SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.tags SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.tag_categories SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.entity_tags SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.email_servers SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.incoming_emails SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.agent_availability SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.agent_skills SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';

-- Create a default organization record if it doesn't exist
INSERT INTO public.organizations (id, name, subdomain, domain, slug, subscription_status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default', null, 'default', 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  subdomain = EXCLUDED.subdomain,
  subscription_status = EXCLUDED.subscription_status;

-- Update helper functions to remove organization filtering
CREATE OR REPLACE FUNCTION public.get_current_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Always return the default organization ID for single-tenant mode
  SELECT '00000000-0000-0000-0000-000000000001'::uuid;
$function$;