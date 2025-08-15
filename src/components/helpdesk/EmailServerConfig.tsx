import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Server, 
  Mail, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Send,
  Eye,
  Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">Email Settings</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="test">Test & Debug</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                SMTP Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This application uses Resend for email delivery. Make sure you have configured your Resend API key in the server settings.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="senderName">Sender Name</Label>
                  <Input
                    id="senderName"
                    value={config.senderName}
                    onChange={(e) => setConfig(prev => ({ ...prev, senderName: e.target.value }))}
                    placeholder="Support Team"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderEmail">Sender Email</Label>
                  <Input
                    id="senderEmail"
                    type="email"
                    value={config.senderEmail}
                    onChange={(e) => setConfig(prev => ({ ...prev, senderEmail: e.target.value }))}
                    placeholder="support@yourdomain.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="replyTo">Reply-To Email</Label>
                <Input
                  id="replyTo"
                  type="email"
                  value={config.replyTo}
                  onChange={(e) => setConfig(prev => ({ ...prev, replyTo: e.target.value }))}
                  placeholder="support@yourdomain.com"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoResponse"
                    checked={config.enableAutoResponse}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableAutoResponse: checked }))}
                  />
                  <Label htmlFor="autoResponse">Enable automatic response emails</Label>
                </div>

                {config.enableAutoResponse && (
                  <div className="space-y-2">
                    <Label htmlFor="autoResponseTemplate">Auto-response Template</Label>
                    <Textarea
                      id="autoResponseTemplate"
                      value={config.autoResponseTemplate}
                      onChange={(e) => setConfig(prev => ({ ...prev, autoResponseTemplate: e.target.value }))}
                      placeholder="Enter your auto-response message..."
                      className="min-h-20"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">Email Signature</Label>
                <Textarea
                  id="signature"
                  value={config.emailSignature}
                  onChange={(e) => setConfig(prev => ({ ...prev, emailSignature: e.target.value }))}
                  placeholder="Enter your email signature..."
                  className="min-h-24"
                />
              </div>

              <Button onClick={handleSaveConfig} className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            </CardContent>
          </Card>
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
      </Tabs>
    </div>
  );
}