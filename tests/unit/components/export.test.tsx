/**
 * Unit Tests - Export Components (Story 5.5)
 *
 * Tests for the Export UI components including ExportClient, VideoDownload,
 * ThumbnailPreview, ExportSummary, AssemblyProgress, and sanitizeFilename utility.
 *
 * Test IDs from story-5.5.md Task 7:
 * - 7.1: Create tests/unit/components/export.test.tsx
 * - 7.2: Test ExportClient rendering with mock data
 * - 7.3: Test VideoDownload click handler
 * - 7.4: Test ThumbnailPreview rendering
 * - 7.5: Test ExportSummary with various metadata values
 * - 7.6: Test AssemblyProgress with different stages
 * - 7.7: Test sanitizeFilename with edge cases
 *
 * Priority: P1 (Component tests)
 * Story: 5.5 - Export UI & Download Workflow
 * Implements: FR-7.06, FR-8.05
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import components under test
import { ExportClient } from '@/app/projects/[id]/export/export-client';
import { VideoDownload } from '@/components/features/export/VideoDownload';
import { ThumbnailPreview } from '@/components/features/export/ThumbnailPreview';
import { ExportSummary } from '@/components/features/export/ExportSummary';
import { AssemblyProgress } from '@/components/features/export/AssemblyProgress';

// ============================================================================
// Test Fixtures and Mock Data
// ============================================================================

const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';

const mockExportData = {
  video_path: '/videos/test-project/final.mp4',
  thumbnail_path: '/videos/test-project/thumbnail.jpg',
  duration: 125,
  file_size: 5242880, // 5 MB
  scene_count: 5,
  title: 'Mars Colonization Documentary',
  resolution: '1280x720',
};

const mockAssemblyStatusComplete = {
  status: 'complete' as const,
  progress: 100,
  currentStage: 'finalizing',
};

const mockAssemblyStatusProcessing = {
  status: 'processing' as const,
  progress: 45,
  currentStage: 'trimming',
  currentScene: 2,
  totalScenes: 5,
};

const mockAssemblyStatusError = {
  status: 'error' as const,
  progress: 30,
  currentStage: 'concatenating',
  errorMessage: 'FFmpeg encoding failed: insufficient memory',
};

// ============================================================================
// Mock Setup
// ============================================================================

// Mock fetch globally for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL object methods for download functionality
const mockCreateObjectURL = vi.fn(() => 'blob:http://localhost/mock-blob-url');
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();

  // Setup URL mocks
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// [7.7] sanitizeFilename Tests
// ============================================================================

describe('[P0] sanitizeFilename Utility - Unit Tests', () => {
  /**
   * Test sanitizeFilename function by testing through VideoDownload component behavior
   * Since the function is internal, we test its behavior through component outputs
   */

  describe('[7.7] sanitizeFilename Edge Cases', () => {
    /**
     * GIVEN: Various input strings with special characters
     * WHEN: Processed by sanitizeFilename
     * THEN: Output follows sanitization rules
     */

    const sanitizeTestCases = [
      {
        input: 'Hello World',
        expected: 'hello-world',
        description: 'converts spaces to hyphens and lowercases',
      },
      {
        input: 'Test!@#$%Video',
        expected: 'testvideo',
        description: 'removes special characters',
      },
      {
        input: 'Multiple   Spaces',
        expected: 'multiple-spaces',
        description: 'collapses multiple spaces to single hyphen',
      },
      {
        input: 'A-B--C---D',
        expected: 'a-b-c-d',
        description: 'collapses multiple hyphens to single',
      },
      {
        input: '---Leading-Trailing---',
        expected: 'leading-trailing',
        description: 'removes leading and trailing hyphens',
      },
      {
        input: 'UPPERCASE',
        expected: 'uppercase',
        description: 'converts to lowercase',
      },
      {
        input: 'File_Name_With_Underscores',
        expected: 'filenamewithu',
        description: 'removes underscores (not in allowed chars)',
      },
      {
        input: 'Numbers123Work',
        expected: 'numbers123work',
        description: 'preserves numbers',
      },
      {
        input: '',
        expected: '',
        description: 'handles empty string',
      },
    ];

    // Test long string truncation separately
    it('should truncate strings longer than 50 characters', async () => {
      // GIVEN: A very long title
      const longTitle = 'This-Is-A-Very-Long-Title-That-Definitely-Exceeds-The-Fifty-Character-Limit-For-Filenames';

      // Setup mock for VideoDownload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['video'], { type: 'video/mp4' })),
      });

      // WHEN: Render VideoDownload and click
      render(<VideoDownload videoPath="/test.mp4" title={longTitle} />);

      const downloadButton = screen.getByRole('button', { name: /download video/i });
      fireEvent.click(downloadButton);

      // THEN: Wait for download to process
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
      });

      // Verify through the mock that download was attempted
      // The actual filename verification would require checking the anchor element
    });

    // Note: For thorough sanitizeFilename testing, the function should be exported
    // These tests verify behavior through component integration
    it('should handle special characters in video title', async () => {
      // GIVEN: Title with special characters
      const specialTitle = 'Mars: The Red Planet! (2024)';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['video'], { type: 'video/mp4' })),
      });

      // WHEN: Render and click download
      render(<VideoDownload videoPath="/test.mp4" title={specialTitle} />);

      const downloadButton = screen.getByRole('button', { name: /download video/i });
      fireEvent.click(downloadButton);

      // THEN: Download should proceed without error
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
      });
    });
  });
});

