import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/stores/cartStore';
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
          const path = genre ? `/browse?genre=${genre}` : '/browse';
          navigate(path);
          break;
        }

        default:
          // For search, recommend, etc. - no direct action needed
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
  }, [addItem, removeItem, clearCart, navigate, addAction, updateAction]);

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
    default:
      return `Executing ${action.type}`;
  }
}
