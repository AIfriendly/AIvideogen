/**
 * Hook Unit Tests - useSessionPersistence
 * Story 4.6: Visual Curation Workflow Integration & Error Recovery
 *
 * Tests for useSessionPersistence hook including localStorage save/restore,
 * session expiration, and error handling.
 *
 * Test IDs: 4.6-UNIT-013 to 4.6-UNIT-020
 * Priority: P0 (Critical)
 * Acceptance Criteria: AC #6
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionPersistence } from '@/lib/hooks/useSessionPersistence';

describe('useSessionPersistence Hook - Story 4.6', () => {
  const projectId = 'test-proj-123';
  const storageKey = `visual-curation-session-${projectId}`;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  /**
   * [4.6-UNIT-013] Save Scroll Position
   */
  describe('[4.6-UNIT-013] Save Scroll Position', () => {
    test('should save scroll position to localStorage', () => {
      // Given: Hook initialized
      const { result } = renderHook(() => useSessionPersistence(projectId));

      // When: Saving scroll position
      act(() => {
        result.current.saveScrollPosition(500);
      });

      // Then: Should be saved in localStorage
      const stored = JSON.parse(localStorage.getItem(storageKey)!);
      expect(stored.scrollPosition).toBe(500);
    });

    test('should update lastUpdated timestamp on save', () => {
      // Given: Hook initialized with mocked Date
      const now = new Date('2025-11-22T12:00:00').getTime();
      vi.setSystemTime(now);

      const { result } = renderHook(() => useSessionPersistence(projectId));

      // When: Saving scroll position
      act(() => {
        result.current.saveScrollPosition(100);
      });

      // Then: Should have correct timestamp
      const stored = JSON.parse(localStorage.getItem(storageKey)!);
      expect(stored.lastUpdated).toBe(now);
    });

    test('should preserve existing preview state when saving scroll', () => {
      // Given: Existing session with preview state
      const existingState = {
        scrollPosition: 0,
        openPreviewId: 'preview-123',
        lastUpdated: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(existingState));

      const { result } = renderHook(() => useSessionPersistence(projectId));

      // When: Saving scroll position
      act(() => {
        result.current.saveScrollPosition(300);
      });

      // Then: Should preserve preview state
      const stored = JSON.parse(localStorage.getItem(storageKey)!);
      expect(stored.openPreviewId).toBe('preview-123');
      expect(stored.scrollPosition).toBe(300);
    });
  });

  /**
   * [4.6-UNIT-014] Save Preview State
   */
  describe('[4.6-UNIT-014] Save Preview State', () => {
    test('should save preview suggestion ID', () => {
      // Given: Hook initialized
      const { result } = renderHook(() => useSessionPersistence(projectId));

      // When: Saving preview state
      act(() => {
        result.current.savePreviewState('suggestion-456');
      });

      // Then: Should be saved
      const stored = JSON.parse(localStorage.getItem(storageKey)!);
      expect(stored.openPreviewId).toBe('suggestion-456');
    });

    test('should save null when clearing preview state', () => {
      // Given: Existing preview state
      const existingState = {
        scrollPosition: 100,
        openPreviewId: 'preview-123',
        lastUpdated: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(existingState));

      const { result } = renderHook(() => useSessionPersistence(projectId));

      // When: Clearing preview state
      act(() => {
        result.current.savePreviewState(null);
      });

      // Then: Should be null
      const stored = JSON.parse(localStorage.getItem(storageKey)!);
      expect(stored.openPreviewId).toBeNull();
    });

    test('should preserve scroll position when saving preview', () => {
      // Given: Existing session with scroll position
      const existingState = {
        scrollPosition: 750,
        openPreviewId: null,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(existingState));

      const { result } = renderHook(() => useSessionPersistence(projectId));

      // When: Saving preview state
      act(() => {
        result.current.savePreviewState('new-preview');
      });

      // Then: Should preserve scroll position
      const stored = JSON.parse(localStorage.getItem(storageKey)!);
      expect(stored.scrollPosition).toBe(750);
    });
  });

  /**
   * [4.6-UNIT-015] Restore State
   */
  describe('[4.6-UNIT-015] Restore State', () => {
    test('should restore saved state from localStorage', () => {
      // Given: Existing valid session
      const now = Date.now();
      const savedState = {
        scrollPosition: 500,
        openPreviewId: 'preview-123',
        lastUpdated: now,
      };
      localStorage.setItem(storageKey, JSON.stringify(savedState));

      const { result } = renderHook(() => useSessionPersistence(projectId));

      // When: Restoring state
      let restored;
      act(() => {
        restored = result.current.restoreState();
      });

      // Then: Should return saved state
      expect(restored).toEqual(savedState);
    });

    test('should return null when no state exists', () => {
      // Given: No saved state
      const { result } = renderHook(() => useSessionPersistence(projectId));

      // When: Restoring state
      let restored;
      act(() => {
        restored = result.current.restoreState();
      });

      // Then: Should return null
      expect(restored).toBeNull();
    });

    test('should return null for expired session (> 1 hour)', () => {
      // Given: Expired session (2 hours old)
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      const expiredState = {
        scrollPosition: 500,
        openPreviewId: 'preview-123',
        lastUpdated: twoHoursAgo,
      };
      localStorage.setItem(storageKey, JSON.stringify(expiredState));

      const { result } = renderHook(() => useSessionPersistence(projectId));

      // When: Restoring state
      let restored;
      act(() => {
        restored = result.current.restoreState();
      });

      // Then: Should return null and clear storage
      expect(restored).toBeNull();
      expect(localStorage.getItem(storageKey)).toBeNull();
    });

    test('should keep session valid for exactly 1 hour', () => {
      // Given: Session exactly 59 minutes old
      const fiftyNineMinutesAgo = Date.now() - 59 * 60 * 1000;
      const validState = {
        scrollPosition: 500,
        openPreviewId: null,
        lastUpdated: fiftyNineMinutesAgo,
      };
      localStorage.setItem(storageKey, JSON.stringify(validState));

      const { result } = renderHook(() => useSessionPersistence(projectId));

      // When: Restoring state
      let restored;
      act(() => {
        restored = result.current.restoreState();
      });

      // Then: Should return state (still valid)
      expect(restored).not.toBeNull();
      expect(restored!.scrollPosition).toBe(500);
    });
  });

  /**
   * [4.6-UNIT-016] Clear State
   */
  describe('[4.6-UNIT-016] Clear State', () => {
    test('should remove state from localStorage', () => {
      // Given: Existing session
      const savedState = {
        scrollPosition: 500,
        openPreviewId: 'preview-123',
        lastUpdated: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(savedState));

      const { result } = renderHook(() => useSessionPersistence(projectId));

      // When: Clearing state
      act(() => {
        result.current.clearState();
      });

      // Then: Should be removed
      expect(localStorage.getItem(storageKey)).toBeNull();
    });

    test('should not throw when clearing non-existent state', () => {
      // Given: No saved state
      const { result } = renderHook(() => useSessionPersistence(projectId));

      // When: Clearing state
      // Then: Should not throw
      expect(() => {
        act(() => {
          result.current.clearState();
        });
      }).not.toThrow();
    });
  });

  /**
   * [4.6-UNIT-017] Project Scoping
   */
  describe('[4.6-UNIT-017] Project-Scoped Storage', () => {
    test('should use project-specific storage key', () => {
      // Given: Two different project IDs
      const { result: result1 } = renderHook(() => useSessionPersistence('proj-1'));
      const { result: result2 } = renderHook(() => useSessionPersistence('proj-2'));

      // When: Saving to both
      act(() => {
        result1.current.saveScrollPosition(100);
        result2.current.saveScrollPosition(200);
      });

      // Then: Should be stored separately
      const state1 = JSON.parse(localStorage.getItem('visual-curation-session-proj-1')!);
      const state2 = JSON.parse(localStorage.getItem('visual-curation-session-proj-2')!);

      expect(state1.scrollPosition).toBe(100);
      expect(state2.scrollPosition).toBe(200);
    });

    test('should not affect other project sessions when clearing', () => {
      // Given: Two project sessions
      localStorage.setItem(
        'visual-curation-session-proj-1',
        JSON.stringify({ scrollPosition: 100, openPreviewId: null, lastUpdated: Date.now() })
      );
      localStorage.setItem(
        'visual-curation-session-proj-2',
        JSON.stringify({ scrollPosition: 200, openPreviewId: null, lastUpdated: Date.now() })
      );

      const { result } = renderHook(() => useSessionPersistence('proj-1'));

      // When: Clearing proj-1
      act(() => {
        result.current.clearState();
      });

      // Then: proj-2 should remain
      expect(localStorage.getItem('visual-curation-session-proj-1')).toBeNull();
      expect(localStorage.getItem('visual-curation-session-proj-2')).not.toBeNull();
    });
  });

  /**
   * [4.6-UNIT-018] Error Handling
   */
  describe('[4.6-UNIT-018] Error Handling', () => {
    test('should handle localStorage write errors gracefully', () => {
      // Given: localStorage that throws on setItem
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Override the global localStorage mock to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('QuotaExceededError');
      };

      const { result } = renderHook(() => useSessionPersistence(projectId));

      // When: Saving scroll position
      // Then: Should not throw
      expect(() => {
        act(() => {
          result.current.saveScrollPosition(500);
        });
      }).not.toThrow();

      // And: Should log error
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save scroll position:',
        expect.any(Error)
      );

      localStorage.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });

    test('should handle corrupted localStorage data gracefully', () => {
      // Given: Invalid JSON in localStorage
      localStorage.setItem(storageKey, 'invalid-json{');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => useSessionPersistence(projectId));

      // When: Restoring state
      let restored;
      act(() => {
        restored = result.current.restoreState();
      });

      // Then: Should return null and log error
      expect(restored).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('should handle localStorage read errors gracefully', () => {
      // Given: localStorage that throws on getItem
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      const { result } = renderHook(() => useSessionPersistence(projectId));

      // When: Restoring state
      let restored;
      act(() => {
        restored = result.current.restoreState();
      });

      // Then: Should return null
      expect(restored).toBeNull();

      getItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  /**
   * [4.6-UNIT-019] Memoization
   */
  describe('[4.6-UNIT-019] Function Stability', () => {
    test('should return stable function references', () => {
      // Given: Hook initialized
      const { result, rerender } = renderHook(() => useSessionPersistence(projectId));

      const initialSave = result.current.saveScrollPosition;
      const initialRestore = result.current.restoreState;

      // When: Rerendering
      rerender();

      // Then: Functions should be the same reference
      expect(result.current.saveScrollPosition).toBe(initialSave);
      expect(result.current.restoreState).toBe(initialRestore);
    });

    test('should update function references when projectId changes', () => {
      // Given: Hook initialized
      const { result, rerender } = renderHook(
        ({ id }) => useSessionPersistence(id),
        { initialProps: { id: 'proj-1' } }
      );

      const initialSave = result.current.saveScrollPosition;

      // When: Changing projectId
      rerender({ id: 'proj-2' });

      // Then: Functions should be new references
      expect(result.current.saveScrollPosition).not.toBe(initialSave);
    });
  });

  /**
   * [4.6-UNIT-020] Initial State Creation
   */
  describe('[4.6-UNIT-020] Initial State Creation', () => {
    test('should create initial state when none exists', () => {
      // Given: No existing state
      const { result } = renderHook(() => useSessionPersistence(projectId));

      // When: Saving scroll position for first time
      act(() => {
        result.current.saveScrollPosition(250);
      });

      // Then: Should create complete state structure
      const stored = JSON.parse(localStorage.getItem(storageKey)!);
      expect(stored).toEqual({
        scrollPosition: 250,
        openPreviewId: null,
        lastUpdated: expect.any(Number),
      });
    });
  });
});
