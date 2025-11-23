/**
 * Component Unit Tests - NavigationBreadcrumb
 * Story 4.6: Visual Curation Workflow Integration & Error Recovery
 *
 * Tests for NavigationBreadcrumb component including step display,
 * controlled navigation, and accessibility.
 *
 * Test IDs: 4.6-UNIT-001 to 4.6-UNIT-006
 * Priority: P0 (Critical)
 * Acceptance Criteria: AC #9
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavigationBreadcrumb } from '@/components/features/curation/NavigationBreadcrumb';

describe('NavigationBreadcrumb Component - Story 4.6', () => {
  const defaultProps = {
    projectId: 'test-proj-123',
    projectName: 'Test Project',
    currentStep: 'visual-curation' as const,
    onNavigate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * [4.6-UNIT-001] Basic Component Rendering
   */
  describe('[4.6-UNIT-001] Basic Rendering', () => {
    test('should render all navigation steps in correct order', () => {
      // Given: Component with default props
      render(<NavigationBreadcrumb {...defaultProps} />);

      // Then: Should display all 4 steps
      expect(screen.getByText('Project')).toBeInTheDocument();
      expect(screen.getByText('Script')).toBeInTheDocument();
      expect(screen.getByText('Voiceover')).toBeInTheDocument();
      expect(screen.getByText('Visual Curation')).toBeInTheDocument();
    });

    test('should render chevron separators between steps', () => {
      // Given: Component rendered
      const { container } = render(<NavigationBreadcrumb {...defaultProps} />);

      // Then: Should have 3 chevron separators (between 4 items)
      const chevrons = container.querySelectorAll('svg.w-4.h-4.mx-1');
      expect(chevrons).toHaveLength(3);
    });

    test('should highlight current step with different styling', () => {
      // Given: Component with visual-curation as current step
      render(<NavigationBreadcrumb {...defaultProps} />);

      // Then: Current step should have different styling (span vs anchor)
      const currentStep = screen.getByText('Visual Curation');
      expect(currentStep.tagName).toBe('SPAN');
      expect(currentStep).toHaveClass('font-medium');
    });

    test('should render previous steps as clickable links', () => {
      // Given: Component rendered
      render(<NavigationBreadcrumb {...defaultProps} />);

      // Then: Previous steps should be anchors
      const projectLink = screen.getByText('Project').closest('a');
      const scriptLink = screen.getByText('Script').closest('a');
      const voiceoverLink = screen.getByText('Voiceover').closest('a');

      expect(projectLink).toBeInTheDocument();
      expect(scriptLink).toBeInTheDocument();
      expect(voiceoverLink).toBeInTheDocument();
    });
  });

  /**
   * [4.6-UNIT-002] Navigation Links
   */
  describe('[4.6-UNIT-002] Correct Link Destinations', () => {
    test('should generate correct href for each step', () => {
      // Given: Component with specific projectId
      render(<NavigationBreadcrumb {...defaultProps} />);

      // Then: Each link should have correct href
      const projectLink = screen.getByText('Project').closest('a');
      const scriptLink = screen.getByText('Script').closest('a');
      const voiceoverLink = screen.getByText('Voiceover').closest('a');

      expect(projectLink).toHaveAttribute('href', '/projects/test-proj-123');
      expect(scriptLink).toHaveAttribute('href', '/projects/test-proj-123/script');
      expect(voiceoverLink).toHaveAttribute('href', '/projects/test-proj-123/voiceover-preview');
    });
  });

  /**
   * [4.6-UNIT-003] Controlled Navigation
   */
  describe('[4.6-UNIT-003] Controlled Navigation with onNavigate', () => {
    test('should call onNavigate when link is clicked', async () => {
      // Given: Component with onNavigate handler
      const onNavigateMock = vi.fn();
      render(<NavigationBreadcrumb {...defaultProps} onNavigate={onNavigateMock} />);

      // When: Clicking on Script link
      const scriptLink = screen.getByText('Script').closest('a')!;
      await userEvent.click(scriptLink);

      // Then: Should call onNavigate with href
      expect(onNavigateMock).toHaveBeenCalledWith('/projects/test-proj-123/script');
    });

    test('should prevent default navigation when onNavigate provided', async () => {
      // Given: Component with onNavigate handler
      const onNavigateMock = vi.fn();
      render(<NavigationBreadcrumb {...defaultProps} onNavigate={onNavigateMock} />);

      // When: Clicking on Project link
      const projectLink = screen.getByText('Project').closest('a')!;
      await userEvent.click(projectLink);

      // Then: Should call onNavigate (not navigate directly)
      expect(onNavigateMock).toHaveBeenCalledWith('/projects/test-proj-123');
    });

    test('should allow default navigation when onNavigate not provided', () => {
      // Given: Component without onNavigate
      const { onNavigate, ...propsWithoutNavigate } = defaultProps;
      render(<NavigationBreadcrumb {...propsWithoutNavigate} />);

      // Then: Links should still be clickable (default behavior)
      const projectLink = screen.getByText('Project').closest('a');
      expect(projectLink).toHaveAttribute('href', '/projects/test-proj-123');
    });
  });

  /**
   * [4.6-UNIT-004] Different Current Steps
   */
  describe('[4.6-UNIT-004] Current Step Variations', () => {
    test('should highlight Script when currentStep is script', () => {
      // Given: Component with script as current step
      render(<NavigationBreadcrumb {...defaultProps} currentStep="script" />);

      // Then: Script should be highlighted
      const scriptStep = screen.getByText('Script');
      expect(scriptStep.tagName).toBe('SPAN');
      expect(scriptStep).toHaveClass('font-medium');
    });

    test('should highlight Voiceover when currentStep is voiceover', () => {
      // Given: Component with voiceover as current step
      render(<NavigationBreadcrumb {...defaultProps} currentStep="voiceover" />);

      // Then: Voiceover should be highlighted
      const voiceoverStep = screen.getByText('Voiceover');
      expect(voiceoverStep.tagName).toBe('SPAN');
      expect(voiceoverStep).toHaveClass('font-medium');
    });
  });

  /**
   * [4.6-UNIT-005] Accessibility
   */
  describe('[4.6-UNIT-005] Accessibility', () => {
    test('should use nav element for semantic navigation', () => {
      // Given: Component rendered
      const { container } = render(<NavigationBreadcrumb {...defaultProps} />);

      // Then: Should use nav element
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    test('should have icons with proper sizing', () => {
      // Given: Component rendered
      const { container } = render(<NavigationBreadcrumb {...defaultProps} />);

      // Then: Icons should have w-4 h-4 classes
      const icons = container.querySelectorAll('svg.w-4.h-4');
      expect(icons.length).toBeGreaterThan(0);
    });

    test('should have hover states for clickable links', () => {
      // Given: Component rendered
      render(<NavigationBreadcrumb {...defaultProps} />);

      // Then: Links should have hover classes
      const projectLink = screen.getByText('Project').closest('a');
      expect(projectLink).toHaveClass('hover:text-slate-700');
    });
  });

  /**
   * [4.6-UNIT-006] Dark Mode Support
   */
  describe('[4.6-UNIT-006] Dark Mode', () => {
    test('should have dark mode classes for current step', () => {
      // Given: Component rendered
      render(<NavigationBreadcrumb {...defaultProps} />);

      // Then: Current step should have dark mode text class
      const currentStep = screen.getByText('Visual Curation');
      expect(currentStep).toHaveClass('dark:text-slate-100');
    });

    test('should have dark mode hover classes for links', () => {
      // Given: Component rendered
      render(<NavigationBreadcrumb {...defaultProps} />);

      // Then: Links should have dark mode hover classes
      const projectLink = screen.getByText('Project').closest('a');
      expect(projectLink).toHaveClass('dark:hover:text-slate-300');
    });
  });
});
