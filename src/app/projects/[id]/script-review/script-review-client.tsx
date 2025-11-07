/**
 * Script Review Client Component
 *
 * Displays generated scenes with word counts and provides navigation
 * to next steps in the workflow.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VoiceProfile } from '@/lib/tts/voice-profiles';
import { Button } from '@/components/ui/button';
import { CheckCircle, Volume2, ArrowLeft, FileText } from 'lucide-react';

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

interface ScriptReviewClientProps {
  projectId: string;
  projectName: string;
  topic: string;
  scenes: Scene[];
  selectedVoice: VoiceProfile | null;
}

export default function ScriptReviewClient({
  projectId,
  projectName,
  topic,
  scenes,
  selectedVoice,
}: ScriptReviewClientProps) {
  const router = useRouter();
  const [selectedScene, setSelectedScene] = useState<number | null>(null);

  // Calculate word count for a scene
  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).length;
  };

  // Calculate total word count
  const totalWords = scenes.reduce((sum, scene) => sum + getWordCount(scene.text), 0);

  // Calculate estimated duration (150 words per minute average speaking rate)
  const estimatedDuration = Math.ceil(totalWords / 150 * 60); // in seconds

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              Script Review
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span>Script Generated</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Success Banner */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="font-semibold text-green-900 dark:text-green-100">
                  Script Generated Successfully!
                </h2>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Your video script has been generated with {scenes.length} scene{scenes.length !== 1 ? 's' : ''}.
                  Review the content below before proceeding.
                </p>
              </div>
            </div>
          </div>

          {/* Script Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <FileText className="w-4 h-4" />
                Total Words
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalWords}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
                <Volume2 className="w-4 h-4" />
                Est. Duration
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatDuration(estimatedDuration)}
              </div>
            </div>
          </div>

          {/* Project Info */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Project Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Topic:</p>
                <p className="text-slate-900 dark:text-slate-100">{topic}</p>
              </div>
              {selectedVoice && (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Selected Voice:</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{selectedVoice.name}</p>
                    <span className="text-sm text-slate-500">•</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">{selectedVoice.gender}</span>
                    <span className="text-sm text-slate-500">•</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">{selectedVoice.accent}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scenes List */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
              Generated Script
            </h3>
            {scenes.map((scene) => {
              const wordCount = getWordCount(scene.text);
              const isShort = wordCount < 50;

              return (
                <div
                  key={scene.id}
                  className={`bg-white dark:bg-slate-800 border rounded-lg p-6 transition-all ${
                    selectedScene === scene.scene_number
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  onClick={() => setSelectedScene(scene.scene_number)}
                >
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
                          {wordCount} words
                          {isShort && (
                            <span className="ml-2 text-amber-600 dark:text-amber-400">
                              (Short - may need editing)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {scene.text}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Next Steps */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Next Steps
            </h3>
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full"
                disabled
              >
                <Volume2 className="w-4 h-4 mr-2" />
                Generate Voiceover (Coming Soon)
              </Button>
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                Voiceover generation will be available in a future update.
                Your script has been saved and is ready for the next step.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${projectId}`)}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chat
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${projectId}/script-generation`)}
              className="flex-1"
            >
              Regenerate Script
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
