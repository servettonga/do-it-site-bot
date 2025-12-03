import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, ShoppingCart, Heart, Share2, Check } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookGrid } from '@/components/books/BookGrid';
import { getBookById, getBooksByGenre } from '@/data/books';
import { genreLabels } from '@/types/book';
import { useCartStore } from '@/stores/cartStore';
import { toast } from 'sonner';
import { useState } from 'react';

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const book = getBookById(id || '');
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);

  if (!book) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">
            Book Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The book you're looking for doesn't exist.
          </p>
          <Link to="/browse">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Browse
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const relatedBooks = getBooksByGenre(book.genre)
    .filter((b) => b.id !== book.id)
    .slice(0, 5);

  const handleAddToCart = () => {
    addItem(book, quantity);
    toast.success(`Added ${quantity} × "${book.title}" to cart`);
  };

  const discount = book.originalPrice
    ? Math.round((1 - book.price / book.originalPrice) * 100)
    : 0;

  return (
    <Layout>
      <div className="container py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link to="/browse" className="hover:text-primary">Browse</Link>
          <span>/</span>
          <Link to={`/browse?genre=${book.genre}`} className="hover:text-primary">
            {genreLabels[book.genre]}
          </Link>
          <span>/</span>
          <span className="text-foreground">{book.title}</span>
        </nav>

        <div className="grid md:grid-cols-[320px_1fr] gap-8 lg:gap-12 mb-16">
          {/* Book Cover */}
          <div className="relative max-w-[320px] mx-auto md:mx-0">
            <div className="aspect-[2/3] overflow-hidden rounded-lg bg-muted shadow-xl">
              <img
                src={book.coverImage}
                alt={book.title}
                className="h-full w-full object-cover"
              />
            </div>
            {book.bestseller && (
              <Badge className="absolute top-4 left-4 bg-accent text-accent-foreground">
                Bestseller
              </Badge>
            )}
            {discount > 0 && (
              <Badge variant="destructive" className="absolute top-4 right-4">
                {discount}% OFF
              </Badge>
            )}
          </div>

          {/* Book Info */}
          <div>
            <Badge variant="secondary" className="mb-3">
              {genreLabels[book.genre]}
            </Badge>
            
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              {book.title}
            </h1>
            
            <p className="text-lg text-muted-foreground mb-4">
              by <span className="text-foreground font-medium">{book.author}</span>
            </p>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(book.rating)
                        ? 'fill-accent text-accent'
                        : 'text-muted'
                    }`}
                  />
                ))}
              </div>
              <span className="font-medium text-foreground">{book.rating}</span>
              <span className="text-muted-foreground">
                ({book.reviewCount.toLocaleString()} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold text-primary">
                ${book.price.toFixed(2)}
              </span>
              {book.originalPrice && (
                <span className="text-xl text-muted-foreground line-through">
                  ${book.originalPrice.toFixed(2)}
                </span>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2 mb-6">
              {book.inStock ? (
                <>
                  <Check className="h-5 w-5 text-success" />
                  <span className="text-success font-medium">In Stock</span>
                </>
              ) : (
                <span className="text-destructive font-medium">Out of Stock</span>
              )}
            </div>

            {/* Add to Cart */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-border rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </Button>
              </div>
              
              <Button
                size="lg"
                onClick={handleAddToCart}
                disabled={!book.inStock}
                className="flex-1 gap-2"
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-8">
              <Button variant="outline" size="sm" className="gap-2">
                <Heart className="h-4 w-4" />
                Save for Later
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>

            <Separator className="mb-6" />

            {/* Description */}
            <div className="mb-6">
              <h3 className="font-display font-semibold text-lg mb-2">Description</h3>
              <p className="text-muted-foreground leading-relaxed">
                {book.description}
              </p>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Published:</span>
                <span className="ml-2 text-foreground">{book.publishedYear}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pages:</span>
                <span className="ml-2 text-foreground">{book.pages}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">ISBN:</span>
                <span className="ml-2 text-foreground">{book.isbn}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Books */}
        {relatedBooks.length > 0 && (
          <section>
            <BookGrid
              books={relatedBooks}
              title="You May Also Like"
              subtitle={`More in ${genreLabels[book.genre]}`}
            />
          </section>
        )}
      </div>
    </Layout>
  );
}
