'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  CheckCircle2,
  Circle,
  FileText,
  Mic,
  Image,
  Film,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';

type PipelineStage = 'script' | 'voiceover' | 'visuals' | 'assembly' | 'complete';

interface PipelineStatus {
  projectId: string;
  topic: string;
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  stageProgress: number;
  overallProgress: number;
  currentMessage: string;
  error?: string;
}

interface QuickProductionProgressProps {
  projectId: string;
  onComplete?: (projectId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

const STAGES: { id: PipelineStage; label: string; icon: React.ElementType }[] = [
  { id: 'script', label: 'Script', icon: FileText },
  { id: 'voiceover', label: 'Voiceover', icon: Mic },
  { id: 'visuals', label: 'Visuals', icon: Image },
  { id: 'assembly', label: 'Assembly', icon: Film },
];

export function QuickProductionProgress({
  projectId,
  onComplete,
  onError,
  onCancel,
}: QuickProductionProgressProps) {
  const router = useRouter();
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  // Poll pipeline status every 2 seconds
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/pipeline-status`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch pipeline status');
      }

      setStatus(data.data);
      setError(null);

      // Check for completion
      if (data.data.currentStage === 'complete') {
        setPolling(false);
        if (onComplete) {
          onComplete(projectId);
        }
      }

      // Check for errors
      if (data.data.error) {
        setError(data.data.error);
        if (onError) {
          onError(data.data.error);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch status';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [projectId, onComplete, onError]);

  // Set up polling interval
  useEffect(() => {
    if (!polling) return;

    // Initial fetch
    fetchStatus();

    // Set up interval
    const interval = setInterval(fetchStatus, 2000);

    return () => clearInterval(interval);
  }, [polling, fetchStatus]);

  // Handle beforeunload warning
  useEffect(() => {
    if (!status || status.currentStage === 'complete') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Video production is in progress. Are you sure you want to leave?';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  // Retry handler
  const handleRetry = async () => {
    setError(null);
    setPolling(true);

    // Re-trigger the pipeline
    try {
      const response = await fetch(`/api/projects/${projectId}/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rag_enabled: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to restart pipeline');
      }

      fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry');
    }
  };

  // Cancel handler
  const handleCancel = () => {
    setPolling(false);
    if (onCancel) {
      onCancel();
    } else {
      router.push('/settings/channel-intelligence');
    }
  };

  // Edit handler - go to project detail page
  const handleEdit = () => {
    router.push(`/projects/${projectId}`);
  };

  // Get stage status
  const getStageStatus = (stageId: PipelineStage): 'complete' | 'current' | 'pending' => {
    if (!status) return 'pending';
    if (status.completedStages.includes(stageId)) return 'complete';
    if (status.currentStage === stageId) return 'current';
    return 'pending';
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status?.currentStage === 'complete' ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : error ? (
            <AlertCircle className="h-5 w-5 text-destructive" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          Quick Production
        </CardTitle>
        <CardDescription>
          {status?.topic || 'Creating your video...'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <div className="flex gap-2 ml-4">
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{status?.overallProgress ?? 0}%</span>
          </div>
          <Progress value={status?.overallProgress ?? 0} className="h-2" />
        </div>

        {/* Stage Indicators */}
        <div className="flex justify-between items-center py-4">
          {STAGES.map((stage, index) => {
            const stageStatus = getStageStatus(stage.id);
            const Icon = stage.icon;

            return (
              <div
                key={stage.id}
                className="flex flex-col items-center gap-2 relative"
              >
                {/* Connector line */}
                {index > 0 && (
                  <div
                    className={`absolute right-full top-4 w-full h-0.5 -mr-4 ${
                      stageStatus === 'complete' || (stageStatus === 'current' && status?.currentStage !== stage.id)
                        ? 'bg-primary'
                        : 'bg-muted'
                    }`}
                  />
                )}

                {/* Stage circle */}
                <div
                  className={`rounded-full p-2 ${
                    stageStatus === 'complete'
                      ? 'bg-primary text-primary-foreground'
                      : stageStatus === 'current'
                      ? 'bg-primary/20 text-primary border-2 border-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {stageStatus === 'complete' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : stageStatus === 'current' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>

                {/* Stage label */}
                <span
                  className={`text-xs font-medium ${
                    stageStatus === 'current' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current Stage Progress */}
        {status && status.currentStage !== 'complete' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {STAGES.find(s => s.id === status.currentStage)?.label ?? 'Processing'}
              </span>
              <span className="font-medium">{status.stageProgress}%</span>
            </div>
            <Progress value={status.stageProgress} className="h-1" />
          </div>
        )}

        {/* Status Message */}
        <div className="text-center text-sm text-muted-foreground">
          {status?.currentMessage || 'Initializing pipeline...'}
        </div>

        {/* Completion Actions */}
        {status?.currentStage === 'complete' && (
          <div className="flex justify-center gap-3 pt-4">
            <Button onClick={() => router.push(`/projects/${projectId}/export`)}>
              View Video
            </Button>
            <Button variant="outline" onClick={() => router.push('/settings/channel-intelligence')}>
              Create Another
            </Button>
          </div>
        )}

        {/* Cancel during progress */}
        {status && status.currentStage !== 'complete' && !error && (
          <div className="flex justify-center pt-4">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
