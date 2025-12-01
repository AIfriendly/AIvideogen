'use client';

/**
 * Voiceover Preview Client Component
 *
 * Displays generated voiceovers for all scenes with audio players,
 * allowing users to preview and optionally regenerate audio before
 * proceeding to visual sourcing.
 *
 * Story 2.6: Script & Voiceover Preview Integration
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AudioPlayer from '@/components/ui/audio-player';
import {
  ArrowRight,
  ArrowLeft,
  Volume2,
  Clock,
  FileText,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface Scene {
  id: string;
  project_id: string;
  scene_number: number;
  text: string;
  sanitized_text: string | null;
  audio_file_path: string | null;
  duration: number | null;
  created_at: string;
  updated_at: string;
}

interface VoiceProfile {
  id: string;
  name: string;
  gender: string;
  accent: string;
  tone: string;
}

interface Props {
  project: {
    id: string;
    name: string;
    topic: string | null;
    voice_id: string | null;
    visuals_generated: boolean;
    total_duration: number | null;
  };
}

/**
 * Format seconds to MM:SS format
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VoiceoverPreviewClient({ project }: Props) {
  const router = useRouter();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [voice, setVoice] = useState<VoiceProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Fetch scenes and voice data
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch scenes
        const scenesResponse = await fetch(`/api/projects/${project.id}/scenes`);
        if (!scenesResponse.ok) {
          throw new Error('Failed to fetch scenes');
        }
        const scenesData = await scenesResponse.json();
        setScenes(scenesData.data?.scenes || []);

        // Fetch voice profile if voice_id is set
        if (project.voice_id) {
          const voiceResponse = await fetch(`/api/voices/${project.voice_id}`);
          if (voiceResponse.ok) {
            const voiceData = await voiceResponse.json();
            setVoice(voiceData.data || null);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load voiceover data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [project.id, project.voice_id]);

  // Calculate total words
  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).length;
  };

  const totalWords = scenes.reduce((sum, scene) => sum + getWordCount(scene.text), 0);

  // Check if all scenes have audio
  const allScenesHaveAudio = scenes.length > 0 && scenes.every((scene) => scene.audio_file_path !== null);
  const scenesWithAudio = scenes.filter((scene) => scene.audio_file_path !== null).length;
  const scenesWithoutAudio = scenes.length - scenesWithAudio;

  // Calculate total duration from scenes
  const totalDuration = scenes.reduce((sum, scene) => sum + (scene.duration || 0), 0);

  // Handle regenerate voiceover
  const handleRegenerate = async () => {
    try {
      setIsRegenerating(true);
      setError(null);

      const response = await fetch(`/api/projects/${project.id}/generate-voiceovers`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to regenerate voiceovers');
      }

      // Refresh the page to show updated audio
      window.location.reload();
    } catch (err) {
      console.error('Error regenerating voiceovers:', err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate voiceovers');
      setIsRegenerating(false);
    }
  };

  // Navigate to visual sourcing
  const handleContinue = () => {
    if (project.visuals_generated) {
      router.push(`/projects/${project.id}/visual-curation`);
    } else {
      router.push(`/projects/${project.id}/visual-sourcing`);
    }
  };

  // Navigate back to voiceover generation
  const handleBackToVoiceover = () => {
    router.push(`/projects/${project.id}/voiceover`);
  };

  // Navigate back to script review
  const handleBackToScript = () => {
    router.push(`/projects/${project.id}/script-review`);
  };

  // Loading state
  if (isLoading) {
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
        <main className="flex flex-1 items-center justify-center p-4 md:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-slate-600 dark:text-slate-400">Loading voiceover data...</p>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b bg-background dark:bg-slate-900 sticky top-0 z-10">
          <div className="container flex h-16 items-center gap-4 px-4 md:px-6 lg:px-8">
            <Button variant="ghost" size="sm" onClick={handleBackToScript} className="mr-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
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
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button variant="outline" onClick={handleBackToVoiceover}>
                Generate Voiceovers
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // No scenes state
  if (scenes.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b bg-background dark:bg-slate-900 sticky top-0 z-10">
          <div className="container flex h-16 items-center gap-4 px-4 md:px-6 lg:px-8">
            <Button variant="ghost" size="sm" onClick={handleBackToScript} className="mr-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
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
            <Card>
              <CardHeader>
                <CardTitle>No Script Generated</CardTitle>
                <CardDescription>
                  You need to generate a script before creating voiceovers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push(`/projects/${project.id}/script-generation`)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Script
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background dark:bg-slate-900 sticky top-0 z-10">
        <div className="container flex h-16 items-center gap-4 px-4 md:px-6 lg:px-8">
          <Button variant="ghost" size="sm" onClick={handleBackToScript} className="mr-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Script
          </Button>
          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100">
              {project.name}
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
              Voiceover Preview
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            {allScenesHaveAudio ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>All Voiceovers Ready</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{scenesWithAudio}/{scenes.length} Scenes</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Status Banner */}
          {allScenesHaveAudio ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="font-semibold text-green-900 dark:text-green-100">
                    All Voiceovers Generated!
                  </h2>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Preview your audio below. When you&apos;re satisfied, continue to visual sourcing.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="font-semibold text-amber-900 dark:text-amber-100">
                    {scenesWithoutAudio} Scene{scenesWithoutAudio > 1 ? 's' : ''} Missing Audio
                  </h2>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Some scenes don&apos;t have audio yet. Generate voiceovers to continue.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToVoiceover}
                  className="border-amber-300 dark:border-amber-700"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  Generate
                </Button>
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
                <FileText className="w-4 h-4" />
                Total Scenes
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {scenes.length}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
                <Volume2 className="w-4 h-4" />
                Audio Ready
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {scenesWithAudio}/{scenes.length}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
                <Clock className="w-4 h-4" />
                Total Duration
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatDuration(totalDuration)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
                <FileText className="w-4 h-4" />
                Total Words
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalWords}
              </div>
            </div>
          </div>

          {/* Voice Info */}
          {voice && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Selected Voice</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{voice.name}</p>
                </div>
                <div className="ml-auto flex gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="capitalize">{voice.gender}</span>
                  <span>•</span>
                  <span className="capitalize">{voice.accent}</span>
                  <span>•</span>
                  <span className="capitalize">{voice.tone}</span>
                </div>
              </div>
            </div>
          )}

          {/* Scene Audio Players */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                Scene Voiceovers
              </h3>
              {allScenesHaveAudio && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {isRegenerating ? 'Regenerating...' : 'Regenerate All'}
                </Button>
              )}
            </div>

            {scenes.map((scene) => (
              <Card key={scene.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary font-semibold text-lg rounded-full w-10 h-10 flex items-center justify-center">
                        {scene.scene_number}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                          Scene {scene.scene_number}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {getWordCount(scene.text)} words
                          {scene.duration && (
                            <span className="ml-2">
                              • {formatDuration(scene.duration)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {scene.audio_file_path ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>

                  {/* Script Text */}
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4 text-sm">
                    {scene.text}
                  </p>

                  {/* Audio Player */}
                  {scene.audio_file_path ? (
                    <AudioPlayer
                      projectId={project.id}
                      sceneNumber={scene.scene_number}
                      className="w-full"
                    />
                  ) : (
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        No audio generated for this scene
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Navigation Actions */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Next Steps
            </h3>
            <div className="space-y-3">
              {allScenesHaveAudio ? (
                <>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleContinue}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    {project.visuals_generated ? 'Continue to Visual Curation' : 'Continue to Visual Sourcing'}
                  </Button>
                  <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                    All voiceovers are ready. Proceed to find visuals for your scenes.
                  </p>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleBackToVoiceover}
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    Generate Voiceovers
                  </Button>
                  <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                    Generate audio narration for all scenes before continuing.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Secondary Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleBackToScript}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Script Review
            </Button>
            <Button
              variant="outline"
              onClick={handleBackToVoiceover}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Voice
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
