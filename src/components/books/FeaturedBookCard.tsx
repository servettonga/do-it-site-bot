import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Book } from '@/types/book';
import { useBookCover } from '@/hooks/useBookEnrichment';
import { Skeleton } from '@/components/ui/skeleton';
import { BookPlaceholder } from './BookPlaceholder';

interface FeaturedBookCardProps {
  book: Book;
}

export function FeaturedBookCard({ book }: FeaturedBookCardProps) {
  const [imageError, setImageError] = useState(false);
  const { coverImage, isLoading } = useBookCover(book.isbn, book.coverImage);

  const showPlaceholder = imageError || !coverImage;

  return (
    <Link to={`/book/${book.id}`}>
      <div className="group relative aspect-[2/3] overflow-hidden rounded-md bg-muted">
        {isLoading && <Skeleton className="absolute inset-0" />}
        
        {showPlaceholder ? (
          <BookPlaceholder title={book.title} author={book.author} className="text-xs" />
        ) : (
          <img 
            src={coverImage} 
            alt={book.title} 
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" 
          />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-0 left-0 right-0 p-2 text-primary-foreground translate-y-full group-hover:translate-y-0 transition-transform">
          <p className="font-display font-semibold text-xs line-clamp-2">{book.title}</p>
          <p className="text-xs opacity-80">{book.author}</p>
        </div>
      </div>
    </Link>
  );
}