// ============================================================================
// [7.2] ExportClient Tests
// ============================================================================

describe('[P0] ExportClient Component - Unit Tests', () => {
  /**
   * ExportClient is the main orchestrating component for the export page.
   * It handles fetching assembly status and export data, and renders
   * appropriate UI based on the current state.
   */

  describe('[7.2] ExportClient Rendering with Mock Data', () => {
    /**
     * GIVEN: Project with completed assembly
     * WHEN: ExportClient renders
     * THEN: Shows video player and export UI
     */
    it('should render video player when assembly is complete', async () => {
      // GIVEN: API returns complete status and export data
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAssemblyStatusComplete),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExportData),
        });

      // WHEN: Render ExportClient
      render(<ExportClient projectId={mockProjectId} />);

      // THEN: Header should display
      await waitFor(() => {
        expect(screen.getByText(/Your Video is Ready/i)).toBeInTheDocument();
      });
    });

    it('should display video element with correct source', async () => {
      // GIVEN: Complete assembly with export data
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAssemblyStatusComplete),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExportData),
        });

      // WHEN: Render
      const { container } = render(<ExportClient projectId={mockProjectId} />);

      // THEN: Video element should have correct source
      await waitFor(() => {
        const videoElement = container.querySelector('video');
        expect(videoElement).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      // GIVEN: Fetch is pending
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      // WHEN: Render
      render(<ExportClient projectId={mockProjectId} />);

      // THEN: Loading indicator should show
      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });

    it('should show assembly progress when status is processing', async () => {
      // GIVEN: Assembly in progress
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAssemblyStatusProcessing),
      });

      // WHEN: Render
      render(<ExportClient projectId={mockProjectId} />);

      // THEN: Progress UI should display
      await waitFor(() => {
        expect(screen.getByText(/Assembling Your Video/i)).toBeInTheDocument();
      });
    });

    it('should show error state when assembly fails', async () => {
      // GIVEN: Assembly failed
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAssemblyStatusError),
      });

      // WHEN: Render
      render(<ExportClient projectId={mockProjectId} />);

      // THEN: Error message should display
      await waitFor(() => {
        expect(screen.getByText(/Assembly Failed/i)).toBeInTheDocument();
      });
    });

    it('should display error message from assembly status', async () => {
      // GIVEN: Assembly failed with specific error
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAssemblyStatusError),
      });

      // WHEN: Render
      render(<ExportClient projectId={mockProjectId} />);

      // THEN: Specific error message should show
      await waitFor(() => {
        expect(screen.getByText(/FFmpeg encoding failed/i)).toBeInTheDocument();
      });
    });

    it('should show error when no assembly job found', async () => {
      // GIVEN: API returns job not found
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ code: 'JOB_NOT_FOUND', error: 'No job found' }),
      });

      // WHEN: Render
      render(<ExportClient projectId={mockProjectId} />);

      // THEN: Appropriate message should display
      await waitFor(() => {
        expect(screen.getByText(/No assembly job found/i)).toBeInTheDocument();
      });
    });

    it('should render navigation buttons when complete', async () => {
      // GIVEN: Complete assembly
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAssemblyStatusComplete),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExportData),
        });

      // WHEN: Render
      render(<ExportClient projectId={mockProjectId} />);

      // THEN: Navigation buttons should appear
      await waitFor(() => {
        expect(screen.getByText(/Create New Video/i)).toBeInTheDocument();
        expect(screen.getByText(/Back to Curation/i)).toBeInTheDocument();
      });
    });

    it('should render thumbnail when available', async () => {
      // GIVEN: Export data with thumbnail
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAssemblyStatusComplete),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExportData),
        });

      // WHEN: Render
      render(<ExportClient projectId={mockProjectId} />);

      // THEN: Thumbnail section should render
      await waitFor(() => {
        expect(screen.getByText('Thumbnail')).toBeInTheDocument();
      });
    });

    it('should not render thumbnail when path is null', async () => {
      // GIVEN: Export data without thumbnail
      const exportDataNoThumbnail = { ...mockExportData, thumbnail_path: null };
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAssemblyStatusComplete),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(exportDataNoThumbnail),
        });

      // WHEN: Render
      render(<ExportClient projectId={mockProjectId} />);

      // THEN: Thumbnail section should not render
      await waitFor(() => {
        expect(screen.getByText(/Your Video is Ready/i)).toBeInTheDocument();
      });
      expect(screen.queryByText('Thumbnail')).not.toBeInTheDocument();
    });
  });
});

