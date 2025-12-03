import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useAIStore } from '@/stores/aiStore';
import { getBookById } from '@/data/books';
import { ChatMessage, AIActionType } from '@/types/ai';
import { toast } from '@/hooks/use-toast';

interface AIResponse {
  message: string;
  actions: Array<{
    type: AIActionType;
    data: Record<string, unknown>;
  }>;
}

export function useAIChat() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const { items: cartItems, addItem, removeItem, clearCart, getTotal } = useCartStore();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, clearWishlist, items: wishlistItems } = useWishlistStore();
  const { addMessage, addAction, updateAction, setProcessing } = useAIStore();

  const executeAction = useCallback(async (
    action: { type: AIActionType; data: Record<string, unknown> }
  ) => {
    const actionId = addAction({
      type: action.type,
      description: getActionDescription(action),
      status: 'pending',
      data: action.data,
    });

    try {
      switch (action.type) {
        case 'add_to_cart': {
          const bookId = action.data.bookId as string;
          const book = getBookById(bookId);
          if (book) {
            const quantity = (action.data.quantity as number) || 1;
            addItem(book, quantity);
            toast({
              title: 'Added to cart',
              description: `${book.title} has been added to your cart.`,
            });
          }
          break;
        }

        case 'remove_from_cart': {
          const bookId = action.data.bookId as string;
          removeItem(bookId);
          toast({
            title: 'Removed from cart',
            description: `Item removed from your cart.`,
          });
          break;
        }

        case 'clear_cart': {
          clearCart();
          toast({
            title: 'Cart cleared',
            description: 'All items have been removed from your cart.',
          });
          break;
        }

        case 'navigate': {
          const path = action.data.path as string;
          navigate(path);
          break;
        }

        case 'view_details': {
          const bookId = action.data.bookId as string;
          navigate(`/book/${bookId}`);
          break;
        }

        case 'filter': {
          const genre = action.data.genre as string;
          const priceRange = action.data.priceRange as [number, number] | undefined;
          const params = new URLSearchParams(window.location.search);
          if (genre) params.set('genre', genre);
          if (priceRange && priceRange[1]) params.set('maxPrice', priceRange[1].toString());
          if (priceRange && priceRange[0]) params.set('minPrice', priceRange[0].toString());
          const path = params.toString() ? `/browse?${params.toString()}` : '/browse';
          navigate(path);
          toast({
            title: 'Filters applied',
            description: `Showing books${genre ? ` in ${genre}` : ''}${priceRange ? ` under $${priceRange[1]}` : ''}`,
          });
          break;
        }

        case 'search': {
          const query = action.data.query as string;
          const results = action.data.results as string[];
          if (results && results.length > 0) {
            // Navigate to browse with search query
            navigate(`/browse?search=${encodeURIComponent(query)}`);
            toast({
              title: 'Search results',
              description: `Found ${results.length} book(s) matching "${query}"`,
            });
          }
          break;
        }

        case 'recommend': {
          const books = action.data.books as Array<{ id: string; title: string; reason: string }>;
          if (books && books.length > 0) {
            toast({
              title: 'Recommendations ready',
              description: `Found ${books.length} book(s) you might enjoy!`,
            });
          }
          break;
        }

        case 'add_to_wishlist': {
          const bookId = action.data.bookId as string;
          const book = getBookById(bookId);
          if (book) {
            addToWishlist(book);
            toast({
              title: 'Added to wishlist',
              description: `${book.title} has been added to your wishlist.`,
            });
          }
          break;
        }

        case 'remove_from_wishlist': {
          const bookId = action.data.bookId as string;
          removeFromWishlist(bookId);
          toast({
            title: 'Removed from wishlist',
            description: `Item removed from your wishlist.`,
          });
          break;
        }

        case 'clear_wishlist': {
          clearWishlist();
          toast({
            title: 'Wishlist cleared',
            description: 'All items have been removed from your wishlist.',
          });
          break;
        }

        case 'add_wishlist_to_cart': {
          const wishlistBooks = wishlistItems;
          if (wishlistBooks.length === 0) {
            toast({
              title: 'Wishlist empty',
              description: 'Your wishlist is empty.',
            });
          } else {
            wishlistBooks.forEach(book => addItem(book, 1));
            clearWishlist();
            toast({
              title: 'Added to cart',
              description: `${wishlistBooks.length} item(s) moved from wishlist to cart.`,
            });
          }
          break;
        }

        default:
          break;
      }

      updateAction(actionId, { 
        status: 'completed',
        result: `Successfully executed ${action.type}`,
      });
    } catch (error) {
      console.error('Error executing action:', error);
      updateAction(actionId, { 
        status: 'failed',
        result: `Failed to execute ${action.type}`,
      });
    }
  }, [addItem, removeItem, clearCart, addToWishlist, removeFromWishlist, clearWishlist, navigate, addAction, updateAction]);

  const sendMessage = useCallback(async (
    content: string,
    conversationHistory: ChatMessage[],
    isVoice: boolean = false
  ): Promise<string> => {
    setIsLoading(true);
    setProcessing(true);

    // Add thinking action
    const thinkingId = addAction({
      type: 'thinking',
      description: 'Processing your request...',
      status: 'pending',
    });

    try {
      // Prepare cart context
      const cartContext = {
        items: cartItems.map(item => ({
          bookId: item.book.id,
          title: item.book.title,
          author: item.book.author,
          price: item.book.price,
          quantity: item.quantity,
        })),
        total: getTotal(),
        itemCount: cartItems.length,
      };

      // Prepare messages for API
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user', content },
      ];

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { messages, cartContext },
      });

      if (error) {
        throw new Error(error.message || 'Failed to get AI response');
      }

      const response = data as AIResponse;
      
      updateAction(thinkingId, { status: 'completed', result: 'Processed successfully' });

      // Execute any actions from the response
      if (response.actions && response.actions.length > 0) {
        for (const action of response.actions) {
          await executeAction(action);
        }
      }

      return response.message;
    } catch (error) {
      console.error('AI chat error:', error);
      updateAction(thinkingId, { status: 'failed', result: 'Processing failed' });
      throw error;
    } finally {
      setIsLoading(false);
      setProcessing(false);
    }
  }, [cartItems, getTotal, addAction, updateAction, executeAction, setProcessing]);

  return {
    sendMessage,
    isLoading,
  };
}

function getActionDescription(action: { type: AIActionType; data: Record<string, unknown> }): string {
  switch (action.type) {
    case 'add_to_cart':
      return `Adding "${action.data.bookTitle}" to cart`;
    case 'remove_from_cart':
      return `Removing "${action.data.bookTitle}" from cart`;
    case 'navigate':
      return `Navigating to ${action.data.path}`;
    case 'view_details':
      return `Viewing details for "${action.data.bookTitle}"`;
    case 'search':
      return `Searching for "${action.data.query}"`;
    case 'filter':
      return `Filtering by ${action.data.genre || 'criteria'}`;
    case 'recommend':
      return 'Getting personalized recommendations';
    case 'clear_cart':
      return 'Clearing shopping cart';
    case 'checkout':
      return 'Proceeding to checkout';
    case 'thinking':
      return 'Processing your request...';
    case 'add_to_wishlist':
      return `Adding "${action.data.bookTitle}" to wishlist`;
    case 'remove_from_wishlist':
      return `Removing "${action.data.bookTitle}" from wishlist`;
    case 'clear_wishlist':
      return 'Clearing wishlist';
    case 'add_wishlist_to_cart':
      return 'Adding all wishlist items to cart';
    default:
      return `Executing ${action.type}`;
  }
}
