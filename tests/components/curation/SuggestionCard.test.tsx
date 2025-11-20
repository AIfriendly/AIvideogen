/**
 * SuggestionCard Component Tests - Epic 4, Story 4.2
 * Test ID Prefix: 4.2-UNIT-xxx
 * Priority: P1/P2
 *
 * Tests for the SuggestionCard component that displays individual visual suggestions
 * with thumbnails, metadata, rank badges, and download status indicators.
 *
 * Following TEA test-quality.md best practices:
 * - BDD format (Given-When-Then)
 * - Test IDs for traceability
 * - Priority markers for triage
 * - Explicit assertions
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SuggestionCard } from '@/components/features/curation/SuggestionCard';
import { type VisualSuggestion } from '@/types/visual-suggestions';
import { faker } from '@faker-js/faker';

/**
 * Factory: Create visual suggestion DTO (camelCase for frontend)
 * Uses faker.js for parallel-safe, unique test data
 */
function createVisualSuggestionDto(overrides?: Partial<VisualSuggestion>): VisualSuggestion {
  const videoId = overrides?.videoId || faker.string.alphanumeric(11);

  return {
    id: faker.string.uuid(),
    sceneId: faker.string.uuid(),
    videoId,
    title: faker.lorem.sentence({ min: 3, max: 8 }),
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    channelTitle: faker.company.name(),
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    rank: faker.number.int({ min: 1, max: 8 }),
    duration: faker.number.int({ min: 30, max: 600 }),
    defaultSegmentPath: `.cache/videos/project-1/scene-1-default.mp4`,
    downloadStatus: 'complete',
    createdAt: faker.date.recent().toISOString(),
    ...overrides,
  };
}

