'use client';

/**
 * Export Client Component - Story 5.5
 *
 * Main client component for the Export page.
 * Displays completed video with thumbnail, download options, and metadata.
 * UX spec: Section 7.7
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoDownload } from '@/components/features/export/VideoDownload';
import { ThumbnailPreview } from '@/components/features/export/ThumbnailPreview';
import { ExportSummary } from '@/components/features/export/ExportSummary';
import { AssemblyProgress } from '@/components/features/export/AssemblyProgress';

interface ExportData {
  video_path: string;
  thumbnail_path: string | null;
  duration: number;
  file_size: number;
  scene_count: number;
  title: string;
  resolution: string;
}

interface AssemblyStatus {
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  currentStage: string;
  currentScene?: number;
  totalScenes?: number;
  errorMessage?: string;
}

interface ExportClientProps {
  projectId: string;
}

export function ExportClient({ projectId }: ExportClientProps) {
  const router = useRouter();
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [assemblyStatus, setAssemblyStatus] = useState<AssemblyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch assembly status and export data
   */
  const fetchData = useCallback(async () => {
    try {
      // Check assembly status first
      const statusRes = await fetch(`/api/projects/${projectId}/assembly-status`);

      if (!statusRes.ok) {
        const statusErr = await statusRes.json();
        if (statusErr.code === 'JOB_NOT_FOUND') {
          setError('No assembly job found. Please start assembly from the visual curation page.');
          setLoading(false);
          return;
        }
        throw new Error(statusErr.error || 'Failed to fetch assembly status');
      }

      const statusData = await statusRes.json();
      setAssemblyStatus(statusData);

      // If complete, fetch export data
      if (statusData.status === 'complete') {
        const exportRes = await fetch(`/api/projects/${projectId}/export`);
        if (!exportRes.ok) {
          const exportErr = await exportRes.json();
          throw new Error(exportErr.error || 'Failed to fetch export data');
        }
        const data = await exportRes.json();
        setExportData(data);
      }

      setError(null);
    } catch (err) {
      console.error('[ExportClient] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  /**
   * Initial fetch and polling while processing
   */
  useEffect(() => {
    fetchData();

    // Poll every 2 seconds while processing
    const interval = setInterval(() => {
      if (!assemblyStatus || assemblyStatus.status === 'pending' || assemblyStatus.status === 'processing') {
        fetchData();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchData, assemblyStatus?.status]);

  // Loading state
  if (loading) {
    return (
      <div className="exp-loading flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-3 text-slate-300">Loading...</span>
      </div>
    );
  }

  // Error state (no job or fetch failed)
  if (error && !assemblyStatus) {
    return (
      <div className="exp-error max-w-2xl mx-auto p-8">
        <div className="bg-slate-800 rounded-lg p-6 border border-red-700">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Error</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <Button
            onClick={() => router.push(`/projects/${projectId}/visual-curation`)}
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Visual Curation
          </Button>
        </div>
      </div>
    );
  }

  // Assembly in progress
  if (assemblyStatus?.status === 'pending' || assemblyStatus?.status === 'processing') {
    return (
      <div className="exp-progress-container max-w-2xl mx-auto p-8">
        <AssemblyProgress status={assemblyStatus} />
      </div>
    );
  }

  // Assembly failed
  if (assemblyStatus?.status === 'error') {
    return (
      <div className="exp-error max-w-2xl mx-auto p-8">
        <div className="bg-slate-800 rounded-lg p-6 border border-red-700">
          <h2 className="text-xl font-semibold text-red-400 mb-4">Assembly Failed</h2>
          <p className="text-slate-300 mb-4">
            An error occurred during video assembly.
          </p>
          {assemblyStatus.errorMessage && (
            <div className="bg-red-900/30 rounded p-4 mb-6 border border-red-800">
              <p className="text-sm text-red-300 font-mono">{assemblyStatus.errorMessage}</p>
            </div>
          )}
          <Button
            onClick={() => router.push(`/projects/${projectId}/visual-curation`)}
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // No export data available
  if (!exportData) {
    return (
      <div className="exp-error max-w-2xl mx-auto p-8">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">No Video Available</h2>
          <p className="text-slate-300 mb-6">
            No export data found for this project. Please complete video assembly first.
          </p>
          <Button
            onClick={() => router.push(`/projects/${projectId}/visual-curation`)}
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Visual Curation
          </Button>
        </div>
      </div>
    );
  }

  // Success state - show export page
  return (
    <div className="exp-container max-w-[1200px] mx-auto p-8 bg-slate-900 min-h-screen">
      {/* Header */}
      <h1 className="exp-header text-2xl font-semibold text-slate-50 mb-6">
        Your Video is Ready!
      </h1>

      {/* Main Content Grid */}
      <div className="exp-content grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 mb-6">
        {/* Video Player Section */}
        <div className="exp-video-section">
          <div className="exp-video-wrapper aspect-video rounded-xl bg-black shadow-lg overflow-hidden">
            <video
              className="w-full h-full"
              controls
              poster={exportData.thumbnail_path || undefined}
            >
              <source src={exportData.video_path} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Primary Download Button */}
          <VideoDownload
            videoPath={exportData.video_path}
            title={exportData.title}
            className="mt-4"
          />
        </div>

        {/* Thumbnail Preview Section */}
        {exportData.thumbnail_path && (
          <ThumbnailPreview
            thumbnailPath={exportData.thumbnail_path}
            title={exportData.title}
          />
        )}
      </div>

      {/* Metadata Card */}
      <ExportSummary
        duration={exportData.duration}
        fileSize={exportData.file_size}
        resolution={exportData.resolution}
        title={exportData.title}
        sceneCount={exportData.scene_count}
      />

      {/* Action Buttons */}
      <div className="exp-actions flex flex-col sm:flex-row justify-between gap-4 mt-8">
        <Button
          onClick={() => router.push('/')}
          className="bg-indigo-500 hover:bg-indigo-600 text-white"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New Video
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push(`/projects/${projectId}/visual-curation`)}
          className="text-slate-300 hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Curation
        </Button>
      </div>
    </div>
  );
}
