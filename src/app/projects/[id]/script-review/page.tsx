/**
 * Script Review Page
 *
 * Shows the generated script with all scenes for review before proceeding
 * to voiceover generation (future story).
 */

import { notFound } from 'next/navigation';
import { getProject, getScenesByProjectId } from '@/lib/db/queries';
import { getVoiceById } from '@/lib/tts/voice-profiles';
import ScriptReviewClient from './script-review-client';

interface ScriptReviewPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Script Review Page Component (Server)
 *
 * Fetches project and scenes from database and passes to client component
 */
export default async function ScriptReviewPage({
  params,
}: ScriptReviewPageProps) {
  const { id: projectId } = await params;

  // Fetch project data
  const project = getProject(projectId);

  if (!project) {
    notFound();
  }

  // Verify script has been generated
  if (!project.script_generated) {
    // Redirect to script generation if not done yet
    throw new Error('Script not yet generated. Please generate a script first.');
  }

  // Fetch all scenes for this project
  const scenes = getScenesByProjectId(projectId);

  // Get selected voice information
  const selectedVoice = project.voice_id
    ? (getVoiceById(project.voice_id) ?? null)
    : null;

  return (
    <ScriptReviewClient
      projectId={projectId}
      projectName={project.name}
      topic={project.topic || ''}
      scenes={scenes}
      selectedVoice={selectedVoice}
    />
  );
}

/**
 * Generate metadata for the page
 */
export async function generateMetadata({ params }: ScriptReviewPageProps) {
  const { id: projectId } = await params;
  const project = getProject(projectId);

  return {
    title: project ? `Script Review - ${project.name}` : 'Script Review',
    description: 'Review your generated video script',
  };
}
