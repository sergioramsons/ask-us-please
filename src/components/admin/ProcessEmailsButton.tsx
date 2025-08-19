import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Loader2 } from 'lucide-react';

export function ProcessEmailsButton() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleProcessEmails = async () => {
    setIsProcessing(true);
    try {
      // First, fetch new emails from POP3 servers
      const { data: fetchResult, error: fetchError } = await supabase.functions.invoke('fetch-pop3-emails');
      
      if (fetchError) {
        throw new Error(`Failed to fetch emails: ${fetchError.message}`);
      }

      console.log('POP3 fetch result:', fetchResult);

      // Then, process any pending emails
      const { data: processResult, error: processError } = await supabase.functions.invoke('process-pending-emails');
      
      if (processError) {
        throw new Error(`Failed to process emails: ${processError.message}`);
      }

      console.log('Processing result:', processResult);

      const fetchMsg = fetchResult?.message || 'No fetch result';
      const processMsg = processResult?.message || 'No process result';
      
      toast({
        title: "Email Processing Complete",
        description: `${fetchMsg}. ${processMsg}`,
      });

    } catch (error: any) {
      console.error('Error processing emails:', error);
      toast({
        title: "Error Processing Emails",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handleProcessEmails}
      disabled={isProcessing}
      className="gap-2"
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Mail className="h-4 w-4" />
      )}
      {isProcessing ? 'Processing...' : 'Process Emails Now'}
    </Button>
  );
}