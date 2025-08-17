import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Mail, Send, Edit, Trash2, TestTube, Check, X } from 'lucide-react';

interface EmailServer {
  id: string;
  name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password?: string; // Optional since we use secure view
  password_status?: string; // Shows encryption status
  sender_name: string;
  sender_email: string;
  reply_to?: string;
  use_tls: boolean;
  is_active: boolean;
  password_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  template_type: string;
  is_default: boolean;
}

export function EmailManager() {
  const { toast } = useToast();
  const [servers, setServers] = useState<EmailServer[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showServerDialog, setShowServerDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<EmailServer | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [testingServer, setTestingServer] = useState<string | null>(null);

  // Server form state
  const [serverForm, setServerForm] = useState({
    name: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    sender_name: '',
    sender_email: '',
    reply_to: '',
    use_tls: true,
    is_active: false
  });

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    body: '',
    template_type: 'ticket_created',
    is_default: false
  });

  // Load data
  const loadServers = async () => {
    try {
      // Use secure view that hides password data
      const { data, error } = await supabase
        .from('email_servers_secure')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Use secure view data directly (passwords are already secured)
      setServers(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading email servers",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const loadTemplates = async () => {
    try {
      // Note: This would need a templates table in the database
      // For now, we'll show a placeholder
      setTemplates([]);
    } catch (error: any) {
      toast({
        title: "Error loading email templates",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadServers();
    loadTemplates();
  }, []);

  // Server management
  const handleSaveServer = async () => {
    try {
      // Build payload and sanitize inputs
      const payload: any = { ...serverForm };
      payload.name = payload.name.trim();
      payload.smtp_host = payload.smtp_host.trim();
      payload.smtp_username = payload.smtp_username.trim();
      payload.sender_name = payload.sender_name.trim();
      payload.sender_email = payload.sender_email.trim();
      payload.reply_to = (payload.reply_to || '').trim();
      payload.smtp_port = Number(payload.smtp_port);
      if (payload.smtp_port === 465) payload.use_tls = true; // Implicit TLS

      // Basic validation
      if (!payload.name || !payload.smtp_host || !payload.smtp_username || !payload.sender_email) {
        toast({
          title: "Missing required fields",
          description: "Name, host, username, and sender email are required.",
          variant: "destructive"
        });
        return;
      }

      if (editingServer) {
        if (!serverForm.smtp_password || serverForm.smtp_password.trim() === '') {
          // Do not update password if left blank while editing
          delete payload.smtp_password;
        }

        const { error } = await supabase
          .from('email_servers')
          .update(payload)
          .eq('id', editingServer.id);
        
        if (error) throw error;
        
        toast({
          title: "Email server updated",
          description: "Email server configuration has been updated successfully."
        });
      } else {
        // Creating a new server requires a password
        if (!serverForm.smtp_password || serverForm.smtp_password.trim() === '') {
          toast({
            title: "Password required",
            description: "Please enter the SMTP password for the new server.",
            variant: "destructive"
          });
          return;
        }

        const { error } = await supabase
          .from('email_servers')
          .insert(payload);
        
        if (error) throw error;
        
        toast({
          title: "Email server added",
          description: "New email server has been configured successfully."
        });
      }

      setShowServerDialog(false);
      setEditingServer(null);
      setServerForm({
        name: '',
        smtp_host: '',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: '',
        sender_name: '',
        sender_email: '',
        reply_to: '',
        use_tls: true,
        is_active: false
      });
      loadServers();
    } catch (error: any) {
      toast({
        title: "Error saving email server",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditServer = (server: EmailServer) => {
    setEditingServer(server);
    setServerForm({
      name: server.name,
      smtp_host: server.smtp_host,
      smtp_port: server.smtp_port,
      smtp_username: server.smtp_username,
      smtp_password: '', // Clear password field for security - user must re-enter
      sender_name: server.sender_name,
      sender_email: server.sender_email,
      reply_to: server.reply_to || '',
      use_tls: server.use_tls,
      is_active: server.is_active
    });
    setShowServerDialog(true);
  };

  const handleDeleteServer = async (serverId: string) => {
    try {
      const { error } = await supabase
        .from('email_servers')
        .delete()
        .eq('id', serverId);

      if (error) throw error;

      toast({
        title: "Email server deleted",
        description: "Email server has been removed successfully."
      });
      
      loadServers();
    } catch (error: any) {
      toast({
        title: "Error deleting email server",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleTestServer = async (serverId: string) => {
    setTestingServer(serverId);
    try {
      const { data, error } = await supabase.functions.invoke('test-mail-connection', {
        body: { server_id: serverId }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Connection successful",
          description: "Email server connection test passed!"
        });
      } else {
        toast({
          title: "Connection failed",
          description: data.error || "Unable to connect to email server",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Test failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTestingServer(null);
    }
  };

  const handleToggleActive = async (serverId: string, isActive: boolean) => {
    try {
      // If activating this server, deactivate all others first
      if (isActive) {
        await supabase
          .from('email_servers')
          .update({ is_active: false })
          .neq('id', serverId);
      }

      const { error } = await supabase
        .from('email_servers')
        .update({ is_active: isActive })
        .eq('id', serverId);

      if (error) throw error;

      toast({
        title: isActive ? "Server activated" : "Server deactivated",
        description: `Email server has been ${isActive ? 'activated' : 'deactivated'}.`
      });

      loadServers();
    } catch (error: any) {
      toast({
        title: "Error updating server status",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">Email Management</h2>
        <p className="text-muted-foreground">Configure email servers and templates</p>
      </div>
      </div>

      {/* Email Servers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              SMTP Servers
            </CardTitle>
            <Dialog open={showServerDialog} onOpenChange={setShowServerDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingServer(null);
                  setServerForm({
                    name: '',
                    smtp_host: '',
                    smtp_port: 587,
                    smtp_username: '',
                    smtp_password: '',
                    sender_name: '',
                    sender_email: '',
                    reply_to: '',
                    use_tls: true,
                    is_active: false
                  });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Server
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingServer ? 'Edit Email Server' : 'Add Email Server'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingServer ? 'Update the SMTP server configuration below.' : 'Configure a new SMTP server for sending emails.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Server Name</Label>
                    <Input
                      id="name"
                      value={serverForm.name}
                      onChange={(e) => setServerForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Primary SMTP"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp_host">SMTP Host</Label>
                    <Input
                      id="smtp_host"
                      value={serverForm.smtp_host}
                      onChange={(e) => setServerForm(prev => ({ ...prev, smtp_host: e.target.value }))}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp_port">SMTP Port</Label>
                    <Input
                      id="smtp_port"
                      type="number"
                      value={serverForm.smtp_port}
                      onChange={(e) => setServerForm(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp_username">Username</Label>
                    <Input
                      id="smtp_username"
                      value={serverForm.smtp_username}
                      onChange={(e) => setServerForm(prev => ({ ...prev, smtp_username: e.target.value }))}
                      placeholder="your-email@domain.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp_password">Password</Label>
                    <Input
                      id="smtp_password"
                      type="password"
                      value={serverForm.smtp_password}
                      onChange={(e) => setServerForm(prev => ({ ...prev, smtp_password: e.target.value }))}
                      placeholder="App password or SMTP password"
                    />
                    <p className="text-xs text-muted-foreground">Leave blank when editing to keep the current password.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender_name">Sender Name</Label>
                    <Input
                      id="sender_name"
                      value={serverForm.sender_name}
                      onChange={(e) => setServerForm(prev => ({ ...prev, sender_name: e.target.value }))}
                      placeholder="Support Team"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender_email">Sender Email</Label>
                    <Input
                      id="sender_email"
                      value={serverForm.sender_email}
                      onChange={(e) => setServerForm(prev => ({ ...prev, sender_email: e.target.value }))}
                      placeholder="support@yourcompany.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reply_to">Reply-To (Optional)</Label>
                    <Input
                      id="reply_to"
                      value={serverForm.reply_to}
                      onChange={(e) => setServerForm(prev => ({ ...prev, reply_to: e.target.value }))}
                      placeholder="noreply@yourcompany.com"
                    />
                  </div>
                  <div className="col-span-2 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="use_tls"
                        checked={serverForm.use_tls}
                        onCheckedChange={(checked) => setServerForm(prev => ({ ...prev, use_tls: checked }))}
                      />
                      <Label htmlFor="use_tls">Use TLS/SSL Encryption</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={serverForm.is_active}
                        onCheckedChange={(checked) => setServerForm(prev => ({ ...prev, is_active: checked }))}
                      />
                      <Label htmlFor="is_active">Set as Active Server</Label>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowServerDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveServer}>
                    {editingServer ? 'Update' : 'Add'} Server
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {servers.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No email servers configured</p>
              <p className="text-sm text-muted-foreground">Add an SMTP server to start sending emails</p>
            </div>
          ) : (
            <div className="space-y-4">
              {servers.map((server) => (
                <div key={server.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{server.name}</h3>
                        {server.is_active && (
                          <Badge variant="default" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {server.sender_name} &lt;{server.sender_email}&gt;
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {server.smtp_host}:{server.smtp_port} • {server.use_tls ? 'TLS' : 'No TLS'}
                      </p>
                      <p className="text-xs">
                        <Badge variant={server.password_encrypted ? "default" : "destructive"} className="text-xs">
                          {server.password_status || (server.password_encrypted ? '***encrypted***' : '***unencrypted***')}
                        </Badge>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestServer(server.id)}
                        disabled={testingServer === server.id}
                      >
                        <TestTube className="h-4 w-4 mr-1" />
                        {testingServer === server.id ? 'Testing...' : 'Test'}
                      </Button>
                      <Switch
                        checked={server.is_active}
                        onCheckedChange={(checked) => handleToggleActive(server.id, checked)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditServer(server)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteServer(server.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Email Templates
            </CardTitle>
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Email templates feature coming soon</p>
            <p className="text-sm text-muted-foreground">
              Create reusable email templates for different ticket events
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}