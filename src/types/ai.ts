export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

export interface AIAction {
  id: string;
  type: AIActionType;
  description: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  result?: string;
  data?: Record<string, unknown>;
}

export type AIActionType =
  | 'search'
  | 'navigate'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'filter'
  | 'recommend'
  | 'view_details'
  | 'clear_cart'
  | 'checkout'
  | 'voice_input'
  | 'voice_output'
  | 'thinking';

export const actionTypeLabels: Record<AIActionType, string> = {
  search: 'Search',
  navigate: 'Navigate',
  add_to_cart: 'Add to Cart',
  remove_from_cart: 'Remove from Cart',
  filter: 'Filter Products',
  recommend: 'Get Recommendations',
  view_details: 'View Details',
  clear_cart: 'Clear Cart',
  checkout: 'Checkout',
  voice_input: 'Voice Input',
  voice_output: 'Voice Output',
  thinking: 'Thinking',
};
