import { cn } from '@/lib/utils';

interface AudioWaveformProps {
  isActive: boolean;
  isSpeaking?: boolean;
  barCount?: number;
  className?: string;
}

export function AudioWaveform({ 
  isActive, 
  isSpeaking = false, 
  barCount = 5,
  className 
}: AudioWaveformProps) {
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full transition-all duration-150",
            isActive 
              ? isSpeaking 
                ? "bg-primary animate-waveform-speaking" 
                : "bg-primary/70 animate-waveform-listening"
              : "bg-muted-foreground/30 h-2"
          )}
          style={{
            animationDelay: isActive ? `${i * 0.1}s` : '0s',
            height: isActive ? undefined : '8px',
          }}
        />
      ))}
    </div>
  );
}
