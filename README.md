# AI Shopping Assistant - Bookstore Demo

A voice-first AI shopping assistant prototype for a bookstore e-commerce site, demonstrating real-time conversational AI capabilities powered by ElevenLabs Conversational AI.

**Live Demo**: https://do-it-site-bot.lovable.app/

<p align="center" width="100%">
<video src="https://github.com/user-attachments/assets/0e2805c1-ccfd-4e45-8460-5877c8b3b779" width="80%" controls></video>
</p>


## Overview

This project showcases an agentic AI assistant that helps users browse, search, and shop for books through natural voice conversation. The assistant can:

- **Search & Browse**: Find books by title, author, genre, or complex queries like "sci-fi books under $20"
- **Navigate**: Move between pages (home, browse, cart, wishlist, book details)
- **Manage Cart**: Add/remove items, update quantities, clear cart
- **Manage Wishlist**: Add/remove favorites, move items to cart
- **Provide Details**: Answer questions about specific books (price, rating, availability, description)
- **Make Recommendations**: Suggest books based on preferences

## How to Use

1. **Start a Conversation**: Click the prominent "Start Conversation" button or the chat widget in the bottom-right corner
2. **Speak Naturally**: Ask questions or give commands like:
   - "Show me fantasy books"
   - "Add this book to my cart"
   - "What's in my cart?"
   - "Find books by Stephen King"
   - "Remove the first item from my cart"
3. **Interrupt Anytime**: The conversation is real-time and interruptible - no need to wait for the assistant to finish speaking
4. **Text Alternative**: Click "Prefer to type?" for text-based chat

## Technical Implementation

### Architecture

```
┌─────────────────┐     WebRTC     ┌──────────────────────┐
│   React App     │◄──────────────►│  ElevenLabs Agent    │
│                 │                │  (Conversational AI) │
│  - Voice UI     │                │                      │
│  - Client Tools │                │  - Voice Synthesis   │
│  - State Mgmt   │                │  - Speech Recognition│
└─────────────────┘                │  - AI Intelligence   │
        │                          └──────────────────────┘
        │
        ▼
┌─────────────────┐
│  Lovable Cloud  │
│  (Supabase)     │
│                 │
│  - Edge Funcs   │
│  - Signed URLs  │
└─────────────────┘
```

### Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Voice AI**: ElevenLabs Conversational AI (WebRTC)
- **Backend**: Lovable Cloud (Supabase Edge Functions)
- **State Management**: Zustand
- **Book Data**: Open Library API for cover images

### ElevenLabs Agent Configuration

#### System Prompt Structure

The agent prompt follows a specific structure for optimal behavior:

```
⚠️ CRITICAL RULES - ALWAYS FOLLOW ⚠️

1. ALWAYS call the appropriate tool BEFORE answering any question
2. NEVER answer from memory - always verify with tools
3. After ANY cart/wishlist modification, call the info tool to verify
4. You have ZERO memory between conversations

# Personality

You are a friendly bookstore shopping assistant named "Biblio"...

# Capabilities

You can help customers with:
- Browsing the book catalog (~80 books available)
- Searching by title, author, or keywords
- Filtering by genre, price range, stock status
- Managing shopping cart and wishlist
- Providing book details and recommendations

# Tool Usage Guidelines

- Use `searchBooksByTitle` for freetext search (author names, keywords)
- Use `filterBooks` for structured queries (genre + price range)
- Use `getCurrentContext` to understand what page/book user is viewing
- Always verify cart contents after modifications

# Limitations

- Cannot process payments or complete checkout
- Cannot access external websites or real-time pricing
```

#### Client-Side Tools

Tools are implemented in `src/components/ai/VoiceConversation.tsx`:

```typescript
clientTools: {
  // Navigation
  navigate: ({ page }) => { /* routes to page */ },
  viewBook: ({ bookId }) => { /* navigates to book detail */ },
  scrollPage: ({ direction }) => { /* scrolls up/down */ },

  // Search & Discovery
  searchBooksByTitle: ({ query }) => { /* freetext search */ },
  filterBooks: ({ genre, minPrice, maxPrice, inStock }) => { /* structured filter */ },
  getAvailableBooks: ({ limit }) => { /* list catalog */ },

  // Context
  getCurrentContext: () => { /* returns current page, book, filters */ },
  getBookDetails: ({ bookId }) => { /* full book info */ },

  // Cart Management
  getCartInfo: () => { /* cart contents & total */ },
  addToCart: ({ bookId }) => { /* add by ID */ },
  addCurrentBookToCart: () => { /* add currently viewed book */ },
  removeFromCart: ({ bookId }) => { /* remove item */ },
  updateCartQuantity: ({ bookId, quantity }) => { /* update qty */ },
  updateCartQuantityByTitle: ({ title, quantity }) => { /* update by title */ },
  clearCart: () => { /* empty cart */ },

  // Wishlist Management
  getWishlistInfo: () => { /* wishlist contents */ },
  addToWishlist: ({ bookId }) => { /* add to wishlist */ },
  removeFromWishlist: ({ bookId }) => { /* remove from wishlist */ },
  // ... more wishlist tools
}
```

#### Tool Configuration in ElevenLabs Dashboard

Each tool must be configured in the ElevenLabs dashboard with:

1. **Name**: Matches the client-side function name
2. **Description**: Clear description of what the tool does
3. **Parameters**: JSON schema for expected inputs
4. **Wait for response**: 
   - ✅ Enable for tools that return data (search, getCart, etc.)
   - ❌ Disable for fire-and-forget actions (navigate, scroll)

Example tool configuration:

```json
{
  "name": "searchBooksByTitle",
  "description": "Search for books by title or author name. Returns matching books with details.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search query - book title or author name"
      }
    },
    "required": ["query"]
  }
}
```

### Edge Function: Signed URL Generation

The app uses an edge function to generate signed URLs for secure WebRTC connection:

```typescript
// supabase/functions/elevenlabs-signed-url/index.ts
const response = await fetch(
  `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${AGENT_ID}`,
  {
    headers: { "xi-api-key": ELEVENLABS_API_KEY }
  }
);
```

### Key Implementation Files

| File | Purpose |
|------|---------|
| `src/components/ai/VoiceConversation.tsx` | Main voice interface, tool implementations |
| `src/components/ai/ChatWidget.tsx` | Chat UI component |
| `src/stores/cartStore.ts` | Shopping cart state (Zustand) |
| `src/stores/wishlistStore.ts` | Wishlist state (Zustand) |
| `src/stores/aiStore.ts` | AI action logging state |
| `supabase/functions/elevenlabs-signed-url/` | Signed URL generation |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ELEVENLABS_API_KEY` | ElevenLabs API key (stored as Supabase secret) |
| `ELEVENLABS_AGENT_ID` | Your Conversational AI agent ID |

## Known Limitations

- **Browser Support**: Voice input works best in Chrome/Edge (Chromium-based browsers)
- **Agent Memory**: The agent has no memory between conversations
- **Checkout**: Agent cannot process payments (by design for demo)
- **Catalog Size**: Demo includes ~80 books from static data

## Credits

Built with [Lovable](https://lovable.dev) using:
- [ElevenLabs Conversational AI](https://elevenlabs.io/conversational-ai)
- [Open Library API](https://openlibrary.org/) for book covers
- [shadcn/ui](https://ui.shadcn.com/) components
