'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface SetupWizardProps {
  onSelectMode: (mode: 'established' | 'cold_start') => void;
}

const MODES = [
  {
    id: 'established' as const,
    title: 'Established Channel',
    icon: '📺',
    description: 'Connect your existing YouTube channel to learn your content style and voice.',
    details: [
      'Sync your video transcripts for style analysis',
      'Generate scripts matching your established tone',
      'Track competitor channels for market awareness',
    ],
  },
  {
    id: 'cold_start' as const,
    title: 'New Channel (Cold Start)',
    icon: '🚀',
    description: 'Starting fresh? Learn from successful channels in your niche.',
    details: [
      'Select your content niche (military, gaming, tech, etc.)',
      'Learn patterns from top channels in your niche',
      'Get script suggestions based on proven formulas',
    ],
  },
];

export function SetupWizard({ onSelectMode }: SetupWizardProps) {
  const [selectedMode, setSelectedMode] = useState<'established' | 'cold_start' | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Welcome to Channel Intelligence</h2>
        <p className="text-muted-foreground mt-2">
          Choose how you want to set up your AI-powered content assistant
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {MODES.map((mode) => (
          <Card
            key={mode.id}
            className={cn(
              'cursor-pointer transition-all hover:border-primary',
              selectedMode === mode.id && 'border-primary ring-2 ring-primary ring-offset-2'
            )}
            onClick={() => setSelectedMode(mode.id)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{mode.icon}</span>
                <div>
                  <CardTitle className="text-lg">{mode.title}</CardTitle>
                  <CardDescription>{mode.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {mode.details.map((detail, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {detail}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          disabled={!selectedMode}
          onClick={() => selectedMode && onSelectMode(selectedMode)}
        >
          Continue with {selectedMode === 'established' ? 'Established Channel' : selectedMode === 'cold_start' ? 'Cold Start' : '...'}
        </Button>
      </div>
    </div>
  );
}
