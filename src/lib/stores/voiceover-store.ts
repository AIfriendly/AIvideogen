/**
 * Voiceover Generation Store
 *
 * Manages state for voiceover generation workflow including:
 * - Generation status (idle, generating, complete, error)
 * - Progress tracking (current scene, total scenes)
 * - Error messages
 *
 * @module lib/stores/voiceover-store
 */

import { create } from 'zustand';

/**
 * Generation status values
 */
export type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error';

/**
 * Voiceover store state
 */
interface VoiceoverState {
  /** Current generation status */
  generationStatus: GenerationStatus;

  /** Current scene being processed (1-indexed) */
  currentScene: number | null;

  /** Total number of scenes to process */
  totalScenes: number;

  /** Progress percentage (0-100) */
  progress: number;

  /** Error message if status is 'error' */
  errorMessage: string | null;

  /** Scene number being processed */
  currentSceneNumber: number | null;

  /** Actions */
  startGeneration: (totalScenes: number) => void;
  updateProgress: (currentScene: number, totalScenes: number, sceneNumber: number) => void;
  completeGeneration: () => void;
  setError: (message: string) => void;
  resetState: () => void;
}

/**
 * Initial state values
 */
const initialState = {
  generationStatus: 'idle' as GenerationStatus,
  currentScene: null,
  totalScenes: 0,
  progress: 0,
  errorMessage: null,
  currentSceneNumber: null,
};

/**
 * Voiceover generation store
 *
 * Usage:
 * ```typescript
 * const { generationStatus, progress, startGeneration } = useVoiceoverStore();
 *
 * // Start generation
 * startGeneration(5);
 *
 * // Update progress
 * updateProgress(3, 5, 3);
 *
 * // Complete generation
 * completeGeneration();
 * ```
 */
export const useVoiceoverStore = create<VoiceoverState>((set) => ({
  ...initialState,

  /**
   * Start voiceover generation
   *
   * @param totalScenes - Total number of scenes to process
   */
  startGeneration: (totalScenes: number) =>
    set({
      generationStatus: 'generating',
      currentScene: 0,
      totalScenes,
      progress: 0,
      errorMessage: null,
      currentSceneNumber: null,
    }),

  /**
   * Update generation progress
   *
   * @param currentScene - Current scene index (1-indexed)
   * @param totalScenes - Total number of scenes
   * @param sceneNumber - Scene number being processed
   */
  updateProgress: (currentScene: number, totalScenes: number, sceneNumber: number) => {
    const progress = totalScenes > 0 ? Math.round((currentScene / totalScenes) * 100) : 0;
    set({
      currentScene,
      totalScenes,
      progress,
      currentSceneNumber: sceneNumber,
    });
  },

  /**
   * Mark generation as complete
   */
  completeGeneration: () =>
    set({
      generationStatus: 'complete',
      progress: 100,
    }),

  /**
   * Set error state
   *
   * @param message - Error message
   */
  setError: (message: string) =>
    set({
      generationStatus: 'error',
      errorMessage: message,
    }),

  /**
   * Reset to initial state
   */
  resetState: () => set(initialState),
}));
