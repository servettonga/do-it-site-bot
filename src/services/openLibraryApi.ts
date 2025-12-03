// Combined API service:
// - Open Library for covers (better availability)
// - Google Books for descriptions (better coverage)

export interface OpenLibraryBookData {
  title?: string;
  authors?: { name: string }[];
  description?: string | { value: string };
  number_of_pages?: number;
  publish_date?: string;
  subjects?: { name: string }[];
  cover?: {
    small?: string;
    medium?: string;
    large?: string;
  };
}

export interface GoogleBooksData {
  title?: string;
  authors?: string[];
  description?: string;
  pageCount?: number;
}

export interface EnrichedBookData {
  coverImage: string | null;
  description: string | null;
  pageCount: number | null;
}

const CACHE_KEY = 'openlib-books-cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  data: EnrichedBookData;
  timestamp: number;
}

interface Cache {
  [isbn: string]: CacheEntry;
}

function getCache(): Cache {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setCache(cache: Cache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or unavailable
  }
}

function getCachedData(isbn: string): EnrichedBookData | null {
  const cache = getCache();
  const entry = cache[isbn];
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry.data;
  }
  return null;
}

function setCachedData(isbn: string, data: EnrichedBookData): void {
  const cache = getCache();
  cache[isbn] = { data, timestamp: Date.now() };
  setCache(cache);
}

// Clean ISBN - remove hyphens and spaces
function cleanISBN(isbn: string): string {
  return isbn.replace(/[-\s]/g, '');
}

// Direct cover URL from Open Library - no API call needed
export function getOpenLibraryCoverUrl(isbn: string, size: 'S' | 'M' | 'L' = 'L'): string {
  const cleanedISBN = cleanISBN(isbn);
  return `https://covers.openlibrary.org/b/isbn/${cleanedISBN}-${size}.jpg`;
}

// Check if a cover image exists (Open Library returns 1x1 pixel if not found)
async function checkCoverExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) return false;
    
    // Check content-length - 1x1 pixel is very small (~807 bytes or less)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) < 1000) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Fetch description from Google Books API
async function fetchGoogleBooksDescription(isbn: string): Promise<string | null> {
  const cleanedISBN = cleanISBN(isbn);
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanedISBN}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.items || data.items.length === 0) return null;
    
    const bookInfo: GoogleBooksData = data.items[0].volumeInfo;
    return bookInfo.description || null;
  } catch {
    return null;
  }
}

// Fetch book data - Open Library for covers, Google Books for descriptions
export async function fetchBookByISBN(isbn: string): Promise<EnrichedBookData> {
  // Check cache first
  const cached = getCachedData(isbn);
  if (cached) {
    return cached;
  }

  const cleanedISBN = cleanISBN(isbn);
  
  try {
    // Fetch from both APIs in parallel
    const [openLibResponse, googleDescription] = await Promise.all([
      fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanedISBN}&format=json&jscmd=data`),
      fetchGoogleBooksDescription(isbn)
    ]);
    
    // Process Open Library response for cover
    let coverImage: string | null = null;
    let openLibDescription: string | null = null;
    let pageCount: number | null = null;
    
    if (openLibResponse.ok) {
      const data = await openLibResponse.json();
      const bookKey = `ISBN:${cleanedISBN}`;
      const bookInfo: OpenLibraryBookData | undefined = data[bookKey];
      
      // Get cover URL - try direct URL first
      const coverUrl = getOpenLibraryCoverUrl(isbn, 'L');
      const coverExists = await checkCoverExists(coverUrl);
      
      if (coverExists) {
        coverImage = coverUrl;
      } else if (bookInfo?.cover?.large) {
        coverImage = bookInfo.cover.large;
      } else if (bookInfo?.cover?.medium) {
        coverImage = bookInfo.cover.medium;
      }
      
      // Extract Open Library description as fallback
      if (bookInfo?.description) {
        openLibDescription = typeof bookInfo.description === 'string' 
          ? bookInfo.description 
          : bookInfo.description.value;
      }
      
      pageCount = bookInfo?.number_of_pages || null;
    } else {
      // If Open Library fails, still try direct cover URL
      const coverUrl = getOpenLibraryCoverUrl(isbn, 'L');
      const coverExists = await checkCoverExists(coverUrl);
      if (coverExists) {
        coverImage = coverUrl;
      }
    }
    
    // Prefer Google Books description (better coverage), fallback to Open Library
    const description = googleDescription || openLibDescription;
    
    const result: EnrichedBookData = {
      coverImage,
      description,
      pageCount,
    };
    
    setCachedData(isbn, result);
    return result;
  } catch (error) {
    console.error('Error fetching book data:', error);
    
    // Even if APIs fail, try the direct cover URL
    const coverUrl = getOpenLibraryCoverUrl(isbn, 'L');
    const coverExists = await checkCoverExists(coverUrl);
    
    const result: EnrichedBookData = {
      coverImage: coverExists ? coverUrl : null,
      description: null,
      pageCount: null,
    };
    
    setCachedData(isbn, result);
    return result;
  }
}

// Batch fetch multiple books
export async function fetchBooksByISBN(isbns: string[]): Promise<Map<string, EnrichedBookData>> {
  const results = new Map<string, EnrichedBookData>();
  
  // Process in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < isbns.length; i += batchSize) {
    const batch = isbns.slice(i, i + batchSize);
    const promises = batch.map(isbn => 
      fetchBookByISBN(isbn).then(data => ({ isbn, data }))
    );
    
    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ isbn, data }) => {
      results.set(isbn, data);
    });
    
    // Small delay between batches
    if (i + batchSize < isbns.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}