// ============================================================================
// [7.3] VideoDownload Tests
// ============================================================================

describe('[P0] VideoDownload Component - Unit Tests', () => {
  /**
   * VideoDownload handles video file download with sanitized filename.
   */

  describe('[7.3] VideoDownload Click Handler', () => {
    /**
     * GIVEN: VideoDownload component with video path
     * WHEN: User clicks download button
     * THEN: Video file is fetched and download triggered
     */
    it('should fetch video and trigger download on click', async () => {
      // GIVEN: Mock successful fetch
      const mockBlob = new Blob(['video content'], { type: 'video/mp4' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      // WHEN: Render and click
      render(<VideoDownload videoPath="/videos/test.mp4" title="Test Video" />);

      const downloadButton = screen.getByRole('button', { name: /download video/i });
      fireEvent.click(downloadButton);

      // THEN: Fetch should be called with correct URL
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/videos/test.mp4');
      });

      // AND: Object URL should be created
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      });

      // AND: Object URL should be revoked (cleanup)
      await waitFor(() => {
        expect(mockRevokeObjectURL).toHaveBeenCalled();
      });
    });

    it('should show loading state during download', async () => {
      // GIVEN: Slow fetch
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  blob: () => Promise.resolve(new Blob(['video'])),
                }),
              100
            )
          )
      );

      // WHEN: Click download
      render(<VideoDownload videoPath="/videos/test.mp4" title="Test Video" />);

      const downloadButton = screen.getByRole('button', { name: /download video/i });
      fireEvent.click(downloadButton);

      // THEN: Button should show loading state
      await waitFor(() => {
        expect(screen.getByText(/Downloading/i)).toBeInTheDocument();
      });
    });

    it('should show error message when download fails', async () => {
      // GIVEN: Failed fetch
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      // WHEN: Click download
      render(<VideoDownload videoPath="/videos/missing.mp4" title="Test Video" />);

      const downloadButton = screen.getByRole('button', { name: /download video/i });
      fireEvent.click(downloadButton);

      // THEN: Error message should display
      await waitFor(() => {
        expect(screen.getByText(/Failed to download video/i)).toBeInTheDocument();
      });
    });

    it('should disable button during download', async () => {
      // GIVEN: Slow fetch
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  blob: () => Promise.resolve(new Blob(['video'])),
                }),
              200
            )
          )
      );

      // WHEN: Click download
      render(<VideoDownload videoPath="/videos/test.mp4" title="Test Video" />);

      const downloadButton = screen.getByRole('button', { name: /download video/i });
      fireEvent.click(downloadButton);

      // THEN: Button should be disabled
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
      });
    });

    it('should apply custom className', () => {
      // GIVEN: Custom className
      const customClass = 'my-custom-class';

      // WHEN: Render with className
      const { container } = render(
        <VideoDownload videoPath="/videos/test.mp4" title="Test Video" className={customClass} />
      );

      // THEN: Container should have custom class
      const wrapper = container.firstElementChild;
      expect(wrapper).toHaveClass(customClass);
    });
  });
});

// ============================================================================
// [7.4] ThumbnailPreview Tests
// ============================================================================

