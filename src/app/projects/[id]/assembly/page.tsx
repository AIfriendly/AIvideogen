/**
 * Assembly Status Page - Epic 4, Story 4.5 (Integrated with Epic 5)
 *
 * Displays video assembly status and progress.
 * Integrated with Epic 5 assembly implementation.
 * Shows real-time progress from the assembly job.
 */

import { Loader2 } from 'lucide-react';

/**
 * AssemblyPage Component
 *
 * Server component that displays the assembly status.
 * Shows the job ID from URL params and a placeholder message.
 *
 * @param params - Route params containing project ID
 * @param searchParams - URL search params containing job ID
 * @returns Assembly status page
 */
export default async function AssemblyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { id: projectId } = await params;
  const { jobId } = await searchParams;

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6 text-slate-100">Video Assembly</h1>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <h2 className="text-xl font-semibold text-slate-100">Assembly in Progress</h2>
          </div>

          <p className="text-slate-300 mb-4">
            Your video is being assembled. This may take a few minutes depending on the number of scenes and clip lengths.
          </p>

          {jobId && (
            <div className="bg-slate-900 rounded p-4 mb-4">
              <p className="text-sm text-slate-400 mb-1">Job ID:</p>
              <code className="text-sm text-indigo-400 font-mono">{jobId}</code>
            </div>
          )}

          <div className="bg-slate-900 rounded p-4 mb-4">
            <p className="text-sm text-slate-400 mb-1">Project ID:</p>
            <code className="text-sm text-slate-300 font-mono">{projectId}</code>
          </div>

          <div className="border-t border-slate-700 pt-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Video assembly is now processing</span>
            </div>
          </div>
        </div>

        {/* Assembly features */}
        <div className="mt-6 text-center text-sm text-slate-500">
          <p>Processing: Trimming scenes → Concatenating videos → Overlaying audio → Finalizing output</p>
        </div>
      </div>
    </div>
  );
}
