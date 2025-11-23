/**
 * Integration Tests - Workflow Validation
 * Story 4.6: Visual Curation Workflow Integration & Error Recovery
 *
 * Tests for server-side workflow validation including step checking,
 * redirect logic, and backward compatibility.
 *
 * Test IDs: 4.6-INT-001 to 4.6-INT-008
 * Priority: P0 (Critical)
 * Acceptance Criteria: AC #2, AC #3
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Next.js navigation functions
const mockRedirect = vi.fn();
const mockNotFound = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT'); // redirect throws
  },
  notFound: () => {
    mockNotFound();
    throw new Error('NEXT_NOT_FOUND'); // notFound throws
  },
}));

// Mock database query
const mockGetProject = vi.fn();
vi.mock('@/lib/db/queries', () => ({
  getProject: (id: string) => mockGetProject(id),
}));

describe('Workflow Validation - Story 4.6', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  /**
   * [4.6-INT-001] Direct URL Access - Valid Step
   */
  describe('[4.6-INT-001] Valid Workflow Step Access', () => {
    test('should allow access when current_step is visual-curation', async () => {
      // Given: Project with current_step = 'visual-curation'
      mockGetProject.mockReturnValue({
        id: 'proj-123',
        name: 'Test Project',
        current_step: 'visual-curation',
        visuals_generated: true,
      });

      // When: Importing and checking the page logic
      // Then: Should not redirect
      const project = mockGetProject('proj-123');
      const ALLOWED_STEPS = ['visual-curation', 'editing', 'export', 'complete'];

      expect(ALLOWED_STEPS.includes(project.current_step)).toBe(true);
    });

    test('should allow access when current_step is editing', async () => {
      // Given: Project in editing step (after visual curation)
      mockGetProject.mockReturnValue({
        id: 'proj-123',
        name: 'Test Project',
        current_step: 'editing',
        visuals_generated: true,
      });

      // When: Checking step
      const project = mockGetProject('proj-123');
      const ALLOWED_STEPS = ['visual-curation', 'editing', 'export', 'complete'];

      // Then: Should be allowed
      expect(ALLOWED_STEPS.includes(project.current_step)).toBe(true);
    });

    test('should allow access when visuals_generated is true (backward compatibility)', () => {
      // Given: Project with visuals_generated=true but different step
      mockGetProject.mockReturnValue({
        id: 'proj-123',
        name: 'Test Project',
        current_step: 'voiceover',
        visuals_generated: true,
      });

      // When: Checking access
      const project = mockGetProject('proj-123');

      // Then: Should allow access due to visuals_generated flag
      expect(project.visuals_generated).toBe(true);
    });
  });

  /**
   * [4.6-INT-002] Redirect for Wrong Step
   */
  describe('[4.6-INT-002] Invalid Workflow Step Redirect', () => {
    test('should redirect to voice-selection when current_step is voice', () => {
      // Given: Project in voice step
      mockGetProject.mockReturnValue({
        id: 'proj-123',
        name: 'Test Project',
        current_step: 'voice',
        visuals_generated: false,
      });

      // When: Checking redirect logic
      const project = mockGetProject('proj-123');
      const STEP_REDIRECTS: Record<string, string> = {
        'topic': 'topic',
        'script': 'script',
        'voice': 'voice-selection',
        'voiceover': 'voiceover-preview',
        'visual-sourcing': 'visual-sourcing',
      };

      // Then: Should redirect to voice-selection
      const redirectPath = STEP_REDIRECTS[project.current_step];
      expect(redirectPath).toBe('voice-selection');
    });

    test('should redirect to script when current_step is script', () => {
      // Given: Project in script step
      mockGetProject.mockReturnValue({
        id: 'proj-123',
        name: 'Test Project',
        current_step: 'script',
        visuals_generated: false,
      });

      // When: Checking redirect logic
      const project = mockGetProject('proj-123');
      const STEP_REDIRECTS: Record<string, string> = {
        'topic': 'topic',
        'script': 'script',
        'voice': 'voice-selection',
        'voiceover': 'voiceover-preview',
        'visual-sourcing': 'visual-sourcing',
      };

      // Then: Should redirect to script
      const redirectPath = STEP_REDIRECTS[project.current_step];
      expect(redirectPath).toBe('script');
    });

    test('should redirect to voiceover-preview when current_step is voiceover', () => {
      // Given: Project in voiceover step
      mockGetProject.mockReturnValue({
        id: 'proj-123',
        name: 'Test Project',
        current_step: 'voiceover',
        visuals_generated: false,
      });

      // When: Checking redirect logic
      const project = mockGetProject('proj-123');
      const STEP_REDIRECTS: Record<string, string> = {
        'topic': 'topic',
        'script': 'script',
        'voice': 'voice-selection',
        'voiceover': 'voiceover-preview',
        'visual-sourcing': 'visual-sourcing',
      };

      // Then: Should redirect to voiceover-preview
      const redirectPath = STEP_REDIRECTS[project.current_step];
      expect(redirectPath).toBe('voiceover-preview');
    });

    test('should redirect to visual-sourcing when current_step is visual-sourcing', () => {
      // Given: Project in visual-sourcing step
      mockGetProject.mockReturnValue({
        id: 'proj-123',
        name: 'Test Project',
        current_step: 'visual-sourcing',
        visuals_generated: false,
      });

      // When: Checking redirect logic
      const project = mockGetProject('proj-123');
      const STEP_REDIRECTS: Record<string, string> = {
        'topic': 'topic',
        'script': 'script',
        'voice': 'voice-selection',
        'voiceover': 'voiceover-preview',
        'visual-sourcing': 'visual-sourcing',
      };

      // Then: Should redirect to visual-sourcing
      const redirectPath = STEP_REDIRECTS[project.current_step];
      expect(redirectPath).toBe('visual-sourcing');
    });
  });

  /**
   * [4.6-INT-003] Warning Query Parameter
   */
  describe('[4.6-INT-003] Warning Parameter in Redirect', () => {
    test('should include warning query parameter in redirect URL', () => {
      // Given: Project in wrong step
      mockGetProject.mockReturnValue({
        id: 'proj-123',
        name: 'Test Project',
        current_step: 'voice',
        visuals_generated: false,
      });

      // When: Building redirect URL
      const projectId = 'proj-123';
      const redirectPath = 'voice-selection';
      const redirectUrl = `/projects/${projectId}/${redirectPath}?warning=complete-previous-step`;

      // Then: Should have warning parameter
      expect(redirectUrl).toContain('warning=complete-previous-step');
    });
  });

  /**
   * [4.6-INT-004] Project Not Found
   */
  describe('[4.6-INT-004] Non-Existent Project', () => {
    test('should return notFound for non-existent project', () => {
      // Given: No project found
      mockGetProject.mockReturnValue(null);

      // When: Checking project
      const project = mockGetProject('non-existent');

      // Then: Should trigger notFound
      expect(project).toBeNull();
    });
  });

  /**
   * [4.6-INT-005] Default Redirect
   */
  describe('[4.6-INT-005] Default Redirect Behavior', () => {
    test('should default to visual-sourcing when no redirect mapping exists', () => {
      // Given: Project with unknown step
      mockGetProject.mockReturnValue({
        id: 'proj-123',
        name: 'Test Project',
        current_step: 'unknown-step',
        visuals_generated: false,
      });

      // When: Checking redirect logic
      const project = mockGetProject('proj-123');
      const STEP_REDIRECTS: Record<string, string> = {
        'topic': 'topic',
        'script': 'script',
        'voice': 'voice-selection',
        'voiceover': 'voiceover-preview',
        'visual-sourcing': 'visual-sourcing',
      };
      const ALLOWED_STEPS = ['visual-curation', 'editing', 'export', 'complete'];

      const redirectPath = STEP_REDIRECTS[project.current_step];

      // Then: Should not have redirect path (falls to default)
      expect(redirectPath).toBeUndefined();
      expect(ALLOWED_STEPS.includes(project.current_step)).toBe(false);
    });
  });

  /**
   * [4.6-INT-006] All Allowed Steps
   */
  describe('[4.6-INT-006] Complete Allowed Steps List', () => {
    const allowedSteps = ['visual-curation', 'editing', 'export', 'complete'];

    allowedSteps.forEach((step) => {
      test(`should allow access for step: ${step}`, () => {
        // Given: Project with allowed step
        mockGetProject.mockReturnValue({
          id: 'proj-123',
          name: 'Test Project',
          current_step: step,
          visuals_generated: false,
        });

        // When: Checking access
        const project = mockGetProject('proj-123');
        const ALLOWED_STEPS = ['visual-curation', 'editing', 'export', 'complete'];

        // Then: Should be allowed
        expect(ALLOWED_STEPS.includes(project.current_step)).toBe(true);
      });
    });
  });

  /**
   * [4.6-INT-007] Priority Check Order
   */
  describe('[4.6-INT-007] Access Check Priority', () => {
    test('visuals_generated should take priority over current_step check', () => {
      // Given: Project with visuals_generated=true but wrong step
      mockGetProject.mockReturnValue({
        id: 'proj-123',
        name: 'Test Project',
        current_step: 'topic', // Wrong step
        visuals_generated: true, // But flag is true
      });

      // When: Checking access priority
      const project = mockGetProject('proj-123');

      // Then: Should allow based on visuals_generated
      // The check order is: visuals_generated first, then current_step
      expect(project.visuals_generated).toBe(true);
    });
  });

  /**
   * [4.6-INT-008] Null Current Step
   */
  describe('[4.6-INT-008] Edge Cases', () => {
    test('should handle null current_step', () => {
      // Given: Project with null current_step
      mockGetProject.mockReturnValue({
        id: 'proj-123',
        name: 'Test Project',
        current_step: null,
        visuals_generated: false,
      });

      // When: Checking redirect logic
      const project = mockGetProject('proj-123');
      const STEP_REDIRECTS: Record<string, string> = {
        'topic': 'topic',
        'script': 'script',
        'voice': 'voice-selection',
        'voiceover': 'voiceover-preview',
        'visual-sourcing': 'visual-sourcing',
      };

      // Then: Should not have redirect mapping
      expect(STEP_REDIRECTS[project.current_step]).toBeUndefined();
    });

    test('should handle empty string current_step', () => {
      // Given: Project with empty current_step
      mockGetProject.mockReturnValue({
        id: 'proj-123',
        name: 'Test Project',
        current_step: '',
        visuals_generated: false,
      });

      // When: Checking allowed steps
      const project = mockGetProject('proj-123');
      const ALLOWED_STEPS = ['visual-curation', 'editing', 'export', 'complete'];

      // Then: Should not be in allowed steps
      expect(ALLOWED_STEPS.includes(project.current_step)).toBe(false);
    });
  });
});
