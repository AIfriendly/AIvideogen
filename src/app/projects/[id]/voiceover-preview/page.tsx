/**
 * Voiceover Preview Page - Epic 2, Story 2.6
 *
 * Displays generated voiceovers for all scenes with audio players,
 * allowing users to preview and optionally regenerate audio before
 * proceeding to visual sourcing.
 */

import { notFound } from 'next/navigation';
import { getProject } from '@/lib/db/queries';
import { VoiceoverPreviewClient } from './VoiceoverPreviewClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VoiceoverPreviewPage({ params }: Props) {
  const { id: projectId } = await params;
  const project = getProject(projectId);

  if (!project) {
    notFound();
  }

  // Pass the full project data needed by the client component
  return (
    <VoiceoverPreviewClient
      project={{
        id: project.id,
        name: project.name,
        topic: project.topic,
        voice_id: project.voice_id,
        visuals_generated: project.visuals_generated,
        total_duration: project.total_duration,
      }}
    />
  );
}

export async function generateMetadata({ params }: Props) {
  const { id: projectId } = await params;
  const project = getProject(projectId);

  return {
    title: project ? `Voiceover Preview - ${project.name}` : 'Voiceover Preview',
    description: 'Preview voiceovers for your AI video project',
  };
}
