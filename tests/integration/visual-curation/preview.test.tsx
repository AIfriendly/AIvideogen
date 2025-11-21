/**
 * E2E Integration Tests: Video Preview Workflow
 * Story 4.3: Video Preview & Playback Functionality
 *
 * Tests for complete preview workflow from card click to video playback to closing.
 * Validates user interactions, state management, and component integration.
 *
 * Test IDs: 4.3-E2E-001 to 4.3-E2E-008
 * Priority: P0 (Critical)
 * Acceptance Criteria: AC1, AC6, AC7, AC8
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Plyr before any component imports
vi.mock('plyr', () => {
  return {
    default: vi.fn().mockImplementation((element, options) => ({
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      togglePlay: vi.fn(),
      destroy: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      paused: true,
      currentTime: 0,
      duration: 120,
      volume: 1,
      muted: false,
    })),
  };
});

import { VisualCurationClient } from '@/app/projects/[id]/visual-curation/VisualCurationClient';
import { createProject, createScene, saveVisualSuggestions } from '@/lib/db/queries';
import { initializeDatabase } from '@/lib/db/init';
import type { Project, Scene } from '@/lib/db/queries';
import type { VisualSuggestion } from '@/types/visual-suggestions';
import fs from 'fs/promises';
import path from 'path';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({
    id: 'test-project-123',
  }),
}));

// Mock Dialog component for testing
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? React.createElement('div', { 'data-testid': 'dialog-modal' }, children) : null,
  DialogContent: ({ children }: any) => React.createElement('div', { 'data-testid': 'dialog-content' }, children),
  DialogHeader: ({ children }: any) => React.createElement('div', {}, children),
  DialogTitle: ({ children }: any) => React.createElement('h2', {}, children),
}));

describe('[4.3-E2E] Video Preview Integration Tests', () => {
  let testProject: Project;
  let testScenes: Scene[];
  let testSuggestions: VisualSuggestion[];
  const testVideoDir = path.join(process.cwd(), '.cache/videos');

  beforeEach(async () => {
    // Initialize test database with clean state
    initializeDatabase();

    // Generate unique IDs for this test run
    const testId = Date.now().toString(36) + Math.random().toString(36).substring(2);

    // Create test project
    testProject = createProject('Test Video Project');

    // Create test scenes with unique IDs
    testScenes = [
      {
        id: `scene-001-${testId}`,
        project_id: testProject.id,
        scene_number: 1,
        text: 'Scene 1 narration text for testing',
        audio_file_path: `.cache/audio/projects/${testProject.id}/scene-1.mp3`,
        duration: 10,
        selected_clip_id: null,
        created_at: new Date().toISOString(),
      },
      {
        id: `scene-002-${testId}`,
        project_id: testProject.id,
        scene_number: 2,
        text: 'Scene 2 narration text for testing',
        audio_file_path: `.cache/audio/projects/${testProject.id}/scene-2.mp3`,
        duration: 15,
        selected_clip_id: null,
        created_at: new Date().toISOString(),
      },
    ];

    testScenes.forEach(scene => createScene(scene));

    // Create test visual suggestions with dynamic IDs
    testSuggestions = [
      {
        id: `sug-001-${testId}`,
        sceneId: testScenes[0].id, // Use the actual scene ID
        videoId: 'youtube123',
        title: 'Test Video 1 - Complete Download',
        thumbnailUrl: 'https://i.ytimg.com/vi/youtube123/maxresdefault.jpg',
        channelTitle: 'Test Channel 1',
        embedUrl: 'https://youtube.com/embed/youtube123',
        rank: 1,
        duration: 120,
        defaultSegmentPath: `.cache/videos/${testProject.id}/scene-01-default.mp4`,
        downloadStatus: 'complete',
        createdAt: new Date().toISOString(),
      },
      {
        id: `sug-002-${testId}`,
        sceneId: testScenes[0].id, // Use the actual scene ID
        videoId: 'youtube456',
        title: 'Test Video 2 - Error Download',
        thumbnailUrl: 'https://i.ytimg.com/vi/youtube456/maxresdefault.jpg',
        channelTitle: 'Test Channel 2',
        embedUrl: 'https://youtube.com/embed/youtube456',
        rank: 2,
        duration: 90,
        defaultSegmentPath: undefined,
        downloadStatus: 'error',
        createdAt: new Date().toISOString(),
      },
    ];

    // Save visual suggestions for the first scene
    saveVisualSuggestions(testScenes[0].id, testSuggestions);

    // Create test video files
    const projectVideoDir = path.join(testVideoDir, testProject.id);
    await fs.mkdir(projectVideoDir, { recursive: true });

    const videoPath = path.join(projectVideoDir, 'scene-01-default.mp4');
    await fs.writeFile(videoPath, Buffer.from([0x00, 0x00, 0x00, 0x20])); // MP4 header

    // Mock API responses
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/projects/') && url.includes('/scenes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { scenes: testScenes }
          })
        });
      }

      if (url.includes('/api/projects/') && url.includes('/visual-suggestions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            suggestions: testSuggestions,
            totalScenes: 2,
            scenesWithSuggestions: 1
          })
        });
      }

      return Promise.resolve({
        ok: false,
        status: 404
      });
    });
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      const projectVideoDir = path.join(testVideoDir, testProject.id);
      await fs.rm(projectVideoDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  /**
   * [4.3-E2E-001] Complete Preview Flow
   */
  describe('[4.3-E2E-001] Full Preview Workflow', () => {
    test('should complete full preview flow from click to close', async () => {
      // Given: User on visual curation page
      const user = userEvent.setup();
      const { container } = render(<VisualCurationClient project={testProject} />);

      // Wait for suggestions to load
      await waitFor(() => {
        expect(screen.queryAllByTestId('suggestion-card')).toHaveLength(2);
      });

      // When: Clicking first suggestion card
      const firstCard = screen.getAllByTestId('suggestion-card')[0];
      await user.click(firstCard);

      // Then: Preview modal should open
      await waitFor(() => {
        expect(screen.getByTestId('dialog-modal')).toBeInTheDocument();
      });

      // And: Video preview player should be visible
      expect(screen.getByTestId('video-preview-player')).toBeInTheDocument();

      // And: Video title should be displayed
      expect(screen.getByText('Test Video 1 - Complete Download')).toBeInTheDocument();
      expect(screen.getByText('Test Channel 1')).toBeInTheDocument();

      // When: Pressing Escape key
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      // Then: Modal should close
      await waitFor(() => {
        expect(screen.queryByTestId('dialog-modal')).not.toBeInTheDocument();
      });
    });

    test('should maintain state when opening multiple previews sequentially', async () => {
      // Given: Visual curation page with suggestions
      const user = userEvent.setup();
      render(<VisualCurationClient project={testProject} />);

      await waitFor(() => {
        expect(screen.queryAllByTestId('suggestion-card')).toHaveLength(2);
      });

      // When: Opening first preview
      const firstCard = screen.getAllByTestId('suggestion-card')[0];
      await user.click(firstCard);

      // Then: First preview opens
      await waitFor(() => {
        expect(screen.getByText('Test Video 1 - Complete Download')).toBeInTheDocument();
      });

      // When: Closing first preview
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByTestId('dialog-modal')).not.toBeInTheDocument();
      });

      // When: Opening second preview
      const secondCard = screen.getAllByTestId('suggestion-card')[1];
      await user.click(secondCard);

      // Then: Second preview opens with different content
      await waitFor(() => {
        expect(screen.getByText('Test Video 2 - Error Download')).toBeInTheDocument();
      });

      // And: Should show YouTube fallback for error status
      expect(screen.getByText(/streaming from youtube/i)).toBeInTheDocument();
    });
  });

  /**
   * [4.3-E2E-002] Click Handler Integration
   */
  describe('[4.3-E2E-002] SuggestionCard Click Integration', () => {
    test('should propagate click from SuggestionCard to VisualCurationClient', async () => {
      // Given: Visual curation page
      const user = userEvent.setup();
      render(<VisualCurationClient project={testProject} />);

      await waitFor(() => {
        expect(screen.queryAllByTestId('suggestion-card')).toHaveLength(2);
      });

      // When: Clicking suggestion card
      const card = screen.getAllByTestId('suggestion-card')[0];

      // Verify card has click cursor
      expect(card).toHaveStyle({ cursor: 'pointer' });

      await user.click(card);

      // Then: State should update in parent component
      await waitFor(() => {
        expect(screen.getByTestId('dialog-modal')).toBeInTheDocument();
      });
    });

    test('should handle rapid clicks without errors', async () => {
      // Given: Visual curation page
      const user = userEvent.setup();
      render(<VisualCurationClient project={testProject} />);

      await waitFor(() => {
        expect(screen.queryAllByTestId('suggestion-card')).toHaveLength(2);
      });

      // When: Rapidly clicking cards
      const card1 = screen.getAllByTestId('suggestion-card')[0];
      const card2 = screen.getAllByTestId('suggestion-card')[1];

      await user.click(card1);
      await user.click(card2);
      await user.click(card1);

      // Then: Should handle state changes without errors
      expect(screen.getByTestId('dialog-modal')).toBeInTheDocument();
    });
  });

  /**
   * [4.3-E2E-003] Local Video Playback Integration
   */
  describe('[4.3-E2E-003] Video Playback Modes', () => {
    test('should load local video for complete downloads', async () => {
      // Given: Suggestion with complete download
      const user = userEvent.setup();
      render(<VisualCurationClient project={testProject} />);

      await waitFor(() => {
        expect(screen.queryAllByTestId('suggestion-card')).toHaveLength(2);
      });

      // When: Opening preview for complete download
      const completeCard = screen.getAllByTestId('suggestion-card')[0];
      await user.click(completeCard);

      // Then: Should render local video player
      await waitFor(() => {
        const videoElement = screen.getByTestId('local-video-player');
        expect(videoElement).toBeInTheDocument();
        expect(videoElement.tagName).toBe('VIDEO');
      });

      // And: Video source should be API route
      const video = screen.getByTestId('local-video-player') as HTMLVideoElement;
      expect(video.src).toContain('/api/videos/');
    });

    test('should show YouTube iframe for error downloads', async () => {
      // Given: Suggestion with error download
      const user = userEvent.setup();
      render(<VisualCurationClient project={testProject} />);

      await waitFor(() => {
        expect(screen.queryAllByTestId('suggestion-card')).toHaveLength(2);
      });

      // When: Opening preview for error download
      const errorCard = screen.getAllByTestId('suggestion-card')[1];
      await user.click(errorCard);

      // Then: Should render YouTube iframe
      await waitFor(() => {
        const iframe = screen.getByTestId('youtube-iframe');
        expect(iframe).toBeInTheDocument();
        expect(iframe.tagName).toBe('IFRAME');
      });

      // And: iframe source should be YouTube embed
      const iframe = screen.getByTestId('youtube-iframe') as HTMLIFrameElement;
      expect(iframe.src).toContain('youtube.com/embed/');
      expect(iframe.src).toContain('autoplay=1');
    });
  });

  /**
   * [4.3-E2E-006] Keyboard Shortcuts Integration
   */
  describe('[4.3-E2E-006] Keyboard Shortcuts', () => {
    test('Space key should toggle play/pause in preview', async () => {
      // Given: Preview is open
      const user = userEvent.setup();
      render(<VisualCurationClient project={testProject} />);

      await waitFor(() => {
        expect(screen.queryAllByTestId('suggestion-card')).toHaveLength(2);
      });

      const card = screen.getAllByTestId('suggestion-card')[0];
      await user.click(card);

      // When: Pressing space key
      await waitFor(() => {
        expect(screen.getByTestId('video-preview-player')).toBeInTheDocument();
      });

      // Mock video element
      const video = screen.getByTestId('local-video-player') as HTMLVideoElement;
      const playMock = vi.spyOn(video, 'play').mockResolvedValue();
      const pauseMock = vi.spyOn(video, 'pause').mockImplementation();

      // When: Pressing space
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });

      // Then: Should toggle playback
      expect(playMock).toHaveBeenCalled();
    });

    test('Escape key should close preview from any state', async () => {
      // Given: Preview is open
      const user = userEvent.setup();
      render(<VisualCurationClient project={testProject} />);

      await waitFor(() => {
        expect(screen.queryAllByTestId('suggestion-card')).toHaveLength(2);
      });

      const card = screen.getAllByTestId('suggestion-card')[0];
      await user.click(card);

      await waitFor(() => {
        expect(screen.getByTestId('dialog-modal')).toBeInTheDocument();
      });

      // When: Pressing Escape
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      // Then: Should close modal
      await waitFor(() => {
        expect(screen.queryByTestId('dialog-modal')).not.toBeInTheDocument();
      });
    });
  });

  /**
   * [4.3-E2E-007] Responsive Design
   */
  describe('[4.3-E2E-007] Responsive Layout', () => {
    test('should adapt preview modal for desktop viewport (1920px)', () => {
      // Given: Desktop viewport
      global.innerWidth = 1920;
      global.innerHeight = 1080;

      // When: Rendering preview
      render(<VisualCurationClient project={testProject} />);

      // Then: Modal should have max-width constraint
      const style = getComputedStyle(document.documentElement);
      expect(style.getPropertyValue('--modal-max-width')).toContain('800px');
    });

    test('should adapt preview modal for tablet viewport (768px)', () => {
      // Given: Tablet viewport
      global.innerWidth = 768;
      global.innerHeight = 1024;

      // When: Rendering preview
      render(<VisualCurationClient project={testProject} />);

      // Then: Modal should use viewport width
      const style = getComputedStyle(document.documentElement);
      expect(style.getPropertyValue('--modal-width')).toContain('90vw');
    });
  });

  /**
   * [4.3-E2E-008] Error Recovery
   */
  describe('[4.3-E2E-008] Error Handling and Recovery', () => {
    test('should gracefully handle API errors', async () => {
      // Given: API returns error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      // When: Rendering component
      render(<VisualCurationClient project={testProject} />);

      // Then: Should show error state
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });

      // And: Should offer retry
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    test('should fallback to YouTube when local video fails', async () => {
      // Given: Preview with local video
      const user = userEvent.setup();
      render(<VisualCurationClient project={testProject} />);

      await waitFor(() => {
        expect(screen.queryAllByTestId('suggestion-card')).toHaveLength(2);
      });

      const card = screen.getAllByTestId('suggestion-card')[0];
      await user.click(card);

      // When: Local video fails to load
      await waitFor(() => {
        const video = screen.getByTestId('local-video-player') as HTMLVideoElement;
        fireEvent.error(video);
      });

      // Then: Should switch to YouTube iframe
      await waitFor(() => {
        expect(screen.queryByTestId('youtube-iframe')).toBeInTheDocument();
      });
    });
  });
});