import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';

export type AppRole = string; // Now supports any custom role

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

interface UserWithRole {
  id: string;
  email: string;
  display_name?: string;
  department_id?: string;
  department_name?: string;
  roles: string[];
}

export function useUserRoles() {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState<{id: string, role_name: string, description?: string, is_admin_role: boolean, is_default?: boolean}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { organization } = useOrganization();

  const fetchCurrentUserRoles = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      // Filter and map roles to ensure they are valid strings
      const validRoles = data
        .filter(item => item.role && typeof item.role === 'string')
        .map(item => item.role as string);
      
      setCurrentUserRoles(validRoles);
    } catch (error) {
      console.error('Error fetching current user roles:', error);
    }
  }, [user]);

  const fetchAllUserRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          created_at,
          updated_at
         `);

      if (error) throw error;

      // Filter and map roles to ensure they are valid strings
      const validRoles = (data || []).filter(item => 
        item.role && typeof item.role === 'string'
      );

      setUserRoles(validRoles as UserRole[]);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch user roles",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchAvailableRoles = useCallback(async () => {
    try {
      const orgId = organization?.id;
      if (!orgId) return;

      const { data, error } = await supabase
        .from('organization_roles')
        .select('id, role_name, description, is_admin_role, is_default')
        .eq('organization_id', orgId)
        .order('role_name');

      if (error) throw error;
      setAvailableRoles(data || []);
    } catch (error) {
      console.error('Error fetching available roles:', error);
    }
  }, [organization?.id]);

  const createCustomRole = useCallback(async (roleName: string, description?: string, isAdminRole: boolean = false) => {
    try {
      const orgId = organization?.id;
      if (!orgId) {
        toast({
          title: "Organization not found",
          description: "Cannot create role without an organization context.",
          variant: "destructive",
        });
        return false;
      }

      const { error } = await supabase
        .from('organization_roles')
        .insert({
          organization_id: orgId,
          role_name: roleName.toLowerCase().trim(),
          description,
          is_admin_role: isAdminRole,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role "${roleName}" created successfully`,
      });

      await fetchAvailableRoles();
      return true;
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
      return false;
    }
  }, [organization?.id, user?.id, toast, fetchAvailableRoles]);

  const deleteCustomRole = useCallback(async (roleId: string, roleName: string) => {
    try {
      // First check if any users have this role
      const { data: usersWithRole, error: checkError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', roleName);

      if (checkError) throw checkError;

      if (usersWithRole && usersWithRole.length > 0) {
        toast({
          title: "Cannot delete role",
          description: `Role "${roleName}" is assigned to ${usersWithRole.length} user(s). Remove the role from all users first.`,
          variant: "destructive",
        });
        return false;
      }

      const { error } = await supabase
        .from('organization_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role "${roleName}" deleted successfully`,
      });

      await fetchAvailableRoles();
      return true;
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
      return false;
    }
  }, [toast, fetchAvailableRoles]);

  const getUsersWithRoles = useCallback(async (): Promise<UserWithRole[]> => {
    try {
      // Get all profiles with their roles and departments
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          display_name,
          department_id,
          departments(name)
        `);

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get users from auth (this might need admin privileges)
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) {
        console.warn('Cannot fetch auth users (admin required):', authError);
        // Fallback: use profiles data only
        const usersMap = new Map<string, UserWithRole>();
        
        profiles?.forEach(profile => {
          if (!usersMap.has(profile.user_id)) {
            usersMap.set(profile.user_id, {
              id: profile.user_id,
              email: 'Unknown',
              display_name: profile.display_name,
              department_id: profile.department_id,
              department_name: (profile as any).departments?.name,
              roles: []
            });
          }
        });

         roles?.forEach(role => {
           const user = usersMap.get(role.user_id);
           if (user && role.role && typeof role.role === 'string') {
             user.roles.push(role.role);
           }
         });

        return Array.from(usersMap.values());
      }

      // Create a map of users with their roles
      const usersMap = new Map<string, UserWithRole>();

      // Add auth users
      authUsers.users.forEach((authUser: any) => {
        const profile = profiles?.find(p => p.user_id === authUser.id);
        usersMap.set(authUser.id, {
          id: authUser.id,
          email: authUser.email || 'No email',
          display_name: profile?.display_name,
          department_id: profile?.department_id,
          department_name: (profile as any)?.departments?.name,
          roles: []
        });
      });

       // Add roles to users
        roles?.forEach(role => {
          const user = usersMap.get(role.user_id);
          if (user && role.role && typeof role.role === 'string') {
            user.roles.push(role.role);
          }
        });

      return Array.from(usersMap.values());
    } catch (error) {
      console.error('Error fetching users with roles:', error);
      return [];
    }
  }, []);

  const assignRole = useCallback(async (userId: string, role: string) => {
    try {
      const orgId = organization?.id;
      if (!orgId) {
        toast({
          title: "Organization not found",
          description: "Cannot assign role without an organization context.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role, organization_id: orgId });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role ${role} assigned successfully`,
      });

      // Refresh data
      await fetchAllUserRoles();
      if (userId === user?.id) {
        await fetchCurrentUserRoles();
      }
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign role",
        variant: "destructive",
      });
    }
  }, [fetchAllUserRoles, fetchCurrentUserRoles, user?.id, toast, organization?.id]);

  const removeRole = useCallback(async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role ${role} removed successfully`,
      });

      // Refresh data
      await fetchAllUserRoles();
      if (userId === user?.id) {
        await fetchCurrentUserRoles();
      }
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove role",
        variant: "destructive",
      });
    }
  }, [fetchAllUserRoles, fetchCurrentUserRoles, user?.id, toast]);

  const hasRole = useCallback((role: string): boolean => {
    return currentUserRoles.includes(role);
  }, [currentUserRoles]);

  const isAdmin = useCallback((): boolean => {
    return hasRole('Administrator') || hasRole('Account Administrator');
  }, [hasRole]);

  const isSupervisor = useCallback((): boolean => {
    return hasRole('Team Lead');
  }, [hasRole]);

  const isAgent = useCallback((): boolean => {
    return hasRole('Full Agent') || hasRole('Occasional Agent');
  }, [hasRole]);

  const isAccountAdmin = useCallback((): boolean => {
    return hasRole('Account Administrator');
  }, [hasRole]);

  useEffect(() => {
    if (user && organization?.id) {
      fetchCurrentUserRoles();
      fetchAvailableRoles();
    }
  }, [user, organization?.id, fetchCurrentUserRoles, fetchAvailableRoles]);

  return {
    userRoles,
    currentUserRoles,
    availableRoles,
    isLoading,
    fetchAllUserRoles,
    getUsersWithRoles,
    fetchAvailableRoles,
    createCustomRole,
    deleteCustomRole,
    assignRole,
    removeRole,
    hasRole,
    isAdmin,
    isSupervisor,
    isAgent,
    isAccountAdmin,
  };
}