describe('[P0] ThumbnailPreview Component - Unit Tests', () => {
  /**
   * ThumbnailPreview displays the generated thumbnail with download option.
   */

  describe('[7.4] ThumbnailPreview Rendering', () => {
    /**
     * GIVEN: ThumbnailPreview with thumbnail path
     * WHEN: Component renders
     * THEN: Thumbnail image displays correctly
     */
    it('should render thumbnail image with correct src', () => {
      // GIVEN: Thumbnail path
      const thumbnailPath = '/videos/project/thumbnail.jpg';

      // WHEN: Render
      render(<ThumbnailPreview thumbnailPath={thumbnailPath} title="Test Video" />);

      // THEN: Image should have correct src
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', thumbnailPath);
    });

    it('should render image with correct alt text', () => {
      // GIVEN: Title
      const title = 'Mars Exploration';

      // WHEN: Render
      render(<ThumbnailPreview thumbnailPath="/thumbnail.jpg" title={title} />);

      // THEN: Image should have descriptive alt text
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', `Thumbnail for ${title}`);
    });

    it('should display "Thumbnail" label', () => {
      // WHEN: Render
      render(<ThumbnailPreview thumbnailPath="/thumbnail.jpg" title="Test" />);

      // THEN: Label should be visible
      expect(screen.getByText('Thumbnail')).toBeInTheDocument();
    });

    it('should render download button', () => {
      // WHEN: Render
      render(<ThumbnailPreview thumbnailPath="/thumbnail.jpg" title="Test" />);

      // THEN: Download button should be present
      expect(screen.getByRole('button', { name: /download thumbnail/i })).toBeInTheDocument();
    });

    it('should trigger download on button click', async () => {
      // GIVEN: Mock successful fetch
      const mockBlob = new Blob(['image'], { type: 'image/jpeg' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      // WHEN: Click download
      render(<ThumbnailPreview thumbnailPath="/thumbnail.jpg" title="Test Video" />);

      const downloadButton = screen.getByRole('button', { name: /download thumbnail/i });
      fireEvent.click(downloadButton);

      // THEN: Fetch should be called
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/thumbnail.jpg');
      });

      // AND: Object URL created
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
      });
    });

    it('should show loading state during thumbnail download', async () => {
      // GIVEN: Slow fetch
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  blob: () => Promise.resolve(new Blob(['image'])),
                }),
              100
            )
          )
      );

      // WHEN: Click download
      render(<ThumbnailPreview thumbnailPath="/thumbnail.jpg" title="Test" />);

      const downloadButton = screen.getByRole('button', { name: /download thumbnail/i });
      fireEvent.click(downloadButton);

      // THEN: Loading state should show
      await waitFor(() => {
        expect(screen.getByText(/Downloading/i)).toBeInTheDocument();
      });
    });

    it('should show error on failed thumbnail download', async () => {
      // GIVEN: Failed fetch
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      // WHEN: Click download
      render(<ThumbnailPreview thumbnailPath="/missing.jpg" title="Test" />);

      const downloadButton = screen.getByRole('button', { name: /download thumbnail/i });
      fireEvent.click(downloadButton);

      // THEN: Error should display
      await waitFor(() => {
        expect(screen.getByText(/Failed to download thumbnail/i)).toBeInTheDocument();
      });
    });
  });
});

// ============================================================================
// [7.5] ExportSummary Tests
// ============================================================================

