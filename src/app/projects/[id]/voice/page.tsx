/**
 * Voice Selection Page - Story 2.3
 *
 * Server Component page that loads project data and renders the VoiceSelection
 * Client Component for voice selection workflow.
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

import { notFound, redirect } from 'next/navigation';
import { getProject } from '@/lib/db/queries';
import { VoiceSelection } from '@/components/features/voice/VoiceSelection';

interface VoicePageProps {
  params: Promise<{ id: string }>;
}

/**
 * Voice Selection Page Component
 *
 * Server Component that:
 * - Fetches project data from database
 * - Verifies project exists
 * - Implements workflow state guards
 * - Renders VoiceSelection Client Component
 *
 * @param params - Route parameters containing project ID
 * @returns Page component with voice selection UI
 */
export default async function VoicePage({ params }: VoicePageProps) {
  const { id: projectId } = await params;

  // Fetch project data on server
  const project = getProject(projectId);

  // Verify project exists
  if (!project) {
    notFound();
  }

  // Workflow state guards
  // Redirect if topic not confirmed
  if (!project.topic) {
    redirect(`/projects/${projectId}`);
  }

  // Redirect if already past voice selection step
  if (project.current_step === 'script-generation' && project.voice_selected) {
    redirect(`/projects/${projectId}/script-generation`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
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

      {/* Main Content */}
      <main className="flex flex-1 flex-col p-8 bg-slate-50 dark:bg-slate-950">
        <VoiceSelection projectId={projectId} />
      </main>
    </div>
  );
}

/**
 * Generate metadata for the page
 */
export async function generateMetadata({ params }: VoicePageProps) {
  const { id: projectId } = await params;
  const project = getProject(projectId);

  return {
    title: project ? `Voice Selection - ${project.name}` : 'Voice Selection',
    description: 'Select a narrator voice for your AI video project',
  };
}
