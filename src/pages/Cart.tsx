import { Link } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/stores/cartStore';
import { toast } from 'sonner';

export default function Cart() {
  const { items, removeItem, updateQuantity, clearCart, getTotal } = useCartStore();
  const total = getTotal();
  const shipping = total > 35 ? 0 : 4.99;
  const tax = total * 0.08;
  const grandTotal = total + shipping + tax;

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              Your Cart is Empty
            </h1>
            <p className="text-muted-foreground mb-6">
              Looks like you haven't added any books yet. Browse our collection to find your next great read!
            </p>
            <Link to="/browse">
              <Button size="lg" className="gap-2">
                Browse Books
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-1">
              Shopping Cart
            </h1>
            <p className="text-muted-foreground">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              clearCart();
              toast.success('Cart cleared');
            }}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear Cart
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(({ book, quantity }) => (
              <Card key={book.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Link to={`/book/${book.id}`} className="shrink-0">
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="w-20 h-28 object-cover rounded-md"
                      />
                    </Link>
                    
                    <div className="flex-1 min-w-0">
                      <Link to={`/book/${book.id}`}>
                        <h3 className="font-display font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                          {book.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground mb-2">
                        {book.author}
                      </p>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center border border-border rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(book.id, quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
                            {quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(book.id, quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            removeItem(book.id);
                            toast.success(`"${book.title}" removed from cart`);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        ${(book.price * quantity).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${book.price.toFixed(2)} each
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-bold text-foreground mb-4">
                  Order Summary
                </h2>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-foreground">
                      {shipping === 0 ? (
                        <span className="text-success">Free</span>
                      ) : (
                        `$${shipping.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-foreground">${tax.toFixed(2)}</span>
                  </div>
                </div>

                {total < 35 && (
                  <p className="text-xs text-muted-foreground mt-3 p-2 bg-muted rounded-md">
                    Add ${(35 - total).toFixed(2)} more for free shipping!
                  </p>
                )}

                <Separator className="my-4" />

                <div className="flex justify-between text-lg font-bold mb-6">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">${grandTotal.toFixed(2)}</span>
                </div>

                <Link to="/checkout">
                  <Button className="w-full gap-2" size="lg">
                    <ShoppingCart className="h-5 w-5" />
                    Proceed to Checkout
                  </Button>
                </Link>

                <Link to="/browse">
                  <Button variant="outline" className="w-full mt-3">
                    Continue Shopping
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
