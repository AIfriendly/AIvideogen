/**
 * Unit Tests for Curation Store
 *
 * Story 4.4: Clip Selection Mechanism & State Management
 *
 * Test Coverage:
 * 1. selectClip adds selection to Map
 * 2. selectClip replaces previous selection for same scene
 * 3. clearSelection removes selection
 * 4. isSceneComplete returns correct boolean
 * 5. getSelectionCount returns accurate count
 * 6. getAllSelected returns true when all scenes selected
 * 7. loadSelections populates Map from array
 * 8. reset clears all state
 * 9. setProject and setTotalScenes work correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCurationStore } from '../curation-store';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useCurationStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useCurationStore());
    act(() => {
      result.current.reset();
    });

    // Clear mocks
    localStorageMock.clear();
    mockFetch.mockReset();
  });

  // ============================================================================
  // Project and Scene Setup Tests
  // ============================================================================

  describe('setProject', () => {
    it('[4.4-UT-001] should set the project ID', () => {
      const { result } = renderHook(() => useCurationStore());

      act(() => {
        result.current.setProject('project-123');
      });

      expect(result.current.projectId).toBe('project-123');
    });

    it('[4.4-UT-002] should reset selections when switching to different project', () => {
      const { result } = renderHook(() => useCurationStore());

      // Set initial project and add selection
      act(() => {
        result.current.setProject('project-1');
        result.current.selectClip('scene-1', 'suggestion-1', 'video-1');
      });

      expect(result.current.selections.size).toBe(1);

      // Switch to different project
      act(() => {
        result.current.setProject('project-2');
      });

      expect(result.current.projectId).toBe('project-2');
      expect(result.current.selections.size).toBe(0);
      expect(result.current.totalScenes).toBe(0);
    });
  });

  describe('setTotalScenes', () => {
    it('[4.4-UT-003] should set the total scenes count', () => {
      const { result } = renderHook(() => useCurationStore());

      act(() => {
        result.current.setTotalScenes(5);
      });

      expect(result.current.totalScenes).toBe(5);
    });
  });

  // ============================================================================
  // Selection Tests
  // ============================================================================

  describe('selectClip', () => {
    beforeEach(() => {
      // Mock successful API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });

    it('[4.4-UT-004] should add selection to Map (AC1, AC6)', () => {
      const { result } = renderHook(() => useCurationStore());

      act(() => {
        result.current.setProject('project-1');
        result.current.selectClip('scene-1', 'suggestion-1', 'video-1');
      });

      expect(result.current.selections.has('scene-1')).toBe(true);
      const selection = result.current.selections.get('scene-1');
      expect(selection).toEqual({
        sceneId: 'scene-1',
        suggestionId: 'suggestion-1',
        videoId: 'video-1',
      });
    });

    it('[4.4-UT-005] should replace previous selection for same scene (AC2)', () => {
      const { result } = renderHook(() => useCurationStore());

      act(() => {
        result.current.setProject('project-1');
        result.current.selectClip('scene-1', 'suggestion-1', 'video-1');
      });

      expect(result.current.selections.get('scene-1')?.suggestionId).toBe('suggestion-1');

      act(() => {
        result.current.selectClip('scene-1', 'suggestion-2', 'video-2');
      });

      expect(result.current.selections.size).toBe(1);
      expect(result.current.selections.get('scene-1')?.suggestionId).toBe('suggestion-2');
    });

    it('[4.4-UT-006] should make API call to save selection (AC4)', async () => {
      const { result } = renderHook(() => useCurationStore());

      act(() => {
        result.current.setProject('project-1');
        result.current.selectClip('scene-1', 'suggestion-1', 'video-1');
      });

      // Wait for async API call
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/projects/project-1/select-clip',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sceneId: 'scene-1',
              suggestionId: 'suggestion-1',
            }),
          })
        );
      });
    });

    it('[4.4-UT-007] should revert selection on API error (AC7)', async () => {
      // Mock API failure
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to save' }),
      });

      const errorCallback = vi.fn();
      const { result } = renderHook(() => useCurationStore());

      act(() => {
        result.current.setProject('project-1');
        result.current.selectClip('scene-1', 'suggestion-1', 'video-1', errorCallback);
      });

      // Selection should be optimistically added
      expect(result.current.selections.has('scene-1')).toBe(true);

      // Wait for API call and reversion
      await vi.waitFor(() => {
        expect(result.current.selections.has('scene-1')).toBe(false);
      });

      expect(errorCallback).toHaveBeenCalled();
    });

    it('[4.4-UT-008] should restore previous selection on API error', async () => {
      const { result } = renderHook(() => useCurationStore());

      // First successful selection
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      act(() => {
        result.current.setProject('project-1');
        result.current.selectClip('scene-1', 'suggestion-1', 'video-1');
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Second selection that fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed' }),
      });

      act(() => {
        result.current.selectClip('scene-1', 'suggestion-2', 'video-2');
      });

      // Wait for reversion
      await vi.waitFor(() => {
        const selection = result.current.selections.get('scene-1');
        expect(selection?.suggestionId).toBe('suggestion-1');
      });
    });
  });

  describe('clearSelection', () => {
    it('[4.4-UT-009] should remove selection from Map', () => {
      const { result } = renderHook(() => useCurationStore());

      act(() => {
        result.current.setProject('project-1');
        result.current.selectClip('scene-1', 'suggestion-1', 'video-1');
      });

      expect(result.current.selections.has('scene-1')).toBe(true);

      act(() => {
        result.current.clearSelection('scene-1');
      });

      expect(result.current.selections.has('scene-1')).toBe(false);
    });

    it('[4.4-UT-010] should handle clearing non-existent selection', () => {
      const { result } = renderHook(() => useCurationStore());

      act(() => {
        result.current.clearSelection('non-existent');
      });

      expect(result.current.selections.size).toBe(0);
    });
  });

  describe('loadSelections', () => {
    it('[4.4-UT-011] should populate Map from array (AC3)', () => {
      const { result } = renderHook(() => useCurationStore());

      const selections = [
        { sceneId: 'scene-1', suggestionId: 'suggestion-1', videoId: 'video-1' },
        { sceneId: 'scene-2', suggestionId: 'suggestion-2', videoId: 'video-2' },
        { sceneId: 'scene-3', suggestionId: 'suggestion-3', videoId: 'video-3' },
      ];

      act(() => {
        result.current.loadSelections(selections);
      });

      expect(result.current.selections.size).toBe(3);
      expect(result.current.selections.get('scene-1')?.suggestionId).toBe('suggestion-1');
      expect(result.current.selections.get('scene-2')?.suggestionId).toBe('suggestion-2');
      expect(result.current.selections.get('scene-3')?.suggestionId).toBe('suggestion-3');
    });

    it('[4.4-UT-012] should replace existing selections', () => {
      const { result } = renderHook(() => useCurationStore());

      // Add initial selection
      act(() => {
        result.current.setProject('project-1');
        result.current.selectClip('scene-1', 'old-suggestion', 'old-video');
      });

      // Load new selections
      const newSelections = [
        { sceneId: 'scene-1', suggestionId: 'new-suggestion', videoId: 'new-video' },
      ];

      act(() => {
        result.current.loadSelections(newSelections);
      });

      expect(result.current.selections.size).toBe(1);
      expect(result.current.selections.get('scene-1')?.suggestionId).toBe('new-suggestion');
    });
  });

  // ============================================================================
  // Computed State Tests
  // ============================================================================

  describe('isSceneComplete', () => {
    it('[4.4-UT-013] should return true when scene has selection', () => {
      const { result } = renderHook(() => useCurationStore());

      act(() => {
        result.current.setProject('project-1');
        result.current.selectClip('scene-1', 'suggestion-1', 'video-1');
      });

      expect(result.current.isSceneComplete('scene-1')).toBe(true);
    });

    it('[4.4-UT-014] should return false when scene has no selection (AC8)', () => {
      const { result } = renderHook(() => useCurationStore());

      expect(result.current.isSceneComplete('scene-1')).toBe(false);
    });
  });

  describe('getSelectionCount', () => {
    it('[4.4-UT-015] should return accurate count (AC5)', () => {
      const { result } = renderHook(() => useCurationStore());

      expect(result.current.getSelectionCount()).toBe(0);

      act(() => {
        result.current.setProject('project-1');
        result.current.selectClip('scene-1', 'suggestion-1', 'video-1');
        result.current.selectClip('scene-2', 'suggestion-2', 'video-2');
      });

      expect(result.current.getSelectionCount()).toBe(2);

      act(() => {
        result.current.selectClip('scene-3', 'suggestion-3', 'video-3');
      });

      expect(result.current.getSelectionCount()).toBe(3);
    });
  });

  describe('getAllSelected', () => {
    it('[4.4-UT-016] should return true when all scenes selected', () => {
      const { result } = renderHook(() => useCurationStore());

      act(() => {
        result.current.setProject('project-1');
        result.current.setTotalScenes(3);
        result.current.selectClip('scene-1', 'suggestion-1', 'video-1');
        result.current.selectClip('scene-2', 'suggestion-2', 'video-2');
        result.current.selectClip('scene-3', 'suggestion-3', 'video-3');
      });

      expect(result.current.getAllSelected()).toBe(true);
    });

    it('[4.4-UT-017] should return false when not all scenes selected', () => {
      const { result } = renderHook(() => useCurationStore());

      act(() => {
        result.current.setProject('project-1');
        result.current.setTotalScenes(5);
        result.current.selectClip('scene-1', 'suggestion-1', 'video-1');
        result.current.selectClip('scene-2', 'suggestion-2', 'video-2');
      });

      expect(result.current.getAllSelected()).toBe(false);
    });

    it('[4.4-UT-018] should return false when totalScenes is 0', () => {
      const { result } = renderHook(() => useCurationStore());

      act(() => {
        result.current.setProject('project-1');
        result.current.selectClip('scene-1', 'suggestion-1', 'video-1');
      });

      expect(result.current.getAllSelected()).toBe(false);
    });
  });

  // ============================================================================
  // Reset Tests
  // ============================================================================

  describe('reset', () => {
    it('[4.4-UT-019] should clear all state', () => {
      const { result } = renderHook(() => useCurationStore());

      act(() => {
        result.current.setProject('project-1');
        result.current.setTotalScenes(5);
        result.current.selectClip('scene-1', 'suggestion-1', 'video-1');
        result.current.selectClip('scene-2', 'suggestion-2', 'video-2');
      });

      expect(result.current.projectId).toBe('project-1');
      expect(result.current.totalScenes).toBe(5);
      expect(result.current.selections.size).toBe(2);

      act(() => {
        result.current.reset();
      });

      expect(result.current.projectId).toBeNull();
      expect(result.current.totalScenes).toBe(0);
      expect(result.current.selections.size).toBe(0);
    });
  });

  // ============================================================================
  // Multiple Scenes Tests
  // ============================================================================

  describe('multiple scenes', () => {
    it('[4.4-UT-020] should handle selections across multiple scenes', () => {
      const { result } = renderHook(() => useCurationStore());

      act(() => {
        result.current.setProject('project-1');
        result.current.setTotalScenes(5);
        result.current.selectClip('scene-1', 'suggestion-1', 'video-1');
        result.current.selectClip('scene-2', 'suggestion-2', 'video-2');
        result.current.selectClip('scene-3', 'suggestion-3', 'video-3');
      });

      expect(result.current.getSelectionCount()).toBe(3);
      expect(result.current.isSceneComplete('scene-1')).toBe(true);
      expect(result.current.isSceneComplete('scene-2')).toBe(true);
      expect(result.current.isSceneComplete('scene-3')).toBe(true);
      expect(result.current.isSceneComplete('scene-4')).toBe(false);
      expect(result.current.isSceneComplete('scene-5')).toBe(false);
    });
  });
});
