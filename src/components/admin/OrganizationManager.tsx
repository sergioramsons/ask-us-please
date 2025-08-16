import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { Plus, Building2, Users, Settings, Edit, Save, X } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  subscription_status: 'active' | 'suspended' | 'cancelled';
  max_users: number;
  max_tickets?: number;
  created_at: string;
  updated_at: string;
}

interface CreateOrgFormData {
  name: string;
  slug: string;
  domain: string;
  max_users: number;
  max_tickets: string;
}

const OrganizationManager: React.FC = () => {
  const { isSuperAdmin } = useOrganization();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [formData, setFormData] = useState<CreateOrgFormData>({
    name: '',
    slug: '',
    domain: '',
    max_users: 10,
    max_tickets: '',
  });
  const [editFormData, setEditFormData] = useState<CreateOrgFormData>({
    name: '',
    slug: '',
    domain: '',
    max_users: 10,
    max_tickets: '',
  });

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations((data || []) as Organization[]);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const orgData = {
        name: formData.name,
        slug: formData.slug,
        domain: formData.domain || null,
        max_users: formData.max_users,
        max_tickets: formData.max_tickets ? parseInt(formData.max_tickets) : null,
      };

      const { error } = await supabase
        .from('organizations')
        .insert([orgData]);

      if (error) throw error;

      toast.success('Organization created successfully');
      setShowCreateDialog(false);
      setFormData({
        name: '',
        slug: '',
        domain: '',
        max_users: 10,
        max_tickets: '',
      });
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast.error(error.message || 'Failed to create organization');
    }
  };

  const updateOrganizationStatus = async (orgId: string, status: 'active' | 'suspended' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ subscription_status: status })
        .eq('id', orgId);

      if (error) throw error;

      toast.success('Organization status updated');
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast.error(error.message || 'Failed to update organization status');
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const handleEditNameChange = (name: string) => {
    setEditFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const handleEditOrganization = (org: Organization) => {
    setEditingOrg(org);
    setEditFormData({
      name: org.name,
      slug: org.slug,
      domain: org.domain || '',
      max_users: org.max_users,
      max_tickets: org.max_tickets?.toString() || '',
    });
    setShowEditDialog(true);
  };

  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;
    
    try {
      const orgData = {
        name: editFormData.name,
        slug: editFormData.slug,
        domain: editFormData.domain || null,
        max_users: editFormData.max_users,
        max_tickets: editFormData.max_tickets ? parseInt(editFormData.max_tickets) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('organizations')
        .update(orgData)
        .eq('id', editingOrg.id);

      if (error) throw error;

      toast.success('Organization updated successfully');
      setShowEditDialog(false);
      setEditingOrg(null);
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast.error(error.message || 'Failed to update organization');
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchOrganizations();
    }
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">You don't have permission to manage organizations.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p>Loading organizations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Organization Management</h2>
          <p className="text-muted-foreground">Manage client organizations and their settings</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <div>
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Acme Corporation"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="acme-corporation"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="domain">Domain (optional)</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="acme.com"
                />
              </div>
              
              <div>
                <Label htmlFor="max_users">Max Users</Label>
                <Input
                  id="max_users"
                  type="number"
                  value={formData.max_users}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_users: parseInt(e.target.value) }))}
                  min="1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="max_tickets">Max Tickets (optional)</Label>
                <Input
                  id="max_tickets"
                  type="number"
                  value={formData.max_tickets}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_tickets: e.target.value }))}
                  placeholder="Leave empty for unlimited"
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Organization</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Organization Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateOrganization} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Organization Name</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => handleEditNameChange(e.target.value)}
                placeholder="Acme Corporation"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={editFormData.slug}
                onChange={(e) => setEditFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="acme-corporation"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit-domain">Domain (optional)</Label>
              <Input
                id="edit-domain"
                value={editFormData.domain}
                onChange={(e) => setEditFormData(prev => ({ ...prev, domain: e.target.value }))}
                placeholder="acme.com"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-max_users">Max Users</Label>
              <Input
                id="edit-max_users"
                type="number"
                value={editFormData.max_users}
                onChange={(e) => setEditFormData(prev => ({ ...prev, max_users: parseInt(e.target.value) }))}
                min="1"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit-max_tickets">Max Tickets (optional)</Label>
              <Input
                id="edit-max_tickets"
                type="number"
                value={editFormData.max_tickets}
                onChange={(e) => setEditFormData(prev => ({ ...prev, max_tickets: e.target.value }))}
                placeholder="Leave empty for unlimited"
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                Update Organization
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {organizations.map((org) => (
          <Card key={org.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {org.name}
                  </CardTitle>
                  <CardDescription>
                    Slug: {org.slug} {org.domain && `• Domain: ${org.domain}`}
                  </CardDescription>
                </div>
                <Badge variant={
                  org.subscription_status === 'active' ? 'default' :
                  org.subscription_status === 'suspended' ? 'secondary' : 'destructive'
                }>
                  {org.subscription_status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Max Users: {org.max_users}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    Max Tickets: {org.max_tickets || 'Unlimited'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Created: {new Date(org.created_at).toLocaleDateString()}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select
                  value={org.subscription_status}
                  onValueChange={(value: 'active' | 'suspended' | 'cancelled') => 
                    updateOrganizationStatus(org.id, value)
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditOrganization(org)}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {organizations.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No organizations created yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OrganizationManager;