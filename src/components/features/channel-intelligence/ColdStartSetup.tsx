'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, X, ArrowLeft, Plus, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const NICHE_OPTIONS = [
  { id: 'military', name: 'Military & Defense', icon: '🎖️' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'tech', name: 'Technology', icon: '💻' },
  { id: 'cooking', name: 'Cooking & Food', icon: '🍳' },
  { id: 'fitness', name: 'Fitness & Health', icon: '💪' },
  { id: 'finance', name: 'Finance & Business', icon: '💰' },
  { id: 'science', name: 'Science & Education', icon: '🔬' },
  { id: 'travel', name: 'Travel & Adventure', icon: '✈️' },
  { id: 'automotive', name: 'Automotive', icon: '🚗' },
  { id: 'history', name: 'History', icon: '📜' },
];

interface ColdStartSetupProps {
  onComplete: (niche: string, channels: string[]) => void;
  onBack: () => void;
}

export function ColdStartSetup({ onComplete, onBack }: ColdStartSetupProps) {
  const [niche, setNiche] = useState('');
  const [channels, setChannels] = useState<string[]>([]);
  const [newChannel, setNewChannel] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const addChannel = async () => {
    if (!newChannel.trim()) {
      setError('Please enter a channel URL or ID');
      return;
    }

    if (channels.length >= 5) {
      setError('Maximum 5 channels allowed');
      return;
    }

    setValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/channels/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: newChannel }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Validation failed');
      }

      if (!data.valid) {
        setError(data.error || 'Channel not found');
        return;
      }

      // Add channel ID to list
      if (!channels.includes(data.channel.id)) {
        setChannels([...channels, data.channel.id]);
      }
      setNewChannel('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate channel');
    } finally {
      setValidating(false);
    }
  };

  const removeChannel = (channelId: string) => {
    setChannels(channels.filter(c => c !== channelId));
  };

  const handleComplete = () => {
    if (!niche) {
      setError('Please select a niche');
      return;
    }
    onComplete(niche, channels);
  };

  const selectedNiche = NICHE_OPTIONS.find(n => n.id === niche);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Cold Start Setup</h2>
          <p className="text-muted-foreground">
            Select your niche and add channels to learn from
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Your Niche</CardTitle>
          <CardDescription>
            Choose the content category you want to create videos for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none cursor-pointer"
            >
              <option value="">Select a niche...</option>
              {NICHE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.icon} {option.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
          </div>
          {selectedNiche && (
            <p className="mt-2 text-sm text-muted-foreground">
              Selected: {selectedNiche.icon} {selectedNiche.name}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Channels to Learn From</CardTitle>
          <CardDescription>
            Add up to 5 successful channels in your niche (optional but recommended)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Channel URL or ID"
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addChannel()}
              disabled={validating || channels.length >= 5}
            />
            <Button
              onClick={addChannel}
              disabled={validating || !newChannel.trim() || channels.length >= 5}
            >
              {validating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {channels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {channels.map((channel) => (
                <Badge key={channel} variant="secondary" className="px-3 py-1">
                  {channel.substring(0, 12)}...
                  <button
                    className="ml-2 hover:text-destructive"
                    onClick={() => removeChannel(channel)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {channels.length}/5 channels added
          </p>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          size="lg"
          disabled={!niche || starting}
          onClick={handleComplete}
        >
          {starting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            'Complete Setup'
          )}
        </Button>
      </div>
    </div>
  );
}
