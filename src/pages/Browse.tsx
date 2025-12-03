import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { BookGrid } from '@/components/books/BookGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { books, searchBooks } from '@/data/books';
import { Genre, genreLabels } from '@/types/book';

const allGenres = Object.keys(genreLabels) as Genre[];

type SortOption = 'relevance' | 'price-low' | 'price-high' | 'rating' | 'newest';

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialGenre = searchParams.get('genre') as Genre | null;
  const initialSearch = searchParams.get('search') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>(
    initialGenre ? [initialGenre] : []
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 30]);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [showInStockOnly, setShowInStockOnly] = useState(false);

  // Sync search query with URL params
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams]);

  const filteredBooks = useMemo(() => {
    let result = searchQuery ? searchBooks(searchQuery) : [...books];

    // Filter by genre
    if (selectedGenres.length > 0) {
      result = result.filter((book) => selectedGenres.includes(book.genre));
    }

    // Filter by price
    result = result.filter(
      (book) => book.price >= priceRange[0] && book.price <= priceRange[1]
    );

    // Filter by stock
    if (showInStockOnly) {
      result = result.filter((book) => book.inStock);
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        result.sort((a, b) => b.publishedYear - a.publishedYear);
        break;
    }

    return result;
  }, [searchQuery, selectedGenres, priceRange, sortBy, showInStockOnly]);

  const toggleGenre = (genre: Genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    );
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setPriceRange([0, 30]);
    setShowInStockOnly(false);
    setSortBy('relevance');
    setSearchQuery('');
    setSearchParams({});
  };

  const activeFilterCount =
    selectedGenres.length +
    (priceRange[0] > 0 || priceRange[1] < 30 ? 1 : 0) +
    (showInStockOnly ? 1 : 0);

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Genres */}
      <div>
        <h4 className="font-medium mb-3">Genres</h4>
        <div className="space-y-2">
          {allGenres.map((genre) => (
            <div key={genre} className="flex items-center gap-2">
              <Checkbox
                id={genre}
                checked={selectedGenres.includes(genre)}
                onCheckedChange={() => toggleGenre(genre)}
              />
              <Label htmlFor={genre} className="text-sm cursor-pointer">
                {genreLabels[genre]}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="font-medium mb-3">
          Price Range: ${priceRange[0]} - ${priceRange[1]}
        </h4>
        <Slider
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as [number, number])}
          min={0}
          max={30}
          step={1}
          className="w-full"
        />
      </div>

      {/* In Stock */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="inStock"
          checked={showInStockOnly}
          onCheckedChange={(checked) => setShowInStockOnly(checked as boolean)}
        />
        <Label htmlFor="inStock" className="text-sm cursor-pointer">
          In Stock Only
        </Label>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Browse Books
          </h1>
          <p className="text-muted-foreground">
            Explore our collection of {books.length} titles
          </p>
        </div>

        {/* Search and Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, author, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>

            {/* Mobile Filter Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge className="ml-1">{activeFilterCount}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Active Filters */}
        {selectedGenres.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedGenres.map((genre) => (
              <Badge
                key={genre}
                variant="secondary"
                className="gap-1 cursor-pointer"
                onClick={() => toggleGenre(genre)}
              >
                {genreLabels[genre]}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24">
              <h3 className="font-display font-semibold mb-4">Filters</h3>
              <FilterContent />
            </div>
          </aside>

          {/* Book Grid */}
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-4">
              Showing {filteredBooks.length} results
            </p>
            <BookGrid books={filteredBooks} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
