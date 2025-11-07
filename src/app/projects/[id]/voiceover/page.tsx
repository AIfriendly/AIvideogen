/**
 * Voiceover Generation Page - Story 2.5
 *
 * Server Component page that loads project and scene data and renders the VoiceoverGenerator
 * Client Component for voiceover generation workflow.
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

import { notFound, redirect } from 'next/navigation';
import { getProject, getScenesByProjectId } from '@/lib/db/queries';
import { VoiceoverGenerator } from '@/components/features/voiceover/VoiceoverGenerator';

interface VoiceoverPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Voiceover Generation Page Component
 *
 * Server Component that:
 * - Fetches project and scene data from database
 * - Verifies project exists and prerequisites are met
 * - Implements workflow state guards
 * - Renders VoiceoverGenerator Client Component
 *
 * @param params - Route parameters containing project ID
 * @returns Page component with voiceover generation UI
 */
export default async function VoiceoverPage({ params }: VoiceoverPageProps) {
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

  // If already completed voiceover generation, show completion state
  const isComplete = project.current_step === 'visual-sourcing';

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
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {scenes.length} scene{scenes.length !== 1 ? 's' : ''}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col p-8 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-2xl mx-auto w-full">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Voiceover Generation
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Generate professional audio narration for your video script
            </p>
          </div>

          <VoiceoverGenerator projectId={projectId} sceneCount={scenes.length} />
        </div>
      </main>
    </div>
  );
}

/**
 * Generate metadata for the page
 */
export async function generateMetadata({ params }: VoiceoverPageProps) {
  const { id: projectId } = await params;
  const project = getProject(projectId);

  return {
    title: project ? `Voiceover Generation - ${project.name}` : 'Voiceover Generation',
    description: 'Generate voiceover audio for your AI video project',
  };
}
