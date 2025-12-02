import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="font-display text-lg font-bold text-foreground">
                PageTurner
              </span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-md">
              Your personal AI-powered bookstore. Discover your next favorite read with 
              the help of our intelligent shopping assistant.
            </p>
          </div>
          
          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/browse" className="text-muted-foreground hover:text-primary transition-colors">
                  Browse Books
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-muted-foreground hover:text-primary transition-colors">
                  Shopping Cart
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground">Genres</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/browse?genre=fiction" className="text-muted-foreground hover:text-primary transition-colors">
                  Fiction
                </Link>
              </li>
              <li>
                <Link to="/browse?genre=mystery" className="text-muted-foreground hover:text-primary transition-colors">
                  Mystery
                </Link>
              </li>
              <li>
                <Link to="/browse?genre=sci-fi" className="text-muted-foreground hover:text-primary transition-colors">
                  Science Fiction
                </Link>
              </li>
              <li>
                <Link to="/browse?genre=fantasy" className="text-muted-foreground hover:text-primary transition-colors">
                  Fantasy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} PageTurner Bookstore. AI Shopping Assistant Demo.</p>
        </div>
      </div>
    </footer>
  );
}
