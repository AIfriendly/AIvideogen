/**
 * Script Generation Page - Story 2.4 Implementation
 *
 * Initiates script generation via API and displays progress/results.
 * Redirects to voiceover step after successful generation.
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

import { notFound } from 'next/navigation';
import { getProject } from '@/lib/db/queries';
import { getVoiceById } from '@/lib/tts/voice-profiles';
import ScriptGenerationClient from './script-generation-client';

interface ScriptGenerationPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Script Generation Page Component (Server)
 *
 * Server Component that:
 * - Fetches project data from database
 * - Verifies project exists and voice is selected
 * - Passes data to client component for API interaction
 *
 * @param params - Route parameters containing project ID
 * @returns Page component with script generation client
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

  // Verify topic is confirmed (required for script generation)
  if (!project.topic) {
    // Redirect back to topic step if topic not set
    throw new Error('Topic must be confirmed before script generation');
  }

  // Get selected voice information
  const selectedVoice = project.voice_id
    ? (getVoiceById(project.voice_id) ?? null)
    : null;

  return (
    <ScriptGenerationClient
      projectId={projectId}
      projectName={project.name}
      topic={project.topic}
      selectedVoice={selectedVoice}
      scriptGenerated={project.script_generated}
    />
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
    description: 'Generating your video script with AI',
  };
}
