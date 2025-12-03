import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { BookGrid } from '@/components/books/BookGrid';
import { FeaturedBookCard } from '@/components/books/FeaturedBookCard';
import { getFeaturedBooks, getBestsellers } from '@/data/books';
import { genreLabels, Genre } from '@/types/book';
import { useAIStore } from '@/stores/aiStore';

const genres: Genre[] = ['fiction', 'mystery', 'sci-fi', 'romance', 'fantasy', 'non-fiction'];

export default function Index() {
  const featuredBooks = getFeaturedBooks();
  const bestsellers = getBestsellers();
  const toggleChat = useAIStore((state) => state.toggleChat);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-background to-muted py-10 md:py-14">
        <div className="container relative">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full mb-4 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI-Powered Shopping Assistant</span>
            </div>
            
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              Discover Your Next <span className="text-primary">Favorite Book</span>
            </h1>
            
            <p className="text-base md:text-lg text-muted-foreground mb-6 max-w-xl mx-auto">
              Let our AI assistant help you find the perfect read. Browse thousands of titles and get personalized recommendations.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/browse">
                <Button size="default" className="gap-2">
                  Browse Collection
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <button
                onClick={toggleChat}
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors group"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <MessageCircle className="h-4 w-4" />
                <span className="underline underline-offset-2">Ask our AI Assistant</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Genre Pills */}
      <section className="py-4 border-b border-border">
        <div className="container">
          <div className="flex flex-wrap justify-center gap-1.5">
            {genres.map((genre) => (
              <Link key={genre} to={`/browse?genre=${genre}`}>
                <Button variant="secondary" size="sm" className="rounded-full h-8 text-xs">
                  {genreLabels[genre]}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Books */}
      <section className="py-8 md:py-10">
        <div className="container">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">Featured Books</h2>
              <p className="text-muted-foreground text-sm">Hand-picked selections for you</p>
            </div>
            <Link to="/browse">
              <Button variant="ghost" size="sm" className="gap-1.5">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {featuredBooks.slice(0, 6).map((book) => (
              <FeaturedBookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      </section>

      {/* Bestsellers */}
      <section className="py-8 md:py-10 bg-muted/50">
        <div className="container">
          <BookGrid books={bestsellers.slice(0, 10)} title="Bestsellers" subtitle="Our most popular titles this month" />
        </div>
      </section>
    </Layout>
  );
}
