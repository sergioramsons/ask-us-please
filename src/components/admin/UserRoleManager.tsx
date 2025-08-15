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
import { Shield, UserPlus, UserMinus, Building2, Plus, Trash2 } from 'lucide-react';

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
  const [selectedRole, setSelectedRole] = useState<AppRole>('user');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newDepartmentDesc, setNewDepartmentDesc] = useState('');
  
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
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
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
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