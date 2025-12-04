import { useState } from 'react';
import { BookPlaceholder } from './BookPlaceholder';
import { cn } from '@/lib/utils';

interface BookImageProps {
  src: string;
  title: string;
  author: string;
  className?: string;
}

export function BookImage({ src, title, author, className }: BookImageProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className={cn("overflow-hidden", className)}>
        <BookPlaceholder title={title} author={author} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title}
      onError={() => setError(true)}
      className={cn("object-cover", className)}
    />
  );
}
