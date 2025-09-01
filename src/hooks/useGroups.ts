import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface Group {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  manager_id?: string;
  manager_name?: string;
  is_active: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  role_in_group: string;
  user_name: string;
  user_email: string;
  created_at: string;
}

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { organization } = useOrganization();

  const fetchGroups = useCallback(async () => {
    if (!organization?.id) return;
    
    setIsLoading(true);
    try {
      // First get the groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name');

      if (groupsError) throw groupsError;

      // Get manager info and member counts separately
      const groupsWithCounts: Group[] = [];
      
      for (const group of groupsData || []) {
        // Get manager info if manager_id exists
        let managerName = undefined;
        if (group.manager_id) {
          const { data: managerData } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', group.manager_id)
            .single();
          managerName = managerData?.display_name;
        }

        // Get member count
        const { count } = await supabase
          .from('user_groups')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id);

        groupsWithCounts.push({
          id: group.id,
          name: group.name,
          description: group.description,
          organization_id: group.organization_id,
          manager_id: group.manager_id,
          manager_name: managerName,
          is_active: group.is_active,
          member_count: count || 0,
          created_at: group.created_at,
          updated_at: group.updated_at,
        });
      }

      setGroups(groupsWithCounts);
    } catch (error: any) {
      console.error('Error fetching groups:', error);
      toast({
        title: "Error",
        description: "Failed to fetch groups",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, toast]);

  const createGroup = useCallback(async (name: string, description?: string, managerId?: string) => {
    if (!organization?.id) {
      toast({
        title: "Organization not found",
        description: "Cannot create group without an organization context.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('groups')
        .insert({
          name,
          description,
          organization_id: organization.id,
          manager_id: managerId && managerId.trim() !== '' ? managerId : null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group created successfully",
      });

      await fetchGroups();
      return true;
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive",
      });
      return false;
    }
  }, [organization?.id, toast, fetchGroups]);

  const updateGroup = useCallback(async (groupId: string, updates: Partial<Group>) => {
    try {
      const { error } = await supabase
        .from('groups')
        .update({
          name: updates.name,
          description: updates.description,
          manager_id: updates.manager_id && updates.manager_id.trim() !== '' ? updates.manager_id : null,
          is_active: updates.is_active,
        })
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group updated successfully",
      });

      await fetchGroups();
      return true;
    } catch (error: any) {
      console.error('Error updating group:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update group",
        variant: "destructive",
      });
      return false;
    }
  }, [toast, fetchGroups]);

  const deleteGroup = useCallback(async (groupId: string) => {
    try {
      // First remove all members from the group
      const { error: membersError } = await supabase
        .from('user_groups')
        .delete()
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      // Then delete the group
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group deleted successfully",
      });

      await fetchGroups();
      return true;
    } catch (error: any) {
      console.error('Error deleting group:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete group",
        variant: "destructive",
      });
      return false;
    }
  }, [toast, fetchGroups]);

  const getGroupMembers = useCallback(async (groupId: string): Promise<GroupMember[]> => {
    try {
      // Get user_groups records
      const { data: userGroupsData, error: userGroupsError } = await supabase
        .from('user_groups')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at');

      if (userGroupsError) throw userGroupsError;

      // Get profile info for each user
      const members: GroupMember[] = [];
      
      for (const userGroup of userGroupsData || []) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('user_id', userGroup.user_id)
          .single();

        members.push({
          id: userGroup.id,
          user_id: userGroup.user_id,
          group_id: userGroup.group_id,
          role_in_group: userGroup.role_in_group,
          user_name: profileData?.display_name || 'Unknown User',
          user_email: profileData?.email || '',
          created_at: userGroup.created_at,
        });
      }

      return members;
    } catch (error: any) {
      console.error('Error fetching group members:', error);
      return [];
    }
  }, []);

  const addUserToGroup = useCallback(async (userId: string, groupId: string, roleInGroup: string = 'member') => {
    if (!organization?.id) return false;

    try {
      const { error } = await supabase
        .from('user_groups')
        .insert({
          user_id: userId,
          group_id: groupId,
          organization_id: organization.id,
          role_in_group: roleInGroup,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User added to group successfully",
      });

      await fetchGroups();
      return true;
    } catch (error: any) {
      console.error('Error adding user to group:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add user to group",
        variant: "destructive",
      });
      return false;
    }
  }, [organization?.id, toast, fetchGroups]);

  const removeUserFromGroup = useCallback(async (userId: string, groupId: string) => {
    try {
      const { error } = await supabase
        .from('user_groups')
        .delete()
        .eq('user_id', userId)
        .eq('group_id', groupId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User removed from group successfully",
      });

      await fetchGroups();
      return true;
    } catch (error: any) {
      console.error('Error removing user from group:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove user from group",
        variant: "destructive",
      });
      return false;
    }
  }, [toast, fetchGroups]);

  const getUserGroups = useCallback(async (userId: string): Promise<Group[]> => {
    if (!organization?.id) return [];

    try {
      const { data, error } = await supabase
        .from('user_groups')
        .select(`
          groups(*)
        `)
        .eq('user_id', userId)
        .eq('organization_id', organization.id);

      if (error) throw error;

      return (data || []).map(item => (item as any).groups).filter(Boolean);
    } catch (error: any) {
      console.error('Error fetching user groups:', error);
      return [];
    }
  }, [organization?.id]);

  useEffect(() => {
    if (user && organization?.id) {
      fetchGroups();
    }
  }, [user, organization?.id, fetchGroups]);

  return {
    groups,
    isLoading,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupMembers,
    addUserToGroup,
    removeUserFromGroup,
    getUserGroups,
  };
}