import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'moderator' | 'user';

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
  roles: AppRole[];
}

export function useUserRoles() {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [currentUserRoles, setCurrentUserRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchCurrentUserRoles = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      const roles = data.map(item => item.role as AppRole);
      setCurrentUserRoles(roles);
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

      setUserRoles(data || []);
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
          if (user) {
            user.roles.push(role.role as AppRole);
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
        if (user) {
          user.roles.push(role.role as AppRole);
        }
      });

      return Array.from(usersMap.values());
    } catch (error) {
      console.error('Error fetching users with roles:', error);
      return [];
    }
  }, []);

  const assignRole = useCallback(async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

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
  }, [fetchAllUserRoles, fetchCurrentUserRoles, user?.id, toast]);

  const removeRole = useCallback(async (userId: string, role: AppRole) => {
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

  const hasRole = useCallback((role: AppRole): boolean => {
    return currentUserRoles.includes(role);
  }, [currentUserRoles]);

  const isAdmin = useCallback((): boolean => {
    return hasRole('admin');
  }, [hasRole]);

  const isModerator = useCallback((): boolean => {
    return hasRole('moderator');
  }, [hasRole]);

  useEffect(() => {
    if (user) {
      fetchCurrentUserRoles();
    }
  }, [user, fetchCurrentUserRoles]);

  return {
    userRoles,
    currentUserRoles,
    isLoading,
    fetchAllUserRoles,
    getUsersWithRoles,
    assignRole,
    removeRole,
    hasRole,
    isAdmin,
    isModerator,
  };
}