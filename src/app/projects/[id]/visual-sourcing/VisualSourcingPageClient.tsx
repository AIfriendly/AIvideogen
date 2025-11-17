/**
 * Visual Sourcing Page Client Component
 *
 * Client component that manages the visual sourcing workflow state
 * and displays the VisualSourcingLoader component.
 *
 * Story 3.5: Visual Suggestions Database & Workflow Integration
 */

'use client';

import { useRouter } from 'next/navigation';
import { VisualSourcingLoader } from '@/components/features/visual-sourcing/VisualSourcingLoader';

interface VisualSourcingPageClientProps {
  projectId: string;
  totalScenes: number;
}

export function VisualSourcingPage({ projectId, totalScenes }: VisualSourcingPageClientProps) {
  const router = useRouter();

  const handleComplete = () => {
    // On completion, navigate to visual curation page (Epic 4)
    console.log('[VisualSourcingPage] Visual sourcing complete, navigating to visual curation');
    router.push(`/projects/${projectId}/visual-curation`);
  };

  const handleError = (error: string) => {
    // Log error but still allow navigation to visual curation with partial results
    console.error('[VisualSourcingPage] Visual sourcing error:', error);
    // User can retry from the loader component
  };

  return (
    <VisualSourcingLoader
      projectId={projectId}
      totalScenes={totalScenes}
      onComplete={handleComplete}
      onError={handleError}
    />
  );
}
