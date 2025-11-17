/**
 * Visual Curation Page - Epic 4 (Placeholder)
 *
 * Placeholder page for Epic 4 visual curation workflow.
 * This page will be fully implemented in Epic 4.
 *
 * Story 3.5 creates this placeholder to complete the workflow handoff.
 */

import { notFound, redirect } from 'next/navigation';
import { getProject } from '@/lib/db/queries';

interface VisualCurationPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Visual Curation Page Component (Placeholder)
 *
 * @param params - Route parameters containing project ID
 * @returns Placeholder page for Epic 4
 */
export default async function VisualCurationPage({ params }: VisualCurationPageProps) {
  const { id: projectId } = await params;

  // Fetch project data on server
  const project = getProject(projectId);

  // Verify project exists
  if (!project) {
    notFound();
  }

  // Redirect if visual sourcing not complete
  if (!project.visuals_generated) {
    redirect(`/projects/${projectId}/visual-sourcing`);
  }

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
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Visual Curation
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Epic 4 - Coming Soon!</strong>
              </p>
              <p className="text-sm text-blue-700 mt-2">
                Visual curation interface will be implemented in Epic 4. This page is a placeholder
                to complete the Epic 3 workflow handoff.
              </p>
            </div>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <p>
                <strong>Visual Sourcing Complete!</strong> Your project has successfully completed
                Epic 3 visual content sourcing.
              </p>
              <p className="mt-4">
                <strong>Next Steps (Epic 4):</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
                <li>Review visual suggestions for each scene</li>
                <li>Select preferred video clips</li>
                <li>Adjust segment timing and placement</li>
                <li>Proceed to video assembly (Epic 5)</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
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
