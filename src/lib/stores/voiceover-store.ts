/**
 * Voiceover Store (Zustand)
 *
 * Client-side state management for voiceover generation UI.
 * Tracks generation status, progress, and errors.
 *
 * Story 2.5: Voiceover Generation for Scenes
 */

import { create } from 'zustand';

/**
 * Voiceover store state interface
 */
interface VoiceoverState {
  // Generation state
  generationStatus: 'idle' | 'generating' | 'complete' | 'error';
  currentScene: number | null;
  totalScenes: number;
  progress: number; // 0-100
  errorMessage: string | null;

  // Actions
  startGeneration: (totalScenes: number) => void;
  updateProgress: (currentScene: number, totalScenes: number) => void;
  completeGeneration: () => void;
  setError: (message: string) => void;
  resetState: () => void;
}

/**
 * Initial state
 */
const initialState = {
  generationStatus: 'idle' as const,
  currentScene: null,
  totalScenes: 0,
  progress: 0,
  errorMessage: null,
};

/**
 * Voiceover store hook
 *
 * @example
 * ```typescript
 * const { generationStatus, startGeneration, updateProgress } = useVoiceoverStore();
 *
 * // Start generation
 * startGeneration(5);
 *
 * // Update progress
 * updateProgress(3, 5); // 60%
 *
 * // Complete generation
 * completeGeneration();
 * ```
 */
export const useVoiceoverStore = create<VoiceoverState>((set) => ({
  ...initialState,

  /**
   * Start voiceover generation
   * @param totalScenes - Total number of scenes to generate
   */
  startGeneration: (totalScenes: number) => {
    set({
      generationStatus: 'generating',
      currentScene: 0,
      totalScenes,
      progress: 0,
      errorMessage: null,
    });
  },

  /**
   * Update generation progress
   * @param currentScene - Current scene being processed (1-indexed)
   * @param totalScenes - Total number of scenes
   */
  updateProgress: (currentScene: number, totalScenes: number) => {
    const progress = Math.round((currentScene / totalScenes) * 100);
    set({
      currentScene,
      totalScenes,
      progress,
      generationStatus: 'generating',
    });
  },

  /**
   * Mark generation as complete
   */
  completeGeneration: () => {
    set({
      generationStatus: 'complete',
      progress: 100,
    });
  },

  /**
   * Set error state
   * @param message - Error message to display
   */
  setError: (message: string) => {
    set({
      generationStatus: 'error',
      errorMessage: message,
    });
  },

  /**
   * Reset store to initial state
   */
  resetState: () => {
    set(initialState);
  },
}));
