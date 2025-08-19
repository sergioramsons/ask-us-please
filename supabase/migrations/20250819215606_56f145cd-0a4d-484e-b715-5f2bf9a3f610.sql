-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create policies for company access
CREATE POLICY "Companies are viewable by organization members" 
ON public.companies 
FOR SELECT 
USING (organization_id IN ( 
  SELECT profiles.organization_id
  FROM profiles
  WHERE (profiles.user_id = auth.uid())
));

CREATE POLICY "Organization members can manage companies" 
ON public.companies 
FOR ALL 
USING (organization_id IN ( 
  SELECT profiles.organization_id
  FROM profiles
  WHERE (profiles.user_id = auth.uid())
));

-- Create function to update timestamps
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraint to contacts table to reference companies
ALTER TABLE public.contacts 
ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Create index for better performance
CREATE INDEX idx_companies_organization_id ON public.companies(organization_id);
CREATE INDEX idx_companies_name ON public.companies(name);
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);