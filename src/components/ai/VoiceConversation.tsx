import { useState, useCallback, useMemo, useRef } from 'react';
import { useConversation } from '@11labs/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Loader2, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { AudioWaveform } from './AudioWaveform';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { getBookById, books } from '@/data/books';
import { ScrollArea } from '@/components/ui/scroll-area';
import { smoothScrollTo, smoothScrollBy, scrollThroughPage } from '@/utils/smoothScroll';

interface VoiceConversationProps {
  agentId: string;
  onMessage?: (message: { role: string; content: string }) => void;
  onClose?: () => void;
}

export function VoiceConversation({ agentId, onMessage, onClose }: VoiceConversationProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [hasEnded, setHasEnded] = useState(false);
  
  const navigateRef = useRef<ReturnType<typeof useNavigate>>(null!);
  const locationRef = useRef<ReturnType<typeof useLocation>>(null!);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Keep refs updated
  navigateRef.current = navigate;
  locationRef.current = location;

  // Get current page context - always read fresh from window.location
  const getCurrentPageContext = useCallback(() => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    
    if (path === '/') {
      return { page: 'home', description: 'User is on the home page viewing featured books and bestsellers' };
    }
    if (path === '/browse') {
      const genre = searchParams.get('genre');
      const search = searchParams.get('search');
      return { 
        page: 'browse', 
        genre: genre || undefined,
        search: search || undefined,
        description: `User is browsing books${genre ? ` filtered by ${genre}` : ''}${search ? ` searching for "${search}"` : ''}`
      };
    }
    if (path.startsWith('/book/')) {
      const bookId = path.split('/book/')[1];
      const book = getBookById(bookId);
      if (book) {
        return { 
          page: 'book-detail', 
          bookId,
          bookTitle: book.title,
          bookAuthor: book.author,
          bookPrice: book.price,
          bookGenre: book.genre,
          description: `User is viewing "${book.title}" by ${book.author} ($${book.price})`
        };
      }
    }
    if (path === '/cart') {
      return { page: 'cart', description: 'User is viewing their shopping cart' };
    }
    if (path === '/checkout') {
      return { page: 'checkout', description: 'User is at checkout' };
    }
    return { page: 'unknown', path, description: `User is on ${path}` };
  }, []);

  // Debug wrapper to log ALL tool calls from ElevenLabs
  const wrapTool = <T extends (...args: any[]) => any>(name: string, fn: T): T => {
    return ((...args: any[]) => {
      console.log(`🔧 TOOL CALLED: ${name}`, JSON.stringify(args, null, 2));
      try {
        const result = fn(...args);
        console.log(`🔧 TOOL RESULT: ${name}`, result);
        return result;
      } catch (err) {
        console.error(`🔧 TOOL ERROR: ${name}`, err);
        throw err;
      }
    }) as T;
  };

  // Client tools that the ElevenLabs agent can call - memoized to prevent recreation
  const clientTools = useMemo(() => ({
    navigate: (params: { path: string }) => {
      console.log('Navigating to:', params.path);
      navigateRef.current(params.path);
      toast({ title: 'Navigating', description: `Going to ${params.path}` });
      return `Navigated to ${params.path}`;
    },
    
    viewBook: (params: { bookId: string }) => {
      console.log('Viewing book:', params.bookId);
      const book = getBookById(params.bookId);
      if (book) {
        navigateRef.current(`/book/${params.bookId}`);
        toast({ title: 'Viewing Book', description: book.title });
        return `Showing details for "${book.title}"`;
      }
      return "Book not found";
    },
    
    addToCart: (params: { bookId: string; quantity?: number }) => {
      console.log('Adding to cart:', params.bookId);
      const book = getBookById(params.bookId);
      if (book) {
        useCartStore.getState().addItem(book, params.quantity || 1);
        // Verify it was added
        const cartAfter = useCartStore.getState();
        console.log('Cart after add:', cartAfter.items.length, 'items');
        toast({ title: 'Added to Cart', description: `${book.title} added to your cart` });
        return `Successfully added "${book.title}" to cart. Cart now has ${cartAfter.items.length} item(s).`;
      }
      return "Book not found - please provide a valid book ID";
    },
    
    addToCartByTitle: (params: { title: string; quantity?: number }) => {
      console.log('addToCartByTitle:', params.title, 'qty:', params.quantity);
      const searchTitle = params.title.toLowerCase();
      const book = books.find(b => 
        b.title.toLowerCase().includes(searchTitle) ||
        searchTitle.includes(b.title.toLowerCase())
      );
      if (book) {
        useCartStore.getState().addItem(book, params.quantity || 1);
        toast({ title: 'Added to Cart', description: `${book.title} added to your cart` });
        return `Added "${book.title}" to cart.`;
      }
      return `Could not find book "${params.title}" in catalog`;
    },
    
    removeFromCart: (params: { bookId: string }) => {
      console.log('Removing from cart:', params.bookId);
      useCartStore.getState().removeItem(params.bookId);
      toast({ title: 'Removed', description: 'Item removed from cart' });
      return "Item removed from cart";
    },
    
    removeFromCartByTitle: (params: { title: string }) => {
      console.log('Removing from cart by title:', params.title);
      const cartState = useCartStore.getState();
      const searchTitle = params.title.toLowerCase();
      const item = cartState.items.find(i => 
        i.book.title.toLowerCase().includes(searchTitle) ||
        searchTitle.includes(i.book.title.toLowerCase())
      );
      if (item) {
        cartState.removeItem(item.book.id);
        toast({ title: 'Removed', description: `"${item.book.title}" removed from cart` });
        return `Removed "${item.book.title}" from cart`;
      }
      return `Could not find "${params.title}" in cart`;
    },
    
    clearCart: () => {
      console.log('Clearing cart');
      useCartStore.getState().clearCart();
      toast({ title: 'Cart Cleared', description: 'All items removed' });
      return "Cart has been cleared";
    },
    
    updateCartQuantity: (params: { bookId: string; quantity: number }) => {
      console.log('Updating quantity:', params.bookId, params.quantity);
      const cartState = useCartStore.getState();
      const item = cartState.items.find(i => i.book.id === params.bookId);
      if (item) {
        if (params.quantity <= 0) {
          cartState.removeItem(params.bookId);
          toast({ title: 'Removed', description: `"${item.book.title}" removed from cart` });
          return `Removed "${item.book.title}" from cart`;
        }
        cartState.updateQuantity(params.bookId, params.quantity);
        toast({ title: 'Updated', description: `"${item.book.title}" quantity set to ${params.quantity}` });
        return `Updated "${item.book.title}" quantity to ${params.quantity}`;
      }
      return "Item not found in cart";
    },
    
    updateCartQuantityByTitle: (params: { title: string; quantity: number }) => {
      console.log('updateCartQuantityByTitle:', params.title, 'qty:', params.quantity);
      toast({ title: 'Updating Cart', description: `Setting ${params.title} to ${params.quantity}` });
      
      // Ensure quantity is a valid number
      const newQuantity = Number(params.quantity);
      if (isNaN(newQuantity)) {
        console.error('Invalid quantity received:', params.quantity);
        return "Invalid quantity. Please specify a number.";
      }
      
      const cartState = useCartStore.getState();
      const searchTitle = params.title.toLowerCase();
      const item = cartState.items.find(i => 
        i.book.title.toLowerCase().includes(searchTitle) ||
        searchTitle.includes(i.book.title.toLowerCase())
      );
      if (item) {
        console.log('Found item:', item.book.title, 'current qty:', item.quantity, 'new qty:', newQuantity);
        if (newQuantity <= 0) {
          cartState.removeItem(item.book.id);
          toast({ title: 'Removed', description: `"${item.book.title}" removed from cart` });
          return `Removed "${item.book.title}" from cart`;
        }
        cartState.updateQuantity(item.book.id, newQuantity);
        toast({ title: 'Updated', description: `"${item.book.title}" quantity set to ${newQuantity}` });
        return `Updated "${item.book.title}" quantity to ${newQuantity}`;
      }
      return `Could not find "${params.title}" in cart`;
    },
    
    // Search books by title or author - searches the FULL catalog
    searchBooksByTitle: (params: { query: string }) => {
      console.log('Searching books by title/author:', params.query);
      const searchTerm = params.query.toLowerCase();
      const matches = books.filter(b => 
        b.title.toLowerCase().includes(searchTerm) || 
        b.author.toLowerCase().includes(searchTerm)
      );
      
      if (matches.length === 0) {
        return `No books found matching "${params.query}". Total catalog has ${books.length} books.`;
      }
      
      const results = matches.slice(0, 10).map(b => ({
        id: b.id,
        title: b.title,
        author: b.author,
        price: b.price,
        genre: b.genre,
        inStock: b.inStock
      }));
      
      // Navigate to browse with search
      navigateRef.current(`/browse?search=${encodeURIComponent(params.query)}`);
      toast({ title: 'Search Results', description: `Found ${matches.length} book(s) matching "${params.query}"` });
      
      return JSON.stringify({
        totalMatches: matches.length,
        showing: results.length,
        totalCatalog: books.length,
        results
      });
    },
    
    filterBooks: (params: { genre?: string; maxPrice?: number; minPrice?: number; inStock?: boolean }) => {
      console.log('Filtering books:', params);
      const searchParams = new URLSearchParams();
      
      if (params.genre) {
        searchParams.set('genre', params.genre);
      }
      if (params.maxPrice !== undefined) {
        searchParams.set('maxPrice', params.maxPrice.toString());
      }
      if (params.minPrice !== undefined) {
        searchParams.set('minPrice', params.minPrice.toString());
      }
      if (params.inStock !== undefined) {
        searchParams.set('inStock', params.inStock.toString());
      }
      
      const queryString = searchParams.toString();
      navigateRef.current(`/browse${queryString ? `?${queryString}` : ''}`);
      
      // Build description
      const filters: string[] = [];
      if (params.genre) filters.push(`genre: ${params.genre}`);
      if (params.minPrice !== undefined) filters.push(`min price: $${params.minPrice}`);
      if (params.maxPrice !== undefined) filters.push(`max price: $${params.maxPrice}`);
      if (params.inStock) filters.push('in stock only');
      
      const description = filters.length > 0 ? filters.join(', ') : 'all books';
      toast({ title: 'Filtering', description: `Showing ${description}` });
      return `Filtering books: ${description}`;
    },
    
    getCartInfo: () => {
      // Force fresh state read from Zustand store
      const cartState = useCartStore.getState();
      const cartItems = cartState.items || [];
      
      // Log for debugging
      console.log('getCartInfo called, hydrated:', cartState._hasHydrated, 'items:', cartItems.length);
      
      if (cartItems.length === 0) {
        return "Cart is empty. No items.";
      }
      
      const total = cartItems.reduce((sum, item) => sum + item.book.price * item.quantity, 0);
      const totalQuantity = cartItems.reduce((count, item) => count + item.quantity, 0);
      
      // Format as clear text to avoid agent misinterpretation
      const itemLines = cartItems.map(item => 
        `- "${item.book.title}" by ${item.book.author}: QUANTITY=${item.quantity}, price=$${item.book.price.toFixed(2)} each, subtotal=$${(item.book.price * item.quantity).toFixed(2)}`
      ).join('\n');
      
      const result = `CART CONTENTS:
${itemLines}

SUMMARY: ${cartItems.length} unique book(s), ${totalQuantity} total items, grand total=$${total.toFixed(2)}`;
      
      console.log('Cart info result:', result);
      return result;
    },
    
    getAvailableBooks: () => {
      const bookList = books.map(b => ({
        id: b.id,
        title: b.title,
        author: b.author,
        genre: b.genre,
        price: b.price,
        inStock: b.inStock
      }));
      console.log('Available books:', bookList.length);
      return JSON.stringify({ totalBooks: bookList.length, books: bookList });
    },
    
    getBookDetails: (params: { bookId: string }) => {
      console.log('Getting book details:', params.bookId);
      const book = getBookById(params.bookId);
      if (book) {
        return JSON.stringify({
          id: book.id,
          title: book.title,
          author: book.author,
          price: book.price,
          genre: book.genre,
          rating: book.rating,
          reviewCount: book.reviewCount,
          description: book.description,
          inStock: book.inStock,
          pages: book.pages,
          publishedYear: book.publishedYear
        });
      }
      return `Book with ID "${params.bookId}" not found`;
    },
    
    goToCheckout: () => {
      console.log('Going to checkout');
      navigateRef.current('/checkout');
      toast({ title: 'Checkout', description: 'Proceeding to checkout' });
      return "Navigating to checkout";
    },
    
    goToCart: () => {
      console.log('Going to cart');
      navigateRef.current('/cart');
      toast({ title: 'Cart', description: 'Viewing your cart' });
      return "Navigating to cart";
    },
    
    browseCatalog: () => {
      console.log('Browsing catalog');
      navigateRef.current('/browse');
      toast({ title: 'Browse', description: 'Viewing all books' });
      return "Navigating to book catalog";
    },
    
    goHome: () => {
      console.log('Going home');
      navigateRef.current('/');
      return "Navigating to home page";
    },
    
    getCurrentContext: () => {
      // Always get fresh context from window.location
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      
      let context: Record<string, unknown> = { page: 'unknown', path };
      
      if (path === '/') {
        context = { page: 'home', description: 'User is on the home page viewing featured books and bestsellers' };
      } else if (path === '/browse') {
        const genre = searchParams.get('genre');
        const search = searchParams.get('search');
        context = { 
          page: 'browse', 
          genre: genre || undefined,
          search: search || undefined,
          description: `User is browsing books${genre ? ` filtered by ${genre}` : ''}${search ? ` searching for "${search}"` : ''}`
        };
      } else if (path.startsWith('/book/')) {
        const bookId = path.split('/book/')[1];
        const book = getBookById(bookId);
        if (book) {
          context = { 
            page: 'book-detail', 
            bookId,
            bookTitle: book.title,
            bookAuthor: book.author,
            bookPrice: book.price,
            bookGenre: book.genre,
            description: `User is viewing "${book.title}" by ${book.author} ($${book.price})`
          };
        }
      } else if (path === '/cart') {
        context = { page: 'cart', description: 'User is viewing their shopping cart' };
      } else if (path === '/checkout') {
        context = { page: 'checkout', description: 'User is at checkout' };
      }
      
      console.log('getCurrentContext called, path:', path, 'context:', context);
      return JSON.stringify(context);
    },
    
    addCurrentBookToCart: () => {
      const context = getCurrentPageContext();
      if (context.page === 'book-detail' && context.bookId) {
        const book = getBookById(context.bookId);
        if (book) {
          useCartStore.getState().addItem(book, 1);
          toast({ title: 'Added to Cart', description: `${book.title} added to your cart` });
          return `Added "${book.title}" to cart`;
        }
      }
      return "No book currently being viewed. Please navigate to a book detail page first.";
    },
    
    // Wishlist tools
    addToWishlist: (params: { bookId: string }) => {
      console.log('Adding to wishlist:', params.bookId);
      const book = getBookById(params.bookId);
      if (book) {
        const wishlistState = useWishlistStore.getState();
        if (wishlistState.isInWishlist(book.id)) {
          return `"${book.title}" is already in your wishlist`;
        }
        wishlistState.addItem(book);
        toast({ title: 'Added to Wishlist', description: `${book.title} saved to wishlist` });
        return `Added "${book.title}" to wishlist`;
      }
      return "Book not found";
    },
    
    addToWishlistByTitle: (params: { title: string }) => {
      console.log('Adding to wishlist by title:', params.title);
      const searchTitle = params.title.toLowerCase();
      const book = books.find(b => 
        b.title.toLowerCase().includes(searchTitle) ||
        searchTitle.includes(b.title.toLowerCase())
      );
      if (book) {
        const wishlistState = useWishlistStore.getState();
        if (wishlistState.isInWishlist(book.id)) {
          return `"${book.title}" is already in your wishlist`;
        }
        wishlistState.addItem(book);
        toast({ title: 'Added to Wishlist', description: `${book.title} saved to wishlist` });
        return `Added "${book.title}" to wishlist`;
      }
      return `Could not find a book matching "${params.title}"`;
    },
    
    removeFromWishlist: (params: { bookId: string }) => {
      console.log('Removing from wishlist:', params.bookId);
      const book = getBookById(params.bookId);
      if (book) {
        useWishlistStore.getState().removeItem(params.bookId);
        toast({ title: 'Removed from Wishlist', description: `${book.title} removed` });
        return `Removed "${book.title}" from wishlist`;
      }
      return "Book not found";
    },
    
    removeFromWishlistByTitle: (params: { title: string }) => {
      console.log('Removing from wishlist by title:', params.title);
      const wishlistState = useWishlistStore.getState();
      const searchTitle = params.title.toLowerCase();
      const item = wishlistState.items.find(b => 
        b.title.toLowerCase().includes(searchTitle) ||
        searchTitle.includes(b.title.toLowerCase())
      );
      if (item) {
        wishlistState.removeItem(item.id);
        toast({ title: 'Removed from Wishlist', description: `${item.title} removed` });
        return `Removed "${item.title}" from wishlist`;
      }
      return `Could not find "${params.title}" in wishlist`;
    },
    
    getWishlistInfo: () => {
      const wishlistState = useWishlistStore.getState();
      const items = wishlistState.items;
      
      const info = {
        itemCount: items.length,
        items: items.map(book => ({
          id: book.id,
          title: book.title,
          author: book.author,
          price: book.price,
          inStock: book.inStock
        })),
        isEmpty: items.length === 0
      };
      console.log('Wishlist info:', JSON.stringify(info));
      return JSON.stringify(info);
    },
    
    addCurrentBookToWishlist: () => {
      const context = getCurrentPageContext();
      if (context.page === 'book-detail' && context.bookId) {
        const book = getBookById(context.bookId);
        if (book) {
          const wishlistState = useWishlistStore.getState();
          if (wishlistState.isInWishlist(book.id)) {
            return `"${book.title}" is already in your wishlist`;
          }
          wishlistState.addItem(book);
          toast({ title: 'Added to Wishlist', description: `${book.title} saved to wishlist` });
          return `Added "${book.title}" to wishlist`;
        }
      }
      return "No book currently being viewed. Please navigate to a book detail page first.";
    },
    
    clearWishlist: () => {
      console.log('Clearing wishlist');
      useWishlistStore.getState().clearWishlist();
      toast({ title: 'Wishlist Cleared', description: 'All items removed' });
      return "Wishlist has been cleared";
    },
    
    goToWishlist: () => {
      console.log('Going to wishlist');
      navigateRef.current('/wishlist');
      toast({ title: 'Wishlist', description: 'Viewing your wishlist' });
      return "Navigating to wishlist";
    },
    
    addAllWishlistToCart: () => {
      console.log('Adding all wishlist items to cart');
      const wishlistState = useWishlistStore.getState();
      const cartState = useCartStore.getState();
      const items = wishlistState.items;
      
      if (items.length === 0) {
        return "Your wishlist is empty. Nothing to add to cart.";
      }
      
      items.forEach(book => cartState.addItem(book, 1));
      wishlistState.clearWishlist();
      
      toast({ 
        title: 'Added to Cart', 
        description: `${items.length} item(s) moved from wishlist to cart` 
      });
      
      return `Added ${items.length} item(s) from wishlist to cart. Your wishlist is now empty.`;
    },
    
    scrollPage: (params: { direction: 'up' | 'down'; amount?: 'small' | 'medium' | 'large' | 'top' | 'bottom' | 'browse' }) => {
      const amount = params.amount || 'medium';
      console.log('Scrolling:', params.direction, amount);
      
      // Special "browse" mode - slowly scroll through the entire page like a human reading
      if (amount === 'browse') {
        const duration = 5000; // 5 seconds to scroll through page
        scrollThroughPage(duration);
        return "Slowly browsing through the page content";
      }
      
      if (amount === 'top') {
        smoothScrollTo(0, 1500); // 1.5 seconds
        return "Scrolled to top of page";
      }
      if (amount === 'bottom') {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        smoothScrollTo(maxScroll, 2000); // 2 seconds
        return "Scrolled to bottom of page";
      }
      
      // Duration varies by scroll amount for natural feel
      const scrollConfig = { 
        small: { pixels: 200, duration: 600 }, 
        medium: { pixels: 400, duration: 1000 }, 
        large: { pixels: 800, duration: 1500 } 
      };
      const config = scrollConfig[amount as keyof typeof scrollConfig] || scrollConfig.medium;
      const direction = params.direction === 'up' ? -1 : 1;
      
      smoothScrollBy(config.pixels * direction, config.duration);
      return `Scrolled ${params.direction} by ${amount} amount`;
    }
  }), [getCurrentPageContext]);

  const conversation = useConversation({
    clientTools,
    onConnect: () => {
      console.log('Connected to ElevenLabs');
      setIsConnecting(false);
      toast({
        title: 'Connected',
        description: 'Voice conversation started. Speak naturally!',
      });
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
      setHasEnded(true);
      toast({
        title: 'Disconnected',
        description: 'Voice conversation ended.',
      });
    },
    onMessage: (message) => {
      console.log('Message received:', message);
      if (message.message) {
        const newMsg = {
          role: message.source === 'user' ? 'user' : 'assistant',
          content: message.message,
        };
        setConversationHistory(prev => [...prev, newMsg]);
        onMessage?.(newMsg);
      }
    },
    onError: (error) => {
      console.error('Conversation error:', error);
      setIsConnecting(false);
      toast({
        title: 'Error',
        description: 'Voice conversation error. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const mediaStreamRef = useRef<MediaStream | null>(null);

  const startConversation = useCallback(async () => {
    try {
      setIsConnecting(true);
      
      // Request microphone permission first and store the stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      // Get signed URL from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-signed-url', {
        body: { agentId },
      });
      
      if (error || !data?.signedUrl) {
        // Clean up stream on error
        stream.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        throw new Error(error?.message || 'Failed to get signed URL');
      }
      
      // Start the conversation with signed URL
      console.log('Starting conversation with clientTools:', Object.keys(clientTools));
      await conversation.startSession({
        signedUrl: data.signedUrl,
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setIsConnecting(false);
      toast({
        title: 'Failed to start',
        description: error instanceof Error ? error.message : 'Could not start voice conversation',
        variant: 'destructive',
      });
    }
  }, [agentId, conversation]);

  const endConversation = useCallback(async () => {
    // Stop all microphone tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      mediaStreamRef.current = null;
    }
    await conversation.endSession();
  }, [conversation]);

  const restartConversation = useCallback(() => {
    setHasEnded(false);
    setConversationHistory([]);
    startConversation();
  }, [startConversation]);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    // Note: ElevenLabs SDK handles muting internally
  }, [isMuted]);

  const toggleVolume = useCallback(() => {
    const newVolume = volume === 0 ? 1 : 0;
    setVolume(newVolume);
    conversation.setVolume({ volume: newVolume });
  }, [volume, conversation]);

  const isConnected = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  // Show conversation history after ended
  if (hasEnded) {
    return (
      <div className="flex flex-col h-[400px]">
        <div className="text-center py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Conversation ended</span>
        </div>
        {conversationHistory.length > 0 ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-3">
              {conversationHistory.map((msg, i) => (
                <div
                  key={i}
                  className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No messages recorded</p>
          </div>
        )}
        <div className="p-4 border-t border-border/50">
          <Button onClick={restartConversation} className="w-full gap-2">
            <RotateCcw className="w-4 h-4" />
            Start New Conversation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      {/* Status indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            isConnecting 
              ? 'bg-amber-500 animate-pulse' 
              : isConnected 
                ? 'bg-green-500 animate-pulse' 
                : 'bg-muted'
          )}
        />
        <span>
          {isConnecting
            ? 'Connecting...'
            : isConnected
              ? isSpeaking
                ? 'Assistant speaking...'
                : 'Listening...'
              : 'Ready to connect'}
        </span>
      </div>

      {/* Voice visualization with waveform */}
      <div
        className={cn(
          'w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300',
          isConnecting
            ? 'bg-amber-500/10 ring-2 ring-amber-500/30'
            : isConnected
              ? isSpeaking
                ? 'bg-primary/20 ring-4 ring-primary/40'
                : 'bg-secondary ring-2 ring-primary/20'
              : 'bg-muted'
        )}
      >
        {isConnecting ? (
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        ) : isConnected ? (
          <AudioWaveform 
            isActive={true} 
            isSpeaking={isSpeaking} 
            barCount={7}
            className="h-12"
          />
        ) : (
          <Mic className="w-10 h-10 text-muted-foreground" />
        )}
      </div>

      {/* Instructions */}
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        {isConnected
          ? 'Ask me to show books, add to cart, or navigate the store.'
          : 'Click the button below to start a voice conversation.'}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {isConnected && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
              className={cn(isMuted && 'bg-destructive/10 border-destructive')}
            >
              {isMuted ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleVolume}
              className={cn(volume === 0 && 'bg-destructive/10 border-destructive')}
            >
              {volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
          </>
        )}

        <Button
          onClick={isConnected ? endConversation : startConversation}
          variant={isConnected ? 'destructive' : 'default'}
          className="gap-2"
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : isConnected ? (
            <>
              <PhoneOff className="w-4 h-4" />
              End Conversation
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Start Conversation
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
