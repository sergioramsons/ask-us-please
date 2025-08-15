import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Ticket } from '@/types/ticket';

export function useFreshdeskSync() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const syncTickets = useCallback(async (): Promise<Ticket[]> => {
    setIsLoading(true);
    try {
      console.log('Syncing tickets from Freshdesk...');
      
      const { data, error } = await supabase.functions.invoke('freshdesk-sync?action=sync', {
        body: {}
      });

      if (error) {
        console.error('Freshdesk sync error:', error);
        throw new Error(error.message || 'Failed to sync tickets');
      }

      console.log('Synced tickets:', data.tickets);
      
      toast({
        title: "Success",
        description: `Synced ${data.tickets.length} tickets from Freshdesk`,
      });

      return data.tickets;
    } catch (error) {
      console.error('Error syncing tickets:', error);
      toast({
        title: "Sync Failed", 
        description: error instanceof Error ? error.message : "Failed to sync tickets from Freshdesk",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createTicketInFreshdesk = useCallback(async (ticketData: any): Promise<Ticket | null> => {
    setIsLoading(true);
    try {
      console.log('Creating ticket in Freshdesk...', ticketData);
      
      const { data, error } = await supabase.functions.invoke('freshdesk-sync?action=create', {
        body: { ticketData }
      });

      if (error) {
        console.error('Freshdesk create error:', error);
        throw new Error(error.message || 'Failed to create ticket');
      }

      console.log('Created ticket:', data.ticket);
      
      toast({
        title: "Success",
        description: "Ticket created in Freshdesk successfully",
      });

      return data.ticket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create ticket in Freshdesk", 
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateTicketInFreshdesk = useCallback(async (freshdeskId: number, updateData: any): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('Updating ticket in Freshdesk...', freshdeskId, updateData);
      
      const { data, error } = await supabase.functions.invoke('freshdesk-sync?action=update', {
        body: { freshdeskId, updateData }
      });

      if (error) {
        console.error('Freshdesk update error:', error);
        throw new Error(error.message || 'Failed to update ticket');
      }

      console.log('Updated ticket successfully');
      
      toast({
        title: "Success",
        description: "Ticket updated in Freshdesk successfully",
      });

      return true;
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update ticket in Freshdesk",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    isLoading,
    syncTickets,
    createTicketInFreshdesk,
    updateTicketInFreshdesk,
  };
}