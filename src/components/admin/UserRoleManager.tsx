import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useGroups, Group, GroupMember } from '@/hooks/useGroups';
import { useDepartments, Department } from '@/hooks/useDepartments';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, UserMinus, Shield, Building2, Trash2, Plus, Settings, Edit, Check, X } from 'lucide-react';

interface UserWithRole {
  id: string;
  email: string;
  display_name?: string;
  department_id?: string;
  department_name?: string;
  roles: string[];
}

export function UserRoleManager() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('agent');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newDepartmentDesc, setNewDepartmentDesc] = useState('');
  
  // New user form state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<string>('agent');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Edit user form state
  const [editingUserId, setEditingUserId] = useState<string>('');
  const [editUserDisplayName, setEditUserDisplayName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserDepartment, setEditUserDepartment] = useState<string>('');
  const [isEditingUser, setIsEditingUser] = useState(false);

  // Custom role form state
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRoleIsAdmin, setNewRoleIsAdmin] = useState(false);
  
  // Permissions state
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<string>('');
  const [rolePermissions, setRolePermissions] = useState<{id: string, name: string, description?: string, category: string}[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  
  // Groups state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [selectedGroupForMembers, setSelectedGroupForMembers] = useState<string>('');
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [selectedUserForGroup, setSelectedUserForGroup] = useState<string>('');
  
  // Edit group state
  const [editingGroupId, setEditingGroupId] = useState<string>('');
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editGroupManagerId, setEditGroupManagerId] = useState('');
  
  const { organization } = useOrganization();
  
  const { 
    getUsersWithRoles, 
    assignRole, 
    removeRole, 
    isLoading, 
    isAdmin, 
    availableRoles, 
    availablePermissions,
    fetchAvailableRoles, 
    getRolePermissions,
    updateRolePermissions,
    createCustomRole, 
    deleteCustomRole 
  } = useUserRoles();
  const { 
    departments, 
    fetchDepartments, 
    createDepartment, 
    deleteDepartment, 
    assignUserToDepartment,
    isLoading: isDepartmentsLoading 
  } = useDepartments();
  const {
    groups,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupMembers,
    addUserToGroup,
    removeUserFromGroup,
    isLoading: isGroupsLoading
  } = useGroups();

  useEffect(() => {
    loadUsers();
    fetchDepartments();
    fetchAvailableRoles();
  }, [fetchAvailableRoles]);

  const loadUsers = async () => {
    const usersWithRoles = await getUsersWithRoles();
    setUsers(usersWithRoles);
  };

  const handleAssignRole = async (userId: string) => {
    await assignRole(userId, selectedRole);
    await loadUsers();
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    await removeRole(userId, role);
    // Add a small delay to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 300));
    await loadUsers();
  };

  const handleAssignDepartment = async (userId: string, departmentId: string | null) => {
    await assignUserToDepartment(userId, departmentId);
    await loadUsers();
  };

  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim() || !organization?.id) return;
    
    const created = await createDepartment(newDepartmentName, newDepartmentDesc, organization.id);
    if (created) {
      setNewDepartmentName('');
      setNewDepartmentDesc('');
    }
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    if (confirm('Are you sure you want to delete this department? Users will be unassigned.')) {
      await deleteDepartment(departmentId);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      return;
    }

    setIsCreatingUser(true);
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call the edge function to create user with admin privileges
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          displayName: newUserDisplayName,
          departmentId: newUserDepartment === 'none' ? null : newUserDepartment || null,
          role: newUserRole
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create user');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Clear form on success
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserDisplayName('');
      setNewUserDepartment('');
      setNewUserRole('agent');

      // Reload users
      await loadUsers();

      // Show success message
      console.log('User created successfully:', data.user);
    } catch (error: any) {
      console.error('Error creating user:', error);
      // You might want to show a toast notification here
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleCreateCustomRole = async () => {
    if (!newRoleName.trim()) return;
    
    const success = await createCustomRole(newRoleName, newRoleDescription, newRoleIsAdmin);
    if (success) {
      setNewRoleName('');
      setNewRoleDescription('');
      setNewRoleIsAdmin(false);
    }
  };

  const handleDeleteCustomRole = async (roleId: string, roleName: string) => {
    if (confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) {
      await deleteCustomRole(roleId, roleName);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user "${userEmail}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Invoke secure edge function to delete the user with service role
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        throw new Error(error.message || 'Failed to delete user');
      }

      if ((data as any)?.errors?.length) {
        console.warn('Partial deletion with warnings:', (data as any).errors);
      }

      console.info('User deleted successfully');
      
      // Reload users list
      await loadUsers();
      
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setEditingUserId(user.id);
    setEditUserDisplayName(user.display_name || '');
    setEditUserEmail(user.email);
    setEditUserDepartment(user.department_id || 'none');
    setIsEditingUser(false);
  };

  const handleSaveUserEdit = async () => {
    if (!editingUserId || !editUserEmail.trim()) {
      console.error('User ID and email are required');
      return;
    }

    setIsEditingUser(true);
    try {
      // Update user profile via secure edge function (admin privileges)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');
      const { data: updateData, error: updateError } = await supabase.functions.invoke('admin-update-user-profile', {
        body: {
          userId: editingUserId,
          email: editUserEmail.trim(),
          displayName: editUserDisplayName.trim() || null,
          departmentId: editUserDepartment === 'none' ? null : editUserDepartment
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (updateError || (updateData as any)?.error) {
        throw new Error(updateError?.message || (updateData as any)?.error || 'Failed to update profile');
      }

      // Clear edit form
      setEditingUserId('');
      setEditUserDisplayName('');
      setEditUserEmail('');
      setEditUserDepartment('');

      // Reload users
      await loadUsers();

      console.log('User updated successfully');
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert('Failed to update user: ' + (error.message || 'Unknown error'));
    } finally {
      setIsEditingUser(false);
    }
  };

  const handleCancelUserEdit = () => {
    setEditingUserId('');
    setEditUserDisplayName('');
    setEditUserEmail('');
    setEditUserDepartment('');
    setIsEditingUser(false);
  };

  // Permissions management functions
  const handleRolePermissionsChange = async (roleId: string) => {
    setSelectedRoleForPermissions(roleId);
    const permissions = await getRolePermissions(roleId);
    setRolePermissions(permissions);
    setSelectedPermissions(new Set(permissions.map(p => p.id)));
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(permissionId);
      } else {
        newSet.delete(permissionId);
      }
      return newSet;
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleForPermissions) return;
    
    const success = await updateRolePermissions(selectedRoleForPermissions, Array.from(selectedPermissions));
    if (success) {
      // Refresh role permissions
      const permissions = await getRolePermissions(selectedRoleForPermissions);
      setRolePermissions(permissions);
    }
  };

  // Group permissions by category
  const groupedPermissions = availablePermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof availablePermissions>);

  // Groups management functions
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    
    const success = await createGroup(
      newGroupName, 
      newGroupDescription || undefined, 
      selectedManagerId === 'none' ? undefined : selectedManagerId || undefined
    );
    if (success) {
      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedManagerId('');
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (confirm(`Are you sure you want to delete the group "${groupName}"? All members will be removed.`)) {
      await deleteGroup(groupId);
    }
  };

  const handleViewGroupMembers = async (groupId: string) => {
    setSelectedGroupForMembers(groupId);
    const members = await getGroupMembers(groupId);
    setGroupMembers(members);
  };

  const handleEditGroup = (group: any) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupDescription(group.description || '');
    setEditGroupManagerId(group.manager_id || '');
  };

  const handleSaveGroupEdit = async () => {
    if (!editGroupName.trim()) {
      console.error('Group name is required');
      return;
    }

    const success = await updateGroup(editingGroupId, {
      name: editGroupName,
      description: editGroupDescription || undefined,
      manager_id: editGroupManagerId || undefined
    });

    if (success) {
      console.log('Group updated successfully');
      setEditingGroupId('');
      setEditGroupName('');
      setEditGroupDescription('');
      setEditGroupManagerId('');
    } else {
      console.error('Failed to update group');
    }
  };

  const handleCancelGroupEdit = () => {
    setEditingGroupId('');
    setEditGroupName('');
    setEditGroupDescription('');
    setEditGroupManagerId('');
  };

  const handleAddUserToGroup = async () => {
    if (!selectedUserForGroup || !selectedGroupForMembers) return;
    
    const success = await addUserToGroup(selectedUserForGroup, selectedGroupForMembers);
    if (success) {
      setSelectedUserForGroup('');
      // Refresh group members
      const members = await getGroupMembers(selectedGroupForMembers);
      setGroupMembers(members);
    }
  };

  const handleRemoveUserFromGroup = async (userId: string, groupId: string) => {
    const success = await removeUserFromGroup(userId, groupId);
    if (success) {
      // Refresh group members
      const members = await getGroupMembers(groupId);
      setGroupMembers(members);
    }
  };

  if (!isAdmin()) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>You need admin privileges to access user role management.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          User & Department Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
            <TabsTrigger value="roles">Manage Roles</TabsTrigger>
            <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="create-user">Create User</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-4">
            {/* Role Assignment Controls */}
            <div className="flex gap-2 items-center p-4 bg-muted/50 rounded-lg">
              <Select value={selectedRole} onValueChange={(value: string) => setSelectedRole(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.role_name}>
                      {role.role_name}
                      {role.is_admin_role && ' (Admin)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Users List */}
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1">
                    {editingUserId === user.id ? (
                      // Edit form
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="edit-display-name">Display Name</Label>
                            <Input
                              id="edit-display-name"
                              value={editUserDisplayName}
                              onChange={(e) => setEditUserDisplayName(e.target.value)}
                              placeholder="Enter display name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                              id="edit-email"
                              type="email"
                              value={editUserEmail}
                              onChange={(e) => setEditUserEmail(e.target.value)}
                              placeholder="Enter email"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="edit-department">Department</Label>
                          <Select value={editUserDepartment} onValueChange={setEditUserDepartment}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Department</SelectItem>
                              {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={handleSaveUserEdit}
                            disabled={isEditingUser}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleCancelUserEdit}
                            disabled={isEditingUser}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <>
                        <div className="font-medium">{user.display_name || 'Unknown User'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        
                        {/* Department Badge */}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {user.department_name || 'No Department'}
                          </Badge>
                        </div>
                        
                        {/* Roles */}
                        <div className="flex gap-2 mt-2">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <Badge key={role} variant="secondary" className="flex items-center gap-1">
                                {role}
                                <button
                                  onClick={() => handleRemoveRole(user.id, role)}
                                  className="ml-1 hover:text-destructive"
                                  title={`Remove ${role} role`}
                                >
                                  <UserMinus className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline">No roles assigned</Badge>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                   
                  {editingUserId !== user.id && (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssignRole(user.id)}
                        disabled={isLoading || user.roles.includes(selectedRole)}
                        title={`Assign ${selectedRole} role`}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add {selectedRole}
                      </Button>
                      
                      {selectedDepartment && selectedDepartment !== 'none' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAssignDepartment(user.id, selectedDepartment === 'none' ? null : selectedDepartment)}
                          disabled={isLoading}
                          title={`Assign to ${departments.find(d => d.id === selectedDepartment)?.name}`}
                        >
                          <Building2 className="h-4 w-4 mr-1" />
                          Set Dept
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditUser(user)}
                        title="Edit user details"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="create-user" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Create New User
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new-user-email">Email Address *</Label>
                    <Input
                      id="new-user-email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@company.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-user-password">Password *</Label>
                    <Input
                      id="new-user-password"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Temporary password"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new-user-name">Display Name</Label>
                    <Input
                      id="new-user-name"
                      value={newUserDisplayName}
                      onChange={(e) => setNewUserDisplayName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-user-role">Initial Role</Label>
                    <Select value={newUserRole} onValueChange={(value: string) => setNewUserRole(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.id} value={role.role_name}>
                            {role.role_name}
                            {role.is_admin_role && ' (Admin)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="new-user-department">Department</Label>
                  <Select value={newUserDepartment} onValueChange={setNewUserDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleCreateUser} 
                    disabled={!newUserEmail.trim() || !newUserPassword.trim() || isCreatingUser}
                    className="flex-1"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {isCreatingUser ? 'Creating User...' : 'Create User'}
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <strong>Note:</strong> The user will be created with email verification automatically confirmed. 
                  They can log in immediately with the provided credentials and should change their password on first login.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="roles" className="space-y-4">
            {/* Create Custom Role */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Create Custom Role
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role-name">Role Name *</Label>
                    <Input
                      id="role-name"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="e.g., manager, technician"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role-description">Description</Label>
                    <Input
                      id="role-description"
                      value={newRoleDescription}
                      onChange={(e) => setNewRoleDescription(e.target.value)}
                      placeholder="Role description (optional)"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="role-admin"
                    checked={newRoleIsAdmin}
                    onChange={(e) => setNewRoleIsAdmin(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="role-admin">Admin role (has administrative privileges)</Label>
                </div>
                
                <Button 
                  onClick={handleCreateCustomRole} 
                  disabled={!newRoleName.trim()}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom Role
                </Button>
              </CardContent>
            </Card>

            {/* Available Roles List */}
            <Card>
              <CardHeader>
                <CardTitle>Available Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableRoles.map((role) => (
                    <div 
                      key={role.id} 
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {role.role_name}
                          {role.is_admin_role && (
                            <Badge variant="destructive" className="text-xs">Admin</Badge>
                          )}
                          {role.is_default && (
                            <Badge variant="outline" className="text-xs">Default</Badge>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                        )}
                      </div>
                      
                      {!role.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCustomRole(role.id, role.role_name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="permissions" className="space-y-4">
            {/* Role Permissions Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Role Permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="role-select">Select Role to Edit Permissions</Label>
                  <Select value={selectedRoleForPermissions} onValueChange={handleRolePermissionsChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a role to edit permissions" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.role_name}
                          {role.is_admin_role && ' (Admin)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedRoleForPermissions && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">
                        Permissions for: {availableRoles.find(r => r.id === selectedRoleForPermissions)?.role_name}
                      </h3>
                      <Button onClick={handleSavePermissions} variant="default">
                        Save Permissions
                      </Button>
                    </div>

                    {Object.entries(groupedPermissions).map(([category, permissions]) => (
                      <Card key={category}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{category}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {permissions.map((permission) => (
                            <div key={permission.id} className="flex items-start space-x-3">
                              <Checkbox
                                id={permission.id}
                                checked={selectedPermissions.has(permission.id)}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(permission.id, checked as boolean)
                                }
                              />
                              <div className="grid gap-1.5 leading-none">
                                <Label
                                  htmlFor={permission.id}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {permission.name.replace(/^\w+\./, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Label>
                                {permission.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {permission.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}

                    <div className="flex justify-between items-center pt-4">
                      <div className="text-sm text-muted-foreground">
                        {selectedPermissions.size} permissions selected
                      </div>
                      <Button onClick={handleSavePermissions} variant="default">
                        Save Permissions
                      </Button>
                    </div>
                  </div>
                )}

                {!selectedRoleForPermissions && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a role above to manage its permissions</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            {/* Create Group */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Create New Group
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="group-name">Group Name *</Label>
                    <Input
                      id="group-name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="e.g., Customer Support, Technical Team"
                    />
                  </div>
                  <div>
                    <Label htmlFor="group-manager">Group Manager</Label>
                    <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a manager" />
                      </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="none">No Manager</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.display_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="group-description">Description</Label>
                  <Input
                    id="group-description"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Group description (optional)"
                  />
                </div>
                
                <Button 
                  onClick={handleCreateGroup} 
                  disabled={!newGroupName.trim() || isGroupsLoading}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </CardContent>
            </Card>

            {/* Groups List */}
            <div className="grid gap-4">
              {groups.map((group) => (
                <Card key={group.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{group.member_count} members</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditGroup(group)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Edit Group Form */}
                    {editingGroupId === group.id ? (
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`edit-group-name-${group.id}`}>Group Name *</Label>
                            <Input
                              id={`edit-group-name-${group.id}`}
                              value={editGroupName}
                              onChange={(e) => setEditGroupName(e.target.value)}
                              placeholder="Enter group name"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-group-manager-${group.id}`}>Manager</Label>
                            <Select value={editGroupManagerId} onValueChange={setEditGroupManagerId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select manager (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">No manager</SelectItem>
                                {users.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.display_name || user.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`edit-group-description-${group.id}`}>Description</Label>
                          <Input
                            id={`edit-group-description-${group.id}`}
                            value={editGroupDescription}
                            onChange={(e) => setEditGroupDescription(e.target.value)}
                            placeholder="Enter description (optional)"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleSaveGroupEdit} size="sm">
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button variant="outline" onClick={handleCancelGroupEdit} size="sm">
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-medium">Manager: </span>
                          <span className="text-muted-foreground">
                            {group.manager_name || 'No manager assigned'}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewGroupMembers(group.id)}
                        >
                          Manage Members
                        </Button>
                      </div>
                    )}
                    
                    {/* Group Members Management */}
                    {selectedGroupForMembers === group.id && (
                      <div className="border-t pt-4 mt-4 space-y-4">
                        <div className="flex items-center gap-2">
                          <Select value={selectedUserForGroup} onValueChange={setSelectedUserForGroup}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select user to add" />
                            </SelectTrigger>
                            <SelectContent>
                              {users
                                .filter(user => !groupMembers.some(member => member.user_id === user.id))
                                .map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.display_name || user.email}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={handleAddUserToGroup}
                            disabled={!selectedUserForGroup}
                            size="sm"
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Current Members:</Label>
                          {groupMembers.length > 0 ? (
                            <div className="space-y-2">
                              {groupMembers.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-2 border rounded">
                                  <div>
                                    <span className="font-medium">{member.user_name}</span>
                                    <span className="text-sm text-muted-foreground ml-2">({member.user_email})</span>
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      {member.role_in_group}
                                    </Badge>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveUserFromGroup(member.user_id, group.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <UserMinus className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No members in this group</p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {groups.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No groups found</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="departments" className="space-y-4">
            {/* Create Department */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create New Department</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dept-name">Department Name</Label>
                    <Input
                      id="dept-name"
                      value={newDepartmentName}
                      onChange={(e) => setNewDepartmentName(e.target.value)}
                      placeholder="Enter department name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dept-desc">Description</Label>
                    <Input
                      id="dept-desc"
                      value={newDepartmentDesc}
                      onChange={(e) => setNewDepartmentDesc(e.target.value)}
                      placeholder="Enter description (optional)"
                    />
                  </div>
                </div>
                <Button onClick={handleCreateDepartment} disabled={!newDepartmentName.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Department
                </Button>
              </CardContent>
            </Card>

            {/* Departments List */}
            <div className="grid gap-4">
              {departments.map((department) => (
                <Card key={department.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{department.name}</h3>
                        {department.description && (
                          <p className="text-sm text-muted-foreground">{department.description}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDepartment(department.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {departments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No departments found</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
