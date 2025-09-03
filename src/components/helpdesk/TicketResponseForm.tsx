import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CannedResponseSelector } from './CannedResponseSelector';
import { CCRecipientSelector } from '../contacts/CCRecipientSelector';
import { MessageSquare, Send, FileText, Mail, Paperclip, Eye, ChevronDown, ChevronUp, Settings, Users, Reply, Forward } from 'lucide-react';
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ccRecipients, setCcRecipients] = useState<CCRecipient[]>([]);
  const [bccRecipients, setBccRecipients] = useState<CCRecipient[]>([]);
  const [responseType, setResponseType] = useState<'reply' | 'forward'>('reply');
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [sendAndClose, setSendAndClose] = useState(false);
  const [subject, setSubject] = useState(ticketSubject);
  const [forwardTo, setForwardTo] = useState('');

  // Handle response type changes - load conversation history when switching to forward
  const handleResponseTypeChange = async (newType: 'reply' | 'forward') => {
    setResponseType(newType);
    if (newType === 'forward') {
      setUpdateStatus(null); // Reset status change
      // Load conversation history for forwarding
      await loadConversationHistory();
    }
  };

  // Load conversation history for forwarding
  const loadConversationHistory = async () => {
    try {
      // Get ticket details
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (ticketError) {
        console.error('Error loading ticket:', ticketError);
        return;
      }

      // Get all ticket comments
      const { data: comments, error: commentsError } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Error loading comments:', commentsError);
        return;
      }

      // Build conversation history in Freshdesk email format
      let conversationHistory = `\n\n--- Forwarded ticket ---\n\n`;
      
      // Original ticket
      conversationHistory += `From: ${customerName} <${customerEmail}>\n`;
      conversationHistory += `Date: ${new Date(ticket.created_at).toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}\n`;
      conversationHistory += `Subject: ${ticketSubject}\n`;
      conversationHistory += `Ticket ID: #${ticket.ticket_number}\n\n`;
      conversationHistory += `${ticket.description}\n\n`;

      // Add all comments to the conversation
      if (comments && comments.length > 0) {
        for (const comment of comments) {
          if (!comment.is_internal) { // Only include public comments in forward
            conversationHistory += `________________________________\n\n`;
            conversationHistory += `From: Support Team\n`;
            conversationHistory += `Date: ${new Date(comment.created_at).toLocaleDateString('en-US', { 
              weekday: 'short', 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}\n`;
            conversationHistory += `Subject: Re: ${ticketSubject}\n\n`;
            conversationHistory += `${comment.content}\n\n`;
          }
        }
      }

      conversationHistory += `--- End of forwarded ticket ---\n\n`;
      setResponse(conversationHistory);
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };
  const { toast } = useToast();

  // Helper interface for CC recipients
  interface CCRecipient {
    id: string;
    email: string;
    name: string;
    isContact?: boolean;
  }

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
      setIsSendingEmail(true);

      // Save the comment to the database
      const { data: comment, error: commentError } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: ticketId,
          content: response,
          is_internal: isInternal,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select('*')
        .single();

      if (commentError) {
        throw commentError;
      }

      // Update ticket status if requested
      const updates: any = { 
        updated_at: new Date().toISOString(),
      };

      if (updateStatus) {
        updates.status = updateStatus;
        if (updateStatus === 'resolved') {
          updates.resolved_at = new Date().toISOString();
        }
      } else if (sendAndClose) {
        updates.status = 'closed';
      }

      const { error: ticketError } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId);

      if (ticketError) {
        console.warn('Could not update ticket:', ticketError);
      }

      // Send email if not internal and recipient is provided
      const recipientEmail = responseType === 'forward' ? forwardTo : customerEmail;
      if (!isInternal && recipientEmail) {
        try {
          const { data: activeServer } = await supabase
            .from('email_servers')
            .select('*')
            .eq('is_active', true)
            .limit(1)
            .single();

          let emailResponse;
          
          if (activeServer) {
            emailResponse = await supabase.functions.invoke('send-custom-email', {
              body: {
                ticketId: ticketNumber || ticketId,
                customerName,
                customerEmail: recipientEmail,
                subject: subject,
                message: response,
                agentName: 'Support Agent',
                agentSignature: userSignature,
                ticketStatus: updateStatus || ticketStatus,
                priority,
                isResolution: updateStatus === 'resolved',
                emailServerId: activeServer.id,
                ccRecipients: ccRecipients.map(r => r.email),
                bccRecipients: bccRecipients.map(r => r.email)
              }
            });
          } else {
            emailResponse = await supabase.functions.invoke('send-ticket-email', {
              body: {
                ticketId: ticketNumber || ticketId,
                customerName,
                customerEmail: recipientEmail,
                subject: subject,
                message: response,
                agentName: 'Support Agent',
                agentSignature: userSignature,
                ticketStatus: updateStatus || ticketStatus,
                priority,
                isResolution: updateStatus === 'resolved',
                ccRecipients: ccRecipients.map(r => r.email),
                bccRecipients: bccRecipients.map(r => r.email)
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
              description: `Your message has been sent to ${recipientEmail} via ${serverType}`,
            });
          }
        } catch (error) {
          console.error('Email error:', error);
          toast({
            title: "Response saved", 
            description: "Response saved but email delivery failed.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Response saved",
          description: `Your ${isInternal ? 'internal note' : 'response'} has been added to the ticket.`,
        });
      }

      onSubmit?.(response, isInternal);
      setResponse('');
      setCcRecipients([]);
      setBccRecipients([]);
      setUpdateStatus(null);
      setSendAndClose(false);
      
    } catch (error: any) {
      console.error('Error saving response:', error);
      toast({
        title: "Error",
        description: "Could not save response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="h-full bg-gray-50">
      <Tabs value={responseType} onValueChange={(v) => handleResponseTypeChange(v as 'reply' | 'forward')} className="h-full flex flex-col">
        {/* Centered Reply/Forward Tabs */}
        <div className="bg-white border-b">
          <div className="flex items-center justify-center py-2">
            <TabsList className="grid w-64 grid-cols-2 bg-gray-100">
              <TabsTrigger 
                value="reply" 
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:border-b-2"
              >
                <Reply className="h-4 w-4 mr-2" />
                Reply
              </TabsTrigger>
              <TabsTrigger 
                value="forward"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:border-b-2"
              >
                <Forward className="h-4 w-4 mr-2" />
                Forward
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="reply" className="flex-1 overflow-hidden mt-0">
          <ReplyContent 
            isInternal={isInternal}
            setIsInternal={setIsInternal}
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            customerEmail={customerEmail}
            ccRecipients={ccRecipients}
            setCcRecipients={setCcRecipients}
            bccRecipients={bccRecipients}
            setBccRecipients={setBccRecipients}
            subject={subject}
            setSubject={setSubject}
            response={response}
            setResponse={setResponse}
            userSignature={userSignature}
            updateStatus={updateStatus}
            setUpdateStatus={setUpdateStatus}
            sendAndClose={sendAndClose}
            setSendAndClose={setSendAndClose}
            isSendingEmail={isSendingEmail}
            onCannedResponseSelect={handleCannedResponseSelect}
            onSubmit={handleSubmit}
          />
        </TabsContent>

        <TabsContent value="forward" className="flex-1 overflow-hidden mt-0">
          <ForwardContent 
            customerEmail={customerEmail}
            ccRecipients={ccRecipients}
            setCcRecipients={setCcRecipients}
            bccRecipients={bccRecipients}
            setBccRecipients={setBccRecipients}
            subject={subject}
            setSubject={setSubject}
            response={response}
            setResponse={setResponse}
            userSignature={userSignature}
            isSendingEmail={isSendingEmail}
            onCannedResponseSelect={handleCannedResponseSelect}
            onSubmit={handleSubmit}
            forwardTo={forwardTo}
            setForwardTo={setForwardTo}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Reply Content Component
function ReplyContent({
  isInternal,
  setIsInternal,
  showAdvanced,
  setShowAdvanced,
  customerEmail,
  ccRecipients,
  setCcRecipients,
  bccRecipients,
  setBccRecipients,
  subject,
  setSubject,
  response,
  setResponse,
  userSignature,
  updateStatus,
  setUpdateStatus,
  sendAndClose,
  setSendAndClose,
  isSendingEmail,
  onCannedResponseSelect,
  onSubmit
}: any) {
  return (
    <div className="bg-white h-full flex flex-col">
      {/* Header Controls */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="internal-note"
                checked={isInternal}
                onCheckedChange={setIsInternal}
              />
              <Label htmlFor="internal-note" className="text-sm font-medium">
                {isInternal ? 'Private Note' : 'Public Reply'}
              </Label>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-gray-600"
          >
            <Settings className="h-4 w-4 mr-2" />
            {showAdvanced ? 'Hide Options' : 'More Options'}
            {showAdvanced ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>

      {/* Email Headers */}
      {!isInternal && (
        <div className="p-4 bg-gray-50 border-b space-y-3">
          <div className="grid grid-cols-12 gap-3 items-center">
            <Label className="col-span-1 text-right text-sm font-medium">To:</Label>
            <div className="col-span-11">
              <Input
                value={customerEmail}
                readOnly
                className="bg-white"
              />
            </div>
          </div>

          {showAdvanced && (
            <>
              <div className="grid grid-cols-12 gap-3 items-center">
                <Label className="col-span-1 text-right text-sm font-medium">CC:</Label>
                <div className="col-span-11">
                  <CCRecipientSelector
                    selectedRecipients={ccRecipients}
                    onRecipientsChange={setCcRecipients}
                    placeholder="Add CC recipients..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 items-center">
                <Label className="col-span-1 text-right text-sm font-medium">BCC:</Label>
                <div className="col-span-11">
                  <CCRecipientSelector
                    selectedRecipients={bccRecipients}
                    onRecipientsChange={setBccRecipients}
                    placeholder="Add BCC recipients..."
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-12 gap-3 items-center">
            <Label className="col-span-1 text-right text-sm font-medium">Subject:</Label>
            <div className="col-span-11">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <CannedResponseSelector onSelect={onCannedResponseSelect}>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </Button>
          </CannedResponseSelector>
          
          <Button variant="outline" size="sm" disabled>
            <Paperclip className="h-4 w-4 mr-2" />
            Attach
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <span className="text-xs text-gray-500 ml-2">
            {response.length} characters
          </span>
        </div>
      </div>

      {/* Message Body */}
      <div className="flex-1 p-4">
        <Textarea
          placeholder={isInternal ? "Add a private note..." : "Type your reply here..."}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          className="min-h-48 border-0 shadow-none resize-none focus-visible:ring-0 p-0 h-full"
        />
        
        {userSignature && !isInternal && (
          <div className="mt-4 pt-4 border-t text-sm text-gray-600">
            <div dangerouslySetInnerHTML={{ __html: userSignature.replace(/\n/g, '<br>') }} />
          </div>
        )}
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="p-4 border-t bg-gray-50">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium mb-2 block">Update Status After Sending</Label>
              <Select value={updateStatus || 'no-change'} onValueChange={(value) => setUpdateStatus(value === 'no-change' ? null : value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  <SelectItem value="no-change">Don't change status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="send-and-close"
                checked={sendAndClose}
                onCheckedChange={setSendAndClose}
              />
              <Label htmlFor="send-and-close" className="text-sm">
                Send and close ticket
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t bg-white flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {isInternal ? (
            <span className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-1" />
              This note will only be visible to internal staff
            </span>
          ) : (
            <span className="flex items-center">
              <Mail className="h-4 w-4 mr-1" />
              {customerEmail ? `Will be sent to ${customerEmail}${ccRecipients.length > 0 ? ` and ${ccRecipients.length} CC recipient${ccRecipients.length > 1 ? 's' : ''}` : ''}` : 'Will be saved to the ticket'}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-gray-600">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          
          <Button 
            onClick={onSubmit} 
            disabled={!response.trim() || isSendingEmail}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSendingEmail ? (
              <>
                <Mail className="h-4 w-4 mr-2 animate-pulse" />
                Sending...
              </>
            ) : (
              <>
                {isInternal ? (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add Note
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {sendAndClose ? 'Send & Close' : 'Send Reply'}
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Forward Content Component
function ForwardContent({
  customerEmail,
  ccRecipients,
  setCcRecipients,
  bccRecipients,
  setBccRecipients,
  subject,
  setSubject,
  response,
  setResponse,
  userSignature,
  isSendingEmail,
  onCannedResponseSelect,
  onSubmit,
  forwardTo,
  setForwardTo,
}: any) {
  return (
    <div className="bg-white h-full flex flex-col">
      {/* Email Headers */}
      <div className="p-4 bg-gray-50 border-b space-y-3">
        <div className="grid grid-cols-12 gap-3 items-center">
          <Label className="col-span-1 text-right text-sm font-medium">To:</Label>
          <div className="col-span-11">
            <Input
              value={forwardTo}
              onChange={(e) => setForwardTo(e.target.value)}
              placeholder="Enter email address to forward to..."
              className="bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 items-center">
          <Label className="col-span-1 text-right text-sm font-medium">CC:</Label>
          <div className="col-span-11">
            <CCRecipientSelector
              selectedRecipients={ccRecipients}
              onRecipientsChange={setCcRecipients}
              placeholder="Add CC recipients..."
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 items-center">
          <Label className="col-span-1 text-right text-sm font-medium">BCC:</Label>
          <div className="col-span-11">
            <CCRecipientSelector
              selectedRecipients={bccRecipients}
              onRecipientsChange={setBccRecipients}
              placeholder="Add BCC recipients..."
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 items-center">
          <Label className="col-span-1 text-right text-sm font-medium">Subject:</Label>
          <div className="col-span-11">
            <Input
              value={`Fwd: ${subject}`}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-white"
            />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <CannedResponseSelector onSelect={onCannedResponseSelect}>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </Button>
          </CannedResponseSelector>
          
          <Button variant="outline" size="sm" disabled>
            <Paperclip className="h-4 w-4 mr-2" />
            Attach
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <span className="text-xs text-gray-500 ml-2">
            {response.length} characters
          </span>
        </div>
      </div>

      {/* Message Body */}
      <div className="flex-1 p-4">
        <Textarea
          placeholder="Add your forward message above the conversation history..."
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          className="min-h-48 border-0 shadow-none resize-none focus-visible:ring-0 p-0 h-full"
        />
        
        {userSignature && (
          <div className="mt-4 pt-4 border-t text-sm text-gray-600">
            <div dangerouslySetInnerHTML={{ __html: userSignature.replace(/\n/g, '<br>') }} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-white flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="flex items-center">
            <Mail className="h-4 w-4 mr-1" />
            {forwardTo ? `Will be forwarded to ${forwardTo}${ccRecipients.length > 0 ? ` and ${ccRecipients.length} CC recipient${ccRecipients.length > 1 ? 's' : ''}` : ''}` : 'Enter recipient to forward'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-gray-600">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          
          <Button 
            onClick={onSubmit} 
            disabled={!response.trim() || !forwardTo.trim() || isSendingEmail}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSendingEmail ? (
              <>
                <Mail className="h-4 w-4 mr-2 animate-pulse" />
                Forwarding...
              </>
            ) : (
              <>
                <Forward className="h-4 w-4 mr-2" />
                Forward
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}