import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

export interface AgentSkill {
  id: string;
  user_id: string;
  skill_name: string;
  skill_level: number;
  user_name?: string;
  user_email?: string;
}

export interface AgentAvailability {
  id: string;
  user_id: string;
  is_available: boolean;
  max_tickets: number | null;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

export interface AssignmentSettings {
  method: 'round_robin' | 'load_balanced' | 'skill_based';
  allow_agent_availability_control: boolean;
  default_max_tickets_per_agent: number;
}

export function useAssignmentSystem() {
  const { organization } = useOrganization();
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [availability, setAvailability] = useState<AgentAvailability[]>([]);
  const [settings, setSettings] = useState<AssignmentSettings>({
    method: 'round_robin',
    allow_agent_availability_control: true,
    default_max_tickets_per_agent: 10
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch agent skills
  const fetchSkills = useCallback(async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('agent_skills')
        .select(`
          id,
          user_id,
          skill_name,
          skill_level,
          created_at,
          updated_at
        `)
        .eq('organization_id', organization.id);

      if (error) throw error;

      // Get user names separately
      const userIds = data?.map(skill => skill.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds);

      const formattedSkills = data?.map(skill => {
        const profile = profiles?.find(p => p.user_id === skill.user_id);
        return {
          ...skill,
          user_name: profile?.display_name || 'Unknown',
          user_email: profile?.email || ''
        };
      }) || [];

      setSkills(formattedSkills);
    } catch (error) {
      console.error('Error fetching skills:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent skills",
        variant: "destructive",
      });
    }
  }, [organization?.id, toast]);

  // Fetch agent availability
  const fetchAvailability = useCallback(async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('agent_availability')
        .select(`
          id,
          user_id,
          is_available,
          max_tickets,
          updated_at
        `)
        .eq('organization_id', organization.id);

      if (error) throw error;

      // Get user names separately
      const userIds = data?.map(avail => avail.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds);

      const formattedAvailability = data?.map(avail => {
        const profile = profiles?.find(p => p.user_id === avail.user_id);
        return {
          ...avail,
          user_name: profile?.display_name || 'Unknown',
          user_email: profile?.email || ''
        };
      }) || [];

      setAvailability(formattedAvailability);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent availability",
        variant: "destructive",
      });
    }
  }, [organization?.id, toast]);

  // Fetch assignment settings
  const fetchSettings = useCallback(async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('assignment_settings')
        .eq('id', organization.id)
        .single();

      if (error) throw error;

      if (data?.assignment_settings) {
        const assignmentSettings = data.assignment_settings as any;
        setSettings({
          method: assignmentSettings.method || 'round_robin',
          allow_agent_availability_control: assignmentSettings.allow_agent_availability_control ?? true,
          default_max_tickets_per_agent: assignmentSettings.default_max_tickets_per_agent || 10
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch assignment settings",
        variant: "destructive",
      });
    }
  }, [organization?.id, toast]);

  // Add skill to agent
  const addSkill = useCallback(async (userId: string, skillName: string, skillLevel: number = 1) => {
    if (!organization?.id) return false;

    try {
      const { error } = await supabase
        .from('agent_skills')
        .insert({
          organization_id: organization.id,
          user_id: userId,
          skill_name: skillName,
          skill_level: skillLevel
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Skill added successfully",
      });

      fetchSkills();
      return true;
    } catch (error) {
      console.error('Error adding skill:', error);
      toast({
        title: "Error",
        description: "Failed to add skill",
        variant: "destructive",
      });
      return false;
    }
  }, [organization?.id, fetchSkills, toast]);

  // Remove skill from agent
  const removeSkill = useCallback(async (skillId: string) => {
    try {
      const { error } = await supabase
        .from('agent_skills')
        .delete()
        .eq('id', skillId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Skill removed successfully",
      });

      fetchSkills();
      return true;
    } catch (error) {
      console.error('Error removing skill:', error);
      toast({
        title: "Error",
        description: "Failed to remove skill",
        variant: "destructive",
      });
      return false;
    }
  }, [fetchSkills, toast]);

  // Update agent availability
  const updateAvailability = useCallback(async (userId: string, isAvailable: boolean, maxTickets?: number) => {
    if (!organization?.id) return false;

    try {
      const { error } = await supabase
        .from('agent_availability')
        .upsert({
          organization_id: organization.id,
          user_id: userId,
          is_available: isAvailable,
          max_tickets: maxTickets || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agent availability updated",
      });

      fetchAvailability();
      return true;
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive",
      });
      return false;
    }
  }, [organization?.id, fetchAvailability, toast]);

  // Update assignment settings
  const updateSettings = useCallback(async (newSettings: Partial<AssignmentSettings>) => {
    if (!organization?.id) return false;

    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      const { error } = await supabase
        .from('organizations')
        .update({
          assignment_settings: updatedSettings
        })
        .eq('id', organization.id);

      if (error) throw error;

      setSettings(updatedSettings);
      
      toast({
        title: "Success",
        description: "Assignment settings updated",
      });

      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update assignment settings",
        variant: "destructive",
      });
      return false;
    }
  }, [organization?.id, settings, toast]);

  // Get available skills list
  const getAvailableSkills = useCallback(() => {
    const allSkills = skills.map(skill => skill.skill_name);
    return [...new Set(allSkills)];
  }, [skills]);

  // Load all data
  useEffect(() => {
    if (organization?.id) {
      setIsLoading(true);
      Promise.all([
        fetchSkills(),
        fetchAvailability(), 
        fetchSettings()
      ]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [organization?.id, fetchSkills, fetchAvailability, fetchSettings]);

  return {
    skills,
    availability,
    settings,
    isLoading,
    addSkill,
    removeSkill,
    updateAvailability,
    updateSettings,
    getAvailableSkills,
    refetch: () => {
      fetchSkills();
      fetchAvailability();
      fetchSettings();
    }
  };
}