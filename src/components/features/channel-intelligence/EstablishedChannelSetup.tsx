'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

interface ChannelInfo {
  id: string;
  name: string;
  description: string;
  subscriberCount: number | null;
  videoCount: number | null;
  thumbnailUrl?: string;
}

interface EstablishedChannelSetupProps {
  onComplete: (channelId: string, niche: string) => void;
  onBack: () => void;
}

export function EstablishedChannelSetup({ onComplete, onBack }: EstablishedChannelSetupProps) {
  const [channelUrl, setChannelUrl] = useState('');
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [niche, setNiche] = useState('');
  const [syncing, setSyncing] = useState(false);

  const validateChannel = async () => {
    if (!channelUrl.trim()) {
      setError('Please enter a channel URL or ID');
      return;
    }

    setValidating(true);
    setError(null);
    setValidated(false);
    setChannelInfo(null);

    try {
      const response = await fetch('/api/channels/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: channelUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Validation failed');
      }

      if (!data.valid) {
        setError(data.error || 'Channel not found');
        return;
      }

      setChannelInfo(data.channel);
      setValidated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate channel');
    } finally {
      setValidating(false);
    }
  };

  const handleComplete = () => {
    if (channelInfo) {
      onComplete(channelInfo.id, niche);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Connect Your Channel</h2>
          <p className="text-muted-foreground">
            Enter your YouTube channel URL to sync your content
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Channel URL</CardTitle>
          <CardDescription>
            Paste your channel URL (e.g., youtube.com/@yourchannel or channel ID)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://youtube.com/@yourchannel"
              value={channelUrl}
              onChange={(e) => {
                setChannelUrl(e.target.value);
                setValidated(false);
                setError(null);
              }}
              disabled={validating}
            />
            <Button onClick={validateChannel} disabled={validating || !channelUrl.trim()}>
              {validating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating
                </>
              ) : (
                'Validate'
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {validated && channelInfo && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="ml-2">
                <div className="flex items-center gap-4">
                  {channelInfo.thumbnailUrl && (
                    <img
                      src={channelInfo.thumbnailUrl}
                      alt={channelInfo.name}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium">{channelInfo.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {channelInfo.subscriberCount?.toLocaleString() || '?'} subscribers
                      {' • '}
                      {channelInfo.videoCount?.toLocaleString() || '?'} videos
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {validated && channelInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Content Niche (Optional)</CardTitle>
            <CardDescription>
              Specify your content niche for better news and trend tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="e.g., military, gaming, technology"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          size="lg"
          disabled={!validated || !channelInfo || syncing}
          onClick={handleComplete}
        >
          {syncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting Sync...
            </>
          ) : (
            'Connect & Start Sync'
          )}
        </Button>
      </div>
    </div>
  );
}
