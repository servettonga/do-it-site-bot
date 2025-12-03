import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseTextToSpeechOptions {
  voiceId?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

interface UseTextToSpeechReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
}

export function useTextToSpeech(options: UseTextToSpeechOptions = {}): UseTextToSpeechReturn {
  const { voiceId = 'EXAVITQu4vr4xnSDxMaL', onStart, onEnd, onError } = options;
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voiceId },
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate speech');
      }

      if (!data?.audioContent) {
        throw new Error('No audio content received');
      }

      // Create audio element and play
      const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
        setIsLoading(false);
        onStart?.();
      };

      audio.onended = () => {
        setIsSpeaking(false);
        audioRef.current = null;
        onEnd?.();
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setIsLoading(false);
        audioRef.current = null;
        onError?.('Failed to play audio');
      };

      await audio.play();
    } catch (error) {
      console.error('Text-to-speech error:', error);
      setIsLoading(false);
      setIsSpeaking(false);
      onError?.(error instanceof Error ? error.message : 'Failed to generate speech');
    }
  }, [voiceId, onStart, onEnd, onError]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsSpeaking(false);
      onEnd?.();
    }
  }, [onEnd]);

  return {
    speak,
    stop,
    isSpeaking,
    isLoading,
  };
}
