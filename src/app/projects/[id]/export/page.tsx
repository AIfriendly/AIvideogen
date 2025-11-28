/**
 * Export Page - Story 5.5
 *
 * Server component that renders the export page for completed videos.
 * Displays video player, thumbnail preview, and download options.
 */

import { ExportClient } from './export-client';

interface ExportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExportPage({ params }: ExportPageProps) {
  const { id } = await params;
  return <ExportClient projectId={id} />;
}
