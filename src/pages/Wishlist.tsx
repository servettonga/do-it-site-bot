import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useCartStore } from '@/stores/cartStore';
import { useToast } from '@/hooks/use-toast';

export default function Wishlist() {
  const { items, removeItem, clearWishlist } = useWishlistStore();
  const addToCart = useCartStore((state) => state.addItem);
  const { toast } = useToast();

  const handleAddToCart = (book: typeof items[0]) => {
    addToCart(book);
    toast({
      title: "Added to cart",
      description: `${book.title} has been added to your cart.`,
    });
  };

  const handleRemove = (book: typeof items[0]) => {
    removeItem(book.id);
    toast({
      title: "Removed from wishlist",
      description: `${book.title} has been removed.`,
    });
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-display font-bold mb-2">Your wishlist is empty</h1>
          <p className="text-muted-foreground mb-6">
            Save books you love to find them later.
          </p>
          <Link to="/browse">
            <Button>Browse Books</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold">My Wishlist</h1>
            <p className="text-muted-foreground">{items.length} saved items</p>
          </div>
          <Button variant="outline" size="sm" onClick={clearWishlist}>
            Clear All
          </Button>
        </div>

        <div className="grid gap-4">
          {items.map((book) => (
            <div
              key={book.id}
              className="flex gap-4 p-4 bg-card border border-border rounded-lg"
            >
              <Link to={`/book/${book.id}`}>
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="w-20 h-28 object-cover rounded"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/book/${book.id}`} className="hover:text-primary transition-colors">
                  <h3 className="font-medium truncate">{book.title}</h3>
                </Link>
                <p className="text-sm text-muted-foreground">{book.author}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-semibold text-primary">${book.price.toFixed(2)}</span>
                  {book.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      ${book.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-1 ${book.inStock ? 'text-green-600' : 'text-red-500'}`}>
                  {book.inStock ? 'In Stock' : 'Out of Stock'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAddToCart(book)}
                  disabled={!book.inStock}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Add to Cart
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(book)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
