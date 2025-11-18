/**
 * Visual Curation Page - Epic 4, Story 4.1
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
 * - Workflow validation (checks current_step = 'visual-curation')
 */

import { notFound, redirect } from 'next/navigation';
import { getProject } from '@/lib/db/queries';
import { VisualCurationClient } from './VisualCurationClient';

interface VisualCurationPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Visual Curation Page Component (Server Component)
 *
 * Validates project state and renders the client component.
 * Handles server-side validation and redirects.
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

  // Workflow Validation: Redirect if visual sourcing not complete
  if (!project.visuals_generated) {
    redirect(`/projects/${projectId}/visual-sourcing`);
  }

  // Pass project data to client component
  return <VisualCurationClient project={project} />;
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
