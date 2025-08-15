import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { NotificationService } from "@/services/NotificationService";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, TestTube, Loader2 } from "lucide-react";

export function EmailNotificationTester() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [testData, setTestData] = useState({
    type: 'ticket_created' as const,
    ticketId: 'TEST-001',
    ticketTitle: 'Sample Support Ticket',
    ticketStatus: 'open',
    ticketPriority: 'high',
    recipientEmail: '',
    recipientName: 'John Doe',
    senderName: 'Support Team',
    message: 'This is a test notification to verify email delivery.'
  });

  const notificationTypes = [
    { value: 'ticket_created', label: 'Ticket Created' },
    { value: 'ticket_updated', label: 'Ticket Updated' },
    { value: 'comment_added', label: 'Comment Added' },
    { value: 'sla_warning', label: 'SLA Warning' }
  ];

  const handleSendTest = async () => {
    if (!testData.recipientEmail) {
      toast({
        title: "Missing email",
        description: "Please enter a recipient email address.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const success = await NotificationService.sendNotification(testData);
      
      if (success) {
        toast({
          title: "Test email sent",
          description: `Notification sent to ${testData.recipientEmail}`
        });
      } else {
        toast({
          title: "Failed to send",
          description: "There was an error sending the test notification.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test notification.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (type: string) => {
    const variants = {
      ticket_created: 'default',
      ticket_updated: 'secondary',
      comment_added: 'outline',
      sla_warning: 'destructive'
    };
    return variants[type as keyof typeof variants] || 'default';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Email Notification System</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Test Email Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Test Email Notifications
            </CardTitle>
            <CardDescription>
              Send test notifications to verify email delivery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notification-type">Notification Type</Label>
              <Select
                value={testData.type}
                onValueChange={(value: any) => setTestData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {notificationTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient-email">Recipient Email</Label>
              <Input
                id="recipient-email"
                type="email"
                value={testData.recipientEmail}
                onChange={(e) => setTestData(prev => ({ ...prev, recipientEmail: e.target.value }))}
                placeholder="test@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticket-id">Ticket ID</Label>
                <Input
                  id="ticket-id"
                  value={testData.ticketId}
                  onChange={(e) => setTestData(prev => ({ ...prev, ticketId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={testData.ticketPriority}
                  onValueChange={(value) => setTestData(prev => ({ ...prev, ticketPriority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticket-title">Ticket Title</Label>
              <Input
                id="ticket-title"
                value={testData.ticketTitle}
                onChange={(e) => setTestData(prev => ({ ...prev, ticketTitle: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Custom Message (Optional)</Label>
              <Textarea
                id="message"
                value={testData.message}
                onChange={(e) => setTestData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Additional message for the notification..."
                rows={3}
              />
            </div>

            <Button onClick={handleSendTest} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Types Info */}
        <Card>
          <CardHeader>
            <CardTitle>Available Notification Types</CardTitle>
            <CardDescription>
              Different types of automated notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {notificationTypes.map(type => (
                <div key={type.value} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{type.label}</h4>
                    <p className="text-sm text-muted-foreground">
                      {type.value === 'ticket_created' && 'Sent when a new ticket is created'}
                      {type.value === 'ticket_updated' && 'Sent when ticket status changes'}
                      {type.value === 'comment_added' && 'Sent when a comment is added'}
                      {type.value === 'sla_warning' && 'Sent when SLA deadline approaches'}
                    </p>
                  </div>
                  <Badge variant={getStatusBadge(type.value) as any}>
                    {type.label}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Email Templates</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Responsive HTML templates</li>
                <li>• Branded with your helpdesk theme</li>
                <li>• Includes ticket links and details</li>
                <li>• Professional styling and layout</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}