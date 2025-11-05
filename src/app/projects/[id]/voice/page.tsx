/**
 * Voice Selection Page - Story 1.7 Placeholder
 *
 * Epic 2 placeholder page for voice selection step.
 * Displays after topic confirmation in Story 1.7.
 *
 * Full implementation coming in Epic 2.
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProjectById } from '@/lib/db/project-queries';
import { notFound } from 'next/navigation';

interface VoicePageProps {
  params: Promise<{ id: string }>;
}

/**
 * Voice Selection Page Component
 *
 * Placeholder for Epic 2 voice selection feature.
 * Shows current project topic and provides navigation back to chat.
 *
 * @param params - Route parameters containing project ID
 * @returns Page component with placeholder content
 */
export default async function VoicePage({ params }: VoicePageProps) {
  const { id: projectId } = await params;

  // Fetch project data
  const project = getProjectById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center gap-4 px-4">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Chat
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{project.name}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="max-w-2xl text-center space-y-6">
          {/* Placeholder Icon */}
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
            <svg
              className="h-12 w-12 text-indigo-600 dark:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Voice Selection
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              Coming in Epic 2
            </p>
          </div>

          {/* Project Details */}
          {project.topic && (
            <div className="mx-auto max-w-md rounded-lg border border-border bg-muted/50 p-6">
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Confirmed Topic:
              </p>
              <p className="text-xl font-semibold">{project.topic}</p>
            </div>
          )}

          {/* Information */}
          <div className="space-y-2 text-muted-foreground">
            <p>
              Voice selection will allow you to choose from a variety of AI
              voices for your video narration.
            </p>
            <p>
              This feature is scheduled for implementation in Epic 2 of the
              project roadmap.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/projects/${projectId}`}>
              <Button variant="default" size="lg">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Chat
              </Button>
            </Link>
          </div>

          {/* Debug Info (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-8 rounded border p-4 text-left text-sm">
              <summary className="cursor-pointer font-semibold">
                Debug Info (Development Only)
              </summary>
              <div className="mt-2 space-y-1 font-mono text-xs">
                <p>
                  <strong>Project ID:</strong> {project.id}
                </p>
                <p>
                  <strong>Project Name:</strong> {project.name}
                </p>
                <p>
                  <strong>Topic:</strong> {project.topic || 'null'}
                </p>
                <p>
                  <strong>Current Step:</strong> {project.currentStep}
                </p>
                <p>
                  <strong>Last Active:</strong> {project.lastActive}
                </p>
              </div>
            </details>
          )}
        </div>
      </main>
    </div>
  );
}
