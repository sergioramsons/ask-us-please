import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { NotificationService } from '@/services/NotificationService';
import { Loader2, MessageSquare } from 'lucide-react';

export const SMSTester: React.FC = () => {
  const [smsData, setSmsData] = useState({
    destination: '',
    message: '',
    source: 'BernsergIT'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendTest = async () => {
    if (!smsData.destination || !smsData.message) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const success = await NotificationService.sendSMS(smsData);
      
      if (success) {
        toast({
          title: "SMS Sent Successfully",
          description: `Test SMS sent to ${smsData.destination}`,
        });
        setSmsData({ ...smsData, message: '' });
      } else {
        toast({
          title: "SMS Failed",
          description: "Failed to send test SMS. Please check the logs.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('SMS test error:', error);
      toast({
        title: "Error",
        description: "An error occurred while sending SMS",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          SMS Tester
        </CardTitle>
        <CardDescription>
          Test SMS functionality using RML Connect API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="destination">Destination Number *</Label>
            <Input
              id="destination"
              type="tel"
              placeholder="233244051423"
              value={smsData.destination}
              onChange={(e) => setSmsData({ ...smsData, destination: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source (Sender ID)</Label>
            <Input
              id="source"
              placeholder="BernsergIT"
              value={smsData.source}
              onChange={(e) => setSmsData({ ...smsData, source: e.target.value })}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="message">Message *</Label>
          <Textarea
            id="message"
            placeholder="Enter your test message here..."
            value={smsData.message}
            onChange={(e) => setSmsData({ ...smsData, message: e.target.value })}
            rows={3}
          />
          <div className="text-sm text-muted-foreground">
            {smsData.message.length}/160 characters
          </div>
        </div>

        <Button 
          onClick={handleSendTest} 
          disabled={isLoading || !smsData.destination || !smsData.message}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending SMS...
            </>
          ) : (
            'Send Test SMS'
          )}
        </Button>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">SMS Configuration:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• API: RML Connect</li>
            <li>• Username: bernsergsms</li>
            <li>• Default Source: BernsergIT</li>
            <li>• Type: Text (0)</li>
            <li>• Delivery Reports: Enabled</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};