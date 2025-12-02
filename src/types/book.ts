export interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  originalPrice?: number;
  description: string;
  coverImage: string;
  genre: Genre;
  rating: number;
  reviewCount: number;
  publishedYear: number;
  pages: number;
  isbn: string;
  inStock: boolean;
  featured?: boolean;
  bestseller?: boolean;
}

export type Genre = 
  | 'fiction'
  | 'mystery'
  | 'sci-fi'
  | 'romance'
  | 'fantasy'
  | 'non-fiction'
  | 'thriller'
  | 'biography';

export const genreLabels: Record<Genre, string> = {
  'fiction': 'Fiction',
  'mystery': 'Mystery',
  'sci-fi': 'Science Fiction',
  'romance': 'Romance',
  'fantasy': 'Fantasy',
  'non-fiction': 'Non-Fiction',
  'thriller': 'Thriller',
  'biography': 'Biography',
};

export interface CartItem {
  book: Book;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}
