import { create } from 'zustand';
import { ChatMessage, AIAction, AIActionType } from '@/types/ai';

interface AIStore {
  messages: ChatMessage[];
  actions: AIAction[];
  isProcessing: boolean;
  isChatOpen: boolean;
  isActionLogOpen: boolean;
  
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  addAction: (action: Omit<AIAction, 'id' | 'timestamp'>) => string;
  updateAction: (id: string, updates: Partial<AIAction>) => void;
  setProcessing: (processing: boolean) => void;
  toggleChat: () => void;
  toggleActionLog: () => void;
  setChatOpen: (open: boolean) => void;
  setActionLogOpen: (open: boolean) => void;
  clearMessages: () => void;
  clearActions: () => void;
}

export const useAIStore = create<AIStore>((set, get) => ({
  messages: [],
  actions: [],
  isProcessing: false,
  isChatOpen: false,
  isActionLogOpen: false,
  
  addMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },
  
  addAction: (action): string => {
    const newAction: AIAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    set((state) => ({
      actions: [newAction, ...state.actions],
    }));
    return newAction.id;
  },
  
  updateAction: (id, updates) => {
    set((state) => ({
      actions: state.actions.map((action) =>
        action.id === id ? { ...action, ...updates } : action
      ),
    }));
  },
  
  setProcessing: (processing) => set({ isProcessing: processing }),
  
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  
  toggleActionLog: () => set((state) => ({ isActionLogOpen: !state.isActionLogOpen })),
  
  setChatOpen: (open) => set({ isChatOpen: open }),
  
  setActionLogOpen: (open) => set({ isActionLogOpen: open }),
  
  clearMessages: () => set({ messages: [] }),
  
  clearActions: () => set({ actions: [] }),
}));
