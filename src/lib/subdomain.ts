// Subdomain detection and tenant resolution utilities

export interface TenantInfo {
  type: 'subdomain' | 'custom' | 'default';
  identifier: string;
  hostname: string;
  subdomain?: string;
  baseDomain?: string;
}

export const detectTenant = (): TenantInfo => {
  const hostname = window.location.hostname;
  
  // Handle localhost development
  if (hostname === 'localhost' || hostname.includes('127.0.0.1') || hostname.includes('lovableproject.com')) {
    return {
      type: 'default',
      identifier: 'default',
      hostname,
    };
  }
  
  // Split hostname into parts
  const parts = hostname.split('.');
  
  // If only one part, it's likely a top-level domain without subdomain
  if (parts.length <= 2) {
    return {
      type: 'custom',
      identifier: hostname,
      hostname,
    };
  }
  
  // Extract subdomain and base domain
  const subdomain = parts[0];
  const baseDomain = parts.slice(1).join('.');
  
  // Skip common non-tenant subdomains
  const systemSubdomains = ['www', 'api', 'admin', 'mail', 'ftp', 'blog'];
  if (systemSubdomains.includes(subdomain.toLowerCase())) {
    return {
      type: 'custom',
      identifier: hostname,
      hostname,
    };
  }
  
  return {
    type: 'subdomain',
    identifier: subdomain,
    hostname,
    subdomain,
    baseDomain,
  };
};

export const resolveOrganizationFromDomain = async (tenantInfo: TenantInfo) => {
  // This will be implemented to call the Supabase function
  // For now, return null to be handled by the context
  return null;
};

export const generateSubdomainUrl = (subdomain: string, baseDomain: string = 'yourdomain.com') => {
  return `https://${subdomain}.${baseDomain}`;
};

export const isValidSubdomain = (subdomain: string): boolean => {
  // Subdomain validation rules
  const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  return subdomainRegex.test(subdomain.toLowerCase()) && 
         subdomain.length >= 2 && 
         subdomain.length <= 63;
};