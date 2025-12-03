import { useState, useEffect } from 'react';
import { fetchBookByISBN, EnrichedBookData } from '@/services/openLibraryApi';

interface UseBookEnrichmentResult {
  enrichedData: EnrichedBookData | null;
  isLoading: boolean;
  error: Error | null;
}

export function useBookEnrichment(isbn: string): UseBookEnrichmentResult {
  const [enrichedData, setEnrichedData] = useState<EnrichedBookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchBookByISBN(isbn);
        if (!cancelled) {
          setEnrichedData(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch book data'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (isbn) {
      fetchData();
    }

    return () => {
      cancelled = true;
    };
  }, [isbn]);

  return { enrichedData, isLoading, error };
}

// Hook for getting cover image with fallback
export function useBookCover(isbn: string, fallbackImage: string): {
  coverImage: string;
  isLoading: boolean;
} {
  const { enrichedData, isLoading } = useBookEnrichment(isbn);
  
  return {
    coverImage: enrichedData?.coverImage || fallbackImage,
    isLoading,
  };
}
