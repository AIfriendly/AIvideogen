'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QuickProductionProgress } from '@/components/features/channel-intelligence';

interface ProgressPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Progress Page - Story 6.8b
 *
 * Displays real-time progress for Quick Production pipeline.
 * Auto-redirects to export page on completion.
 *
 * Route: /projects/[id]/progress
 */
export default function ProgressPage({ params }: ProgressPageProps) {
  const router = useRouter();
  const { id: projectId } = use(params);

  // Handle pipeline completion - redirect to export page
  const handleComplete = (completedProjectId: string) => {
    router.push(`/projects/${completedProjectId}/export`);
  };

  // Handle cancel - return to channel intelligence
  const handleCancel = () => {
    router.push('/settings/channel-intelligence');
  };

  // Handle error
  const handleError = (error: string) => {
    console.error('[Progress Page] Pipeline error:', error);
    // Error is displayed in the QuickProductionProgress component
    // User can retry, edit, or cancel from there
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <QuickProductionProgress
        projectId={projectId}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onError={handleError}
      />
    </div>
  );
}
