import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { BookGrid } from '@/components/books/BookGrid';
import { getFeaturedBooks, getBestsellers } from '@/data/books';
import { genreLabels, Genre } from '@/types/book';

const genres: Genre[] = ['fiction', 'mystery', 'sci-fi', 'romance', 'fantasy', 'non-fiction'];

export default function Index() {
  const featuredBooks = getFeaturedBooks();
  const bestsellers = getBestsellers();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-background to-muted py-16 md:py-24">
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">AI-Powered Shopping Assistant</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance">
              Discover Your Next <span className="text-primary">Favorite Book</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Let our AI assistant help you find the perfect read. Browse thousands of titles, 
              get personalized recommendations, and shop with ease.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/browse">
                <Button size="lg" className="gap-2">
                  Browse Collection
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Genre Pills */}
      <section className="py-8 border-b border-border">
        <div className="container">
          <div className="flex flex-wrap justify-center gap-2">
            {genres.map((genre) => (
              <Link key={genre} to={`/browse?genre=${genre}`}>
                <Button variant="secondary" size="sm" className="rounded-full">
                  {genreLabels[genre]}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Books */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Featured Books</h2>
              <p className="text-muted-foreground mt-1">Hand-picked selections for you</p>
            </div>
            <Link to="/browse">
              <Button variant="ghost" className="gap-2">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {featuredBooks.slice(0, 6).map((book) => (
              <Link key={book.id} to={`/book/${book.id}`}>
                <div className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-muted">
                  <img src={book.coverImage} alt={book.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-primary-foreground translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="font-display font-semibold text-sm line-clamp-2">{book.title}</p>
                    <p className="text-xs opacity-80">{book.author}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bestsellers */}
      <section className="py-12 md:py-16 bg-muted/50">
        <div className="container">
          <BookGrid books={bestsellers.slice(0, 10)} title="Bestsellers" subtitle="Our most popular titles this month" />
        </div>
      </section>
    </Layout>
  );
}
