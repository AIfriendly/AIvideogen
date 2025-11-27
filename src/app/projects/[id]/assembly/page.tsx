/**
 * Assembly Status Page - Epic 4, Story 4.5 (Integrated with Epic 5)
 *
 * Displays video assembly status and progress with real-time polling.
 * Shows download button when assembly is complete.
 */

import { AssemblyClient } from './assembly-client';

/**
 * AssemblyPage Component
 *
 * Server component that renders the assembly status client.
 * The client component handles polling and displays progress/download.
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
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-slate-100">Video Assembly</h1>

        <AssemblyClient projectId={projectId} jobId={jobId} />

        {/* Back link */}
        <div className="mt-6 text-center">
          <a
            href={`/projects/${projectId}/visual-curation`}
            className="text-sm text-slate-500 hover:text-slate-300"
          >
            ← Back to Visual Curation
          </a>
        </div>
      </div>
    </div>
  );
}
