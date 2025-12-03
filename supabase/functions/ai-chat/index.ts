import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Book catalog for the AI to reference
const bookCatalog = [
  { id: '1', title: 'The Midnight Library', author: 'Matt Haig', price: 16.99, genre: 'fiction', rating: 4.5 },
  { id: '2', title: 'Where the Crawdads Sing', author: 'Delia Owens', price: 14.99, genre: 'fiction', rating: 4.7 },
  { id: '3', title: 'The Great Alone', author: 'Kristin Hannah', price: 15.99, genre: 'fiction', rating: 4.4 },
  { id: '4', title: 'The Silent Patient', author: 'Alex Michaelides', price: 17.99, genre: 'mystery', rating: 4.3 },
  { id: '5', title: 'Gone Girl', author: 'Gillian Flynn', price: 13.99, genre: 'mystery', rating: 4.1 },
  { id: '6', title: 'The Girl with the Dragon Tattoo', author: 'Stieg Larsson', price: 14.99, genre: 'mystery', rating: 4.2 },
  { id: '7', title: 'Project Hail Mary', author: 'Andy Weir', price: 18.99, genre: 'sci-fi', rating: 4.8 },
  { id: '8', title: 'Dune', author: 'Frank Herbert', price: 16.99, genre: 'sci-fi', rating: 4.6 },
  { id: '9', title: 'The Martian', author: 'Andy Weir', price: 14.99, genre: 'sci-fi', rating: 4.7 },
  { id: '10', title: 'It Ends with Us', author: 'Colleen Hoover', price: 15.99, genre: 'romance', rating: 4.4 },
  { id: '11', title: 'The Notebook', author: 'Nicholas Sparks', price: 12.99, genre: 'romance', rating: 4.2 },
  { id: '12', title: 'Beach Read', author: 'Emily Henry', price: 14.99, genre: 'romance', rating: 4.3 },
  { id: '13', title: 'The Name of the Wind', author: 'Patrick Rothfuss', price: 17.99, genre: 'fantasy', rating: 4.6 },
  { id: '14', title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', price: 16.99, genre: 'fantasy', rating: 4.5 },
  { id: '15', title: 'The Way of Kings', author: 'Brandon Sanderson', price: 19.99, genre: 'fantasy', rating: 4.7 },
  { id: '16', title: 'Atomic Habits', author: 'James Clear', price: 18.99, genre: 'non-fiction', rating: 4.8 },
  { id: '17', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', price: 15.99, genre: 'non-fiction', rating: 4.5 },
  { id: '18', title: 'Sapiens', author: 'Yuval Noah Harari', price: 17.99, genre: 'non-fiction', rating: 4.6 },
  { id: '19', title: 'The Da Vinci Code', author: 'Dan Brown', price: 14.99, genre: 'thriller', rating: 4.1 },
  { id: '20', title: 'The Girl on the Train', author: 'Paula Hawkins', price: 13.99, genre: 'thriller', rating: 4.0 },
  { id: '21', title: 'Before I Go to Sleep', author: 'S.J. Watson', price: 14.99, genre: 'thriller', rating: 4.2 },
  { id: '22', title: 'Becoming', author: 'Michelle Obama', price: 19.99, genre: 'biography', rating: 4.7 },
  { id: '23', title: 'Steve Jobs', author: 'Walter Isaacson', price: 17.99, genre: 'biography', rating: 4.5 },
  { id: '24', title: 'Educated', author: 'Tara Westover', price: 16.99, genre: 'biography', rating: 4.6 },
  { id: '25', title: 'The Alchemist', author: 'Paulo Coelho', price: 12.99, genre: 'fiction', rating: 4.3 },
  { id: '26', title: 'Circe', author: 'Madeline Miller', price: 15.99, genre: 'fantasy', rating: 4.4 },
  { id: '27', title: '1984', author: 'George Orwell', price: 11.99, genre: 'fiction', rating: 4.5 },
  { id: '28', title: 'The Catcher in the Rye', author: 'J.D. Salinger', price: 10.99, genre: 'fiction', rating: 4.0 },
  { id: '29', title: 'The Hobbit', author: 'J.R.R. Tolkien', price: 14.99, genre: 'fantasy', rating: 4.7 },
  { id: '30', title: 'And Then There Were None', author: 'Agatha Christie', price: 12.99, genre: 'mystery', rating: 4.6 },
];

const systemPrompt = `You are a friendly and knowledgeable AI shopping assistant for a bookstore called "BookHaven". Your role is to help customers find and purchase books.

AVAILABLE BOOK CATALOG:
${JSON.stringify(bookCatalog, null, 2)}

CAPABILITIES:
You can help users with:
1. **Search & Recommendations**: Find books by title, author, genre, or theme
2. **Book Information**: Provide details about any book in the catalog
3. **Cart Management**: Add books to cart, view cart, remove items
4. **Navigation**: Guide users to browse pages, specific book pages, cart, or checkout
5. **Personalized Suggestions**: Recommend books based on user preferences

RESPONSE FORMAT:
Always respond in JSON format with this structure:
{
  "message": "Your friendly response to the user",
  "actions": [
    {
      "type": "search" | "add_to_cart" | "remove_from_cart" | "navigate" | "view_details" | "clear_cart" | "recommend" | "filter",
      "data": { ... action-specific data ... }
    }
  ]
}

ACTION DATA FORMATS:
- search: { "query": "search terms", "results": [book ids] }
- add_to_cart: { "bookId": "id", "bookTitle": "title", "quantity": 1 }
- remove_from_cart: { "bookId": "id", "bookTitle": "title" }
- navigate: { "path": "/browse" | "/cart" | "/checkout" | "/book/[id]" }
- view_details: { "bookId": "id", "bookTitle": "title" }
- clear_cart: {}
- recommend: { "books": [{ "id": "id", "title": "title", "reason": "why recommended" }] }
- filter: { "genre": "genre name", "priceRange": [min, max] }

GUIDELINES:
- Be conversational, warm, and helpful
- When recommending books, explain WHY they might enjoy it
- If asked about a book not in catalog, apologize and suggest alternatives
- For vague requests like "something good", ask clarifying questions about preferences
- Always confirm before adding items to cart
- Keep responses concise but informative`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, cartContext } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    // Add cart context to the system prompt if provided
    let contextualPrompt = systemPrompt;
    if (cartContext) {
      contextualPrompt += `\n\nCURRENT CART STATE:\n${JSON.stringify(cartContext, null, 2)}`;
    }

    console.log('Sending request to Claude API...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: contextualPrompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.content[0].text;

    console.log('Claude response:', assistantMessage);

    // Try to parse the JSON response
    let parsedResponse;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = { message: assistantMessage, actions: [] };
      }
    } catch {
      parsedResponse = { message: assistantMessage, actions: [] };
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        message: "I'm sorry, I encountered an error. Please try again.",
        actions: [],
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
