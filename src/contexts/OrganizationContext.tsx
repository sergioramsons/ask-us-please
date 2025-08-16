import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { detectTenant, TenantInfo } from '@/lib/subdomain';

interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  settings: any;
  subscription_status: 'active' | 'suspended' | 'cancelled';
  max_users: number;
  max_tickets?: number;
  created_at: string;
  updated_at: string;
}

interface OrganizationContextType {
  organization: Organization | null;
  userOrganizations: Organization[];
  isOrgAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUserOrganization = async () => {
    if (!user) {
      setOrganization(null);
      setUserOrganizations([]);
      setIsOrgAdmin(false);
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    try {
      // Check if we should resolve organization by subdomain
      const hostname = window.location.hostname;
      let targetOrgId: string | null = null;

      // Try to resolve organization from subdomain/hostname
      if (hostname && hostname !== 'localhost' && !hostname.includes('lovableproject.com')) {
        const { data: resolvedOrgId } = await supabase
          .rpc('resolve_organization_by_subdomain', { hostname });
        
        if (resolvedOrgId) {
          targetOrgId = resolvedOrgId;
        }
      }

      // If no subdomain organization found, get user's current organization from profile
      if (!targetOrgId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('user_id', user.id)
          .maybeSingle();

        targetOrgId = profile?.organization_id;
      }

      if (targetOrgId) {
        // Fetch current organization
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', targetOrgId)
          .single();

        if (org) {
          setOrganization(org as Organization);
          
          // Update user's profile if we switched via subdomain
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (currentProfile?.organization_id !== targetOrgId) {
            await supabase
              .from('profiles')
              .update({ organization_id: targetOrgId })
              .eq('user_id', user.id);
          }
        }
      }

      // Fetch all organizations user has admin access to
      const { data: adminOrgs } = await supabase
        .from('organization_admins')
        .select(`
          organization_id,
          role,
          organizations (*)
        `)
        .eq('user_id', user.id);

      if (adminOrgs) {
        const orgs = adminOrgs
          .map(admin => admin.organizations)
          .filter(Boolean) as Organization[];
        setUserOrganizations(orgs);
        setIsOrgAdmin(adminOrgs.length > 0);
        setIsSuperAdmin(adminOrgs.some(admin => admin.role === 'super_admin'));
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = async (orgId: string) => {
    if (!user) return;

    try {
      // Update user's profile to switch organization
      const { error } = await supabase
        .from('profiles')
        .update({ organization_id: orgId })
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh organization data
      await fetchUserOrganization();
    } catch (error) {
      console.error('Error switching organization:', error);
      throw error;
    }
  };

  const refreshOrganization = async () => {
    await fetchUserOrganization();
  };

  useEffect(() => {
    if (session) {
      fetchUserOrganization();
    }
  }, [session, user]);

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        userOrganizations,
        isOrgAdmin,
        isSuperAdmin,
        loading,
        switchOrganization,
        refreshOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};