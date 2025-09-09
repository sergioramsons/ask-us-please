-- Create tags table for centralized tag management
CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT '#3B82F6',
  category text DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  usage_count integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Create tag categories table
CREATE TABLE public.tag_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6B7280',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Create junction table for entity tag relationships
CREATE TABLE public.entity_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  entity_type text NOT NULL, -- 'ticket', 'contact', 'article'
  entity_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tag_id, entity_type, entity_id)
);

-- Enable RLS on all tables
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for tags
CREATE POLICY "Tags are viewable by organization members"
ON public.tags FOR SELECT
USING (organization_id IN (
  SELECT profiles.organization_id FROM profiles 
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Organization admins can manage tags"
ON public.tags FOR ALL
USING (organization_id IN (
  SELECT user_roles.organization_id FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = ANY(ARRAY['admin', 'super_admin', 'Administrator', 'Account Administrator'])
));

-- RLS policies for tag categories
CREATE POLICY "Tag categories are viewable by organization members"
ON public.tag_categories FOR SELECT
USING (organization_id IN (
  SELECT profiles.organization_id FROM profiles 
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Organization admins can manage tag categories"
ON public.tag_categories FOR ALL
USING (organization_id IN (
  SELECT user_roles.organization_id FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = ANY(ARRAY['admin', 'super_admin', 'Administrator', 'Account Administrator'])
));

-- RLS policies for entity tags
CREATE POLICY "Entity tags are viewable by organization members"
ON public.entity_tags FOR SELECT
USING (organization_id IN (
  SELECT profiles.organization_id FROM profiles 
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Organization members can manage entity tags"
ON public.entity_tags FOR ALL
USING (organization_id IN (
  SELECT profiles.organization_id FROM profiles 
  WHERE profiles.user_id = auth.uid()
));

-- Function to update tag usage count
CREATE OR REPLACE FUNCTION public.update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tags 
    SET usage_count = usage_count + 1 
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tags 
    SET usage_count = GREATEST(usage_count - 1, 0) 
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update usage count
CREATE TRIGGER update_tag_usage_trigger
  AFTER INSERT OR DELETE ON public.entity_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_tag_usage_count();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for timestamps
CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tag_categories_updated_at
  BEFORE UPDATE ON public.tag_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tag categories
INSERT INTO public.tag_categories (organization_id, name, description, color) VALUES
  ('00000000-0000-0000-0000-000000000000', 'General', 'General purpose tags', '#6B7280'),
  ('00000000-0000-0000-0000-000000000000', 'Priority', 'Priority-related tags', '#EF4444'),
  ('00000000-0000-0000-0000-000000000000', 'Department', 'Department-specific tags', '#3B82F6'),
  ('00000000-0000-0000-0000-000000000000', 'Status', 'Status-related tags', '#10B981'),
  ('00000000-0000-0000-0000-000000000000', 'Product', 'Product-related tags', '#8B5CF6');

-- Insert some default tags
INSERT INTO public.tags (organization_id, name, description, color, category) VALUES
  ('00000000-0000-0000-0000-000000000000', 'urgent', 'Urgent priority items', '#EF4444', 'priority'),
  ('00000000-0000-0000-0000-000000000000', 'billing', 'Billing and payment related', '#F59E0B', 'department'),
  ('00000000-0000-0000-0000-000000000000', 'technical', 'Technical support issues', '#3B82F6', 'department'),
  ('00000000-0000-0000-0000-000000000000', 'resolved', 'Resolved issues', '#10B981', 'status'),
  ('00000000-0000-0000-0000-000000000000', 'api', 'API integration related', '#8B5CF6', 'product'),
  ('00000000-0000-0000-0000-000000000000', 'mobile', 'Mobile app related', '#EC4899', 'product');