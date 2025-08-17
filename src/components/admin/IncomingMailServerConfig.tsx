import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Mail, Plus, Settings, Trash2, Play, Pause, TestTube } from 'lucide-react';
import { encryptPassword, decryptPassword } from '@/lib/secureEncryption';

interface IncomingMailServer {
  id: string;
  name: string;
  server_type: 'imap' | 'pop3';
  host: string;
  port: number;
  username: string;
  password?: string; // Optional since we use secure view
  password_status?: string; // Shows encryption status
  use_ssl: boolean;
  use_tls: boolean;
  is_active: boolean;
  auto_process: boolean;
  check_interval: number; // minutes
  folder_name?: string; // for IMAP
  delete_after_process: boolean;
  auto_create_tickets: boolean;
  auto_assign_department?: string;
  created_at: string;
  updated_at: string;
  last_check?: string;
  password_encrypted: boolean;
}

const IncomingMailServerConfig = () => {
  const [selectedServer, setSelectedServer] = useState<IncomingMailServer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<IncomingMailServer>>({
    name: '',
    server_type: 'imap',
    host: '',
    port: 993,
    username: '',
    password: '',
    use_ssl: true,
    use_tls: false,
    is_active: false,
    auto_process: true,
    check_interval: 5,
    folder_name: 'INBOX',
    delete_after_process: false,
    auto_create_tickets: true,
    password_encrypted: false,
  });

  const queryClient = useQueryClient();

  // Fetch incoming mail servers using secure view
  const { data: servers, isLoading } = useQuery({
    queryKey: ['incoming-mail-servers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incoming_mail_servers_secure')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      // Use secure view data directly (passwords are already secured)
      return data as IncomingMailServer[];
    },
  });

  // Fetch departments for auto-assignment
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Save server mutation
  const saveServerMutation = useMutation({
    mutationFn: async (serverData: Partial<IncomingMailServer>) => {
      let encryptedPassword = serverData.password;
      
      // Encrypt password if it's not already encrypted
      if (serverData.password && !serverData.password_encrypted) {
        encryptedPassword = await encryptPassword(serverData.password);
      }

      const dataToSave = {
        ...serverData,
        password: encryptedPassword,
        password_encrypted: true,
      } as any; // Type assertion to handle database schema mismatch

      if (serverData.id) {
        // Update existing server
        const { data, error } = await supabase
          .from('incoming_mail_servers')
          .update(dataToSave)
          .eq('id', serverData.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Create new server
        const { data, error } = await supabase
          .from('incoming_mail_servers')
          .insert(dataToSave)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success('Mail server configuration saved successfully');
      queryClient.invalidateQueries({ queryKey: ['incoming-mail-servers'] });
      setShowForm(false);
      setFormData({
        name: '',
        server_type: 'imap',
        host: '',
        port: 993,
        username: '',
        password: '',
        use_ssl: true,
        use_tls: false,
        is_active: false,
        auto_process: true,
        check_interval: 5,
        folder_name: 'INBOX',
        delete_after_process: false,
        auto_create_tickets: true,
        password_encrypted: false,
      });
    },
    onError: (error: any) => {
      toast.error(`Failed to save server: ${error.message}`);
    },
  });

  // Delete server mutation
  const deleteServerMutation = useMutation({
    mutationFn: async (serverId: string) => {
      const { error } = await supabase
        .from('incoming_mail_servers')
        .delete()
        .eq('id', serverId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mail server deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['incoming-mail-servers'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to delete server: ${error.message}`);
    },
  });

  // Toggle server active status
  const toggleServerMutation = useMutation({
    mutationFn: async ({ serverId, isActive }: { serverId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('incoming_mail_servers')
        .update({ is_active: isActive })
        .eq('id', serverId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Server status updated');
      queryClient.invalidateQueries({ queryKey: ['incoming-mail-servers'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to update server: ${error.message}`);
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (serverId: string) => {
      const { data, error } = await supabase.functions.invoke('test-incoming-mail-connection', {
        body: { server_id: serverId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Connection test successful');
      } else {
        toast.error(`Connection test failed: ${data.error}`);
      }
    },
    onError: (error: any) => {
      toast.error(`Connection test failed: ${error.message}`);
    },
  });

// Process pending emails mutation
const processPendingMutation = useMutation({
  mutationFn: async () => {
    const { data, error } = await supabase.functions.invoke('process-pending-emails');
    if (error) throw error;
    return data;
  },
  onSuccess: (data) => {
    if (data.success) {
      toast.success(data.message || 'Processed pending emails');
      queryClient.invalidateQueries({ queryKey: ['incoming-emails'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    } else {
      toast.error(data.message || 'Failed to process pending emails');
    }
  },
  onError: (error: any) => {
    toast.error(`Failed to process pending: ${error.message}`);
  },
});

// Fetch emails mutation
const fetchEmailsMutation = useMutation({
  mutationFn: async () => {
    const { data, error } = await supabase.functions.invoke('fetch-pop3-emails');
    
    if (error) throw error;
    return data;
  },
  onSuccess: (data) => {
    console.log('Fetch emails response:', data);
    if (data.success) {
      toast.success(data.message || 'Emails fetched successfully!');
      queryClient.invalidateQueries({ queryKey: ['incoming-emails'] });
      // Show detailed results
      if (data.results) {
        data.results.forEach((result: any) => {
          if (result.errors && result.errors.length > 0) {
            console.error('Server errors:', result.errors);
            result.errors.forEach((error: string) => {
              toast.error(`Server error: ${error}`);
            });
          }
        });
      }
      // Immediately process any pending emails into tickets
      processPendingMutation.mutate();
    } else {
      toast.error(data.message || 'Failed to fetch emails');
      if (data.error) {
        console.error('Fetch emails error:', data.error);
      }
    }
  },
  onError: (error: any) => {
    console.error('Fetch emails mutation error:', error);
    toast.error(`Failed to fetch emails: ${error.message}`);
  },
});

  const handleEditServer = (server: IncomingMailServer) => {
    setFormData({
      ...server,
      password: '', // Clear password field for security - user must re-enter
      password_encrypted: false, // Mark as requiring new password
    });
    setSelectedServer(server);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.host || !formData.username || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    saveServerMutation.mutate(formData);
  };

  const getServerTypeDefaults = (type: 'imap' | 'pop3') => {
    return {
      imap: { port: 993, use_ssl: true, use_tls: false },
      pop3: { port: 995, use_ssl: true, use_tls: false },
    }[type];
  };

  const handleServerTypeChange = (type: 'imap' | 'pop3') => {
    const defaults = getServerTypeDefaults(type);
    setFormData(prev => ({
      ...prev,
      server_type: type,
      ...defaults,
      folder_name: type === 'imap' ? 'INBOX' : undefined,
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Incoming Mail Servers
          </CardTitle>
          <div className="flex gap-2">
<Button 
  onClick={() => fetchEmailsMutation.mutate()}
  disabled={fetchEmailsMutation.isPending}
  variant="outline"
  className="gap-2"
>
  {fetchEmailsMutation.isPending ? 'Fetching...' : 'Fetch Emails'}
</Button>
<Button 
  onClick={() => processPendingMutation.mutate()}
  disabled={processPendingMutation.isPending}
  variant="outline"
  className="gap-2"
>
  {processPendingMutation.isPending ? 'Processing...' : 'Process Pending'}
</Button>
<Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowForm(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Mail Server
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedServer ? 'Edit' : 'Add'} Incoming Mail Server
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Server Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Gmail Support"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="server_type">Server Type *</Label>
                      <Select 
                        value={formData.server_type} 
                        onValueChange={(value: 'imap' | 'pop3') => handleServerTypeChange(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="imap">IMAP</SelectItem>
                          <SelectItem value="pop3">POP3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="host">Host *</Label>
                      <Input
                        id="host"
                        value={formData.host}
                        onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                        placeholder="e.g., imap.gmail.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="port">Port *</Label>
                      <Input
                        id="port"
                        type="number"
                        value={formData.port}
                        onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="username">Username/Email *</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="email@domain.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  {formData.server_type === 'imap' && (
                    <div>
                      <Label htmlFor="folder_name">Folder Name</Label>
                      <Input
                        id="folder_name"
                        value={formData.folder_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, folder_name: e.target.value }))}
                        placeholder="INBOX"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="check_interval">Check Interval (minutes)</Label>
                      <Input
                        id="check_interval"
                        type="number"
                        min="1"
                        value={formData.check_interval}
                        onChange={(e) => setFormData(prev => ({ ...prev, check_interval: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="auto_assign_department">Auto-assign Department</Label>
                      <Select 
                        value={formData.auto_assign_department || 'none'} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, auto_assign_department: value === 'none' ? undefined : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {departments?.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="use_ssl"
                        checked={formData.use_ssl}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_ssl: checked }))}
                      />
                      <Label htmlFor="use_ssl">Use SSL</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="use_tls"
                        checked={formData.use_tls}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_tls: checked }))}
                      />
                      <Label htmlFor="use_tls">Use TLS</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto_process"
                        checked={formData.auto_process}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_process: checked }))}
                      />
                      <Label htmlFor="auto_process">Auto-process emails</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto_create_tickets"
                        checked={formData.auto_create_tickets}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_create_tickets: checked }))}
                      />
                      <Label htmlFor="auto_create_tickets">Auto-create tickets</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="delete_after_process"
                        checked={formData.delete_after_process}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, delete_after_process: checked }))}
                      />
                      <Label htmlFor="delete_after_process">Delete emails after processing</Label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={saveServerMutation.isPending}>
                      {saveServerMutation.isPending ? 'Saving...' : 'Save Server'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : servers && servers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Check</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.id}>
                   <TableCell>
                     <div>
                       <div className="font-medium">{server.name}</div>
                       <div className="text-sm text-muted-foreground">{server.username}</div>
                       <div className="text-xs">
                         <Badge variant={server.password_encrypted ? "default" : "destructive"} className="text-xs">
                           {server.password_status || (server.password_encrypted ? '***encrypted***' : '***unencrypted***')}
                         </Badge>
                       </div>
                     </div>
                   </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase">
                      {server.server_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{server.host}:{server.port}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={server.is_active ? "default" : "secondary"}>
                        {server.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleServerMutation.mutate({
                          serverId: server.id,
                          isActive: !server.is_active
                        })}
                        disabled={toggleServerMutation.isPending}
                      >
                        {server.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {server.last_check ? 
                      new Date(server.last_check).toLocaleString() : 
                      'Never'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testConnectionMutation.mutate(server.id)}
                        disabled={testConnectionMutation.isPending}
                      >
                        <TestTube className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditServer(server)}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteServerMutation.mutate(server.id)}
                        disabled={deleteServerMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No incoming mail servers configured</p>
            <p className="text-sm mt-1">Add a mail server to automatically fetch and process emails</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IncomingMailServerConfig;