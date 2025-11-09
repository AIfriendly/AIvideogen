/**
 * VoiceoverGenerator Component
 *
 * Main voiceover generation UI component with generation trigger, progress tracking,
 * and completion summary.
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 * Story 2.5: Voiceover Generation for Scenes
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useVoiceoverStore } from '@/lib/stores/voiceover-store';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface VoiceoverGeneratorProps {
  projectId: string;
  sceneCount: number;
}

/**
 * Format seconds to MM:SS format
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VoiceoverGenerator({ projectId, sceneCount }: VoiceoverGeneratorProps) {
  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const [audioFiles, setAudioFiles] = useState<
    Array<{ sceneNumber: number; audioPath: string; duration: number }>
  >([]);
  const [summary, setSummary] = useState<{
    completed: number;
    skipped: number;
    failed: number;
  } | null>(null);

  // Hooks
  const router = useRouter();

  // Voiceover store
  const {
    generationStatus,
    currentScene,
    totalScenes,
    progress,
    errorMessage,
    startGeneration,
    updateProgress,
    completeGeneration,
    setError: setStoreError,
    resetState,
  } = useVoiceoverStore();

  // Poll for progress updates
  const pollProgress = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/voiceover-progress`);
      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const { status, currentScene, totalScenes, error: progressError } = data.data;

        if (status === 'generating') {
          updateProgress(currentScene, totalScenes);
        } else if (status === 'complete') {
          completeGeneration();
          setIsGenerating(false);
        } else if (status === 'error') {
          setStoreError(progressError || 'Generation failed');
          setError(progressError || 'Generation failed');
          setIsGenerating(false);
        }
      }
    } catch (err) {
      console.error('Error polling progress:', err);
      // Don't stop polling on error - server might be processing
    }
  }, [projectId, updateProgress, completeGeneration, setStoreError]);

  // Start polling when generation begins
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    if (isGenerating && generationStatus === 'generating') {
      pollInterval = setInterval(pollProgress, 1000); // Poll every 1 second
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isGenerating, generationStatus, pollProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  // Handle generation
  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      startGeneration(sceneCount);

      const response = await fetch(`/api/projects/${projectId}/generate-voiceovers`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      // Update state with results
      setTotalDuration(data.data.totalDuration);
      setAudioFiles(data.data.audioFiles);
      setSummary(data.data.summary);

      completeGeneration();
      setIsGenerating(false);
    } catch (err) {
      console.error('Error generating voiceovers:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate voiceovers';
      setError(errorMsg);
      setStoreError(errorMsg);
      setIsGenerating(false);
    }
  };

  // Handle retry
  const handleRetry = () => {
    setError(null);
    resetState();
    handleGenerate();
  };

  // Handle continue
  const handleContinue = () => {
    // Navigate to next step (placeholder for now)
    router.push(`/projects/${projectId}`);
  };

  // Render loading state
  if (generationStatus === 'generating') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Generating Voiceovers</CardTitle>
            <CardDescription>
              Processing scene {currentScene} of {totalScenes}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">{progress}% complete</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render completion state
  if (generationStatus === 'complete' && totalDuration !== null) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Voiceover Generation Complete!</CardTitle>
            <CardDescription>All scene audio files have been generated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Total Duration</p>
                <p className="text-2xl font-bold">{formatDuration(totalDuration)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Scenes Generated</p>
                <p className="text-2xl font-bold">{audioFiles.length}</p>
              </div>
            </div>

            {summary && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Completed: {summary.completed}</p>
                <p>Skipped: {summary.skipped}</p>
                {summary.failed > 0 && <p className="text-destructive">Failed: {summary.failed}</p>}
              </div>
            )}

            <Button onClick={handleContinue} className="w-full">
              Continue to Visual Sourcing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render error state
  if (generationStatus === 'error' || error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>{errorMessage || error}</AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Generation Failed</CardTitle>
            <CardDescription>An error occurred during voiceover generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleRetry} variant="outline" className="w-full">
              Retry Generation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render initial state
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Voiceovers</CardTitle>
          <CardDescription>
            Generate TTS audio for all {sceneCount} scenes using your selected voice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This will create audio narration for each scene in your script. The process may take
              several minutes depending on the number of scenes.
            </p>
          </div>

          <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
            {isGenerating ? 'Generating...' : 'Generate Voiceover'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
