import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Mail, Ticket, User, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';

interface IncomingEmail {
  id: string;
  message_id: string;
  sender_email: string;
  sender_name?: string;
  recipient_email: string;
  subject: string;
  body_text?: string;
  body_html?: string;
  received_at: string;
  processed: boolean;
  ticket_id?: string;
  created_at: string;
}

interface EmailAttachment {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
}

const IncomingEmailManager = () => {
  const { organization } = useOrganization();
  const [selectedEmail, setSelectedEmail] = useState<IncomingEmail | null>(null);
  const [showProcessed, setShowProcessed] = useState(false);
  const queryClient = useQueryClient();

  // Fetch incoming emails
  const { data: emails, isLoading } = useQuery({
    queryKey: ['incoming-emails', showProcessed],
    queryFn: async () => {
      const query = supabase
        .from('incoming_emails')
        .select('*')
        .order('received_at', { ascending: false });
      
      if (!showProcessed) {
        query.eq('processed', false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as IncomingEmail[];
    },
  });

  // Fetch attachments for selected email
  const { data: attachments } = useQuery({
    queryKey: ['email-attachments', selectedEmail?.id],
    queryFn: async () => {
      if (!selectedEmail?.id) return [];
      // Note: email_attachments table exists but types haven't regenerated yet
      const { data, error } = await supabase
        .from('email_attachments' as any)
        .select('*')
        .eq('email_id', selectedEmail.id);
      if (error) throw error;
      return (data || []) as EmailAttachment[];
    },
    enabled: !!selectedEmail?.id,
  });

  // Create ticket from email
  const createTicketMutation = useMutation({
    mutationFn: async (email: IncomingEmail) => {
      // Generate ticket number
      const { data: ticketNumber, error: rpcError } = await supabase
        .rpc('generate_ticket_number');
      
      if (rpcError) throw rpcError;

      // Check/create contact
      let contactId = null;
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', email.sender_email)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            name: `${email.sender_name || 'Unknown User'}`,
            first_name: email.sender_name?.split(' ')[0] || 'Unknown',
            last_name: email.sender_name?.split(' ').slice(1).join(' ') || 'User',
            email: email.sender_email,
            organization_id: organization?.id
          })
          .select()
          .single();

        if (contactError) throw contactError;
        contactId = newContact.id;
      }

      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          ticket_number: ticketNumber,
          subject: email.subject,
          description: email.body_text || email.body_html || 'Email content not available',
          priority: 'medium',
          status: 'open',
          contact_id: contactId,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create initial comment
      await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: ticket.id,
          content: email.body_text || email.body_html || 'Email content not available',
          email_id: email.id,
          is_internal: false,
        });

      // Mark email as processed
      await supabase
        .from('incoming_emails')
        .update({ 
          ticket_id: ticket.id,
          processed: true 
        })
        .eq('id', email.id);

      return ticket;
    },
    onSuccess: (ticket) => {
      toast.success(`Ticket ${ticket.ticket_number} created successfully`);
      queryClient.invalidateQueries({ queryKey: ['incoming-emails'] });
      setSelectedEmail(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to create ticket: ${error.message}`);
    },
  });

  // Mark email as processed without creating ticket
  const markProcessedMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const { error } = await supabase
        .from('incoming_emails')
        .update({ processed: true })
        .eq('id', emailId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Email marked as processed');
      queryClient.invalidateQueries({ queryKey: ['incoming-emails'] });
      setSelectedEmail(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to mark as processed: ${error.message}`);
    },
  });

  // Process pending emails into tickets
  const processPendingMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('process-pending-emails');
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        toast.success(data.message || 'Processed pending emails');
        queryClient.invalidateQueries({ queryKey: ['incoming-emails'] });
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      } else {
        toast.error(data?.message || 'Failed to process pending emails');
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to process pending: ${error.message}`);
    },
  });

  const getStatusBadge = (email: IncomingEmail) => {
    if (email.ticket_id) {
      return <Badge variant="default" className="gap-1"><Ticket className="h-3 w-3" />Ticket Created</Badge>;
    }
    if (email.processed) {
      return <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" />Processed</Badge>;
    }
    return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Incoming Email Management
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => processPendingMutation.mutate()}
                size="sm"
                disabled={processPendingMutation.isPending}
                className="gap-2"
              >
                {processPendingMutation.isPending ? 'Processing…' : 'Process Pending'}
              </Button>
              <Button
                variant={showProcessed ? "default" : "outline"}
                onClick={() => setShowProcessed(!showProcessed)}
                size="sm"
              >
                {showProcessed ? 'Show Unprocessed' : 'Show All'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : emails && emails.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{email.sender_name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{email.sender_email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md truncate">{email.subject}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(email.received_at), 'MMM d, yyyy HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(email)}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedEmail(email)}
                          >
                            View
                          </Button>
                        </DialogTrigger>
                        <EmailDetailDialog 
                          email={selectedEmail}
                          attachments={attachments || []}
                          onCreateTicket={(email) => createTicketMutation.mutate(email)}
                          onMarkProcessed={(emailId) => markProcessedMutation.mutate(emailId)}
                          isCreatingTicket={createTicketMutation.isPending}
                          isMarkingProcessed={markProcessedMutation.isPending}
                        />
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No {showProcessed ? '' : 'unprocessed '}emails found</p>
              <p className="text-sm mt-1">
                Configure your email provider to send webhooks to: 
                <code className="bg-muted px-1 py-0.5 rounded text-xs ml-1">
                  https://thzdazcmswmeolaiijml.supabase.co/functions/v1/process-incoming-email
                </code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const EmailDetailDialog = ({ 
  email, 
  attachments, 
  onCreateTicket, 
  onMarkProcessed, 
  isCreatingTicket, 
  isMarkingProcessed 
}: {
  email: IncomingEmail | null;
  attachments: EmailAttachment[];
  onCreateTicket: (email: IncomingEmail) => void;
  onMarkProcessed: (emailId: string) => void;
  isCreatingTicket: boolean;
  isMarkingProcessed: boolean;
}) => {
  if (!email) return null;

  return (
    <DialogContent className="max-w-4xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Details
        </DialogTitle>
      </DialogHeader>
      
      <Tabs defaultValue="content" className="w-full">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          {attachments.length > 0 && (
            <TabsTrigger value="attachments">Attachments ({attachments.length})</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="content" className="space-y-4">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">From:</span> {email.sender_name || 'Unknown'} &lt;{email.sender_email}&gt;
              </div>
              <div>
                <span className="font-medium">To:</span> {email.recipient_email}
              </div>
            </div>
            <div>
              <span className="font-medium">Subject:</span> {email.subject}
            </div>
            <div>
              <span className="font-medium">Received:</span> {format(new Date(email.received_at), 'PPpp')}
            </div>
          </div>
          
          <div className="border rounded-lg">
            <div className="bg-muted px-3 py-2 border-b">
              <span className="font-medium">Email Content</span>
            </div>
            <ScrollArea className="h-64 p-4">
              {email.body_html ? (
                <div dangerouslySetInnerHTML={{ __html: email.body_html }} />
              ) : (
                <pre className="whitespace-pre-wrap text-sm">{email.body_text || 'No content available'}</pre>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
        
        <TabsContent value="metadata" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 text-sm">
            <div><span className="font-medium">Message ID:</span> {email.message_id}</div>
            <div><span className="font-medium">Processed:</span> {email.processed ? 'Yes' : 'No'}</div>
            {email.ticket_id && (
              <div><span className="font-medium">Ticket ID:</span> {email.ticket_id}</div>
            )}
            <div><span className="font-medium">Created:</span> {format(new Date(email.created_at), 'PPpp')}</div>
          </div>
        </TabsContent>
        
        {attachments.length > 0 && (
          <TabsContent value="attachments" className="space-y-4">
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">{attachment.filename}</div>
                    <div className="text-sm text-muted-foreground">
                      {attachment.content_type} • {(attachment.size_bytes / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
      
      {!email.processed && (
        <div className="flex gap-2 pt-4">
          <Button
            onClick={() => onCreateTicket(email)}
            disabled={isCreatingTicket}
            className="gap-2"
          >
            <Ticket className="h-4 w-4" />
            {isCreatingTicket ? 'Creating Ticket...' : 'Create Ticket'}
          </Button>
          <Button
            variant="outline"
            onClick={() => onMarkProcessed(email.id)}
            disabled={isMarkingProcessed}
          >
            {isMarkingProcessed ? 'Processing...' : 'Mark as Processed'}
          </Button>
        </div>
      )}
    </DialogContent>
  );
};

export default IncomingEmailManager;