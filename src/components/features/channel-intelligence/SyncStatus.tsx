'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Clock, Video, Newspaper, CheckCircle, AlertCircle } from 'lucide-react';

interface SyncStatusData {
  lastSync: string | null;
  lastSyncFormatted: string;
  stats: {
    channels: {
      total: number;
      userChannel: number;
      competitors: number;
    };
    videos: {
      total: number;
      embedded: number;
    };
    news: {
      sources: number;
      articles: number;
    };
    jobs: {
      pending: number;
      running: number;
    };
  };
  pendingJobs: Array<{
    id: string;
    type: string;
    status: string;
    progress: number;
  }>;
}

interface SyncStatusProps {
  data: SyncStatusData;
  onRefresh: () => void;
  onSync: () => void;
  syncing: boolean;
  refreshing: boolean;
}

export function SyncStatus({ data, onRefresh, onSync, syncing, refreshing }: SyncStatusProps) {
  const hasActiveJobs = data.stats.jobs.pending > 0 || data.stats.jobs.running > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Sync Status</CardTitle>
          <CardDescription className="flex items-center gap-2 mt-1">
            <Clock className="h-4 w-4" />
            Last synced: {data.lastSyncFormatted}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            onClick={onSync}
            disabled={syncing || hasActiveJobs}
          >
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : hasActiveJobs ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                In Progress
              </>
            ) : (
              'Sync Now'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="space-y-1">
            <p className="text-2xl font-bold">{data.stats.channels.total}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Video className="h-3 w-3" />
              Channels Tracked
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{data.stats.videos.embedded}</p>
            <p className="text-xs text-muted-foreground">Videos Indexed</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{data.stats.news.articles}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Newspaper className="h-3 w-3" />
              News Articles
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{data.stats.news.sources}</p>
            <p className="text-xs text-muted-foreground">News Sources</p>
          </div>
        </div>

        {data.pendingJobs.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Active Jobs</p>
            <div className="space-y-2">
              {data.pendingJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                    {job.type.replace('rag_sync_', 'Sync ').replace('_', ' ')}
                  </span>
                  <Badge variant="outline">{job.progress}%</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
