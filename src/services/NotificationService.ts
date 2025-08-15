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

      console.log('Notification sent successfully:', data);
      return true;
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
}