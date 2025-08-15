import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CannedResponseSelector } from './CannedResponseSelector';
import { MessageSquare, Send, FileText } from 'lucide-react';
import { CannedResponse } from '@/types/cannedResponse';
import { useToast } from '@/hooks/use-toast';

interface TicketResponseFormProps {
  ticketId: string;
  onSubmit?: (response: string, isInternal: boolean) => void;
}

export function TicketResponseForm({ ticketId, onSubmit }: TicketResponseFormProps) {
  const [response, setResponse] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const { toast } = useToast();

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

  const handleSubmit = () => {
    if (!response.trim()) {
      toast({
        title: "Error",
        description: "Please enter a response before submitting.",
        variant: "destructive",
      });
      return;
    }

    onSubmit?.(response, isInternal);
    setResponse('');
    
    toast({
      title: "Response sent",
      description: `Your ${isInternal ? 'internal note' : 'response'} has been added to the ticket.`,
    });
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
            {isInternal ? 'This note will only be visible to internal staff' : 'This response will be sent to the customer'}
          </p>
          <Button onClick={handleSubmit} disabled={!response.trim()}>
            <Send className="h-4 w-4 mr-2" />
            {isInternal ? 'Add Note' : 'Send Response'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}