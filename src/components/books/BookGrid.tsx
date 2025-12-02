import { Book } from '@/types/book';
import { BookCard } from './BookCard';

interface BookGridProps {
  books: Book[];
  title?: string;
  subtitle?: string;
}

export function BookGrid({ books, title, subtitle }: BookGridProps) {
  if (books.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No books found.</p>
      </div>
    );
  }

  return (
    <section>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  );
}
