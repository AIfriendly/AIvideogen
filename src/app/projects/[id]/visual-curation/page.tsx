/**
 * Visual Curation Page - Epic 4, Story 4.1, 4.6
 *
 * Scene-by-scene visual curation interface where users review and select
 * visual content for each scene in their video project.
 *
 * Features:
 * - Fetches scenes from API
 * - Displays scenes in scene-by-scene layout
 * - Loading states with skeleton components
 * - Error handling with retry functionality
 * - Empty state when no scenes found
 * - Responsive design (desktop 1920px, tablet 768px)
 * - Workflow validation with step-based redirects (Story 4.6)
 */

import { notFound, redirect } from 'next/navigation';
import { getProject } from '@/lib/db/queries';
import { VisualCurationClient } from './VisualCurationClient';

interface VisualCurationPageProps {
  params: Promise<{ id: string }>;
}

// Map current_step to redirect paths
const STEP_REDIRECTS: Record<string, string> = {
  'topic': 'topic',
  'script': 'script',
  'voice': 'voice-selection',
  'voiceover': 'voiceover-preview',
  'visual-sourcing': 'visual-sourcing',
};

// Steps that allow access to visual-curation
const ALLOWED_STEPS = ['visual-curation', 'editing', 'export', 'complete'];

/**
 * Visual Curation Page Component (Server Component)
 *
 * Validates project state and renders the client component.
 * Handles server-side validation and redirects based on workflow step.
 *
 * @param params - Route parameters containing project ID
 * @returns Visual curation page
 */
export default async function VisualCurationPage({ params }: VisualCurationPageProps) {
  const { id: projectId } = await params;

  // Fetch project data on server
  const project = getProject(projectId);

  // Verify project exists
  if (!project) {
    notFound();
  }

  // Workflow Validation: Check if user can access visual-curation
  const currentStep = project.current_step;

  // Allow if visuals_generated is true (backward compatibility)
  if (project.visuals_generated) {
    return <VisualCurationClient project={project} />;
  }

  // Check against allowed steps
  if (currentStep && ALLOWED_STEPS.includes(currentStep)) {
    return <VisualCurationClient project={project} />;
  }

  // Redirect to appropriate step with warning
  if (currentStep && STEP_REDIRECTS[currentStep]) {
    const redirectPath = STEP_REDIRECTS[currentStep];
    redirect(`/projects/${projectId}/${redirectPath}?warning=complete-previous-step`);
  }

  // Default: redirect to visual-sourcing if visual generation incomplete
  redirect(`/projects/${projectId}/visual-sourcing`);
}

/**
 * Generate metadata for the page
 */
export async function generateMetadata({ params }: VisualCurationPageProps) {
  const { id: projectId } = await params;
  const project = getProject(projectId);

  return {
    title: project ? `Visual Curation - ${project.name}` : 'Visual Curation',
    description: 'Curate and select visual content for your AI video project',
  };
}
