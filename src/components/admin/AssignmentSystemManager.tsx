import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAssignmentSystem } from '@/hooks/useAssignmentSystem';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Settings, Users, Award, Clock, Plus, Trash2, UserCheck, UserX } from 'lucide-react';

interface UserWithRole {
  id: string;
  email: string;
  display_name?: string;
  department_id?: string;
  department_name?: string;
  roles: string[];
}

export function AssignmentSystemManager() {
  const { 
    skills, 
    availability, 
    settings, 
    isLoading,
    addSkill,
    removeSkill,
    updateAvailability,
    updateSettings,
    getAvailableSkills
  } = useAssignmentSystem();
  
  const { getUsersWithRoles } = useUserRoles();
  
  // Local state for users
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  
  // State for adding skills
  const [selectedUser, setSelectedUser] = useState('');
  const [newSkillName, setNewSkillName] = useState('');
  const [skillLevel, setSkillLevel] = useState(1);
  
  // State for settings
  const [tempSettings, setTempSettings] = useState(settings);
  
  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      setUsersLoading(true);
      const usersData = await getUsersWithRoles();
      setUsers(usersData);
      setUsersLoading(false);
    };
    
    loadUsers();
  }, [getUsersWithRoles]);

  const handleAddSkill = async () => {
    if (!selectedUser || !newSkillName.trim()) return;
    
    const success = await addSkill(selectedUser, newSkillName.trim(), skillLevel);
    if (success) {
      setSelectedUser('');
      setNewSkillName('');
      setSkillLevel(1);
    }
  };

  const handleSaveSettings = async () => {
    await updateSettings(tempSettings);
  };

  const toggleAgentAvailability = async (userId: string, currentAvailability: boolean) => {
    const agent = availability.find(a => a.user_id === userId);
    await updateAvailability(userId, !currentAvailability, agent?.max_tickets || null);
  };

  const updateMaxTickets = async (userId: string, maxTickets: number) => {
    const agent = availability.find(a => a.user_id === userId);
    await updateAvailability(userId, agent?.is_available ?? true, maxTickets);
  };

  if (isLoading || usersLoading) {
    return <div className="flex items-center justify-center p-8">Loading assignment system...</div>;
  }

  // Filter agents (users with agent, moderator, or admin roles)
  const agents = users.filter(user => user.roles.some(role => ['admin', 'moderator', 'agent'].includes(role)));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Assignment System</h2>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="availability">Agent Availability</TabsTrigger>
          <TabsTrigger value="skills">Agent Skills</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Assignment Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="assignment-method">Assignment Method</Label>
                <Select 
                  value={tempSettings.method} 
                  onValueChange={(value: any) => setTempSettings(prev => ({ ...prev, method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">Round Robin - Equal distribution</SelectItem>
                    <SelectItem value="load_balanced">Load Balanced - Based on current workload</SelectItem>
                    <SelectItem value="skill_based">Skill Based - Match ticket requirements</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {tempSettings.method === 'round_robin' && 'Distributes tickets equally among available agents in circular fashion.'}
                  {tempSettings.method === 'load_balanced' && 'Assigns tickets to agents with lowest current workload.'}
                  {tempSettings.method === 'skill_based' && 'Routes tickets to agents with matching skills.'}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Agent Availability Control</Label>
                  <p className="text-sm text-muted-foreground">
                    Let agents control their own availability status
                  </p>
                </div>
                <Switch
                  checked={tempSettings.allow_agent_availability_control}
                  onCheckedChange={(checked) => 
                    setTempSettings(prev => ({ ...prev, allow_agent_availability_control: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-tickets">Default Max Tickets per Agent</Label>
                <Input
                  id="max-tickets"
                  type="number"
                  min="1"
                  max="100"
                  value={tempSettings.default_max_tickets_per_agent}
                  onChange={(e) => 
                    setTempSettings(prev => ({ 
                      ...prev, 
                      default_max_tickets_per_agent: parseInt(e.target.value) || 10 
                    }))
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of open tickets an agent can handle simultaneously
                </p>
              </div>

              <Button onClick={handleSaveSettings} className="w-full">
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Agent Availability Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agents.map((user) => {
                  const agentAvail = availability.find(a => a.user_id === user.id);
                  const isAvailable = agentAvail?.is_available ?? true;
                  const maxTickets = agentAvail?.max_tickets ?? settings.default_max_tickets_per_agent;

                  return (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {isAvailable ? (
                          <UserCheck className="h-5 w-5 text-green-500" />
                        ) : (
                          <UserX className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium">{user.display_name || user.email}</p>
                          <p className="text-sm text-muted-foreground">{user.roles[0]}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Max Tickets:</Label>
                          <Input
                            type="number"
                            min="1"
                            max="50"
                            value={maxTickets}
                            onChange={(e) => updateMaxTickets(user.id, parseInt(e.target.value) || 10)}
                            className="w-16 h-8"
                          />
                        </div>
                        
                        <Switch
                          checked={isAvailable}
                          onCheckedChange={() => toggleAgentAvailability(user.id, isAvailable)}
                        />
                        
                        <Badge variant={isAvailable ? "default" : "secondary"}>
                          {isAvailable ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          {/* Add Skill Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Agent Skill
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Select Agent</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.display_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Skill Name</Label>
                  <Input
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="e.g., Technical Support"
                  />
                </div>
                
                <div>
                  <Label>Skill Level (1-5)</Label>
                  <Select value={skillLevel.toString()} onValueChange={(value) => setSkillLevel(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(level => (
                        <SelectItem key={level} value={level.toString()}>
                          Level {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    onClick={handleAddSkill}
                    disabled={!selectedUser || !newSkillName.trim()}
                    className="w-full"
                  >
                    Add Skill
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Agent Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {skills.map((skill) => (
                  <div key={skill.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Award className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="font-medium">{skill.user_name}</p>
                        <p className="text-sm text-muted-foreground">{skill.user_email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{skill.skill_name}</Badge>
                      <Badge variant="secondary">Level {skill.skill_level}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSkill(skill.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {skills.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No agent skills configured</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Assignment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="capitalize">{settings.method.replace('_', ' ')}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Available Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-500" />
                  <span>{availability.filter(a => a.is_available).length} / {availability.length || agents.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Total Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-blue-500" />
                  <span>{getAvailableSkills().length} unique skills</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Available Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {getAvailableSkills().map((skill) => (
                  <Badge key={skill} variant="outline">{skill}</Badge>
                ))}
                {getAvailableSkills().length === 0 && (
                  <p className="text-muted-foreground">No skills configured</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}