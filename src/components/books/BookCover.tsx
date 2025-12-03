import { useState } from 'react';
import { useBookCover } from '@/hooks/useBookEnrichment';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface BookCoverProps {
  isbn: string;
  fallbackImage: string;
  alt: string;
  className?: string;
  aspectRatio?: 'portrait' | 'square';
}

export function BookCover({ 
  isbn, 
  fallbackImage, 
  alt, 
  className,
  aspectRatio = 'portrait' 
}: BookCoverProps) {
  const { coverImage, isLoading } = useBookCover(isbn, fallbackImage);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const displayImage = imageError ? fallbackImage : coverImage;

  return (
    <div className={cn(
      "relative overflow-hidden bg-muted",
      aspectRatio === 'portrait' ? 'aspect-[2/3]' : 'aspect-square',
      className
    )}>
      {/* Skeleton while loading */}
      {(isLoading || !imageLoaded) && (
        <Skeleton className="absolute inset-0" />
      )}
      
      <img
        src={displayImage}
        alt={alt}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          setImageError(true);
          setImageLoaded(true);
        }}
        className={cn(
          "h-full w-full object-cover transition-all duration-300",
          (!imageLoaded) && "opacity-0"
        )}
      />
    </div>
  );
}
