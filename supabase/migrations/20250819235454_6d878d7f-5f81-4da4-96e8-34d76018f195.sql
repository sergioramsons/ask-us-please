-- Add department_id column to tickets table for department assignment
ALTER TABLE public.tickets ADD COLUMN department_id uuid REFERENCES public.departments(id);