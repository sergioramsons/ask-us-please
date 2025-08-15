import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserRoles, AppRole } from '@/hooks/useUserRoles';
import { Shield, UserPlus, UserMinus } from 'lucide-react';

interface UserWithRole {
  id: string;
  email: string;
  display_name?: string;
  roles: AppRole[];
}

export function UserRoleManager() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<AppRole>('user');
  const { getUsersWithRoles, assignRole, removeRole, isLoading, isAdmin } = useUserRoles();

  useEffect(() => {
    loadUsers();
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
          User Role Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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
            <span className="text-sm text-muted-foreground">
              Select a role to assign to users
            </span>
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
                <div className="flex gap-2">
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
        </div>
      </CardContent>
    </Card>
  );
}