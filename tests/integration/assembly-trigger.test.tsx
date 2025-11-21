/**
 * Assembly Trigger Integration Tests - Epic 4, Story 4.5
 * Test ID Prefix: 4.5-INT-xxx
 * Priority: P1/P2
 *
 * Integration tests for the full assembly trigger flow:
 * Button click -> Modal -> Confirm -> API -> Navigation
 *
 * Following TEA test-quality.md best practices:
 * - BDD format (Given-When-Then)
 * - Test IDs for traceability
 * - Priority markers for triage
 * - Explicit assertions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VisualCurationClient } from '@/app/projects/[id]/visual-curation/VisualCurationClient';
import { useCurationStore } from '@/lib/stores/curation-store';
import { faker } from '@faker-js/faker';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock VideoPreviewPlayer to avoid plyr import issues
vi.mock('@/components/features/curation/VideoPreviewPlayer', () => ({
  VideoPreviewPlayer: () => <div data-testid="video-preview-player">Video Preview</div>,
}));

// Mock VisualSuggestionGallery to avoid complex dependencies
vi.mock('@/components/features/curation/VisualSuggestionGallery', () => ({
  VisualSuggestionGallery: () => <div data-testid="visual-suggestion-gallery">Gallery</div>,
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('[4.5-INT] Assembly Trigger Integration Tests', () => {
  const projectId = faker.string.uuid();
  const projectName = 'Test Integration Project';

  const mockProject = {
    id: projectId,
    name: projectName,
    current_step: 'visual_curation',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockScenes = [
    {
      id: 'scene-1',
      project_id: projectId,
      scene_number: 1,
      text: 'Scene 1 text',
      audio_file_path: 'audio1.mp3',
      duration: 10,
      selected_clip_id: 'clip-1',
    },
    {
      id: 'scene-2',
      project_id: projectId,
      scene_number: 2,
      text: 'Scene 2 text',
      audio_file_path: 'audio2.mp3',
      duration: 15,
      selected_clip_id: 'clip-2',
    },
    {
      id: 'scene-3',
      project_id: projectId,
      scene_number: 3,
      text: 'Scene 3 text',
      audio_file_path: 'audio3.mp3',
      duration: 12,
      selected_clip_id: 'clip-3',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset curation store
    useCurationStore.setState({
      projectId: null,
      selections: new Map(),
      totalScenes: 0,
    });

    // Default fetch mock for scenes API
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/scenes')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { scenes: mockScenes },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('[4.5-INT-001] [P1] Button State Updates', () => {
    it('should enable button when all scenes have selections', async () => {
      // Given: Store with all selections complete
      useCurationStore.setState({
        projectId,
        selections: new Map([
          ['scene-1', { sceneId: 'scene-1', suggestionId: 'sugg-1', videoId: 'vid-1' }],
          ['scene-2', { sceneId: 'scene-2', suggestionId: 'sugg-2', videoId: 'vid-2' }],
          ['scene-3', { sceneId: 'scene-3', suggestionId: 'sugg-3', videoId: 'vid-3' }],
        ]),
        totalScenes: 3,
      });

      // When: Render the component
      render(<VisualCurationClient project={mockProject as any} />);

      // Then: Wait for scenes to load and button to appear
      await waitFor(() => {
        expect(screen.getByText('Scene 1')).toBeInTheDocument();
      });

      // Button should be enabled
      const button = screen.getByRole('button', { name: /assemble video/i });
      expect(button).not.toBeDisabled();
    });

    it('should disable button when selections are incomplete', async () => {
      // Given: Scenes with only partial selections in mock data
      const partialSelectionScenes = [
        {
          id: 'scene-1',
          project_id: projectId,
          scene_number: 1,
          text: 'Scene 1 text',
          audio_file_path: 'audio1.mp3',
          duration: 10,
          selected_clip_id: 'clip-1', // Only scene 1 has selection
        },
        {
          id: 'scene-2',
          project_id: projectId,
          scene_number: 2,
          text: 'Scene 2 text',
          audio_file_path: 'audio2.mp3',
          duration: 15,
          selected_clip_id: null, // No selection
        },
        {
          id: 'scene-3',
          project_id: projectId,
          scene_number: 3,
          text: 'Scene 3 text',
          audio_file_path: 'audio3.mp3',
          duration: 12,
          selected_clip_id: null, // No selection
        },
      ];

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/scenes')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: { scenes: partialSelectionScenes },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      // When: Render the component
      render(<VisualCurationClient project={mockProject as any} />);

      // Then: Wait for scenes to load
      await waitFor(() => {
        expect(screen.getByText('Scene 1')).toBeInTheDocument();
      });

      // Button should be disabled (1/3 selections)
      const button = screen.getByRole('button', { name: /assemble video/i });
      expect(button).toBeDisabled();
    });
  });

  describe('[4.5-INT-002] [P1] Modal Flow', () => {
    it('should open modal when Assemble Video button is clicked', async () => {
      // Given: Store with all selections
      useCurationStore.setState({
        projectId,
        selections: new Map([
          ['scene-1', { sceneId: 'scene-1', suggestionId: 'sugg-1', videoId: 'vid-1' }],
          ['scene-2', { sceneId: 'scene-2', suggestionId: 'sugg-2', videoId: 'vid-2' }],
          ['scene-3', { sceneId: 'scene-3', suggestionId: 'sugg-3', videoId: 'vid-3' }],
        ]),
        totalScenes: 3,
      });

      // When: Render and click the button
      render(<VisualCurationClient project={mockProject as any} />);

      await waitFor(() => {
        expect(screen.getByText('Scene 1')).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /assemble video/i });
      fireEvent.click(button);

      // Then: Modal should appear
      await waitFor(() => {
        expect(screen.getByText('Ready to Assemble?')).toBeInTheDocument();
      });
    });

    it('should close modal when Cancel is clicked', async () => {
      // Given: Store with all selections
      useCurationStore.setState({
        projectId,
        selections: new Map([
          ['scene-1', { sceneId: 'scene-1', suggestionId: 'sugg-1', videoId: 'vid-1' }],
          ['scene-2', { sceneId: 'scene-2', suggestionId: 'sugg-2', videoId: 'vid-2' }],
          ['scene-3', { sceneId: 'scene-3', suggestionId: 'sugg-3', videoId: 'vid-3' }],
        ]),
        totalScenes: 3,
      });

      // When: Render, open modal, and click Cancel
      render(<VisualCurationClient project={mockProject as any} />);

      await waitFor(() => {
        expect(screen.getByText('Scene 1')).toBeInTheDocument();
      });

      const assembleButton = screen.getByRole('button', { name: /assemble video/i });
      fireEvent.click(assembleButton);

      await waitFor(() => {
        expect(screen.getByText('Ready to Assemble?')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Then: Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Ready to Assemble?')).not.toBeInTheDocument();
      });
    });
  });

  describe('[4.5-INT-003] [P1] API Call and Navigation', () => {
    it('should call API and navigate on successful assembly', async () => {
      // Given: Store with all selections
      useCurationStore.setState({
        projectId,
        selections: new Map([
          ['scene-1', { sceneId: 'scene-1', suggestionId: 'sugg-1', videoId: 'vid-1' }],
          ['scene-2', { sceneId: 'scene-2', suggestionId: 'sugg-2', videoId: 'vid-2' }],
          ['scene-3', { sceneId: 'scene-3', suggestionId: 'sugg-3', videoId: 'vid-3' }],
        ]),
        totalScenes: 3,
      });

      // Mock successful assembly API response
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/scenes')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: { scenes: mockScenes },
              }),
          });
        }
        if (url.includes('/assemble')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                assemblyJobId: 'job-123-abc',
                status: 'queued',
                message: 'Video assembly started',
                sceneCount: 3,
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      // When: Complete the assembly flow
      render(<VisualCurationClient project={mockProject as any} />);

      await waitFor(() => {
        expect(screen.getByText('Scene 1')).toBeInTheDocument();
      });

      // Click Assemble Video
      const assembleButton = screen.getByRole('button', { name: /assemble video/i });
      fireEvent.click(assembleButton);

      await waitFor(() => {
        expect(screen.getByText('Ready to Assemble?')).toBeInTheDocument();
      });

      // Click Confirm Assembly
      const confirmButton = screen.getByRole('button', { name: /confirm assembly/i });
      fireEvent.click(confirmButton);

      // Then: API should be called and navigation should occur
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/projects/${projectId}/assemble`,
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          `/projects/${projectId}/assembly?jobId=job-123-abc`
        );
      });
    });

    it('should show error toast on API failure', async () => {
      // Given: Store with all selections
      useCurationStore.setState({
        projectId,
        selections: new Map([
          ['scene-1', { sceneId: 'scene-1', suggestionId: 'sugg-1', videoId: 'vid-1' }],
          ['scene-2', { sceneId: 'scene-2', suggestionId: 'sugg-2', videoId: 'vid-2' }],
          ['scene-3', { sceneId: 'scene-3', suggestionId: 'sugg-3', videoId: 'vid-3' }],
        ]),
        totalScenes: 3,
      });

      // Mock failed assembly API response
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/scenes')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: { scenes: mockScenes },
              }),
          });
        }
        if (url.includes('/assemble')) {
          return Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve({
                error: 'Not all scenes have clip selections',
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      // Import toast to check if it was called
      const { toast } = await import('@/hooks/use-toast');

      // When: Complete the assembly flow
      render(<VisualCurationClient project={mockProject as any} />);

      await waitFor(() => {
        expect(screen.getByText('Scene 1')).toBeInTheDocument();
      });

      // Click Assemble Video
      const assembleButton = screen.getByRole('button', { name: /assemble video/i });
      fireEvent.click(assembleButton);

      await waitFor(() => {
        expect(screen.getByText('Ready to Assemble?')).toBeInTheDocument();
      });

      // Click Confirm Assembly
      const confirmButton = screen.getByRole('button', { name: /confirm assembly/i });
      fireEvent.click(confirmButton);

      // Then: Error toast should be shown
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
            title: 'Assembly Failed',
          })
        );
      });

      // Navigation should not occur
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('[4.5-INT-004] [P2] Loading States', () => {
    it('should show loading state in modal during assembly', async () => {
      // Given: Store with all selections
      useCurationStore.setState({
        projectId,
        selections: new Map([
          ['scene-1', { sceneId: 'scene-1', suggestionId: 'sugg-1', videoId: 'vid-1' }],
          ['scene-2', { sceneId: 'scene-2', suggestionId: 'sugg-2', videoId: 'vid-2' }],
          ['scene-3', { sceneId: 'scene-3', suggestionId: 'sugg-3', videoId: 'vid-3' }],
        ]),
        totalScenes: 3,
      });

      // Mock slow assembly API response that never resolves
      let resolveAssembly: Function;
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/scenes')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: { scenes: mockScenes },
              }),
          });
        }
        if (url.includes('/assemble')) {
          // Return a promise that we control
          return new Promise((resolve) => {
            resolveAssembly = resolve;
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      // When: Complete the assembly flow
      render(<VisualCurationClient project={mockProject as any} />);

      await waitFor(() => {
        expect(screen.getByText('Scene 1')).toBeInTheDocument();
      });

      // Click Assemble Video
      const assembleButton = screen.getByRole('button', { name: /assemble video/i });
      fireEvent.click(assembleButton);

      await waitFor(() => {
        expect(screen.getByText('Ready to Assemble?')).toBeInTheDocument();
      });

      // Click Confirm Assembly
      const confirmButton = screen.getByRole('button', { name: /confirm assembly/i });
      fireEvent.click(confirmButton);

      // Then: Loading state should be shown in the modal
      await waitFor(() => {
        // The modal should show "Assembling..." in the confirm button
        const buttons = screen.getAllByRole('button');
        const hasAssemblingButton = buttons.some(btn => btn.textContent?.includes('Assembling'));
        expect(hasAssemblingButton).toBe(true);
      });

      // Cancel button should be disabled during loading
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });
});
