'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Settings, Trash2 } from 'lucide-react';
import {
  SetupWizard,
  EstablishedChannelSetup,
  ColdStartSetup,
  SyncStatus,
  CompetitorManagement,
  RAGHealth,
  TopicSuggestions,
  QuickProductionForm,
} from '@/components/features/channel-intelligence';
import type { Channel, RAGHealthStatus } from '@/lib/rag/types';

type SetupStep = 'wizard' | 'established' | 'cold_start' | 'configured';

interface StatusData {
  enabled: boolean;
  initialized: boolean;
  configured: boolean;
  mode: 'established' | 'cold_start' | 'not_configured';
  lastSync: string | null;
  lastSyncFormatted: string;
  stats: {
    channels: { total: number; userChannel: number; competitors: number };
    videos: { total: number; embedded: number };
    news: { sources: number; articles: number };
    jobs: { pending: number; running: number };
  };
  userChannel: Channel | null;
  competitorChannels: Channel[];
  health: RAGHealthStatus | null;
  pendingJobs: Array<{ id: string; type: string; status: string; progress: number }>;
}

export default function ChannelIntelligencePage() {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>('wizard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch status data
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/rag/status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }

      setStatusData(data.data);

      // Debug logging
      console.log('[ChannelIntelligence] Status data:', data.data);
      console.log('[ChannelIntelligence] Configured:', data.data.configured);
      console.log('[ChannelIntelligence] Mode:', data.data.mode);
      console.log('[ChannelIntelligence] User Channel:', data.data.userChannel);

      // Determine step based on configuration
      if (data.data.configured) {
        console.log('[ChannelIntelligence] Setting step to: configured');
        setStep('configured');
      } else {
        console.log('[ChannelIntelligence] Setting step to: wizard');
        setStep('wizard');
      }
    } catch (err) {
      console.error('[ChannelIntelligence] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Refresh status
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  };

  // Handle mode selection
  const handleSelectMode = (mode: 'established' | 'cold_start') => {
    setStep(mode);
  };

  // Handle established channel setup completion
  const handleEstablishedComplete = async (channelId: string, niche: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rag/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'established',
          config: {
            userChannelId: channelId,
            niche,
            newsEnabled: true,
            trendsEnabled: true,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Setup failed');
      }

      // Refresh status and show configured view
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
      setLoading(false);
    }
  };

  // Handle cold start setup completion
  const handleColdStartComplete = async (niche: string, channels: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rag/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'cold_start',
          config: {
            competitorChannels: channels,
            niche,
            newsEnabled: true,
            trendsEnabled: true,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Setup failed');
      }

      // Refresh status and show configured view
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
      setLoading(false);
    }
  };

  // Trigger sync
  const handleSync = async () => {
    setSyncing(true);
    setError(null);

    try {
      // Sync all channels
      const channelsResponse = await fetch('/api/rag/channels');
      const channelsData = await channelsResponse.json();

      if (channelsData.channels) {
        for (const channel of channelsData.channels) {
          await fetch(`/api/rag/channels/${channel.id}/sync`, {
            method: 'POST',
          });
        }
      }

      // Sync news
      await fetch('/api/rag/news/sync', {
        method: 'POST',
      });

      // Refresh status
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Add competitor
  const handleAddCompetitor = async (channelId: string) => {
    const response = await fetch('/api/rag/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelIdentifier: channelId,
        isCompetitor: true,
        niche: statusData?.userChannel?.niche,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to add channel');
    }

    await fetchStatus();
  };

  // Remove competitor
  const handleRemoveCompetitor = async (channelId: string) => {
    const response = await fetch(`/api/rag/channels/${channelId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to remove channel');
    }

    await fetchStatus();
  };

  // Remove user channel
  const handleRemoveUserChannel = async () => {
    if (!statusData?.userChannel) return;

    // Confirm deletion
    if (!confirm(
      `Are you sure you want to remove your channel "${statusData.userChannel.name}"?\n\n` +
      `This will:\n` +
      `• Delete all ${statusData.userChannel.videoCount} indexed videos from this channel\n` +
      `• Remove all associated embeddings from RAG\n` +
      `• Allow you to add a different channel\n\n` +
      `This action cannot be undone.`
    )) {
      return;
    }

    const response = await fetch(`/api/rag/channels/${statusData.userChannel.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to remove channel');
    }

    // Reset to wizard mode
    setStep('wizard');
    await fetchStatus();
  };

  // Sync single channel
  const handleSyncChannel = async (channelId: string) => {
    const response = await fetch(`/api/rag/channels/${channelId}/sync`, {
      method: 'POST',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to sync channel');
    }

    await fetchStatus();
  };

  // Create project from topic
  const handleCreateProject = (topic: string) => {
    // Navigate to home with topic as query param
    router.push(`/?topic=${encodeURIComponent(topic)}`);
  };

  if (loading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Channel Intelligence</h1>
            <p className="text-muted-foreground">
              AI-powered content research and script generation
            </p>
          </div>
        </div>
        {step === 'configured' && (
          <Button variant="outline" onClick={() => setStep('wizard')}>
            <Settings className="h-4 w-4 mr-2" />
            Reconfigure
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* DEBUG: Always show sync button if user has a channel */}
      {statusData && statusData.userChannel && step !== 'configured' && (
        <Alert>
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                <strong>Debug:</strong> You have a channel configured but step is "{step}". <br />
                Configured: {statusData.configured.toString()}, Mode: {statusData.mode}
              </span>
              <Button
                size="sm"
                onClick={() => {
                  console.log('[ChannelIntelligence] Force setting step to configured');
                  setStep('configured');
                }}
              >
                Show Sync UI
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Setup Wizard */}
      {step === 'wizard' && (
        <SetupWizard onSelectMode={handleSelectMode} />
      )}

      {/* Established Channel Setup */}
      {step === 'established' && (
        <EstablishedChannelSetup
          onComplete={handleEstablishedComplete}
          onBack={() => setStep('wizard')}
        />
      )}

      {/* Cold Start Setup */}
      {step === 'cold_start' && (
        <ColdStartSetup
          onComplete={handleColdStartComplete}
          onBack={() => setStep('wizard')}
        />
      )}

      {/* Configured View */}
      {step === 'configured' && statusData && (
        <div className="space-y-6">
          {/* Quick Production Form */}
          <QuickProductionForm />

          {/* Sync Status */}
          <SyncStatus
            data={{
              lastSync: statusData.lastSync,
              lastSyncFormatted: statusData.lastSyncFormatted,
              stats: statusData.stats,
              pendingJobs: statusData.pendingJobs,
            }}
            onRefresh={handleRefresh}
            onSync={handleSync}
            syncing={syncing}
            refreshing={refreshing}
          />

          {/* User Channel Card (if established mode) */}
          {statusData.userChannel && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg">Your Channel</CardTitle>
                  <CardDescription>
                    Content synced from your YouTube channel
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveUserChannel}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                    📺
                  </div>
                  <div>
                    <p className="font-medium">{statusData.userChannel.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {statusData.userChannel.videoCount?.toLocaleString() || '?'} videos
                      {statusData.userChannel.niche && ` • ${statusData.userChannel.niche}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Competitor Management */}
          <CompetitorManagement
            competitors={statusData.competitorChannels}
            onAdd={handleAddCompetitor}
            onRemove={handleRemoveCompetitor}
            onSync={handleSyncChannel}
          />

          {/* Topic Suggestions */}
          <TopicSuggestions
            niche={statusData.userChannel?.niche || undefined}
            onCreateProject={handleCreateProject}
          />

          {/* RAG Health */}
          <RAGHealth
            health={statusData.health}
            enabled={statusData.enabled}
            initialized={statusData.initialized}
          />
        </div>
      )}
    </div>
  );
}
