import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CannedResponseSelector } from './CannedResponseSelector';
import { MessageSquare, Send, FileText, Mail } from 'lucide-react';
import { CannedResponse } from '@/types/cannedResponse';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TicketResponseFormProps {
  ticketId: string; // UUID (internal)
  ticketNumber?: string; // Human-friendly ticket number like BS00001
  customerName?: string;
  customerEmail?: string;
  ticketSubject?: string;
  ticketStatus?: string;
  priority?: string;
  onSubmit?: (response: string, isInternal: boolean) => void;
}

export function TicketResponseForm({ 
  ticketId,
  ticketNumber,
  customerName = 'Customer',
  customerEmail = '',
  ticketSubject = 'Support Request',
  ticketStatus = 'open',
  priority = 'medium',
  onSubmit 
}: TicketResponseFormProps) {
  const [response, setResponse] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [userSignature, setUserSignature] = useState('');
  const { toast } = useToast();

  // Load user signature
  useEffect(() => {
    const loadUserSignature = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('signature')
            .eq('user_id', user.user.id)
            .single();
          
          if (profile?.signature) {
            setUserSignature(profile.signature);
          }
        }
      } catch (error) {
        console.error('Error loading user signature:', error);
      }
    };
    
    loadUserSignature();
  }, []);

  const handleCannedResponseSelect = (cannedResponse: CannedResponse) => {
    // If there's existing content, add the canned response with some spacing
    const newContent = response 
      ? `${response}\n\n${cannedResponse.content}`
      : cannedResponse.content;
    
    setResponse(newContent);
    
    toast({
      title: "Canned response added",
      description: `"${cannedResponse.title}" has been inserted into your response.`,
    });
  };

  const handleSubmit = async () => {
    if (!response.trim()) {
      toast({
        title: "Error",
        description: "Please enter a response before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save the comment to the database
      const { data: comment, error: commentError } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: ticketId,
          content: response,
          is_internal: isInternal,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select('*')
        .single();

      if (commentError) {
        throw commentError;
      }

      // Update ticket's last activity
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({ 
          last_activity_at: new Date().toISOString(),
          ...(ticketStatus !== 'resolved' && !isInternal && { first_response_at: new Date().toISOString() })
        })
        .eq('id', ticketId);

      if (ticketError) {
        console.warn('Could not update ticket activity:', ticketError);
      }

      // Send email if not internal and customer email is provided
      if (!isInternal && customerEmail) {
        setIsSendingEmail(true);
        try {
          // Check if there's an active custom email server
          const { data: activeServer } = await supabase
            .from('email_servers')
            .select('*')
            .eq('is_active', true)
            .limit(1)
            .single();

          let emailResponse;
          
          if (activeServer) {
            // Use custom email server
            emailResponse = await supabase.functions.invoke('send-custom-email', {
              body: {
                ticketId: ticketNumber || ticketId,
                customerName,
                customerEmail,
                subject: ticketSubject,
                message: response,
                agentName: 'Support Agent',
                agentSignature: userSignature,
                ticketStatus,
                priority,
                isResolution: ticketStatus === 'resolved',
                emailServerId: activeServer.id
              }
            });
          } else {
            // Fallback to Resend
            emailResponse = await supabase.functions.invoke('send-ticket-email', {
              body: {
                ticketId: ticketNumber || ticketId,
                customerName,
                customerEmail,
                subject: ticketSubject,
                message: response,
                agentName: 'Support Agent',
                agentSignature: userSignature,
                ticketStatus,
                priority,
                isResolution: ticketStatus === 'resolved'
              }
            });
          }

          if (emailResponse.error) {
            console.error('Email sending error:', emailResponse.error);
            toast({
              title: "Response saved",
              description: "Response saved but email could not be sent. Please check email configuration.",
              variant: "destructive",
            });
          } else {
            const serverType = activeServer ? 'custom SMTP server' : 'Resend';
            toast({
              title: "Response sent",
              description: `Your response has been sent to ${customerEmail} via ${serverType}`,
            });
          }
        } catch (error) {
          console.error('Email error:', error);
          toast({
            title: "Response saved", 
            description: "Response saved but email delivery failed.",
            variant: "destructive",
          });
        } finally {
          setIsSendingEmail(false);
        }
      } else {
        toast({
          title: "Response saved",
          description: `Your ${isInternal ? 'internal note' : 'response'} has been added to the ticket.`,
        });
      }

      onSubmit?.(response, isInternal);
      setResponse('');
      
    } catch (error: any) {
      console.error('Error saving response:', error);
      toast({
        title: "Error",
        description: "Could not save response. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Add Response
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CannedResponseSelector onSelect={handleCannedResponseSelect}>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Use Canned Response
              </Button>
            </CannedResponseSelector>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="internal-note"
              checked={isInternal}
              onCheckedChange={setIsInternal}
            />
            <Label htmlFor="internal-note" className="text-sm">
              Internal note
            </Label>
          </div>
        </div>

        <Textarea
          placeholder="Type your response here..."
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          className="min-h-32"
        />

        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {isInternal ? 'This note will only be visible to internal staff' : 
             customerEmail ? `This response will be sent to ${customerEmail}` : 'This response will be saved to the ticket'}
          </p>
          <Button 
            onClick={handleSubmit} 
            disabled={!response.trim() || isSendingEmail}
          >
            {isSendingEmail ? (
              <>
                <Mail className="h-4 w-4 mr-2 animate-pulse" />
                Sending...
              </>
            ) : (
              <>
                {isInternal ? <MessageSquare className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                {isInternal ? 'Add Note' : 'Send Response'}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}