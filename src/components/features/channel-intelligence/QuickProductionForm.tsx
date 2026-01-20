'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Rocket, Sparkles } from 'lucide-react';
import { ProviderSelectionModal } from './ProviderSelectionModal';
import type { VideoProvider } from './ProviderSelectionModal';

/**
 * Quick Production Form Component
 *
 * Provides a simple form to enter a topic and launch Quick Production.
 * Shows provider selection modal if user hasn't selected a preferred provider.
 *
 * Flow:
 * 1. User enters topic
 * 2. (Optional) Select video provider (DVIDS, NASA, YouTube)
 * 3. Click "Generate Video"
 * 4. Creates project via /api/projects/quick-create
 * 5. Redirects to /projects/[id]/progress
 */
export function QuickProductionForm() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/projects/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          provider: selectedProvider,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'DEFAULTS_NOT_CONFIGURED') {
          setError('Please configure your default voice and persona in Settings first.');
          return;
        }
        throw new Error(data.message || 'Failed to create project');
      }

      // Redirect to progress page
      router.push(data.data.redirectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start video production');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setShowProviderModal(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Quick Production
          </CardTitle>
          <CardDescription>
            Enter a topic to automatically generate a complete video with script, voiceover, visuals, and assembly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Topic Input */}
            <div className="space-y-2">
              <Label htmlFor="topic">Video Topic</Label>
              <Input
                id="topic"
                placeholder="e.g., Military tank training exercises, NASA Mars mission updates..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={loading}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {topic.length}/500 characters
              </p>
            </div>

            {/* Provider Selection (Optional) */}
            <div className="space-y-2">
              <Label>Video Provider (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowProviderModal(true)}
                disabled={loading}
              >
                <Rocket className="h-4 w-4 mr-2" />
                {selectedProvider ? `Provider: ${selectedProvider.toUpperCase()}` : 'Select Provider (DVIDS, NASA, YouTube)'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Leave empty to use automatic provider selection with fallback
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={loading || !topic.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting Production...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Video
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Provider Selection Modal */}
      <ProviderSelectionModal
        isOpen={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        onSelectProvider={handleProviderSelect}
        isLoading={false}
      />
    </>
  );
}
