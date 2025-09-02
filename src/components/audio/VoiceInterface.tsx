import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';

interface VoiceInterfaceProps {
  ticketId?: string;
  onSpeakingChange?: (speaking: boolean) => void;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ 
  ticketId, 
  onSpeakingChange 
}) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const chatRef = useRef<RealtimeChat | null>(null);

  const handleMessage = (event: any) => {
    console.log('Received message:', event.type, event);
    
    switch (event.type) {
      case 'response.audio.delta':
        setIsSpeaking(true);
        onSpeakingChange?.(true);
        break;
        
      case 'response.audio.done':
        setIsSpeaking(false);
        onSpeakingChange?.(false);
        break;
        
      case 'input_audio_buffer.speech_started':
        setIsListening(true);
        break;
        
      case 'input_audio_buffer.speech_stopped':
        setIsListening(false);
        break;
        
      case 'response.audio_transcript.delta':
        setTranscript(prev => prev + (event.delta || ''));
        break;
        
      case 'response.audio_transcript.done':
        // Transcript is complete
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        // User's speech transcription is complete
        break;
        
      case 'response.function_call_arguments.done':
        if (event.arguments) {
          try {
            const args = JSON.parse(event.arguments);
            console.log('Function call:', event.name, args);
            
            if (event.name === 'update_ticket_status' && args.ticketId === ticketId) {
              toast({
                title: "Ticket Updated",
                description: `Status changed to: ${args.status}`,
              });
            }
          } catch (error) {
            console.error('Error parsing function arguments:', error);
          }
        }
        break;
        
      case 'error':
        toast({
          title: "Error",
          description: event.message || 'Unknown error occurred',
          variant: "destructive",
        });
        break;
        
      case 'status':
        console.log('Status:', event.message);
        break;
    }
  };

  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected);
    if (!connected) {
      setIsSpeaking(false);
      setIsListening(false);
      onSpeakingChange?.(false);
    }
  };

  const startConversation = async () => {
    try {
      chatRef.current = new RealtimeChat(handleMessage, handleConnectionChange);
      await chatRef.current.connect();
      
      // Send initial context about the ticket
      if (ticketId) {
        setTimeout(() => {
          chatRef.current?.sendTextMessage(
            `I'm looking at support ticket ${ticketId}. Please help me with this ticket.`
          );
        }, 1000);
      }
      
      toast({
        title: "Voice Assistant Connected",
        description: "You can now speak to get help with this ticket",
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Failed to start voice conversation',
        variant: "destructive",
      });
    }
  };

  const endConversation = () => {
    chatRef.current?.disconnect();
    setTranscript('');
    toast({
      title: "Voice Assistant Disconnected",
      description: "Voice conversation ended",
    });
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Voice Assistant</h3>
          {isConnected && (
            <Badge variant={isSpeaking ? "default" : isListening ? "secondary" : "outline"}>
              {isSpeaking ? "Speaking" : isListening ? "Listening" : "Ready"}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!isConnected ? (
            <Button 
              onClick={startConversation}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              <Phone className="w-4 h-4 mr-2" />
              Start Voice Chat
            </Button>
          ) : (
            <Button 
              onClick={endConversation}
              variant="destructive"
              size="sm"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              End Call
            </Button>
          )}
        </div>
      </div>

      {isConnected && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isListening ? (
              <>
                <Mic className="w-4 h-4 text-green-500" />
                <span>Listening...</span>
              </>
            ) : isSpeaking ? (
              <>
                <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
                <span>Assistant speaking...</span>
              </>
            ) : (
              <>
                <MicOff className="w-4 h-4" />
                <span>Ready to listen</span>
              </>
            )}
          </div>

          {transcript && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium mb-1">Assistant:</p>
              <p className="text-sm text-muted-foreground">{transcript}</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            💡 Speak naturally to get help with this ticket. The assistant can help you understand the issue, suggest solutions, or update the ticket status.
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInterface;