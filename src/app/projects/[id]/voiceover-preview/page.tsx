/**
 * Voiceover Preview Page - Epic 2, Story 2.6 (Placeholder)
 *
 * This is a placeholder page for the voiceover preview functionality.
 * It will be fully implemented in Epic 2, but includes the navigation
 * button to Visual Curation for workflow continuity.
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

  return <VoiceoverPreviewClient project={project} />;
}

export async function generateMetadata({ params }: Props) {
  const { id: projectId } = await params;
  const project = getProject(projectId);

  return {
    title: project ? `Voiceover Preview - ${project.name}` : 'Voiceover Preview',
    description: 'Preview voiceovers for your AI video project',
  };
}