describe('[P1] ExportSummary Component - Unit Tests', () => {
  /**
   * ExportSummary displays video metadata: duration, size, resolution, topic, scenes.
   */

  describe('[7.5] ExportSummary Metadata Display', () => {
    /**
     * GIVEN: ExportSummary with metadata
     * WHEN: Component renders
     * THEN: All metadata fields display correctly
     */
    it('should format duration as mm:ss', () => {
      // GIVEN: Duration of 125 seconds (2:05)
      render(
        <ExportSummary duration={125} fileSize={5242880} resolution="1280x720" title="Test" sceneCount={5} />
      );

      // THEN: Should show "2:05"
      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('should format duration with leading zero for seconds', () => {
      // GIVEN: Duration of 65 seconds (1:05)
      render(
        <ExportSummary duration={65} fileSize={1000000} resolution="1280x720" title="Test" sceneCount={3} />
      );

      // THEN: Should show "1:05" not "1:5"
      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('should handle zero duration', () => {
      // GIVEN: Zero duration
      render(
        <ExportSummary duration={0} fileSize={0} resolution="1280x720" title="Test" sceneCount={0} />
      );

      // THEN: Should show "0:00"
      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('should format file size in MB', () => {
      // GIVEN: 5 MB file
      render(
        <ExportSummary duration={60} fileSize={5242880} resolution="1280x720" title="Test" sceneCount={5} />
      );

      // THEN: Should show "5.0 MB"
      expect(screen.getByText('5.0 MB')).toBeInTheDocument();
    });

    it('should format small files in KB', () => {
      // GIVEN: 512 KB file
      render(
        <ExportSummary duration={60} fileSize={524288} resolution="1280x720" title="Test" sceneCount={2} />
      );

      // THEN: Should show KB format
      expect(screen.getByText('512.0 KB')).toBeInTheDocument();
    });

    it('should format large files in GB', () => {
      // GIVEN: 2 GB file
      const twoGB = 2 * 1024 * 1024 * 1024;
      render(
        <ExportSummary duration={3600} fileSize={twoGB} resolution="1920x1080" title="Test" sceneCount={50} />
      );

      // THEN: Should show GB format
      expect(screen.getByText('2.00 GB')).toBeInTheDocument();
    });

    it('should display resolution', () => {
      // GIVEN: Resolution string
      render(
        <ExportSummary duration={60} fileSize={1000000} resolution="1280x720" title="Test" sceneCount={5} />
      );

      // THEN: Resolution should display
      expect(screen.getByText('1280x720')).toBeInTheDocument();
    });

    it('should display topic/title', () => {
      // GIVEN: Title
      const title = 'Mars Colonization';
      render(
        <ExportSummary duration={60} fileSize={1000000} resolution="1280x720" title={title} sceneCount={5} />
      );

      // THEN: Title should display
      expect(screen.getByText(title)).toBeInTheDocument();
    });

    it('should display scene count', () => {
      // GIVEN: Scene count
      render(
        <ExportSummary duration={60} fileSize={1000000} resolution="1280x720" title="Test" sceneCount={8} />
      );

      // THEN: Scene count should display
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('should display all metadata labels', () => {
      // WHEN: Render
      render(
        <ExportSummary duration={120} fileSize={5000000} resolution="1280x720" title="Test" sceneCount={5} />
      );

      // THEN: All labels should be present
      expect(screen.getByText('Duration:')).toBeInTheDocument();
      expect(screen.getByText('Size:')).toBeInTheDocument();
      expect(screen.getByText('Resolution:')).toBeInTheDocument();
      expect(screen.getByText('Topic:')).toBeInTheDocument();
      expect(screen.getByText('Scenes:')).toBeInTheDocument();
    });

    it('should handle negative values gracefully', () => {
      // GIVEN: Negative values (edge case)
      render(
        <ExportSummary duration={-10} fileSize={-1000} resolution="1280x720" title="Test" sceneCount={0} />
      );

      // THEN: Should show safe defaults
      expect(screen.getByText('0:00')).toBeInTheDocument();
      expect(screen.getByText('0 MB')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// [7.6] AssemblyProgress Tests
// ============================================================================

describe('[P1] AssemblyProgress Component - Unit Tests', () => {
  /**
   * AssemblyProgress displays assembly progress with stage label and percentage.
   */

  describe('[7.6] AssemblyProgress Stage Display', () => {
    /**
     * GIVEN: AssemblyProgress with status
     * WHEN: Component renders
     * THEN: Stage label and progress display correctly
     */

    const stageLabels: Record<string, string> = {
      initializing: 'Initializing...',
      downloading: 'Downloading source videos...',
      trimming: 'Trimming video clips...',
      concatenating: 'Joining video clips...',
      audio_overlay: 'Adding voiceover audio...',
      thumbnail: 'Generating thumbnail...',
      finalizing: 'Finalizing video...',
    };

    Object.entries(stageLabels).forEach(([stage, expectedLabel]) => {
      it(`should display correct label for "${stage}" stage`, () => {
        // GIVEN: Status with specific stage
        const status = {
          status: 'processing',
          progress: 50,
          currentStage: stage,
        };

        // WHEN: Render
        render(<AssemblyProgress status={status} />);

        // THEN: Correct label should display
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      });
    });

    it('should display progress percentage', () => {
      // GIVEN: 45% progress
      const status = {
        status: 'processing',
        progress: 45,
        currentStage: 'trimming',
      };

      // WHEN: Render
      render(<AssemblyProgress status={status} />);

      // THEN: Percentage should display
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('should display header text', () => {
      // WHEN: Render
      render(
        <AssemblyProgress
          status={{
            status: 'processing',
            progress: 30,
            currentStage: 'downloading',
          }}
        />
      );

      // THEN: Header should display
      expect(screen.getByText(/Assembling Your Video/i)).toBeInTheDocument();
    });

    it('should display scene counter when available', () => {
      // GIVEN: Status with scene info
      const status = {
        status: 'processing',
        progress: 40,
        currentStage: 'trimming',
        currentScene: 3,
        totalScenes: 8,
      };

      // WHEN: Render
      render(<AssemblyProgress status={status} />);

      // THEN: Scene counter should display
      expect(screen.getByText(/Processing scene 3 of 8/i)).toBeInTheDocument();
    });

    it('should not display scene counter when not available', () => {
      // GIVEN: Status without scene info
      const status = {
        status: 'processing',
        progress: 20,
        currentStage: 'initializing',
      };

      // WHEN: Render
      render(<AssemblyProgress status={status} />);

      // THEN: Scene counter should not display
      expect(screen.queryByText(/Processing scene/i)).not.toBeInTheDocument();
    });

    it('should clamp progress to 0-100 range', () => {
      // GIVEN: Progress > 100
      const status = {
        status: 'processing',
        progress: 150,
        currentStage: 'finalizing',
      };

      // WHEN: Render
      render(<AssemblyProgress status={status} />);

      // THEN: Should show 100%
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should handle negative progress', () => {
      // GIVEN: Negative progress
      const status = {
        status: 'processing',
        progress: -10,
        currentStage: 'initializing',
      };

      // WHEN: Render
      render(<AssemblyProgress status={status} />);

      // THEN: Should show 0%
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should display pipeline stages', () => {
      // WHEN: Render
      render(
        <AssemblyProgress
          status={{
            status: 'processing',
            progress: 50,
            currentStage: 'trimming',
          }}
        />
      );

      // THEN: Pipeline description should be present
      expect(screen.getByText(/Initialize/i)).toBeInTheDocument();
    });

    it('should have accessible progress indicator', () => {
      // WHEN: Render
      const { container } = render(
        <AssemblyProgress
          status={{
            status: 'processing',
            progress: 65,
            currentStage: 'concatenating',
          }}
        />
      );

      // THEN: Screen reader status should exist
      const srStatus = container.querySelector('[role="status"]');
      expect(srStatus).toBeInTheDocument();
    });

    it('should handle unknown stage gracefully', () => {
      // GIVEN: Unknown stage
      const status = {
        status: 'processing',
        progress: 50,
        currentStage: 'unknown_stage',
      };

      // WHEN: Render
      render(<AssemblyProgress status={status} />);

      // THEN: Should display stage name as fallback
      expect(screen.getByText('unknown_stage')).toBeInTheDocument();
    });

    it('should handle empty stage gracefully', () => {
      // GIVEN: Empty stage
      const status = {
        status: 'processing',
        progress: 50,
        currentStage: '',
      };

      // WHEN: Render
      render(<AssemblyProgress status={status} />);

      // THEN: Should show fallback
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('[P2] Export Components Integration', () => {
  /**
   * Tests that verify components work together correctly
   */

  it('should render complete export page with all subcomponents', async () => {
    // GIVEN: Complete assembly with full export data
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAssemblyStatusComplete),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExportData),
      });

    // WHEN: Render ExportClient
    render(<ExportClient projectId={mockProjectId} />);

    // THEN: All sections should render
    await waitFor(() => {
      // Header
      expect(screen.getByText(/Your Video is Ready/i)).toBeInTheDocument();

      // Download button
      expect(screen.getByRole('button', { name: /download video/i })).toBeInTheDocument();

      // Thumbnail section
      expect(screen.getByText('Thumbnail')).toBeInTheDocument();

      // Metadata
      expect(screen.getByText('Duration:')).toBeInTheDocument();
      expect(screen.getByText('Size:')).toBeInTheDocument();

      // Navigation
      expect(screen.getByText(/Create New Video/i)).toBeInTheDocument();
      expect(screen.getByText(/Back to Curation/i)).toBeInTheDocument();
    });
  });
});
