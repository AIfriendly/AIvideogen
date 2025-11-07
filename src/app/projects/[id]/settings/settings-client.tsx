/**
 * Project Settings Client Component
 *
 * Interactive UI for configuring project settings including video duration
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Clock, FileText, CheckCircle } from 'lucide-react';

interface SettingsClientProps {
  projectId: string;
  projectName: string;
  topic: string;
  currentConfig: any;
}

/**
 * Calculate recommended scene count based on target duration
 * Uses average of 60 seconds per scene (100 words at 150 WPM)
 */
function calculateSceneCount(durationMinutes: number): number {
  // Average scene: ~100 words, ~40 seconds when spoken
  // Add some buffer for pacing and transitions
  const scenesPerMinute = 1.5; // ~40 seconds per scene = 1.5 scenes/minute
  const calculatedScenes = Math.round(durationMinutes * scenesPerMinute);

  // Clamp to reasonable range (min 2, max 30)
  return Math.max(2, Math.min(30, calculatedScenes));
}

/**
 * Format duration display
 */
function formatDuration(minutes: number): string {
  if (minutes === 1) return '1 minute';
  return `${minutes} minutes`;
}

export default function SettingsClient({
  projectId,
  projectName,
  topic,
  currentConfig,
}: SettingsClientProps) {
  const router = useRouter();

  // State
  const [duration, setDuration] = useState<number>(
    currentConfig?.targetDuration || 2
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate scene count based on duration
  const sceneCount = calculateSceneCount(duration);
  const estimatedWords = sceneCount * 100; // Average 100 words per scene
  const estimatedSeconds = Math.round((estimatedWords / 150) * 60); // 150 WPM

  // Quick duration presets
  const presets = [1, 2, 3, 5, 10, 15, 20];

  /**
   * Save settings to database
   */
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const config = {
        targetDuration: duration,
        sceneCount: sceneCount,
        estimatedWords: estimatedWords,
      };

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config_json: JSON.stringify(config),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSaved(true);

      // Redirect back to project after 1.5 seconds
      setTimeout(() => {
        router.push(`/projects/${projectId}`);
      }, 1500);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background dark:bg-slate-900 sticky top-0 z-10">
        <div className="container flex h-16 items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/projects/${projectId}`)}
            className="mr-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {projectName}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Project Settings
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Success Message */}
          {saved && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    Settings Saved Successfully!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Redirecting back to project...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-900 dark:text-red-100 font-semibold">
                Error: {error}
              </p>
            </div>
          )}

          {/* Project Info */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Project Information
            </h2>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Topic:</p>
                <p className="text-slate-900 dark:text-slate-100">{topic || 'Not set'}</p>
              </div>
            </div>
          </div>

          {/* Video Duration Settings */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                  Target Video Duration
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Set the desired length for your video script
                </p>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="mb-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Quick Presets:
              </p>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <Button
                    key={preset}
                    variant={duration === preset ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDuration(preset)}
                  >
                    {formatDuration(preset)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Duration Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Custom Duration:
                </label>
                <span className="text-2xl font-bold text-primary">
                  {formatDuration(duration)}
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="20"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />

              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-500">
                <span>1 min</span>
                <span>5 min</span>
                <span>10 min</span>
                <span>15 min</span>
                <span>20 min</span>
              </div>
            </div>

            {/* Calculated Statistics */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                Estimated Script Structure:
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs mb-1">
                    <FileText className="w-3 h-3" />
                    Scenes
                  </div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {sceneCount}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs mb-1">
                    <FileText className="w-3 h-3" />
                    Words
                  </div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    ~{estimatedWords}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs mb-1">
                    <Clock className="w-3 h-3" />
                    Duration
                  </div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {Math.floor(estimatedSeconds / 60)}:{(estimatedSeconds % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-4">
                Based on average speaking rate of 150 words per minute
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              How This Works
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• The system will generate approximately {sceneCount} scenes for a {formatDuration(duration)} video</li>
              <li>• Each scene will be 50-200 words (optimal: 80-120 words)</li>
              <li>• Actual duration may vary based on speaking pace and pauses</li>
              <li>• You can regenerate scripts if the length doesn't match your needs</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${projectId}`)}
              className="flex-1"
              disabled={saving}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={saving || saved}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
