-- Create departments table
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Add department_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- RLS policies for departments table
CREATE POLICY "Everyone can view departments" 
ON public.departments 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage departments" 
ON public.departments 
FOR ALL 
USING (public.current_user_has_role('admin'));

-- Update profiles RLS to allow admins to update user departments
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id OR public.current_user_has_role('admin'));

-- Create trigger for departments updated_at
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default departments
INSERT INTO public.departments (name, description) VALUES
('Support', 'Customer support and helpdesk'),
('Engineering', 'Software development and technical teams'),
('Sales', 'Sales and business development'),
('Marketing', 'Marketing and communications'),
('Human Resources', 'HR and people operations'),
('Finance', 'Finance and accounting');

-- Function to get user's department
CREATE OR REPLACE FUNCTION public.get_user_department(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT d.name
  FROM public.departments d
  INNER JOIN public.profiles p ON p.department_id = d.id
  WHERE p.user_id = user_id
$$;