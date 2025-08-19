import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserRoles, AppRole } from '@/hooks/useUserRoles';
import { useDepartments, Department } from '@/hooks/useDepartments';
import { supabase } from '@/integrations/supabase/client';
import { Shield, UserPlus, UserMinus, Building2, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface UserWithRole {
  id: string;
  email: string;
  display_name?: string;
  department_id?: string;
  department_name?: string;
  roles: AppRole[];
}

export function UserRoleManager() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<AppRole>('agent');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newDepartmentDesc, setNewDepartmentDesc] = useState('');
  
  // New user form state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('agent');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  const { getUsersWithRoles, assignRole, removeRole, isLoading, isAdmin } = useUserRoles();
  const { 
    departments, 
    fetchDepartments, 
    createDepartment, 
    deleteDepartment, 
    assignUserToDepartment,
    isLoading: isDepartmentsLoading 
  } = useDepartments();

  useEffect(() => {
    loadUsers();
    fetchDepartments();
  }, []);

  const loadUsers = async () => {
    const usersWithRoles = await getUsersWithRoles();
    setUsers(usersWithRoles);
  };

  const handleAssignRole = async (userId: string) => {
    await assignRole(userId, selectedRole);
    await loadUsers();
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    await removeRole(userId, role);
    await loadUsers();
  };

  const handleAssignDepartment = async (userId: string, departmentId: string | null) => {
    await assignUserToDepartment(userId, departmentId);
    await loadUsers();
  };

  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim()) return;
    
    const created = await createDepartment(newDepartmentName, newDepartmentDesc);
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

      // First remove all user roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error removing user roles:', rolesError);
      }

      // Remove user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) {
        console.error('Error removing user profile:', profileError);
      }

      // Try to delete the auth user (requires admin privileges)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.error('Error deleting auth user:', authError);
        // Continue even if auth deletion fails - the user data is cleaned up
      }

      console.log('User deleted successfully');
      
      // Reload users list
      await loadUsers();
      
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user: ' + (error.message || 'Unknown error'));
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
            <TabsTrigger value="create-user">Create User</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-4">
            {/* Role Assignment Controls */}
            <div className="flex gap-2 items-center p-4 bg-muted/50 rounded-lg">
              <Select value={selectedRole} onValueChange={(value: AppRole) => setSelectedRole(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="account_admin">Account Admin</SelectItem>
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
                  </div>
                   
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
                         disabled={isDepartmentsLoading || user.department_id === selectedDepartment}
                         title="Assign to department"
                       >
                         <Building2 className="h-4 w-4 mr-1" />
                         {selectedDepartment === 'none' ? 'Remove Dept' : 'Assign Dept'}
                       </Button>
                     )}
                     
                     {selectedDepartment === 'none' && user.department_id && (
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => handleAssignDepartment(user.id, null)}
                         disabled={isDepartmentsLoading}
                         title="Remove from department"
                       >
                         <Building2 className="h-4 w-4 mr-1" />
                         Remove Dept
                       </Button>
                     )}
                     
                     <Button
                       size="sm"
                       variant="destructive"
                       onClick={() => handleDeleteUser(user.id, user.email)}
                       disabled={isLoading}
                       title="Delete user permanently"
                       className="mt-2"
                     >
                       <Trash2 className="h-4 w-4 mr-1" />
                       Delete User
                     </Button>
                   </div>
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
                    <Label htmlFor="new-user-dept">Department</Label>
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
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new-user-role">Initial Role</Label>
                    <Select value={newUserRole} onValueChange={(value: AppRole) => setNewUserRole(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="account_admin">Account Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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