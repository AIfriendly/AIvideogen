/**
 * Script Generation Client Component - Story 2.4
 *
 * Client-side component that handles:
 * - Calling the generate-script API endpoint
 * - Displaying loading/success/error states
 * - Redirecting to voiceover step after successful generation
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VoiceProfile } from '@/lib/tts/voice-profiles';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface ScriptGenerationClientProps {
  projectId: string;
  projectName: string;
  topic: string;
  selectedVoice: VoiceProfile | null;
  scriptGenerated: boolean;
}

type GenerationState = 'idle' | 'generating' | 'success' | 'error';

interface GenerationResult {
  success: boolean;
  data?: {
    projectId: string;
    sceneCount: number;
    scenes: Array<{
      id: string;
      scene_number: number;
      text: string;
    }>;
    attempts: number;
    validationScore?: number;
  };
  error?: string;
  details?: string[];
}

export default function ScriptGenerationClient({
  projectId,
  projectName,
  topic,
  selectedVoice,
  scriptGenerated,
}: ScriptGenerationClientProps) {
  const router = useRouter();
  const [state, setState] = useState<GenerationState>('idle');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-start generation on mount (if not already generated)
  useEffect(() => {
    if (!scriptGenerated && state === 'idle') {
      generateScript();
    } else if (scriptGenerated) {
      // Already generated, redirect back to project detail page
      router.push(`/projects/${projectId}`);
    }
    // Note: Only run on mount and when scriptGenerated changes, not on every state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptGenerated, projectId]);

  /**
   * Call the generate-script API endpoint
   */
  const generateScript = async () => {
    setState('generating');
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/generate-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: GenerationResult = await response.json();

      if (!response.ok) {
        // Store the error result with details before throwing
        setResult(data);
        setError(data.error || 'Failed to generate script');
        setState('error');
        return; // Don't throw, just return to show error UI
      }

      setResult(data);
      setState('success');

      // Redirect to script review page after 2 seconds
      setTimeout(() => {
        router.push(`/projects/${projectId}/script-review`);
      }, 2000);
    } catch (err) {
      console.error('Script generation error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setState('error');
    }
  };

  /**
   * Retry script generation after error
   */
  const handleRetry = () => {
    generateScript();
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background dark:bg-slate-900">
        <div className="container flex h-16 items-center gap-4 px-4">
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {projectName}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Script Generation
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-2xl w-full space-y-8">
          {/* Loading State */}
          {state === 'generating' && (
            <div className="flex flex-col items-center gap-6">
              {/* Animated Spinner */}
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-700"></div>
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              </div>

              {/* Status Message */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Generating Your Video Script...
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Our AI is crafting a professional script based on your topic
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  This typically takes 10-30 seconds
                </p>
              </div>
            </div>
          )}

          {/* Success State */}
          {state === 'success' && result?.data && (
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Script Generated Successfully!
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Created {result.data.sceneCount} scenes in {result.data.attempts} attempt{result.data.attempts > 1 ? 's' : ''}
                </p>
                {result.data.validationScore && (
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Quality Score: {result.data.validationScore}/100
                  </p>
                )}
              </div>

              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Redirecting to script review...
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Generation Failed
                </h2>
                <p className="text-red-600 dark:text-red-400">
                  {error}
                </p>
                {result?.details && result.details.length > 0 && (
                  <div className="mt-4 text-left p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                      Issues detected:
                    </p>
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                      {result.details.map((detail, idx) => (
                        <li key={idx}>• {detail}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <Button onClick={handleRetry} size="lg">
                <Loader2 className="w-4 h-4 mr-2" />
                Retry Generation
              </Button>
            </div>
          )}

          {/* Project Information */}
          <div className="space-y-4 p-6 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50">
            {/* Topic */}
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                Topic:
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {topic}
              </p>
            </div>

            {/* Selected Voice */}
            {selectedVoice && (
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Selected Voice:
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {selectedVoice.name}
                </p>
                <div className="flex gap-3 mt-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="capitalize">{selectedVoice.gender}</span>
                  <span>•</span>
                  <span className="capitalize">{selectedVoice.accent}</span>
                  <span>•</span>
                  <span className="capitalize">{selectedVoice.tone}</span>
                </div>
              </div>
            )}
          </div>

          {/* Generation Info (when successful) */}
          {state === 'success' && result?.data && (
            <div className="p-6 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3">
                Generated Script Preview
              </h3>
              <div className="space-y-2">
                {result.data.scenes.slice(0, 2).map((scene) => (
                  <div
                    key={scene.id}
                    className="p-3 rounded bg-white dark:bg-slate-800 border border-green-100 dark:border-green-900"
                  >
                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                      Scene {scene.scene_number}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                      {scene.text}
                    </p>
                  </div>
                ))}
                {result.data.sceneCount > 2 && (
                  <p className="text-xs text-center text-green-700 dark:text-green-400 pt-2">
                    + {result.data.sceneCount - 2} more scene{result.data.sceneCount > 3 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
