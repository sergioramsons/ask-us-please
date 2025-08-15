import { supabase } from "@/integrations/supabase/client";

export interface NotificationRequest {
  type: 'ticket_created' | 'ticket_updated' | 'ticket_assigned' | 'comment_added' | 'sla_warning';
  ticketId: string;
  ticketTitle: string;
  ticketStatus?: string;
  ticketPriority?: string;
  recipientEmail: string;
  recipientName?: string;
  senderName?: string;
  message?: string;
}

export interface SMSRequest {
  destination: string;
  message: string;
  source?: string;
}

export class NotificationService {
  static async sendNotification(notification: NotificationRequest): Promise<boolean> {
    try {
      console.log('Sending notification:', notification);
      
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: notification
      });

      if (error) {
        console.error('Error invoking notification function:', error);
        return false;
      }

      const success = (data as any)?.success === true;
      if (!success) {
        console.warn('NotificationService: Email reported failure from edge function:', data);
      } else {
        console.log('NotificationService: Email sent successfully:', data);
      }
      return success;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  // Helper methods for common notification types
  static async notifyTicketCreated(
    ticketId: string,
    ticketTitle: string,
    ticketPriority: string,
    recipientEmail: string,
    recipientName?: string
  ): Promise<boolean> {
    return this.sendNotification({
      type: 'ticket_created',
      ticketId,
      ticketTitle,
      ticketPriority,
      ticketStatus: 'open',
      recipientEmail,
      recipientName
    });
  }

  static async notifyTicketUpdated(
    ticketId: string,
    ticketTitle: string,
    newStatus: string,
    recipientEmail: string,
    senderName?: string,
    message?: string
  ): Promise<boolean> {
    return this.sendNotification({
      type: 'ticket_updated',
      ticketId,
      ticketTitle,
      ticketStatus: newStatus,
      recipientEmail,
      senderName,
      message
    });
  }

  static async notifyCommentAdded(
    ticketId: string,
    ticketTitle: string,
    recipientEmail: string,
    senderName: string,
    comment: string
  ): Promise<boolean> {
    return this.sendNotification({
      type: 'comment_added',
      ticketId,
      ticketTitle,
      recipientEmail,
      senderName,
      message: comment
    });
  }

  static async notifySLAWarning(
    ticketId: string,
    ticketTitle: string,
    ticketPriority: string,
    recipientEmail: string
  ): Promise<boolean> {
    return this.sendNotification({
      type: 'sla_warning',
      ticketId,
      ticketTitle,
      ticketPriority,
      recipientEmail
    });
  }

  // SMS functionality
  static async sendSMS(smsRequest: SMSRequest): Promise<boolean> {
    try {
      console.log('NotificationService: Starting SMS send with request:', smsRequest);
      
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: smsRequest
      });

      console.log('NotificationService: SMS function response:', { data, error });

      if (error) {
        console.error('Error invoking SMS function:', error);
        return false;
      }

      const success = (data as any)?.success === true;
      if (!success) {
        console.warn('NotificationService: SMS reported failure from edge function:', data);
      }
      return success;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }

  // Helper methods for common SMS types
  static async sendTicketSMS(
    destination: string,
    ticketId: string,
    ticketTitle: string,
    status?: string
  ): Promise<boolean> {
    const message = status 
      ? `Ticket #${ticketId} "${ticketTitle}" status updated to: ${status}`
      : `New ticket #${ticketId} created: "${ticketTitle}"`;
    
    return this.sendSMS({
      destination,
      message
    });
  }
}