/**
 * AssemblyTriggerButton Component Tests - Epic 4, Story 4.5
 * Test ID Prefix: 4.5-UNIT-xxx
 * Priority: P1/P2
 *
 * Tests for the AssemblyTriggerButton component that displays
 * as a sticky footer with validation and loading states.
 *
 * Following TEA test-quality.md best practices:
 * - BDD format (Given-When-Then)
 * - Test IDs for traceability
 * - Priority markers for triage
 * - Explicit assertions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssemblyTriggerButton } from '@/components/features/curation/AssemblyTriggerButton';
import { useCurationStore } from '@/lib/stores/curation-store';

// Mock the curation store
vi.mock('@/lib/stores/curation-store', () => ({
  useCurationStore: vi.fn(),
}));

const mockUseCurationStore = vi.mocked(useCurationStore);

describe('[4.5-UNIT] AssemblyTriggerButton Component Tests', () => {
  const defaultOnAssembleClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default store state: no selections
    mockUseCurationStore.mockImplementation((selector: any) => {
      const state = {
        selections: new Map(),
        totalScenes: 5,
      };
      return selector(state);
    });
  });

  describe('[4.5-UNIT-001] [P1] Disabled State When Selections Incomplete', () => {
    it('should disable button when not all scenes have selections', () => {
      // Given: Store with 3/5 selections
      mockUseCurationStore.mockImplementation((selector: any) => {
        const state = {
          selections: new Map([
            ['scene-1', { sceneId: 'scene-1', suggestionId: 'sugg-1', videoId: 'vid-1' }],
            ['scene-2', { sceneId: 'scene-2', suggestionId: 'sugg-2', videoId: 'vid-2' }],
            ['scene-3', { sceneId: 'scene-3', suggestionId: 'sugg-3', videoId: 'vid-3' }],
          ]),
          totalScenes: 5,
        };
        return selector(state);
      });

      // When: Render AssemblyTriggerButton
      render(
        <AssemblyTriggerButton
          onAssembleClick={defaultOnAssembleClick}
          isLoading={false}
        />
      );

      // Then: Button is disabled
      const button = screen.getByRole('button', { name: /assemble video/i });
      expect(button).toBeDisabled();
    });

    it('should show selection progress indicator', () => {
      // Given: Store with 3/5 selections
      mockUseCurationStore.mockImplementation((selector: any) => {
        const state = {
          selections: new Map([
            ['scene-1', { sceneId: 'scene-1', suggestionId: 'sugg-1', videoId: 'vid-1' }],
            ['scene-2', { sceneId: 'scene-2', suggestionId: 'sugg-2', videoId: 'vid-2' }],
            ['scene-3', { sceneId: 'scene-3', suggestionId: 'sugg-3', videoId: 'vid-3' }],
          ]),
          totalScenes: 5,
        };
        return selector(state);
      });

      // When: Render component
      render(
        <AssemblyTriggerButton
          onAssembleClick={defaultOnAssembleClick}
          isLoading={false}
        />
      );

      // Then: Shows "3/5 scenes selected"
      expect(screen.getByText('3/5')).toBeInTheDocument();
      expect(screen.getByText(/scenes selected/i)).toBeInTheDocument();
    });

    it('should show remaining count when incomplete', () => {
      // Given: Store with 3/5 selections
      mockUseCurationStore.mockImplementation((selector: any) => {
        const state = {
          selections: new Map([
            ['scene-1', { sceneId: 'scene-1', suggestionId: 'sugg-1', videoId: 'vid-1' }],
            ['scene-2', { sceneId: 'scene-2', suggestionId: 'sugg-2', videoId: 'vid-2' }],
            ['scene-3', { sceneId: 'scene-3', suggestionId: 'sugg-3', videoId: 'vid-3' }],
          ]),
          totalScenes: 5,
        };
        return selector(state);
      });

      // When: Render component
      render(
        <AssemblyTriggerButton
          onAssembleClick={defaultOnAssembleClick}
          isLoading={false}
        />
      );

      // Then: Shows "(2 remaining)"
      expect(screen.getByText('(2 remaining)')).toBeInTheDocument();
    });

    it('should have tooltip message on disabled button', () => {
      // Given: Store with incomplete selections
      mockUseCurationStore.mockImplementation((selector: any) => {
        const state = {
          selections: new Map(),
          totalScenes: 5,
        };
        return selector(state);
      });

      // When: Render component
      render(
        <AssemblyTriggerButton
          onAssembleClick={defaultOnAssembleClick}
          isLoading={false}
        />
      );

      // Then: Button has title attribute with tooltip message
      const button = screen.getByRole('button', { name: /assemble video/i });
      expect(button).toHaveAttribute('title', 'Select clips for all 5 scenes to continue');
    });
  });

  describe('[4.5-UNIT-002] [P1] Enabled State When All Selections Complete', () => {
    it('should enable button when all scenes have selections', () => {
      // Given: Store with 5/5 selections
      mockUseCurationStore.mockImplementation((selector: any) => {
        const state = {
          selections: new Map([
            ['scene-1', { sceneId: 'scene-1', suggestionId: 'sugg-1', videoId: 'vid-1' }],
            ['scene-2', { sceneId: 'scene-2', suggestionId: 'sugg-2', videoId: 'vid-2' }],
            ['scene-3', { sceneId: 'scene-3', suggestionId: 'sugg-3', videoId: 'vid-3' }],
            ['scene-4', { sceneId: 'scene-4', suggestionId: 'sugg-4', videoId: 'vid-4' }],
            ['scene-5', { sceneId: 'scene-5', suggestionId: 'sugg-5', videoId: 'vid-5' }],
          ]),
          totalScenes: 5,
        };
        return selector(state);
      });

      // When: Render component
      render(
        <AssemblyTriggerButton
          onAssembleClick={defaultOnAssembleClick}
          isLoading={false}
        />
      );

      // Then: Button is enabled
      const button = screen.getByRole('button', { name: /assemble video/i });
      expect(button).not.toBeDisabled();
    });

    it('should trigger onAssembleClick when clicked', () => {
      // Given: Store with all selections complete
      mockUseCurationStore.mockImplementation((selector: any) => {
        const state = {
          selections: new Map([
            ['scene-1', { sceneId: 'scene-1', suggestionId: 'sugg-1', videoId: 'vid-1' }],
            ['scene-2', { sceneId: 'scene-2', suggestionId: 'sugg-2', videoId: 'vid-2' }],
            ['scene-3', { sceneId: 'scene-3', suggestionId: 'sugg-3', videoId: 'vid-3' }],
          ]),
          totalScenes: 3,
        };
        return selector(state);
      });

      // When: Render and click button
      render(
        <AssemblyTriggerButton
          onAssembleClick={defaultOnAssembleClick}
          isLoading={false}
        />
      );

      const button = screen.getByRole('button', { name: /assemble video/i });
      fireEvent.click(button);

      // Then: Callback is invoked
      expect(defaultOnAssembleClick).toHaveBeenCalledTimes(1);
    });

    it('should not show tooltip when enabled', () => {
      // Given: Store with all selections complete
      mockUseCurationStore.mockImplementation((selector: any) => {
        const state = {
          selections: new Map([
            ['scene-1', { sceneId: 'scene-1', suggestionId: 'sugg-1', videoId: 'vid-1' }],
          ]),
          totalScenes: 1,
        };
        return selector(state);
      });

      // When: Render component
      render(
        <AssemblyTriggerButton
          onAssembleClick={defaultOnAssembleClick}
          isLoading={false}
        />
      );

      // Then: Button has no title attribute
      const button = screen.getByRole('button', { name: /assemble video/i });
      expect(button).not.toHaveAttribute('title');
    });
  });

  describe('[4.5-UNIT-003] [P1] Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      // Given: Store with all selections, loading state
      mockUseCurationStore.mockImplementation((selector: any) => {
        const state = {
          selections: new Map([
            ['scene-1', { sceneId: 'scene-1', suggestionId: 'sugg-1', videoId: 'vid-1' }],
          ]),
          totalScenes: 1,
        };
        return selector(state);
      });

      // When: Render with isLoading=true
      render(
        <AssemblyTriggerButton
          onAssembleClick={defaultOnAssembleClick}
          isLoading={true}
        />
      );

      // Then: Shows "Assembling..." text
      expect(screen.getByText('Assembling...')).toBeInTheDocument();
    });

    it('should disable button during loading', () => {
      // Given: Store with all selections, loading state
      mockUseCurationStore.mockImplementation((selector: any) => {
        const state = {
          selections: new Map([
            ['scene-1', { sceneId: 'scene-1', suggestionId: 'sugg-1', videoId: 'vid-1' }],
          ]),
          totalScenes: 1,
        };
        return selector(state);
      });

      // When: Render with isLoading=true
      render(
        <AssemblyTriggerButton
          onAssembleClick={defaultOnAssembleClick}
          isLoading={true}
        />
      );

      // Then: Button is disabled
      const button = screen.getByRole('button', { name: /assembling/i });
      expect(button).toBeDisabled();
    });
  });

  describe('[4.5-UNIT-004] [P2] Edge Cases', () => {
    it('should handle zero scenes', () => {
      // Given: Store with no scenes
      mockUseCurationStore.mockImplementation((selector: any) => {
        const state = {
          selections: new Map(),
          totalScenes: 0,
        };
        return selector(state);
      });

      // When: Render component
      render(
        <AssemblyTriggerButton
          onAssembleClick={defaultOnAssembleClick}
          isLoading={false}
        />
      );

      // Then: Button is disabled
      const button = screen.getByRole('button', { name: /assemble video/i });
      expect(button).toBeDisabled();
    });

    it('should show correct count with single scene', () => {
      // Given: Store with 1/1 selection
      mockUseCurationStore.mockImplementation((selector: any) => {
        const state = {
          selections: new Map([
            ['scene-1', { sceneId: 'scene-1', suggestionId: 'sugg-1', videoId: 'vid-1' }],
          ]),
          totalScenes: 1,
        };
        return selector(state);
      });

      // When: Render component
      render(
        <AssemblyTriggerButton
          onAssembleClick={defaultOnAssembleClick}
          isLoading={false}
        />
      );

      // Then: Shows "1/1 scenes selected"
      expect(screen.getByText('1/1')).toBeInTheDocument();
    });
  });
});
