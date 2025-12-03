import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Book } from '@/types/book';

interface WishlistStore {
  items: Book[];
  addItem: (book: Book) => void;
  removeItem: (bookId: string) => void;
  isInWishlist: (bookId: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (book: Book) => {
        const items = get().items;
        if (!items.find(item => item.id === book.id)) {
          set({ items: [...items, book] });
        }
      },
      
      removeItem: (bookId: string) => {
        set({ items: get().items.filter(item => item.id !== bookId) });
      },
      
      isInWishlist: (bookId: string) => {
        return get().items.some(item => item.id === bookId);
      },
      
      clearWishlist: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'wishlist-storage',
    }
  )
);
