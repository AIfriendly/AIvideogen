'use client';

import { useCallback } from 'react';

interface SessionState {
  scrollPosition: number;
  openPreviewId: string | null;
  lastUpdated: number;
}

interface UseSessionPersistenceReturn {
  saveScrollPosition: (position: number) => void;
  savePreviewState: (suggestionId: string | null) => void;
  restoreState: () => SessionState | null;
  clearState: () => void;
}

const STORAGE_KEY_PREFIX = 'visual-curation-session';

export function useSessionPersistence(projectId: string): UseSessionPersistenceReturn {
  const storageKey = `${STORAGE_KEY_PREFIX}-${projectId}`;

  const saveScrollPosition = useCallback((position: number) => {
    try {
      const existing = localStorage.getItem(storageKey);
      const state: SessionState = existing
        ? JSON.parse(existing)
        : { scrollPosition: 0, openPreviewId: null, lastUpdated: Date.now() };

      state.scrollPosition = position;
      state.lastUpdated = Date.now();
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save scroll position:', error);
    }
  }, [storageKey]);

  const savePreviewState = useCallback((suggestionId: string | null) => {
    try {
      const existing = localStorage.getItem(storageKey);
      const state: SessionState = existing
        ? JSON.parse(existing)
        : { scrollPosition: 0, openPreviewId: null, lastUpdated: Date.now() };

      state.openPreviewId = suggestionId;
      state.lastUpdated = Date.now();
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save preview state:', error);
    }
  }, [storageKey]);

  const restoreState = useCallback((): SessionState | null => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;

      const state: SessionState = JSON.parse(stored);

      // Expire after 1 hour
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - state.lastUpdated > oneHour) {
        localStorage.removeItem(storageKey);
        return null;
      }

      return state;
    } catch (error) {
      console.error('Failed to restore session state:', error);
      return null;
    }
  }, [storageKey]);

  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear session state:', error);
    }
  }, [storageKey]);

  return {
    saveScrollPosition,
    savePreviewState,
    restoreState,
    clearState,
  };
}
