/**
 * Visual Sourcing Page - Story 3.5
 *
 * Server Component page that orchestrates the visual content sourcing workflow.
 * Displays VisualSourcingLoader during processing, then redirects to visual curation on completion.
 *
 * Workflow: Epic 2 Voiceover → Epic 3 Visual Sourcing → Epic 4 Visual Curation
 */

import { notFound, redirect } from 'next/navigation';
import { getProject, getScenesByProjectId } from '@/lib/db/queries';
import { VisualSourcingPage as VisualSourcingPageClient } from './VisualSourcingPageClient';

interface VisualSourcingPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Visual Sourcing Page Component
 *
 * Server Component that:
 * - Fetches project and scene data from database
 * - Verifies project exists and prerequisites are met
 * - Implements workflow state guards
 * - Renders VisualSourcingLoader Client Component
 *
 * @param params - Route parameters containing project ID
 * @returns Page component with visual sourcing UI
 */
export default async function VisualSourcingPage({ params }: VisualSourcingPageProps) {
  const { id: projectId } = await params;

  // Fetch project data on server
  const project = getProject(projectId);

  // Verify project exists
  if (!project) {
    notFound();
  }

  // Workflow state guards
  // Redirect if script not generated
  if (!project.script_generated) {
    redirect(`/projects/${projectId}/script-generation`);
  }

  // Redirect if voice not selected
  if (!project.voice_id) {
    redirect(`/projects/${projectId}/voice`);
  }

  // If visuals already generated, redirect to visual curation
  if (project.visuals_generated) {
    redirect(`/projects/${projectId}/visual-curation`);
  }

  // Load scenes to get count
  const scenes = getScenesByProjectId(projectId);

  if (scenes.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b bg-background dark:bg-slate-900">
          <div className="container flex h-16 items-center gap-4 px-4">
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {project.name}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Topic: {project.topic}
              </p>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col p-8 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-2xl mx-auto w-full">
            <div className="bg-background rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-2">No Scenes Found</h2>
              <p className="text-muted-foreground">
                No scenes exist for this project. Please generate a script first.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render client component with visual sourcing loader
  return <VisualSourcingPageClient projectId={projectId} totalScenes={scenes.length} />;
}

/**
 * Generate metadata for the page
 */
export async function generateMetadata({ params }: VisualSourcingPageProps) {
  const { id: projectId } = await params;
  const project = getProject(projectId);

  return {
    title: project ? `Visual Sourcing - ${project.name}` : 'Visual Sourcing',
    description: 'Sourcing visual content for your AI video project',
  };
}
