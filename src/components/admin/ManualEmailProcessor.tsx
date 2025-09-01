import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function ManualEmailProcessor() {
  const [processing, setProcessing] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const { toast } = useToast();

  const processEmails = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-pending-emails', {
        body: { force: true }
      });

      if (error) throw error;

      setLastCheck(new Date());
      toast({
        title: "Email Processing Complete",
        description: `Processed ${data?.processed || 0} emails, created ${data?.created || 0} tickets`,
      });
    } catch (error) {
      console.error('Email processing error:', error);
      toast({
        title: "Processing Failed", 
        description: "Failed to process emails. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Manual Email Processing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Force check for new incoming emails and process them into tickets/replies.
        </p>
        
        <Button 
          onClick={processEmails} 
          disabled={processing}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
          {processing ? 'Processing...' : 'Process New Emails'}
        </Button>

        {lastCheck && (
          <p className="text-xs text-muted-foreground">
            Last checked: {lastCheck.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}