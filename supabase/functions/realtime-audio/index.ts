import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let openAISocket: WebSocket | null = null;
  let sessionId: string | null = null;

  const connectToOpenAI = async () => {
    try {
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      openAISocket = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", [], {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "realtime=v1"
        }
      });

      openAISocket.onopen = () => {
        console.log("Connected to OpenAI Realtime API");
        socket.send(JSON.stringify({ type: 'status', message: 'Connected to OpenAI' }));
      };

      openAISocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("OpenAI message:", data.type);

        if (data.type === 'session.created') {
          sessionId = data.session.id;
          
          // Send session update after receiving session.created
          const sessionUpdate = {
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              instructions: "You are a helpful customer support assistant. Provide clear, concise responses to support tickets. When discussing technical issues, be specific and actionable.",
              voice: "alloy",
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1"
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000
              },
              tools: [
                {
                  type: "function",
                  name: "update_ticket_status",
                  description: "Update the status of a support ticket",
                  parameters: {
                    type: "object",
                    properties: {
                      ticketId: { type: "string" },
                      status: { type: "string" }
                    },
                    required: ["ticketId", "status"]
                  }
                }
              ],
              tool_choice: "auto",
              temperature: 0.8,
              max_response_output_tokens: "inf"
            }
          };
          
          openAISocket.send(JSON.stringify(sessionUpdate));
        }

        // Forward all messages to client
        socket.send(JSON.stringify(data));
      };

      openAISocket.onerror = (error) => {
        console.error("OpenAI WebSocket error:", error);
        socket.send(JSON.stringify({ type: 'error', message: 'OpenAI connection error' }));
      };

      openAISocket.onclose = () => {
        console.log("OpenAI WebSocket closed");
        socket.send(JSON.stringify({ type: 'status', message: 'Disconnected from OpenAI' }));
      };

    } catch (error) {
      console.error("Failed to connect to OpenAI:", error);
      socket.send(JSON.stringify({ type: 'error', message: 'Failed to connect to OpenAI' }));
    }
  };

  socket.onopen = () => {
    console.log("Client WebSocket connected");
    connectToOpenAI();
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log("Client message:", message.type);

      if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
        openAISocket.send(JSON.stringify(message));
      } else {
        socket.send(JSON.stringify({ type: 'error', message: 'OpenAI connection not ready' }));
      }
    } catch (error) {
      console.error("Error processing client message:", error);
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  };

  socket.onclose = () => {
    console.log("Client WebSocket disconnected");
    if (openAISocket) {
      openAISocket.close();
    }
  };

  socket.onerror = (error) => {
    console.error("Client WebSocket error:", error);
    if (openAISocket) {
      openAISocket.close();
    }
  };

  return response;
});