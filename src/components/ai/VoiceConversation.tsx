import { useState, useCallback } from 'react';
import { useConversation } from '@11labs/react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface VoiceConversationProps {
  agentId: string;
  onMessage?: (message: { role: string; content: string }) => void;
  onClose?: () => void;
}

export function VoiceConversation({ agentId, onMessage, onClose }: VoiceConversationProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isConnecting, setIsConnecting] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs');
      setIsConnecting(false);
      toast({
        title: 'Connected',
        description: 'Voice conversation started. Speak naturally!',
      });
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
      toast({
        title: 'Disconnected',
        description: 'Voice conversation ended.',
      });
    },
    onMessage: (message) => {
      console.log('Message received:', message);
      if (onMessage && message.message) {
        onMessage({
          role: message.source === 'user' ? 'user' : 'assistant',
          content: message.message,
        });
      }
    },
    onError: (error) => {
      console.error('Conversation error:', error);
      setIsConnecting(false);
      toast({
        title: 'Error',
        description: 'Voice conversation error. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const startConversation = useCallback(async () => {
    try {
      setIsConnecting(true);
      
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get signed URL from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-signed-url', {
        body: { agentId },
      });
      
      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Failed to get signed URL');
      }
      
      // Start the conversation with signed URL
      await conversation.startSession({
        signedUrl: data.signedUrl,
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setIsConnecting(false);
      toast({
        title: 'Failed to start',
        description: error instanceof Error ? error.message : 'Could not start voice conversation',
        variant: 'destructive',
      });
    }
  }, [agentId, conversation]);

  const endConversation = useCallback(async () => {
    await conversation.endSession();
    onClose?.();
  }, [conversation, onClose]);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    // Note: ElevenLabs SDK handles muting internally
  }, [isMuted]);

  const toggleVolume = useCallback(() => {
    const newVolume = volume === 0 ? 1 : 0;
    setVolume(newVolume);
    conversation.setVolume({ volume: newVolume });
  }, [volume, conversation]);

  const isConnected = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      {/* Status indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-muted'
          )}
        />
        <span>
          {isConnected
            ? isSpeaking
              ? 'Assistant speaking...'
              : 'Listening...'
            : 'Not connected'}
        </span>
      </div>

      {/* Voice visualization */}
      <div
        className={cn(
          'w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300',
          isConnected
            ? isSpeaking
              ? 'bg-primary/20 ring-4 ring-primary/40 animate-pulse'
              : 'bg-secondary ring-2 ring-primary/20'
            : 'bg-muted'
        )}
      >
        {isConnected ? (
          isSpeaking ? (
            <Volume2 className="w-10 h-10 text-primary" />
          ) : (
            <Mic className="w-10 h-10 text-primary animate-pulse" />
          )
        ) : (
          <MicOff className="w-10 h-10 text-muted-foreground" />
        )}
      </div>

      {/* Instructions */}
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        {isConnected
          ? 'Speak naturally. You can interrupt at any time.'
          : 'Click the button below to start a voice conversation.'}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {isConnected && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
              className={cn(isMuted && 'bg-destructive/10 border-destructive')}
            >
              {isMuted ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleVolume}
              className={cn(volume === 0 && 'bg-destructive/10 border-destructive')}
            >
              {volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
          </>
        )}

        <Button
          onClick={isConnected ? endConversation : startConversation}
          variant={isConnected ? 'destructive' : 'default'}
          className="gap-2"
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : isConnected ? (
            <>
              <PhoneOff className="w-4 h-4" />
              End Call
            </>
          ) : (
            <>
              <Phone className="w-4 h-4" />
              Start Voice Call
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
