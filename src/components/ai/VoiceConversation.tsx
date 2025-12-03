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
import { getBookById, books } from '@/data/books';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  // Get current page context - using ref for fresh location
  const getCurrentPageContext = useCallback(() => {
    const path = locationRef.current.pathname;
    const searchParams = new URLSearchParams(locationRef.current.search);
    
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
        toast({ title: 'Added to Cart', description: `${book.title} added to your cart` });
        return `Added "${book.title}" to cart`;
      }
      return "Book not found";
    },
    
    removeFromCart: (params: { bookId: string }) => {
      console.log('Removing from cart:', params.bookId);
      useCartStore.getState().removeItem(params.bookId);
      toast({ title: 'Removed', description: 'Item removed from cart' });
      return "Item removed from cart";
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
    
    searchBooks: (params: { query: string }) => {
      console.log('Searching for:', params.query);
      navigateRef.current(`/browse?search=${encodeURIComponent(params.query)}`);
      toast({ title: 'Searching', description: `Looking for "${params.query}"` });
      return `Searching for "${params.query}"`;
    },
    
    filterByGenre: (params: { genre: string }) => {
      console.log('Filtering by genre:', params.genre);
      navigateRef.current(`/browse?genre=${encodeURIComponent(params.genre)}`);
      toast({ title: 'Filtering', description: `Showing ${params.genre} books` });
      return `Filtering by ${params.genre}`;
    },
    
    getCartInfo: () => {
      const cartItems = useCartStore.getState().items;
      const total = cartItems.reduce((sum, item) => sum + item.book.price * item.quantity, 0);
      const info = {
        itemCount: cartItems.length,
        total: total.toFixed(2),
        items: cartItems.map(item => ({
          bookId: item.book.id,
          title: item.book.title,
          author: item.book.author,
          quantity: item.quantity,
          price: item.book.price
        }))
      };
      console.log('Cart info:', info);
      return JSON.stringify(info);
    },
    
    getAvailableBooks: () => {
      const bookList = books.map(b => ({
        id: b.id,
        title: b.title,
        author: b.author,
        genre: b.genre,
        price: b.price
      }));
      console.log('Available books:', bookList.length);
      return JSON.stringify(bookList);
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
      const context = getCurrentPageContext();
      console.log('Current context:', context);
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

  const startConversation = useCallback(async () => {
    try {
      setIsConnecting(true);
      
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get signed URL from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-signed-url', {
        body: { agentId },
      });
      
      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Failed to get signed URL');
      }
      
      // Start the conversation with signed URL
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
  if (hasEnded && conversationHistory.length > 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="text-center py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Conversation ended</span>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
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
