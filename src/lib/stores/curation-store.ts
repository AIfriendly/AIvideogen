/**
 * Curation Store - Epic 4, Story 4.4
 *
 * Zustand store for managing clip selection state during visual curation.
 * Uses Map for O(1) sceneId lookups and localStorage persistence for session durability.
 *
 * Features:
 * - Optimistic UI updates for immediate feedback
 * - Automatic database persistence via API
 * - Error handling with UI state reversion
 * - localStorage backup for session persistence
 */

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, type PersistStorage, type StorageValue } from 'zustand/middleware';

/**
 * Clip selection data structure
 */
export interface ClipSelection {
  sceneId: string;
  suggestionId: string;
  videoId: string;
}

/**
 * Persisted state (subset that gets saved to localStorage)
 */
interface PersistedCurationState {
  projectId: string | null;
  selections: Map<string, ClipSelection>;
}

/**
 * Curation state interface
 */
interface CurationState extends PersistedCurationState {
  // Additional state (not persisted)
  totalScenes: number;

  // Actions
  setProject: (projectId: string) => void;
  setTotalScenes: (count: number) => void;
  selectClip: (sceneId: string, suggestionId: string, videoId: string, onError?: (error: Error) => void) => void;
  clearSelection: (sceneId: string) => void;
  loadSelections: (selections: ClipSelection[]) => void;
  isSceneComplete: (sceneId: string) => boolean;
  getSelectionCount: () => number;
  getAllSelected: () => boolean;
  reset: () => void;
}

/**
 * Helper function for API call to save clip selection
 */
async function saveClipSelection(
  projectId: string,
  sceneId: string,
  suggestionId: string
): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/select-clip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sceneId, suggestionId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to save selection');
  }
}

/**
 * Custom storage adapter for Map serialization
 * Converts Map to array for JSON serialization and back
 */
const mapStorage: PersistStorage<PersistedCurationState> = {
  getItem: (name: string): StorageValue<PersistedCurationState> | null => {
    const str = localStorage.getItem(name);
    if (!str) return null;

    try {
      const parsed = JSON.parse(str);
      // Convert selections array back to Map
      if (parsed.state && Array.isArray(parsed.state.selections)) {
        parsed.state.selections = new Map(parsed.state.selections);
      }
      return parsed as StorageValue<PersistedCurationState>;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: StorageValue<PersistedCurationState>): void => {
    try {
      // Convert Map to array for JSON serialization
      const toStore = {
        ...value,
        state: {
          ...value.state,
          selections: value.state.selections instanceof Map
            ? Array.from(value.state.selections.entries())
            : value.state.selections,
        },
      };
      localStorage.setItem(name, JSON.stringify(toStore));
    } catch (error) {
      console.error('[CurationStore] Failed to save to localStorage:', error);
    }
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};

/**
 * Curation store with localStorage persistence
 */
export const useCurationStore = create<CurationState>()(
  persist(
    (set, get) => ({
      // Initial state
      projectId: null,
      selections: new Map(),
      totalScenes: 0,

      /**
       * Set the current project ID
       */
      setProject: (projectId) => {
        const currentProjectId = get().projectId;
        // Reset selections if switching to a different project
        if (currentProjectId && currentProjectId !== projectId) {
          set({
            projectId,
            selections: new Map(),
            totalScenes: 0,
          });
        } else {
          set({ projectId });
        }
      },

      /**
       * Set the total number of scenes
       */
      setTotalScenes: (count) => {
        set({ totalScenes: count });
      },

      /**
       * Select a clip for a scene with optimistic update
       */
      selectClip: (sceneId, suggestionId, videoId, onError) => {
        const previousSelection = get().selections.get(sceneId);

        // Optimistic UI update
        set((state) => {
          const newSelections = new Map(state.selections);
          newSelections.set(sceneId, { sceneId, suggestionId, videoId });
          return { selections: newSelections };
        });

        // Save to database asynchronously
        const projectId = get().projectId;
        if (projectId) {
          saveClipSelection(projectId, sceneId, suggestionId).catch((error) => {
            console.error('[CurationStore] Failed to save selection:', error);

            // Revert on error
            set((state) => {
              const newSelections = new Map(state.selections);
              if (previousSelection) {
                // Restore previous selection
                newSelections.set(sceneId, previousSelection);
              } else {
                // Remove the failed selection
                newSelections.delete(sceneId);
              }
              return { selections: newSelections };
            });

            // Call error callback for toast notification
            if (onError) {
              onError(error instanceof Error ? error : new Error('Failed to save selection'));
            }
          });
        }
      },

      /**
       * Clear selection for a scene
       */
      clearSelection: (sceneId) => {
        set((state) => {
          const newSelections = new Map(state.selections);
          newSelections.delete(sceneId);
          return { selections: newSelections };
        });
      },

      /**
       * Load selections from database (overrides localStorage)
       */
      loadSelections: (selections) => {
        set((state) => {
          const newSelections = new Map<string, ClipSelection>();
          selections.forEach((selection) => {
            newSelections.set(selection.sceneId, selection);
          });
          return { selections: newSelections };
        });
      },

      /**
       * Check if a scene has a selection
       */
      isSceneComplete: (sceneId) => {
        return get().selections.has(sceneId);
      },

      /**
       * Get count of selected scenes
       */
      getSelectionCount: () => {
        return get().selections.size;
      },

      /**
       * Check if all scenes are selected
       */
      getAllSelected: () => {
        const state = get();
        return state.totalScenes > 0 && state.selections.size >= state.totalScenes;
      },

      /**
       * Reset all state
       */
      reset: () => {
        set({
          projectId: null,
          selections: new Map(),
          totalScenes: 0,
        });
      },
    }),
    {
      name: 'bmad-curation-storage', // localStorage key
      version: 1,
      storage: mapStorage,
      // Only persist projectId and selections (totalScenes comes from API)
      partialize: (state) => ({
        projectId: state.projectId,
        selections: state.selections,
      }),
    }
  )
);
