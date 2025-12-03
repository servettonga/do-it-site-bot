import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import { Book, genreLabels } from '@/types/book';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useBookCover } from '@/hooks/useBookEnrichment';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BookCardProps {
  book: Book;
  className?: string;
}

export function BookCard({ book, className }: BookCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
  const isWishlisted = isInWishlist(book.id);
  const { coverImage } = useBookCover(book.isbn, book.coverImage);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(book);
    toast.success(`"${book.title}" added to cart`);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isWishlisted) {
      removeFromWishlist(book.id);
      toast.success(`Removed from wishlist`);
    } else {
      addToWishlist(book);
      toast.success(`Added to wishlist`);
    }
  };

  return (
    <Link to={`/book/${book.id}`}>
      <Card className={cn(
        'group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-card',
        className
      )}>
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          <img
            src={coverImage}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Wishlist Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleToggleWishlist}
            className={cn(
              "absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background",
              isWishlisted && "text-red-500"
            )}
          >
            <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")} />
          </Button>
          {book.bestseller && (
            <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground">
              Bestseller
            </Badge>
          )}
          {book.originalPrice && (
            <Badge variant="destructive" className="absolute bottom-2 right-2">
              Sale
            </Badge>
          )}
        </div>
        
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">
            {genreLabels[book.genre]}
          </p>
          
          <h3 className="font-display font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-2">
            {book.author}
          </p>
          
          <div className="flex items-center gap-1 mb-3">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span className="text-sm font-medium text-foreground">{book.rating}</span>
            <span className="text-xs text-muted-foreground">
              ({book.reviewCount.toLocaleString()})
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-primary">
                ${book.price.toFixed(2)}
              </span>
              {book.originalPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  ${book.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddToCart}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
