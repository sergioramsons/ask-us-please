import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

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
  setOrganization: (org: Organization | null) => void;
  isLoading: boolean;
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
  const [isOrgAdmin, setIsOrgAdmin] = useState(true); // Single tenant = everyone is admin
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); // No super admin in single tenant
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
      // In single-tenant mode, get the first available organization
      const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .limit(1);

      if (orgs && orgs.length > 0) {
        const org = orgs[0] as Organization;
        setOrganization(org);
        setUserOrganizations([org]);
        setIsOrgAdmin(true); // Everyone is admin in single tenant
        setIsSuperAdmin(false);
      } else {
        // Create a default organization if none exists
        const { data: newOrg } = await supabase
          .from('organizations')
          .insert({
            name: 'My Organization',
            slug: 'main',
            settings: {},
            subscription_status: 'active',
            max_users: 1000
          })
          .select()
          .single();
        
        if (newOrg) {
          const org = newOrg as Organization;
          setOrganization(org);
          setUserOrganizations([org]);
          setIsOrgAdmin(true);
          setIsSuperAdmin(false);
        }
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      // Set a default organization for single-tenant mode
      const defaultOrg: Organization = {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Default Organization',
        slug: 'default',
        settings: {},
        subscription_status: 'active',
        max_users: 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setOrganization(defaultOrg);
      setUserOrganizations([defaultOrg]);
      setIsOrgAdmin(true);
      setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = async (orgId: string) => {
    // In single-tenant mode, this is a no-op since there's only one organization
    return Promise.resolve();
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
        setOrganization,
        isLoading: loading
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};