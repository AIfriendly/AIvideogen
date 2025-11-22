'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface Props {
  project: {
    id: string;
    name: string;
    visuals_generated: boolean;
  };
}

export function VoiceoverPreviewClient({ project }: Props) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background dark:bg-slate-900 sticky top-0 z-10">
        <div className="container flex h-16 items-center gap-4 px-4 md:px-6 lg:px-8">
          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100">
              {project.name}
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
              Voiceover Preview
            </p>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col p-4 md:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
              Placeholder Page
            </h2>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              This is a placeholder for the Voiceover Preview page (Epic 2, Story 2.6).
              The full implementation will include voiceover playback, regeneration options,
              and voice settings. For now, you can continue to Visual Curation.
            </p>
          </div>

          {/* Navigation to Visual Curation */}
          <div className="flex justify-end">
            {project.visuals_generated ? (
              <Button
                onClick={() => router.push(`/projects/${project.id}/visual-curation`)}
                className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
              >
                Continue to Visual Curation
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => router.push(`/projects/${project.id}/visual-sourcing`)}
                className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
              >
                Generate Visual Suggestions
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
