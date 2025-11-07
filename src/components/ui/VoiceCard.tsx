/**
 * VoiceCard Component
 *
 * Reusable UI component for displaying voice profile information with
 * preview playback and selection functionality.
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

import * as React from 'react';
import { Play, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { VoiceProfile } from '@/lib/tts/provider';

export interface VoiceCardProps {
  voice: VoiceProfile;
  selected: boolean;
  onSelect: (voiceId: string) => void;
  onPreview: (voiceId: string) => void;
}

export function VoiceCard({
  voice,
  selected,
  onSelect,
  onPreview,
}: VoiceCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(voice.id);
    }
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPreview(voice.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select ${voice.name}`}
      aria-selected={selected}
      onClick={() => onSelect(voice.id)}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative flex flex-col gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer',
        'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'dark:bg-slate-800/50 dark:border-slate-700 dark:hover:bg-slate-800',
        selected
          ? 'border-primary bg-primary/5 dark:border-primary dark:bg-primary/10'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50'
      )}
    >
      {/* Selection Indicator */}
      {selected && (
        <div className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground">
          <Check className="w-4 h-4" aria-hidden="true" />
        </div>
      )}

      {/* Voice Name */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {voice.name}
        </h3>
      </div>

      {/* Voice Metadata */}
      <div className="flex flex-col gap-1.5 text-sm text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-medium">Gender:</span>
          <span className="capitalize">{voice.gender}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Accent:</span>
          <span className="capitalize">{voice.accent}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Tone:</span>
          <span className="capitalize">{voice.tone}</span>
        </div>
      </div>

      {/* Preview Button */}
      <div className="mt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviewClick}
          aria-label={`Preview ${voice.name}`}
          className="w-full"
        >
          <Play className="w-4 h-4" aria-hidden="true" />
          Preview Voice
        </Button>
      </div>
    </div>
  );
}
