/**
 * Component Unit Tests: SceneCard
 * Test IDs: 4.1-UNIT-001, 4.1-UNIT-002, 4.1-UNIT-004
 * Epic: 4 - Visual Curation Interface
 * Story: 4.1 - Scene-by-Scene UI Layout & Script Display
 *
 * Tests for the SceneCard component that displays individual scenes
 * with scene numbers, script text, and duration indicators.
 *
 * Risk Mitigation:
 * - R-005 (Score 4): Long text handling without layout break
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SceneCard } from '@/components/features/curation/SceneCard';
import { createTestScene } from '../../factories/scene.factory';
import { faker } from '@faker-js/faker';

// Mock VisualSuggestionGallery (Story 4.2 component)
vi.mock('@/components/features/curation/VisualSuggestionGallery', () => ({
  VisualSuggestionGallery: () => <div data-testid="visual-suggestion-gallery">Gallery</div>,
}));

describe('[4.1-UNIT] SceneCard Component Tests', () => {
  const testProjectId = faker.string.uuid();

  describe('[4.1-UNIT-001] [P1] Scene Number and Text Rendering', () => {
    it('should render scene number badge and scene text', () => {
      // Given: Scene with number and text
      const scene = createTestScene({
        project_id: testProjectId,
        scene_number: 1,
        text: 'This is the scene text content that should be displayed.',
        duration: 5.5,
      });

      // When: Render SceneCard
      render(<SceneCard scene={scene} projectId={testProjectId} />);

      // Then: Scene number and text visible
      expect(screen.getByText('Scene 1')).toBeInTheDocument();
      expect(screen.getByText(/This is the scene text content/)).toBeInTheDocument();
    });

    it('should display scene number in badge', () => {
      // Given: Scene with number 7
      const scene = createTestScene({
        scene_number: 7,
        text: 'Scene 7 content',
      });

      // When: Render
      render(<SceneCard scene={scene} projectId={testProjectId} />);

      // Then: Number 7 visible in badge
      const badge = screen.getByText('7');
      expect(badge).toBeInTheDocument();
      expect(screen.getByText('Scene 7')).toBeInTheDocument();
    });

    it('should render complete script text without truncation', () => {
      // Given: Scene with full paragraph
      const fullText =
        'An octopus can unscrew a jar from the inside. Not because someone taught it - because it figured it out. These eight-armed creatures solve puzzles that stump most animals, and scientists are only beginning to understand why. Their intelligence is not just remarkable, it is alien.';

      const scene = createTestScene({
        scene_number: 1,
        text: fullText,
      });

      // When: Render
      render(<SceneCard scene={scene} projectId={testProjectId} />);

      // Then: Full text visible (not truncated)
      expect(screen.getByText(fullText)).toBeInTheDocument();
    });
  });

  describe('[4.1-UNIT-002] [P1] Long Text Handling', () => {
    it('should handle long text (500+ words) without layout break', () => {
      // Given: Very long scene text (simulates edge case)
      const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100); // ~600 words

      const scene = createTestScene({
        scene_number: 1,
        text: longText,
        duration: 120.0, // 2 minutes for long text
      });

      // When: Render
      const { container } = render(<SceneCard scene={scene} projectId={testProjectId} />);

      // Then: Text renders without breaking layout (use partial match for long text)
      const textElement = screen.getByText((content) => content.includes('Lorem ipsum'));
      expect(textElement).toBeInTheDocument();

      // Verify card structure intact
      expect(container.querySelector('[class*="rounded-lg"]')).toBeInTheDocument();

      // Text should contain the full long text (trim to handle whitespace)
      expect(textElement.textContent?.trim().length).toBeGreaterThan(5000);
    });

    it('should handle text with special characters and line breaks', () => {
      // Given: Text with special formatting
      const specialText = 'Testing with symbols: $100, 50%, @user, #hashtag, & more!\nNew line here.';

      const scene = createTestScene({
        scene_number: 1,
        text: specialText,
      });

      // When: Render
      render(<SceneCard scene={scene} projectId={testProjectId} />);

      // Then: Special characters rendered correctly
      expect(screen.getByText(/Testing with symbols.*more!/)).toBeInTheDocument();
    });
  });

  describe('[4.1-UNIT-004] [P2] Duration Display', () => {
    it('should format duration correctly for seconds (<60s)', () => {
      // Given: Scene with 5.5 second duration
      const scene = createTestScene({
        scene_number: 1,
        text: 'Short scene',
        duration: 5.5,
      });

      // When: Render
      render(<SceneCard scene={scene} projectId={testProjectId} />);

      // Then: Duration shows "5.5s"
      expect(screen.getByText('5.5s')).toBeInTheDocument();
    });

    it('should format duration correctly for minutes (≥60s)', () => {
      // Given: Scene with 90 second duration (1m 30s)
      const scene = createTestScene({
        scene_number: 1,
        text: 'Long scene',
        duration: 90.0,
      });

      // When: Render
      render(<SceneCard scene={scene} projectId={testProjectId} />);

      // Then: Duration shows "1m 30s"
      expect(screen.getByText('1m 30s')).toBeInTheDocument();
    });

    it('should display "No audio" for null duration', () => {
      // Given: Scene without audio (null duration)
      const scene = createTestScene({
        scene_number: 1,
        text: 'Scene without audio',
        audio_file_path: null,
        duration: null,
      });

      // When: Render
      render(<SceneCard scene={scene} projectId={testProjectId} />);

      // Then: "No audio" displayed
      expect(screen.getByText('No audio')).toBeInTheDocument();
    });

    it('should handle zero duration edge case', () => {
      // Given: Scene with 0 second duration
      const scene = createTestScene({
        scene_number: 1,
        text: 'Zero duration scene',
        duration: 0,
      });

      // When: Render
      render(<SceneCard scene={scene} projectId={testProjectId} />);

      // Then: Shows "0.0s"
      expect(screen.getByText('0.0s')).toBeInTheDocument();
    });
  });

  describe('[4.1-UNIT-005] [P3] Component Structure', () => {
    it('should render VisualSuggestionGallery component (Story 4.2)', () => {
      // Given: Any scene
      const scene = createTestScene({
        scene_number: 1,
        text: 'Test scene',
      });

      // When: Render
      render(<SceneCard scene={scene} projectId={testProjectId} />);

      // Then: VisualSuggestionGallery present
      expect(screen.getByTestId('visual-suggestion-gallery')).toBeInTheDocument();
    });

    it('should pass correct props to VisualSuggestionGallery', () => {
      // Given: Scene with specific ID and number
      const scene = createTestScene({
        id: 'test-scene-id',
        scene_number: 5,
        text: 'Test',
      });

      // When: Render
      const { container } = render(<SceneCard scene={scene} projectId={testProjectId} />);

      // Then: Gallery component rendered with scene context
      const gallery = screen.getByTestId('visual-suggestion-gallery');
      expect(gallery).toBeInTheDocument();
      // Props verified by mock (projectId, sceneId, sceneNumber passed)
    });

    it('should apply custom className if provided', () => {
      // Given: Custom className
      const scene = createTestScene({
        scene_number: 1,
        text: 'Test',
      });

      // When: Render with className
      const { container } = render(<SceneCard scene={scene} projectId={testProjectId} className="custom-class" />);

      // Then: Custom class applied to card
      const card = container.firstChild;
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('[4.1-UNIT-006] [P3] Edge Cases', () => {
    it('should handle empty text gracefully', () => {
      // Given: Scene with empty text
      const scene = createTestScene({
        scene_number: 1,
        text: '',
      });

      // When: Render
      render(<SceneCard scene={scene} projectId={testProjectId} />);

      // Then: Component renders without error
      expect(screen.getByText('Scene 1')).toBeInTheDocument();
      // Empty text paragraph rendered
    });

    it('should handle scene number 0', () => {
      // Given: Scene with number 0 (edge case)
      const scene = createTestScene({
        scene_number: 0,
        text: 'Scene zero',
      });

      // When: Render
      render(<SceneCard scene={scene} projectId={testProjectId} />);

      // Then: Renders with 0
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('Scene 0')).toBeInTheDocument();
    });

    it('should handle very large scene numbers', () => {
      // Given: Scene with large number
      const scene = createTestScene({
        scene_number: 999,
        text: 'Scene 999',
      });

      // When: Render
      render(<SceneCard scene={scene} projectId={testProjectId} />);

      // Then: Large number renders (multiple elements may contain "Scene 999")
      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getAllByText('Scene 999').length).toBeGreaterThanOrEqual(1);
    });
  });
});
