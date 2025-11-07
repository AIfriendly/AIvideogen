/**
 * Project Settings Page
 *
 * Allows users to configure project-level settings including:
 * - Target video duration (1-20 minutes)
 * - Script generation preferences
 */

import { notFound } from 'next/navigation';
import { getProject } from '@/lib/db/queries';
import SettingsClient from './settings-client';

interface SettingsPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Project Settings Page Component (Server)
 *
 * Fetches project data and displays settings UI
 */
export default async function SettingsPage({
  params,
}: SettingsPageProps) {
  const { id: projectId } = await params;

  // Fetch project data
  const project = getProject(projectId);

  if (!project) {
    notFound();
  }

  // Parse existing config
  let existingConfig: any = null;
  if (project.config_json) {
    try {
      existingConfig = JSON.parse(project.config_json);
    } catch {
      // Ignore invalid JSON
      console.warn(`Invalid config_json for project ${projectId}`);
    }
  }

  return (
    <SettingsClient
      projectId={projectId}
      projectName={project.name}
      topic={project.topic || ''}
      currentConfig={existingConfig}
    />
  );
}

/**
 * Generate metadata for the page
 */
export async function generateMetadata({ params }: SettingsPageProps) {
  const { id: projectId } = await params;
  const project = getProject(projectId);

  return {
    title: project ? `Settings - ${project.name}` : 'Project Settings',
    description: 'Configure project settings and preferences',
  };
}
