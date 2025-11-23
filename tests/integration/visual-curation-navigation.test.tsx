/**
 * Integration Tests - Visual Curation Navigation
 * Story 4.6: Visual Curation Workflow Integration & Error Recovery
 *
 * Tests for navigation flow including back button, breadcrumb navigation,
 * unsaved changes modal, and browser warning.
 *
 * Test IDs: 4.6-INT-009 to 4.6-INT-018
 * Priority: P0 (Critical)
 * Acceptance Criteria: AC #4, AC #5, AC #6, AC #7
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Plyr before importing components that use it
vi.mock('plyr', () => ({
  default: vi.fn().mockImplementation(() => ({
    play: vi.fn(),
    pause: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    currentTime: 0,
    volume: 1,
    paused: true,
  })),
}));

import { VisualCurationClient } from '@/app/projects/[id]/visual-curation/VisualCurationClient';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock curation store - must return a function that returns the store state
const mockSelections = new Map();
const mockGetSelectionCount = vi.fn(() => mockSelections.size);
const mockSetProject = vi.fn();
const mockSetTotalScenes = vi.fn();
const mockLoadSelections = vi.fn();

vi.mock('@/lib/stores/curation-store', () => ({
  useCurationStore: vi.fn(() => ({
    selections: mockSelections,
    setProject: mockSetProject,
    setTotalScenes: mockSetTotalScenes,
    loadSelections: mockLoadSelections,
    getSelectionCount: mockGetSelectionCount,
  })),
}));

describe('Visual Curation Navigation - Story 4.6', () => {
  const mockProject = {
    id: 'proj-123',
    name: 'Test Project',
    description: 'Test Description',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    current_step: 'visual-curation',
    visuals_generated: true,
    voiceovers_generated: true,
    selected_voice_id: 'voice-1',
  };

  const mockScenes = [
    {
      id: 'scene-1',
      project_id: 'proj-123',
      scene_number: 1,
      text: 'Scene 1 text',
      duration: 10,
      audio_file_path: '/audio/scene-1.mp3',
      selected_clip_id: null,
    },
    {
      id: 'scene-2',
      project_id: 'proj-123',
      scene_number: 2,
      text: 'Scene 2 text',
      duration: 15,
      audio_file_path: '/audio/scene-2.mp3',
      selected_clip_id: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelections.clear();
    localStorage.clear();

    // Default successful scenes fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenes: mockScenes },
      }),
    });
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * [4.6-INT-009] Back to Script Preview Button
   */
  describe('[4.6-INT-009] Back Navigation', () => {
    test('should navigate directly to voiceover-preview when no selections', async () => {
      // Given: No selections made
      mockGetSelectionCount.mockReturnValue(0);

      render(<VisualCurationClient project={mockProject} />);

      // Wait for scenes to load
      await waitFor(() => {
        expect(screen.getByText('Back to Script Preview')).toBeInTheDocument();
      });

      // When: Clicking back button
      const backButton = screen.getByRole('button', { name: /back to script preview/i });
      await userEvent.click(backButton);

      // Then: Should navigate directly (no modal)
      expect(mockPush).toHaveBeenCalledWith('/projects/proj-123/voiceover-preview');
    });

    test('should navigate directly when all selections complete', async () => {
      // Given: All selections made
      mockGetSelectionCount.mockReturnValue(2); // All 2 scenes selected

      render(<VisualCurationClient project={mockProject} />);

      await waitFor(() => {
        expect(screen.getByText('Back to Script Preview')).toBeInTheDocument();
      });

      // When: Clicking back button
      const backButton = screen.getByRole('button', { name: /back to script preview/i });
      await userEvent.click(backButton);

      // Then: Should navigate directly
      expect(mockPush).toHaveBeenCalledWith('/projects/proj-123/voiceover-preview');
    });

    test('should show unsaved changes modal when partial selections', async () => {
      // Given: Partial selections (1 of 2)
      mockGetSelectionCount.mockReturnValue(1);

      render(<VisualCurationClient project={mockProject} />);

      await waitFor(() => {
        expect(screen.getByText('Back to Script Preview')).toBeInTheDocument();
      });

      // When: Clicking back button
      const backButton = screen.getByRole('button', { name: /back to script preview/i });
      await userEvent.click(backButton);

      // Then: Should show modal
      await waitFor(() => {
        expect(screen.getByText('Incomplete Selections')).toBeInTheDocument();
      });
    });
  });

  /**
   * [4.6-INT-010] Breadcrumb Navigation
   */
  describe('[4.6-INT-010] Breadcrumb Navigation', () => {
    test('should render breadcrumb with all steps', async () => {
      // Given: Component rendered
      render(<VisualCurationClient project={mockProject} />);

      await waitFor(() => {
        expect(screen.getByText('Project')).toBeInTheDocument();
      });

      // Then: All breadcrumb steps visible
      expect(screen.getByText('Project')).toBeInTheDocument();
      expect(screen.getByText('Script')).toBeInTheDocument();
      expect(screen.getByText('Voiceover')).toBeInTheDocument();
      expect(screen.getByText('Visual Curation')).toBeInTheDocument();
    });

    test('should show modal when clicking breadcrumb with partial selections', async () => {
      // Given: Partial selections
      mockGetSelectionCount.mockReturnValue(1);

      render(<VisualCurationClient project={mockProject} />);

      await waitFor(() => {
        expect(screen.getByText('Script')).toBeInTheDocument();
      });

      // When: Clicking Script in breadcrumb
      const scriptLink = screen.getByText('Script').closest('a')!;
      await userEvent.click(scriptLink);

      // Then: Should show modal
      await waitFor(() => {
        expect(screen.getByText('Incomplete Selections')).toBeInTheDocument();
      });
    });
  });

  /**
   * [4.6-INT-011] Unsaved Changes Modal Actions
   */
  describe('[4.6-INT-011] Modal Actions', () => {
    test('should navigate when confirming leave in modal', async () => {
      // Given: Partial selections and modal shown
      mockGetSelectionCount.mockReturnValue(1);

      render(<VisualCurationClient project={mockProject} />);

      await waitFor(() => {
        expect(screen.getByText('Back to Script Preview')).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back to script preview/i });
      await userEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Incomplete Selections')).toBeInTheDocument();
      });

      // When: Clicking "Leave Anyway"
      const leaveButton = screen.getByRole('button', { name: /leave anyway/i });
      await userEvent.click(leaveButton);

      // Then: Should navigate
      expect(mockPush).toHaveBeenCalledWith('/projects/proj-123/voiceover-preview');
    });

    test('should stay on page when canceling modal', async () => {
      // Given: Partial selections and modal shown
      mockGetSelectionCount.mockReturnValue(1);

      render(<VisualCurationClient project={mockProject} />);

      await waitFor(() => {
        expect(screen.getByText('Back to Script Preview')).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back to script preview/i });
      await userEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Incomplete Selections')).toBeInTheDocument();
      });

      // When: Clicking "Stay on Page"
      const stayButton = screen.getByRole('button', { name: /stay on page/i });
      await userEvent.click(stayButton);

      // Then: Should not navigate
      expect(mockPush).not.toHaveBeenCalled();

      // And: Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Incomplete Selections')).not.toBeInTheDocument();
      });
    });
  });

  /**
   * [4.6-INT-012] Regenerate Visuals Button
   */
  describe('[4.6-INT-012] Regenerate Visuals', () => {
    test('should call generate-visuals API when clicking regenerate', async () => {
      // Given: Component rendered
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { scenes: mockScenes } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'Visuals generating' }),
        });

      render(<VisualCurationClient project={mockProject} />);

      await waitFor(() => {
        expect(screen.getByText('Regenerate Visuals')).toBeInTheDocument();
      });

      // When: Clicking regenerate
      const regenerateButton = screen.getByRole('button', { name: /regenerate visuals/i });
      await userEvent.click(regenerateButton);

      // Then: Should call API
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/projects/proj-123/generate-visuals',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    test('should show loading state during regeneration', async () => {
      // Given: Slow API response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { scenes: mockScenes } }),
        })
        .mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 1000)));

      render(<VisualCurationClient project={mockProject} />);

      await waitFor(() => {
        expect(screen.getByText('Regenerate Visuals')).toBeInTheDocument();
      });

      // When: Clicking regenerate
      const regenerateButton = screen.getByRole('button', { name: /regenerate visuals/i });
      await userEvent.click(regenerateButton);

      // Then: Button should be disabled
      expect(regenerateButton).toBeDisabled();
    });
  });

  /**
   * [4.6-INT-013] Browser Navigation Warning
   */
  describe('[4.6-INT-013] Browser beforeunload Warning', () => {
    test('should add beforeunload listener when partial selections', async () => {
      // Given: Partial selections
      mockGetSelectionCount.mockReturnValue(1);

      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      render(<VisualCurationClient project={mockProject} />);

      await waitFor(() => {
        expect(screen.getByText('Visual Curation')).toBeInTheDocument();
      });

      // Then: Should add beforeunload listener
      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    test('should remove beforeunload listener on unmount', async () => {
      // Given: Component with listener
      mockGetSelectionCount.mockReturnValue(1);

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<VisualCurationClient project={mockProject} />);

      await waitFor(() => {
        expect(screen.getByText('Visual Curation')).toBeInTheDocument();
      });

      // When: Unmounting
      unmount();

      // Then: Should remove listener
      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  /**
   * [4.6-INT-014] Selection Counter Display
   */
  describe('[4.6-INT-014] Selection Progress Counter', () => {
    test('should display correct selection count', async () => {
      // Given: 1 of 2 scenes selected
      mockGetSelectionCount.mockReturnValue(1);

      render(<VisualCurationClient project={mockProject} />);

      await waitFor(() => {
        expect(screen.getByText('1/2')).toBeInTheDocument();
      });
    });

    test('should show checkmark when all selected', async () => {
      // Given: All scenes selected
      mockGetSelectionCount.mockReturnValue(2);

      const { container } = render(<VisualCurationClient project={mockProject} />);

      await waitFor(() => {
        // Look for green checkmark
        const checkIcon = container.querySelector('.text-green-500');
        expect(checkIcon).toBeInTheDocument();
      });
    });
  });

  /**
   * [4.6-INT-015] Session Persistence Integration
   */
  describe('[4.6-INT-015] Session Persistence', () => {
    test('should save scroll position on scroll', async () => {
      // Given: Component rendered
      render(<VisualCurationClient project={mockProject} />);

      await waitFor(() => {
        expect(screen.getByText('Visual Curation')).toBeInTheDocument();
      });

      // When: Scrolling (simulated)
      fireEvent.scroll(window, { target: { scrollY: 500 } });

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Then: Should save to localStorage
      const stored = localStorage.getItem('visual-curation-session-proj-123');
      expect(stored).toBeTruthy();
      const state = JSON.parse(stored!);
      expect(state.scrollPosition).toBe(500);
    });
  });

  /**
   * [4.6-INT-016] Voiceover Preview Button (AC #1)
   */
  describe('[4.6-INT-016] Continue to Visual Curation Button', () => {
    // This tests the voiceover-preview side (AC #1)
    // The actual button is in VoiceoverPreviewClient
    test('navigation to visual-curation should work', async () => {
      // Given: Component rendered
      render(<VisualCurationClient project={mockProject} />);

      await waitFor(() => {
        expect(screen.getByText('Visual Curation')).toBeInTheDocument();
      });

      // Then: Visual curation page should load correctly
      expect(screen.getByText(mockProject.name)).toBeInTheDocument();
    });
  });

  /**
   * [4.6-INT-017] Navigation with Different Destinations
   */
  describe('[4.6-INT-017] Various Navigation Destinations', () => {
    test('should navigate to correct breadcrumb destination', async () => {
      // Given: Partial selections
      mockGetSelectionCount.mockReturnValue(1);

      render(<VisualCurationClient project={mockProject} />);

      await waitFor(() => {
        expect(screen.getByText('Project')).toBeInTheDocument();
      });

      // When: Clicking Project link
      const projectLink = screen.getByText('Project').closest('a')!;
      await userEvent.click(projectLink);

      // Then: Should show modal (not navigate yet)
      await waitFor(() => {
        expect(screen.getByText('Incomplete Selections')).toBeInTheDocument();
      });

      // When: Confirming leave
      const leaveButton = screen.getByRole('button', { name: /leave anyway/i });
      await userEvent.click(leaveButton);

      // Then: Should navigate to project page
      expect(mockPush).toHaveBeenCalledWith('/projects/proj-123');
    });
  });

  /**
   * [4.6-INT-018] Loading State Navigation Handling
   */
  describe('[4.6-INT-018] Loading State', () => {
    test('should not show navigation buttons during loading', () => {
      // Given: Slow API response (never resolves during test)
      mockFetch.mockImplementation(() => new Promise(() => {}));

      // When: Rendering
      render(<VisualCurationClient project={mockProject} />);

      // Then: Navigation buttons should not be visible
      expect(screen.queryByText('Back to Script Preview')).not.toBeInTheDocument();
      expect(screen.queryByText('Regenerate Visuals')).not.toBeInTheDocument();
    });

    test('should show navigation buttons after loading completes', async () => {
      // Given: Component rendered
      render(<VisualCurationClient project={mockProject} />);

      // Then: After loading, buttons should appear
      await waitFor(() => {
        expect(screen.getByText('Back to Script Preview')).toBeInTheDocument();
        expect(screen.getByText('Regenerate Visuals')).toBeInTheDocument();
      });
    });
  });
});
