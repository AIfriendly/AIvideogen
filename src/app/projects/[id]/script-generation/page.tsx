/**
 * Script Generation Page - Story 2.3 Placeholder
 *
 * Loading screen displayed after voice selection while script generation
 * begins (Story 2.4 will implement actual script generation logic).
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

import { notFound } from 'next/navigation';
import { getProject } from '@/lib/db/queries';
import { getVoiceById } from '@/lib/tts/voice-profiles';

interface ScriptGenerationPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Script Generation Page Component
 *
 * Server Component that:
 * - Fetches project data from database
 * - Verifies project exists and voice is selected
 * - Displays loading UI with selected voice confirmation
 * - Placeholder for Story 2.4 script generation logic
 *
 * @param params - Route parameters containing project ID
 * @returns Page component with loading screen
 */
export default async function ScriptGenerationPage({
  params,
}: ScriptGenerationPageProps) {
  const { id: projectId } = await params;

  // Fetch project data on server
  const project = getProject(projectId);

  // Verify project exists
  if (!project) {
    notFound();
  }

  // Get selected voice information
  const selectedVoice = project.voice_id
    ? getVoiceById(project.voice_id)
    : null;

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
              Script Generation
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-2xl w-full space-y-8">
          {/* Loading Indicator */}
          <div className="flex flex-col items-center gap-6">
            {/* Animated Spinner */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-700"></div>
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>

            {/* Status Message */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Generating Your Video Script...
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                This may take 5-10 seconds
              </p>
            </div>
          </div>

          {/* Project Information */}
          <div className="space-y-4 p-6 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50">
            {/* Topic */}
            {project.topic && (
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Topic:
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {project.topic}
                </p>
              </div>
            )}

            {/* Selected Voice */}
            {selectedVoice && (
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Selected Voice:
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {selectedVoice.name}
                </p>
                <div className="flex gap-3 mt-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="capitalize">{selectedVoice.gender}</span>
                  <span>•</span>
                  <span className="capitalize">{selectedVoice.accent}</span>
                  <span>•</span>
                  <span className="capitalize">{selectedVoice.tone}</span>
                </div>
              </div>
            )}
          </div>

          {/* Coming Soon Notice */}
          <div className="text-center p-6 rounded-lg bg-primary/5 border border-primary/20 dark:bg-primary/10 dark:border-primary/30">
            <p className="text-sm font-medium text-primary dark:text-primary/90">
              Story 2.4: Script Generation Implementation
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Actual script generation logic will be implemented in Story 2.4.
              This is a placeholder loading screen for Story 2.3.
            </p>
          </div>

          {/* Debug Info (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-8 rounded border p-4 text-left text-sm border-slate-200 dark:border-slate-700">
              <summary className="cursor-pointer font-semibold text-slate-900 dark:text-slate-100">
                Debug Info (Development Only)
              </summary>
              <div className="mt-2 space-y-1 font-mono text-xs text-slate-600 dark:text-slate-400">
                <p>
                  <strong>Project ID:</strong> {project.id}
                </p>
                <p>
                  <strong>Voice ID:</strong> {project.voice_id || 'null'}
                </p>
                <p>
                  <strong>Voice Selected:</strong>{' '}
                  {project.voice_selected ? 'true' : 'false'}
                </p>
                <p>
                  <strong>Current Step:</strong> {project.current_step}
                </p>
                <p>
                  <strong>Script Generated:</strong>{' '}
                  {project.script_generated ? 'true' : 'false'}
                </p>
              </div>
            </details>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Generate metadata for the page
 */
export async function generateMetadata({ params }: ScriptGenerationPageProps) {
  const { id: projectId } = await params;
  const project = getProject(projectId);

  return {
    title: project
      ? `Script Generation - ${project.name}`
      : 'Script Generation',
    description: 'Generating your video script',
  };
}
