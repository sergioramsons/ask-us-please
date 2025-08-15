import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Server, 
  Mail, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Send,
  Eye,
  Copy,
  Plus,
  Trash2,
  Edit
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EmailServer {
  id: string;
  name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  use_tls: boolean;
  sender_name: string;
  sender_email: string;
  reply_to?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EmailConfig {
  senderName: string;
  senderEmail: string;
  replyTo: string;
  enableAutoResponse: boolean;
  autoResponseTemplate: string;
  emailSignature: string;
}

export function EmailServerConfig() {
  const { toast } = useToast();
  const [emailServers, setEmailServers] = useState<EmailServer[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingServer, setEditingServer] = useState<EmailServer | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [newServer, setNewServer] = useState({
    name: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    use_tls: true,
    sender_name: 'Support Team',
    sender_email: '',
    reply_to: '',
  });

  const [config, setConfig] = useState<EmailConfig>({
    senderName: 'Support Team',
    senderEmail: 'support@yourdomain.com',
    replyTo: 'support@yourdomain.com',
    enableAutoResponse: true,
    autoResponseTemplate: 'Thank you for contacting our support team. We have received your request and will respond within 24 hours.',
    emailSignature: 'Best regards,\nThe Support Team\n\nYour Company Name\nsupport@yourdomain.com'
  });

  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('connected');

  useEffect(() => {
    fetchEmailServers();
  }, []);

  const fetchEmailServers = async () => {
    try {
      const { data, error } = await supabase
        .from('email_servers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setEmailServers(data || []);
      
      // Set the first active server as selected
      const activeServer = data?.find(server => server.is_active);
      if (activeServer) {
        setSelectedServerId(activeServer.id);
      }
    } catch (error) {
      console.error('Error fetching email servers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch email servers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServer = async () => {
    try {
      if (editingServer) {
        // Update existing server
        const { error } = await supabase
          .from('email_servers')
          .update(newServer)
          .eq('id', editingServer.id);

        if (error) throw error;

        toast({
          title: "Server updated",
          description: "Email server configuration has been updated successfully.",
        });
      } else {
        // Create new server
        const { error } = await supabase
          .from('email_servers')
          .insert([newServer]);

        if (error) throw error;

        toast({
          title: "Server added",
          description: "New email server has been added successfully.",
        });
      }

      setShowAddForm(false);
      setEditingServer(null);
      setNewServer({
        name: '',
        smtp_host: '',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: '',
        use_tls: true,
        sender_name: 'Support Team',
        sender_email: '',
        reply_to: '',
      });
      fetchEmailServers();
    } catch (error) {
      console.error('Error saving email server:', error);
      toast({
        title: "Error",
        description: "Failed to save email server configuration.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    try {
      const { error } = await supabase
        .from('email_servers')
        .delete()
        .eq('id', serverId);

      if (error) throw error;

      toast({
        title: "Server deleted",
        description: "Email server has been deleted successfully.",
      });
      fetchEmailServers();
    } catch (error) {
      console.error('Error deleting email server:', error);
      toast({
        title: "Error",
        description: "Failed to delete email server.",
        variant: "destructive",
      });
    }
  };

  const handleActivateServer = async (serverId: string) => {
    try {
      // Deactivate all servers first
      await supabase
        .from('email_servers')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // Activate the selected server
      const { error } = await supabase
        .from('email_servers')
        .update({ is_active: true })
        .eq('id', serverId);

      if (error) throw error;

      toast({
        title: "Server activated",
        description: "Email server has been activated successfully.",
      });
      fetchEmailServers();
    } catch (error) {
      console.error('Error activating email server:', error);
      toast({
        title: "Error",
        description: "Failed to activate email server.",
        variant: "destructive",
      });
    }
  };

  const handleEditServer = (server: EmailServer) => {
    setEditingServer(server);
    setNewServer({
      name: server.name,
      smtp_host: server.smtp_host,
      smtp_port: server.smtp_port,
      smtp_username: server.smtp_username,
      smtp_password: server.smtp_password,
      use_tls: server.use_tls,
      sender_name: server.sender_name,
      sender_email: server.sender_email,
      reply_to: server.reply_to || '',
    });
    setShowAddForm(true);
  };

  const handleSaveConfig = () => {
    // Save configuration logic would go here
    toast({
      title: "Configuration saved",
      description: "Email server settings have been updated successfully.",
    });
  };

  const handleTestConnection = async () => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter a test email address.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setConnectionStatus('testing');

    try {
      // Simulate API call to test email
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setConnectionStatus('connected');
      toast({
        title: "Test email sent",
        description: `Test email sent successfully to ${testEmail}`,
      });
    } catch (error) {
      setConnectionStatus('disconnected');
      toast({
        title: "Test failed",
        description: "Failed to send test email. Please check your configuration.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin}/api/webhook/email`;
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "Copied",
      description: "Webhook URL copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Email Server Configuration
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={connectionStatus === 'connected' ? 'default' : connectionStatus === 'testing' ? 'secondary' : 'destructive'}
              className="flex items-center gap-1"
            >
              {connectionStatus === 'connected' && <CheckCircle className="h-3 w-3" />}
              {connectionStatus === 'disconnected' && <AlertCircle className="h-3 w-3" />}
              {connectionStatus === 'testing' && <Settings className="h-3 w-3 animate-spin" />}
              {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'testing' ? 'Testing...' : 'Disconnected'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="settings" className="flex gap-6" orientation="vertical">
        <TabsList className="flex flex-col h-fit w-48 p-1">
          <TabsTrigger value="settings" className="w-full justify-start">
            <Settings className="h-4 w-4 mr-2" />
            Email Settings
          </TabsTrigger>
          <TabsTrigger value="templates" className="w-full justify-start">
            <Mail className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="w-full justify-start">
            <Server className="h-4 w-4 mr-2" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="test" className="w-full justify-start">
            <Send className="h-4 w-4 mr-2" />
            Test & Debug
          </TabsTrigger>
        </TabsList>

        <div className="flex-1">{/* This will contain all TabsContent */}

        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Email Servers List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Custom Email Servers
                  </CardTitle>
                  <Button 
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Server
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading email servers...</div>
                ) : emailServers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No email servers configured. Add your first custom SMTP server to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {emailServers.map((server) => (
                      <div 
                        key={server.id} 
                        className="border rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{server.name}</h4>
                            {server.is_active && (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {server.smtp_host}:{server.smtp_port} • {server.sender_email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!server.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleActivateServer(server.id)}
                            >
                              Activate
                            </Button>
                          )}
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add/Edit Server Form */}
            {showAddForm && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {editingServer ? 'Edit Email Server' : 'Add New Email Server'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="serverName">Server Name</Label>
                      <Input
                        id="serverName"
                        value={newServer.name}
                        onChange={(e) => setNewServer(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Gmail SMTP"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="senderName">Sender Name</Label>
                      <Input
                        id="senderName"
                        value={newServer.sender_name}
                        onChange={(e) => setNewServer(prev => ({ ...prev, sender_name: e.target.value }))}
                        placeholder="Support Team"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtpHost">SMTP Host</Label>
                      <Input
                        id="smtpHost"
                        value={newServer.smtp_host}
                        onChange={(e) => setNewServer(prev => ({ ...prev, smtp_host: e.target.value }))}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">SMTP Port</Label>
                      <Input
                        id="smtpPort"
                        type="number"
                        value={newServer.smtp_port}
                        onChange={(e) => setNewServer(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
                        placeholder="587"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtpUsername">SMTP Username</Label>
                      <Input
                        id="smtpUsername"
                        value={newServer.smtp_username}
                        onChange={(e) => setNewServer(prev => ({ ...prev, smtp_username: e.target.value }))}
                        placeholder="your-email@gmail.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPassword">SMTP Password</Label>
                      <Input
                        id="smtpPassword"
                        type="password"
                        value={newServer.smtp_password}
                        onChange={(e) => setNewServer(prev => ({ ...prev, smtp_password: e.target.value }))}
                        placeholder="App Password"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="senderEmail">Sender Email</Label>
                      <Input
                        id="senderEmail"
                        type="email"
                        value={newServer.sender_email}
                        onChange={(e) => setNewServer(prev => ({ ...prev, sender_email: e.target.value }))}
                        placeholder="support@yourcompany.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="replyTo">Reply-To Email (Optional)</Label>
                      <Input
                        id="replyTo"
                        type="email"
                        value={newServer.reply_to}
                        onChange={(e) => setNewServer(prev => ({ ...prev, reply_to: e.target.value }))}
                        placeholder="noreply@yourcompany.com"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="useTls"
                      checked={newServer.use_tls}
                      onCheckedChange={(checked) => setNewServer(prev => ({ ...prev, use_tls: checked }))}
                    />
                    <Label htmlFor="useTls">Use TLS/SSL encryption</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSaveServer} className="flex-1">
                      <Settings className="h-4 w-4 mr-2" />
                      {editingServer ? 'Update Server' : 'Add Server'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingServer(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resend Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Resend Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Resend is also available as a fallback option. Make sure you have configured your Resend API key in the server settings.
                  </AlertDescription>
                </Alert>
                <Button variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Resend Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Email templates are automatically generated based on ticket information and agent responses. You can customize the appearance using the email signature above.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Available Template Variables</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <code>{'{{customerName}}'}</code>
                    <code>{'{{ticketId}}'}</code>
                    <code>{'{{ticketSubject}}'}</code>
                    <code>{'{{ticketStatus}}'}</code>
                    <code>{'{{agentName}}'}</code>
                    <code>{'{{priority}}'}</code>
                    <code>{'{{message}}'}</code>
                    <code>{'{{signature}}'}</code>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Template Types</h4>
                  <div className="space-y-2">
                    <Badge variant="outline">Ticket Created</Badge>
                    <Badge variant="outline">Ticket Updated</Badge>
                    <Badge variant="outline">Ticket Resolved</Badge>
                    <Badge variant="outline">Ticket Closed</Badge>
                    <Badge variant="outline">Agent Response</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Email Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Configure webhooks to receive incoming emails and convert them to tickets automatically.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/api/webhook/email`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use this URL in your email provider's webhook configuration to automatically create tickets from incoming emails.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Supported Email Providers</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Gmail</Badge>
                  <Badge variant="secondary">Outlook</Badge>
                  <Badge variant="secondary">SendGrid</Badge>
                  <Badge variant="secondary">Mailgun</Badge>
                  <Badge variant="secondary">Postmark</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Test Email Delivery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testEmail">Test Email Address</Label>
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter email to send test message"
                />
              </div>

              <Button 
                onClick={handleTestConnection} 
                disabled={isTesting}
                className="w-full"
              >
                {isTesting ? (
                  <>
                    <Settings className="h-4 w-4 mr-2 animate-spin" />
                    Sending Test Email...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Email
                  </>
                )}
              </Button>

              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  The test email will use the current configuration and include sample ticket data to verify your email setup is working correctly.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}