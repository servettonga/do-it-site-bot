import { useState, useCallback } from 'react';
import { useConversation } from '@11labs/react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { AudioWaveform } from './AudioWaveform';
import { useCartStore } from '@/stores/cartStore';
import { getBookById, books } from '@/data/books';

interface VoiceConversationProps {
  agentId: string;
  onMessage?: (message: { role: string; content: string }) => void;
  onClose?: () => void;
}

export function VoiceConversation({ agentId, onMessage, onClose }: VoiceConversationProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const navigate = useNavigate();
  const { addItem, removeItem, clearCart, items: cartItems } = useCartStore();

  // Client tools that the ElevenLabs agent can call
  const clientTools = {
    navigate: (params: { path: string }) => {
      console.log('Navigating to:', params.path);
      navigate(params.path);
      toast({ title: 'Navigating', description: `Going to ${params.path}` });
      return `Navigated to ${params.path}`;
    },
    
    viewBook: (params: { bookId: string }) => {
      console.log('Viewing book:', params.bookId);
      const book = getBookById(params.bookId);
      if (book) {
        navigate(`/book/${params.bookId}`);
        toast({ title: 'Viewing Book', description: book.title });
        return `Showing details for "${book.title}"`;
      }
      return "Book not found";
    },
    
    addToCart: (params: { bookId: string; quantity?: number }) => {
      console.log('Adding to cart:', params.bookId);
      const book = getBookById(params.bookId);
      if (book) {
        addItem(book, params.quantity || 1);
        toast({ title: 'Added to Cart', description: `${book.title} added to your cart` });
        return `Added "${book.title}" to cart`;
      }
      return "Book not found";
    },
    
    removeFromCart: (params: { bookId: string }) => {
      console.log('Removing from cart:', params.bookId);
      removeItem(params.bookId);
      toast({ title: 'Removed', description: 'Item removed from cart' });
      return "Item removed from cart";
    },
    
    clearCart: () => {
      console.log('Clearing cart');
      clearCart();
      toast({ title: 'Cart Cleared', description: 'All items removed' });
      return "Cart has been cleared";
    },
    
    searchBooks: (params: { query: string }) => {
      console.log('Searching for:', params.query);
      navigate(`/browse?search=${encodeURIComponent(params.query)}`);
      toast({ title: 'Searching', description: `Looking for "${params.query}"` });
      return `Searching for "${params.query}"`;
    },
    
    filterByGenre: (params: { genre: string }) => {
      console.log('Filtering by genre:', params.genre);
      navigate(`/browse?genre=${encodeURIComponent(params.genre)}`);
      toast({ title: 'Filtering', description: `Showing ${params.genre} books` });
      return `Filtering by ${params.genre}`;
    },
    
    getCartInfo: () => {
      const total = cartItems.reduce((sum, item) => sum + item.book.price * item.quantity, 0);
      const info = {
        itemCount: cartItems.length,
        total: total.toFixed(2),
        items: cartItems.map(item => ({
          title: item.book.title,
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
      navigate('/checkout');
      toast({ title: 'Checkout', description: 'Proceeding to checkout' });
      return "Navigating to checkout";
    },
    
    goToCart: () => {
      console.log('Going to cart');
      navigate('/cart');
      toast({ title: 'Cart', description: 'Viewing your cart' });
      return "Navigating to cart";
    },
    
    browseCatalog: () => {
      console.log('Browsing catalog');
      navigate('/browse');
      toast({ title: 'Browse', description: 'Viewing all books' });
      return "Navigating to book catalog";
    },
    
    goHome: () => {
      console.log('Going home');
      navigate('/');
      return "Navigating to home page";
    }
  };

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
      toast({
        title: 'Disconnected',
        description: 'Voice conversation ended.',
      });
    },
    onMessage: (message) => {
      console.log('Message received:', message);
      if (onMessage && message.message) {
        onMessage({
          role: message.source === 'user' ? 'user' : 'assistant',
          content: message.message,
        });
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
    onClose?.();
  }, [conversation, onClose]);

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
              : 'Not connected'}
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
          <MicOff className="w-10 h-10 text-muted-foreground" />
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
