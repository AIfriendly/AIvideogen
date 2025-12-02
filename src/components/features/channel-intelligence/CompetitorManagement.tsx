'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Trash2, RefreshCw } from 'lucide-react';
import type { Channel } from '@/lib/rag/types';

interface CompetitorManagementProps {
  competitors: Channel[];
  onAdd: (channelId: string) => Promise<void>;
  onRemove: (channelId: string) => Promise<void>;
  onSync: (channelId: string) => Promise<void>;
}

export function CompetitorManagement({
  competitors,
  onAdd,
  onRemove,
  onSync,
}: CompetitorManagementProps) {
  const [newChannel, setNewChannel] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newChannel.trim()) {
      setError('Please enter a channel URL or ID');
      return;
    }

    if (competitors.length >= 5) {
      setError('Maximum 5 competitor channels allowed');
      return;
    }

    setAdding(true);
    setError(null);

    try {
      await onAdd(newChannel);
      setNewChannel('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add channel');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (channelId: string) => {
    setRemovingId(channelId);
    try {
      await onRemove(channelId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove channel');
    } finally {
      setRemovingId(null);
    }
  };

  const handleSync = async (channelId: string) => {
    setSyncingId(channelId);
    try {
      await onSync(channelId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync channel');
    } finally {
      setSyncingId(null);
    }
  };

  const getSyncStatusBadge = (status: Channel['syncStatus']) => {
    switch (status) {
      case 'synced':
        return <Badge variant="default" className="bg-green-500">Synced</Badge>;
      case 'syncing':
        return <Badge variant="secondary">Syncing...</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Competitor Channels</CardTitle>
        <CardDescription>
          Track up to 5 competitor channels to inform your content strategy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new competitor */}
        <div className="flex gap-2">
          <Input
            placeholder="Channel URL or ID"
            value={newChannel}
            onChange={(e) => setNewChannel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            disabled={adding || competitors.length >= 5}
          />
          <Button
            onClick={handleAdd}
            disabled={adding || !newChannel.trim() || competitors.length >= 5}
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Competitor list */}
        {competitors.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No competitor channels added yet
          </p>
        ) : (
          <div className="space-y-2">
            {competitors.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{channel.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {channel.videoCount?.toLocaleString() || '?'} videos
                    {channel.lastSync && ` • Last sync: ${new Date(channel.lastSync).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {getSyncStatusBadge(channel.syncStatus)}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSync(channel.id)}
                    disabled={syncingId === channel.id || channel.syncStatus === 'syncing'}
                  >
                    {syncingId === channel.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(channel.id)}
                    disabled={removingId === channel.id}
                  >
                    {removingId === channel.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-right">
          {competitors.length}/5 competitors
        </p>
      </CardContent>
    </Card>
  );
}
