/**
 * VoiceSelection Component
 *
 * Main voice selection UI component with voice list display, audio preview,
 * and voice selection confirmation functionality.
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createVoiceStore } from '@/lib/stores/voice-store';
import { VoiceCard } from '@/components/ui/VoiceCard';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { VoiceProfile } from '@/lib/tts/provider';

export interface VoiceSelectionProps {
  projectId: string;
}

export function VoiceSelection({ projectId }: VoiceSelectionProps) {
  // State
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio preview management
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Hooks
  const router = useRouter();

  // Create store instance for this project (per-project state isolation)
  const useVoiceStore = useMemo(
    () => createVoiceStore(projectId),
    [projectId]
  );
  const {
    selectedVoiceId,
    currentPlayingVoice,
    selectVoice,
    playPreview,
    stopPreview,
    resetState,
  } = useVoiceStore();

  // Fetch voice profiles on mount
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        setIsLoadingVoices(true);
        setError(null);

        const response = await fetch('/api/voice/list');
        if (!response.ok) {
          throw new Error('Failed to load voice profiles');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error?.message || 'Failed to load voice profiles');
        }

        setVoices(data.data.voices);
      } catch (err) {
        console.error('Error fetching voices:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load voice profiles'
        );
      } finally {
        setIsLoadingVoices(false);
      }
    };

    fetchVoices();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      resetState();
    };
  }, [resetState]);

  // Handle voice selection
  const handleSelectVoice = (voiceId: string) => {
    selectVoice(voiceId);
    setError(null);
  };

  // Handle audio preview
  const handlePreview = (voiceId: string) => {
    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Find voice to get preview URL
    const voice = voices.find((v) => v.id === voiceId);
    if (!voice) {
      setError('Voice not found');
      return;
    }

    try {
      // Create new audio element
      const audio = new Audio(voice.previewUrl);
      audioRef.current = audio;

      // Update playing state
      playPreview(voiceId);

      // Handle audio events
      audio.onended = () => {
        stopPreview();
      };

      audio.onerror = () => {
        setError('Failed to load audio preview');
        stopPreview();
      };

      // Play audio
      audio.play().catch((err) => {
        console.error('Error playing audio:', err);
        setError('Failed to play audio preview');
        stopPreview();
      });
    } catch (err) {
      console.error('Error creating audio preview:', err);
      setError('Failed to play audio preview');
      stopPreview();
    }
  };

  // Handle confirmation
  const handleConfirm = async () => {
    if (!selectedVoiceId) {
      setError('Please select a voice');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/select-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId: selectedVoiceId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error?.message || 'Failed to save voice selection'
        );
      }

      // Navigate to script generation page
      router.push(`/projects/${projectId}/script-generation`);
    } catch (err) {
      console.error('Error saving voice selection:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to save voice selection'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Render loading state
  if (isLoadingVoices) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Loading voice options...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Select a Voice
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Choose a narrator voice for your video. You can preview each voice
          before making your selection.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Voice Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {voices.map((voice) => (
          <VoiceCard
            key={voice.id}
            voice={voice}
            selected={selectedVoiceId === voice.id}
            onSelect={handleSelectVoice}
            onPreview={handlePreview}
          />
        ))}
      </div>

      {/* Confirmation Section */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {selectedVoiceId ? (
            <>
              Selected:{' '}
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {voices.find((v) => v.id === selectedVoiceId)?.name}
              </span>
            </>
          ) : (
            'No voice selected'
          )}
        </div>

        <Button
          onClick={handleConfirm}
          disabled={!selectedVoiceId || isSaving}
          size="lg"
        >
          {isSaving ? 'Saving...' : 'Continue to Script Generation'}
        </Button>
      </div>
    </div>
  );
}
