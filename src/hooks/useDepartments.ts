import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  created_at: string;
  updated_at: string;
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;

      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch departments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createDepartment = useCallback(async (name: string, description?: string) => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert({ name, description })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Department created successfully",
      });

      await fetchDepartments();
      return data;
    } catch (error: any) {
      console.error('Error creating department:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create department",
        variant: "destructive",
      });
      return null;
    }
  }, [fetchDepartments, toast]);

  const updateDepartment = useCallback(async (id: string, updates: Partial<Department>) => {
    try {
      const { error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Department updated successfully",
      });

      await fetchDepartments();
    } catch (error: any) {
      console.error('Error updating department:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update department",
        variant: "destructive",
      });
    }
  }, [fetchDepartments, toast]);

  const deleteDepartment = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Department deleted successfully",
      });

      await fetchDepartments();
    } catch (error: any) {
      console.error('Error deleting department:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete department",
        variant: "destructive",
      });
    }
  }, [fetchDepartments, toast]);

  const assignUserToDepartment = useCallback(async (userId: string, departmentId: string | null) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ department_id: departmentId })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: departmentId ? "User assigned to department successfully" : "User removed from department",
      });
    } catch (error: any) {
      console.error('Error assigning user to department:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign user to department",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    departments,
    isLoading,
    fetchDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    assignUserToDepartment,
  };
}