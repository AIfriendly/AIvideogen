/**
 * Conversation Store - Zustand State Management
 *
 * Factory pattern for per-project conversation state isolation.
 * Provides persistent conversation history with localStorage.
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Message interface
 *
 * Represents a single message in the conversation.
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO 8601 format
}

/**
 * Conversation state interface
 *
 * Defines the structure of the conversation store.
 */
interface ConversationState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clearMessages: () => void;
}

/**
 * Factory function for creating per-project conversation stores
 *
 * Creates isolated Zustand stores with per-project localStorage persistence.
 * Each project maintains its own conversation history.
 *
 * @param projectId - Unique project identifier
 * @returns Zustand store hook for the specified project
 *
 * @example
 * ```typescript
 * const useConversationStore = createConversationStore('project-123');
 * const { messages, addMessage } = useConversationStore();
 * ```
 */
export const createConversationStore = (projectId: string) =>
  create<ConversationState>()(
    persist(
      (set) => ({
        messages: [],
        isLoading: false,
        error: null,

        addMessage: (message) =>
          set((state) => ({ messages: [...state.messages, message] })),

        setMessages: (messages) =>
          set({ messages }),

        setLoading: (isLoading) =>
          set({ isLoading }),

        setError: (error) =>
          set({ error }),

        clearError: () =>
          set({ error: null }),

        clearMessages: () =>
          set({ messages: [], error: null, isLoading: false }),
      }),
      {
        name: `bmad-conversation-state-${projectId}`, // Per-project isolation
        version: 1,
      }
    )
  );
