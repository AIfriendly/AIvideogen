/**
 * Voice Store - Zustand State Management
 *
 * Factory pattern for per-project voice selection state isolation.
 * Manages voice selection UI state and audio preview playback.
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Voice selection state interface
 *
 * Defines the structure of the voice store.
 */
interface VoiceState {
  selectedVoiceId: string | null;
  isPlaying: boolean;
  currentPlayingVoice: string | null;

  // Actions
  selectVoice: (voiceId: string) => void;
  playPreview: (voiceId: string) => void;
  stopPreview: () => void;
  resetState: () => void;
}

/**
 * Factory function for creating per-project voice stores
 *
 * Creates isolated Zustand stores with per-project localStorage persistence.
 * Each project maintains its own voice selection state.
 *
 * @param projectId - Unique project identifier
 * @returns Zustand store hook for the specified project
 *
 * @example
 * ```typescript
 * const useVoiceStore = createVoiceStore('project-123');
 * const { selectedVoiceId, selectVoice } = useVoiceStore();
 * ```
 */
export const createVoiceStore = (projectId: string) =>
  create<VoiceState>()(
    persist(
      (set) => ({
        selectedVoiceId: null,
        isPlaying: false,
        currentPlayingVoice: null,

        selectVoice: (voiceId) =>
          set({ selectedVoiceId: voiceId }),

        playPreview: (voiceId) =>
          set({
            isPlaying: true,
            currentPlayingVoice: voiceId,
          }),

        stopPreview: () =>
          set({
            isPlaying: false,
            currentPlayingVoice: null,
          }),

        resetState: () =>
          set({
            selectedVoiceId: null,
            isPlaying: false,
            currentPlayingVoice: null,
          }),
      }),
      {
        name: `bmad-voice-state-${projectId}`, // Per-project isolation
        version: 1,
      }
    )
  );