describe('[4.2-UNIT] SuggestionCard Component Tests', () => {
  describe('[4.2-UNIT-001] [P1] Video Metadata Display', () => {
    it('should render video title', () => {
      // Given: Visual suggestion with specific title
      const suggestion = createVisualSuggestionDto({
        title: 'Amazing Space Documentary Footage'
      });

      // When: Rendering SuggestionCard
      render(<SuggestionCard suggestion={suggestion} />);

      // Then: Title visible in card
      expect(screen.getByText('Amazing Space Documentary Footage')).toBeInTheDocument();
    });

    it('should render channel name', () => {
      // Given: Visual suggestion with specific channel
      const suggestion = createVisualSuggestionDto({
        channelTitle: 'Space Channel'
      });

      // When: Rendering SuggestionCard
      render(<SuggestionCard suggestion={suggestion} />);

      // Then: Channel name visible
      expect(screen.getByText('Space Channel')).toBeInTheDocument();
    });

    it('should render rank badge with position number', () => {
      // Given: Visual suggestion with rank 3
      const suggestion = createVisualSuggestionDto({ rank: 3 });

      // When: Rendering SuggestionCard
      render(<SuggestionCard suggestion={suggestion} />);

      // Then: Rank badge shows "#3"
      expect(screen.getByText('#3')).toBeInTheDocument();
    });

    it('should render thumbnail with correct alt text', () => {
      // Given: Visual suggestion with title for alt text
      const suggestion = createVisualSuggestionDto({
        title: 'Mars Colony Visualization'
      });

      // When: Rendering SuggestionCard
      render(<SuggestionCard suggestion={suggestion} />);

      // Then: Image has title as alt text
      const image = screen.getByAltText('Mars Colony Visualization');
      expect(image).toBeInTheDocument();
    });
  });

  describe('[4.2-UNIT-002] [P1] Duration Formatting', () => {
    it('should format duration correctly as MM:SS', () => {
      // Given: Visual suggestion with 225 seconds (3:45)
      const suggestion = createVisualSuggestionDto({ duration: 225 });

      // When: Rendering SuggestionCard
      render(<SuggestionCard suggestion={suggestion} />);

      // Then: Duration displays as "3:45"
      expect(screen.getByText('3:45')).toBeInTheDocument();
    });

    it('should handle missing duration with placeholder', () => {
      // Given: Visual suggestion without duration
      const suggestion = createVisualSuggestionDto({ duration: undefined });

      // When: Rendering SuggestionCard
      render(<SuggestionCard suggestion={suggestion} />);

      // Then: Displays "--:--" placeholder
      expect(screen.getByText('--:--')).toBeInTheDocument();
    });

    it('should format short durations correctly', () => {
      // Given: Visual suggestion with 45 seconds (0:45)
      const suggestion = createVisualSuggestionDto({ duration: 45 });

      // When: Rendering SuggestionCard
      render(<SuggestionCard suggestion={suggestion} />);

      // Then: Duration displays as "0:45"
      expect(screen.getByText('0:45')).toBeInTheDocument();
    });
  });

  describe('[4.2-UNIT-003] [P1] Download Status Badges', () => {
    it('should show "Queued" badge for pending status', () => {
      // Given: Visual suggestion with pending download
      const suggestion = createVisualSuggestionDto({ downloadStatus: 'pending' });

      // When: Rendering SuggestionCard
      render(<SuggestionCard suggestion={suggestion} />);

      // Then: Badge shows "Queued"
      expect(screen.getByText('Queued')).toBeInTheDocument();
    });

    it('should show "Downloading..." badge for in-progress status', () => {
      // Given: Visual suggestion currently downloading
      const suggestion = createVisualSuggestionDto({ downloadStatus: 'downloading' });

      // When: Rendering SuggestionCard
      render(<SuggestionCard suggestion={suggestion} />);

      // Then: Badge shows "Downloading..."
      expect(screen.getByText('Downloading...')).toBeInTheDocument();
    });

    it('should show "Ready" badge for complete status', () => {
      // Given: Visual suggestion with completed download
      const suggestion = createVisualSuggestionDto({ downloadStatus: 'complete' });

      // When: Rendering SuggestionCard
      render(<SuggestionCard suggestion={suggestion} />);

      // Then: Badge shows "Ready"
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('should show "Failed" badge for error status', () => {
      // Given: Visual suggestion with download error
      const suggestion = createVisualSuggestionDto({ downloadStatus: 'error' });

      // When: Rendering SuggestionCard
      render(<SuggestionCard suggestion={suggestion} />);

      // Then: Badge shows "Failed"
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  describe('[4.2-UNIT-004] [P2] Long Title Handling', () => {
    it('should truncate long titles with line-clamp-2', () => {
      // Given: Visual suggestion with very long title
      const longTitle =
        'This is an extremely long video title that should be truncated to two lines maximum using the line-clamp-2 CSS class';
      const suggestion = createVisualSuggestionDto({ title: longTitle });

      // When: Rendering SuggestionCard
      const { container } = render(<SuggestionCard suggestion={suggestion} />);

      // Then: Title element has line-clamp-2 class for truncation
      const titleElement = container.querySelector('.line-clamp-2');
      expect(titleElement).toBeInTheDocument();
    });
  });

  describe('[4.2-UNIT-005] [P3] Edge Cases', () => {
    it('should handle rank 1 (top position)', () => {
      // Given: Visual suggestion with rank 1
      const suggestion = createVisualSuggestionDto({ rank: 1 });

      // When: Rendering SuggestionCard
      render(<SuggestionCard suggestion={suggestion} />);

      // Then: Rank badge shows "#1"
      expect(screen.getByText('#1')).toBeInTheDocument();
    });

    it('should handle rank 8 (maximum rank)', () => {
      // Given: Visual suggestion with maximum rank
      const suggestion = createVisualSuggestionDto({ rank: 8 });

      // When: Rendering SuggestionCard
      render(<SuggestionCard suggestion={suggestion} />);

      // Then: Rank badge shows "#8"
      expect(screen.getByText('#8')).toBeInTheDocument();
    });
  });
});
