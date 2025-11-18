/**
 * SuggestionCard Component Tests - Epic 4, Story 4.2
 *
 * Tests for the SuggestionCard component that displays individual visual suggestions.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SuggestionCard } from '@/components/features/curation/SuggestionCard';
import { type VisualSuggestion } from '@/types/visual-suggestions';

/**
 * Helper: Create mock visual suggestion
 */
function createMockSuggestion(overrides?: Partial<VisualSuggestion>): VisualSuggestion {
  return {
    id: 'sugg-1',
    sceneId: 'scene-1',
    videoId: 'dQw4w9WgXcQ',
    title: 'Amazing Space Documentary Footage',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    channelTitle: 'Space Channel',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    rank: 1,
    duration: 225, // 3:45
    defaultSegmentPath: '.cache/videos/project-1/scene-1-default.mp4',
    downloadStatus: 'complete',
    createdAt: '2025-11-18T10:00:00Z',
    ...overrides,
  };
}

describe('SuggestionCard', () => {
  it('renders video title', () => {
    const suggestion = createMockSuggestion();
    render(<SuggestionCard suggestion={suggestion} />);

    expect(screen.getByText('Amazing Space Documentary Footage')).toBeInTheDocument();
  });

  it('renders channel name', () => {
    const suggestion = createMockSuggestion();
    render(<SuggestionCard suggestion={suggestion} />);

    expect(screen.getByText('Space Channel')).toBeInTheDocument();
  });

  it('renders rank badge', () => {
    const suggestion = createMockSuggestion({ rank: 3 });
    render(<SuggestionCard suggestion={suggestion} />);

    expect(screen.getByText('#3')).toBeInTheDocument();
  });

  it('formats duration correctly (MM:SS)', () => {
    const suggestion = createMockSuggestion({ duration: 225 }); // 3:45
    render(<SuggestionCard suggestion={suggestion} />);

    expect(screen.getByText('3:45')).toBeInTheDocument();
  });

  it('handles missing duration', () => {
    const suggestion = createMockSuggestion({ duration: undefined });
    render(<SuggestionCard suggestion={suggestion} />);

    expect(screen.getByText('--:--')).toBeInTheDocument();
  });

  describe('Download status badges', () => {
    it('shows "Queued" for pending status', () => {
      const suggestion = createMockSuggestion({ downloadStatus: 'pending' });
      render(<SuggestionCard suggestion={suggestion} />);

      expect(screen.getByText('Queued')).toBeInTheDocument();
    });

    it('shows "Downloading..." for downloading status', () => {
      const suggestion = createMockSuggestion({ downloadStatus: 'downloading' });
      render(<SuggestionCard suggestion={suggestion} />);

      expect(screen.getByText('Downloading...')).toBeInTheDocument();
    });

    it('shows "Ready" for complete status', () => {
      const suggestion = createMockSuggestion({ downloadStatus: 'complete' });
      render(<SuggestionCard suggestion={suggestion} />);

      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('shows "Failed" for error status', () => {
      const suggestion = createMockSuggestion({ downloadStatus: 'error' });
      render(<SuggestionCard suggestion={suggestion} />);

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('renders thumbnail with correct alt text', () => {
    const suggestion = createMockSuggestion();
    render(<SuggestionCard suggestion={suggestion} />);

    const image = screen.getByAltText('Amazing Space Documentary Footage');
    expect(image).toBeInTheDocument();
  });

  it('truncates long titles with line-clamp-2', () => {
    const longTitle =
      'This is an extremely long video title that should be truncated to two lines maximum using the line-clamp-2 CSS class';
    const suggestion = createMockSuggestion({ title: longTitle });
    const { container } = render(<SuggestionCard suggestion={suggestion} />);

    const titleElement = container.querySelector('.line-clamp-2');
    expect(titleElement).toBeInTheDocument();
  });
});
